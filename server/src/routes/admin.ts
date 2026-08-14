import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ApiError, money, ok } from '../utils/http'
import { sanitizeUser } from '../utils/user'
import { buildDailyCount } from '../utils/stats'
import { toCsv } from '../utils/csv'
import { getSettings, saveSettings } from '../services/settings'
import { runEarningsEngine, payReferralCommission, daysBetween, DAY } from '../services/engine'
import { requireAuth } from '../middleware/auth'
import { requireAdmin } from '../middleware/admin'
import { validateBody, validateQuery } from '../middleware/validate'
import { logAudit } from '../utils/audit'
import { hashPassword } from '../utils/password'
import { sendToUser, disconnectUser } from '../ws/hub'

const admin = new Hono<AppEnv>()
admin.use('*', requireAuth, requireAdmin)

const txTypes = ['DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'PROFIT', 'MATURITY', 'REFERRAL', 'ADJUSTMENT', 'BONUS', 'LUCKY', 'SPIN'] as const
const statusSchema = z.object({ status: z.enum(['APPROVED', 'REJECTED']) })

admin.get('/stats', async (c) => {
  const now = new Date()
  const since = new Date(now.getTime() - 13 * 86_400_000)

  const [userCount, activeRows, deposits, withdrawals, investments, profitTx, referralTx, bonusTx, usersSince, txSince, recentUsers, recentLogs] =
    await Promise.all([
      prisma.user.count(),
      prisma.investment.findMany({ where: { status: 'ACTIVE' }, select: { userId: true } }),
      prisma.deposit.findMany({ where: { status: 'APPROVED' } }),
      prisma.withdrawal.findMany({ where: { status: 'APPROVED' } }),
      prisma.investment.findMany(),
      prisma.transaction.findMany({ where: { type: 'PROFIT' } }),
      prisma.transaction.findMany({ where: { type: 'REFERRAL' } }),
      prisma.transaction.findMany({ where: { type: 'BONUS' } }),
      prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.transaction.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, fullname: true, email: true, createdAt: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ])

  const totalDeposits = deposits.reduce((sum, d) => sum + Number(d.amount), 0)
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0)
  const totalInvestments = investments.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalProfits = profitTx.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalReferrals = referralTx.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalBonuses = bonusTx.reduce((sum, t) => sum + Number(t.amount), 0)
  const revenue = money(totalDeposits - totalWithdrawals - totalProfits - totalReferrals)

  const topInvestorRows = await prisma.investment.groupBy({
    by: ['userId'],
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 10,
  })
  const ids = topInvestorRows.map((r) => r.userId)
  const investorUsers = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullname: true, email: true } })
    : []
  const investorMap = new Map(investorUsers.map((u) => [u.id, u]))

  return ok(c, {
    users: userCount,
    activeInvestors: new Set(activeRows.map((i) => i.userId)).size,
    totalBalance: money(totalDeposits + totalBonuses - totalWithdrawals),
    totalDeposits: money(totalDeposits),
    totalWithdrawals: money(totalWithdrawals),
    totalInvestments: money(totalInvestments),
    totalProfits: money(totalProfits),
    totalReferrals: money(totalReferrals),
    totalBonuses: money(totalBonuses),
    revenue,
    growth: buildDailyCount(usersSince.map((u) => u.createdAt), 14),
    activity: buildDailyCount(txSince.map((t) => t.createdAt), 14),
    topInvestors: topInvestorRows.map((r, idx) => ({
      rank: idx + 1,
      name: investorMap.get(r.userId)?.fullname ?? 'Investor',
      email: investorMap.get(r.userId)?.email ?? '',
      amount: money(r._sum.amount ?? 0),
    })),
    recentUsers,
    recentLogs,
  })
})

const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
})

admin.get('/users', validateQuery(userQuerySchema), async (c) => {
  const q = c.get('validated') as z.infer<typeof userQuerySchema>
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.role ? { role: q.role } : {}),
    ...(q.search
      ? { OR: [{ fullname: { contains: q.search, mode: 'insensitive' } }, { email: { contains: q.search, mode: 'insensitive' } }] }
      : {}),
  }
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      select: {
        id: true,
        fullname: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        balance: true,
        referralCode: true,
        createdAt: true,
        referredBy: { select: { id: true, fullname: true, email: true } },
        _count: { select: { investments: true, deposits: true, withdrawals: true, referrals: true } },
      },
    }),
    prisma.user.count({ where }),
  ])
  return ok(c, { data: items, page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) })
})

admin.get('/users/:id', async (c) => {
  const user = await prisma.user.findUnique({
    where: { id: c.req.param('id') },
    include: {
      kyc: true,
      settings: true,
      agentApplication: true,
      referredBy: { select: { id: true, fullname: true, email: true } },
      referrals: { select: { id: true, fullname: true, email: true, createdAt: true } },
      investments: { orderBy: { createdAt: 'desc' }, take: 100 },
      deposits: { orderBy: { createdAt: 'desc' }, take: 100 },
      withdrawals: { orderBy: { createdAt: 'desc' }, take: 100 },
      transactions: { orderBy: { createdAt: 'desc' }, take: 200 },
      notifications: { orderBy: { createdAt: 'desc' }, take: 50 },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 100 },
    },
  })
  if (!user) throw new ApiError(404, 'User not found')
  return ok(c, sanitizeUser(user))
})

const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

admin.get('/users/:id/activity', validateQuery(activityQuerySchema), async (c) => {
  const q = c.get('validated') as z.infer<typeof activityQuerySchema>
  const target = await prisma.user.findUnique({ where: { id: c.req.param('id') }, select: { id: true } })
  if (!target) throw new ApiError(404, 'User not found')
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { userId: target.id },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.auditLog.count({ where: { userId: target.id } }),
  ])
  return ok(c, { data: items, page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) })
})

const userUpdateSchema = z.object({
  fullname: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).max(30).nullable().optional(),
  role: z.enum(['USER', 'AGENT', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  referralCode: z.string().min(4).max(20).optional(),
  referredById: z.string().min(1).nullable().optional(),
  balance: z.number().min(0).optional(),
  settings: z
    .object({
      language: z.string().min(2).max(8).optional(),
      notificationsOn: z.boolean().optional(),
      twoFactorEnabled: z.boolean().optional(),
    })
    .optional(),
  agentApplication: z
    .object({
      businessRegistration: z.string().max(500).nullable().optional(),
      applicationFeeTx: z.string().max(200).nullable().optional(),
      applicationFeeAmount: z.number().min(0).optional(),
    })
    .optional(),
})

admin.patch('/users/:id', validateBody(userUpdateSchema), async (c) => {
  const actor = c.get('user')
  const body = c.get('validated') as z.infer<typeof userUpdateSchema>
  const target = await prisma.user.findUnique({ where: { id: c.req.param('id') } })
  if (!target) throw new ApiError(404, 'User not found')

  if (body.email && body.email.toLowerCase() !== target.email) {
    const clash = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })
    if (clash) throw new ApiError(409, 'An account with this email already exists')
  }
  if (body.referralCode && body.referralCode !== target.referralCode) {
    const clash = await prisma.user.findUnique({ where: { referralCode: body.referralCode.toUpperCase() } })
    if (clash) throw new ApiError(409, 'This referral code is already in use')
  }
  if (body.referredById) {
    if (body.referredById === target.id) throw new ApiError(400, 'A user cannot be referred by themselves')
    const ref = await prisma.user.findUnique({ where: { id: body.referredById } })
    if (!ref) throw new ApiError(400, 'Referred-by user not found')
  }

  const { settings, role, status, agentApplication, ...rest } = body
  const data: Record<string, unknown> = { ...rest }
  if (role !== undefined) data.role = role
  if (status !== undefined) data.status = status
  if (data.email) data.email = String(data.email).toLowerCase()
  if (data.referralCode) data.referralCode = String(data.referralCode).toUpperCase()
  if (data.balance !== undefined) data.balance = money(Number(data.balance))

  const roleChanged = role !== undefined && role !== target.role
  if (role === 'AGENT' && target.role !== 'AGENT') {
    const existing = await prisma.agentApplication.findUnique({ where: { userId: target.id } })
    if (existing) {
      await prisma.agentApplication.update({ where: { userId: target.id }, data: { status: 'APPROVED' } })
    } else {
      await prisma.agentApplication.create({
        data: {
          userId: target.id,
          fullName: String(rest.fullname ?? target.fullname),
          email: String(data.email ?? target.email),
          phone: String(data.phone ?? target.phone ?? ''),
          address: '',
          idType: 'NATIONAL_ID',
          idNumber: '',
          education: 'OTHER',
          referenceOneName: '',
          referenceOneContact: '',
          referenceTwoName: '',
          referenceTwoContact: '',
          tin: '',
          criminalRecordOk: false,
          hasDevice: false,
          hasInternet: false,
          banking: '',
          applicationFeeTx: 'ADMIN GRANT',
          status: 'APPROVED',
        },
      })
    }
  } else if (role !== undefined && role !== 'AGENT' && target.role === 'AGENT') {
    await prisma.agentApplication.updateMany({ where: { userId: target.id, status: 'APPROVED' }, data: { status: 'REJECTED' } })
  }

  if (agentApplication) {
    await prisma.agentApplication.updateMany({ where: { userId: target.id }, data: agentApplication })
  }

  const updated = await prisma.user.update({ where: { id: target.id }, data })
  if (settings) {
    await prisma.userSettings.upsert({
      where: { userId: target.id },
      update: settings,
      create: { userId: target.id, ...settings },
    })
  }

  if (body.status === 'SUSPENDED' && target.status !== 'SUSPENDED') {
    await prisma.notification.create({
      data: {
        userId: updated.id,
        type: 'ERROR',
        title: 'Account suspended',
        message: 'Your account has been suspended. Contact support for assistance.',
      },
    })
    sendToUser(updated.id, 'account', { status: 'SUSPENDED' })
    disconnectUser(updated.id)
  } else if (body.status === 'ACTIVE' && target.status !== 'ACTIVE') {
    await prisma.notification.create({
      data: {
        userId: updated.id,
        type: 'INFO',
        title: 'Account reactivated',
        message: 'Your account has been reactivated. You can log in again.',
      },
    })
    sendToUser(updated.id, 'account', { status: 'ACTIVE' })
  }

  if (roleChanged) {
    await prisma.notification.create({
      data: {
        userId: updated.id,
        type: 'INFO',
        title: `Account role updated to ${role}`,
        message: role === 'AGENT'
          ? 'Congratulations! Your account has been upgraded to a company agent.'
          : 'Your account role was updated by our team.',
      },
    })
    sendToUser(updated.id, 'agent', { status: role === 'AGENT' ? 'APPROVED' : 'REJECTED' })
  }

  if (data.balance !== undefined && Number(data.balance) !== Number(target.balance)) {
    await prisma.notification.create({
      data: {
        userId: updated.id,
        type: 'INFO',
        title: 'Balance updated',
        message: `Your account balance was adjusted to $${Number(data.balance)}.`,
      },
    })
  }

  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.user.update', meta: { target: updated.id, body } })
  return ok(c, sanitizeUser(updated))
})

admin.delete('/users/:id', async (c) => {
  const actor = c.get('user')
  const target = await prisma.user.findUnique({ where: { id: c.req.param('id') } })
  if (!target) throw new ApiError(404, 'User not found')
  if (target.id === actor.id) throw new ApiError(400, 'You cannot delete your own account')
  if (target.role === 'ADMIN') throw new ApiError(400, 'Admin accounts cannot be deleted')
  await prisma.user.delete({ where: { id: target.id } })
  disconnectUser(target.id)
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.user.delete', meta: { target: target.id, email: target.email } })
  return ok(c, { deleted: true })
})

const resetPasswordSchema = z.object({ newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72) })

admin.post('/users/:id/password', validateBody(resetPasswordSchema), async (c) => {
  const actor = c.get('user')
  const { newPassword } = c.get('validated') as z.infer<typeof resetPasswordSchema>
  const target = await prisma.user.findUnique({ where: { id: c.req.param('id') } })
  if (!target) throw new ApiError(404, 'User not found')
  if (target.id === actor.id) throw new ApiError(400, 'You cannot reset your own password here')
  const password = await hashPassword(newPassword)
  await prisma.user.update({ where: { id: target.id }, data: { password, tokenVersion: { increment: 1 } } })
  disconnectUser(target.id)
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.user.reset_password', meta: { target: target.id } })
  return ok(c, { updated: true })
})

const notifySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  message: z.string().trim().min(1, 'Message is required').max(1000),
})

admin.post('/users/:id/notify', validateBody(notifySchema), async (c) => {
  const actor = c.get('user')
  const { title, message } = c.get('validated') as z.infer<typeof notifySchema>
  const target = await prisma.user.findUnique({ where: { id: c.req.param('id') } })
  if (!target) throw new ApiError(404, 'User not found')
  await prisma.notification.create({ data: { userId: target.id, type: 'INFO', title, message } })
  sendToUser(target.id, 'notification', { title, message, type: 'INFO' })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.user.notify', meta: { target: target.id, title } })
  return ok(c, { sent: true })
})

admin.post('/investments/:id/complete', async (c) => {
  const actor = c.get('user')
  const inv = await prisma.investment.findUnique({ where: { id: c.req.param('id') } })
  if (!inv) throw new ApiError(404, 'Investment not found')
  if (inv.status !== 'ACTIVE') throw new ApiError(400, 'Only active investments can be completed early')

  const now = new Date()
  const last = inv.lastProfitDate ?? inv.startDate
  const days = daysBetween(last, inv.endDate)
  const profit = days > 0 ? money(Number(inv.dailyProfit) * days) : 0

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: inv.userId }, data: { balance: { increment: profit + Number(inv.amount) } } })
    await tx.investment.update({ where: { id: inv.id }, data: { status: 'COMPLETED', lastProfitDate: inv.endDate } })
    if (profit > 0) {
      await tx.transaction.create({
        data: {
          userId: inv.userId,
          type: 'PROFIT',
          amount: profit,
          status: 'APPROVED',
          reference: `PRF-${inv.id}`,
          meta: { investmentId: inv.id, packageName: inv.packageName, earlyComplete: true },
        },
      })
    }
    await tx.transaction.create({
      data: {
        userId: inv.userId,
        type: 'MATURITY',
        amount: inv.amount,
        status: 'APPROVED',
        reference: `MAT-${inv.id}`,
        meta: { investmentId: inv.id, packageName: inv.packageName, earlyComplete: true },
      },
    })
  })

  await prisma.notification.create({
    data: {
      userId: inv.userId,
      type: 'SUCCESS',
      title: 'Investment completed',
      message: `Your ${inv.packageName} investment of $${Number(inv.amount)} was completed by an administrator. Principal and final profit were returned.`,
    },
  })
  sendToUser(inv.userId, 'maturity', { investmentId: inv.id, amount: Number(inv.amount), packageName: inv.packageName })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.investment.complete', meta: { investmentId: inv.id, profit } })
  return ok(c, { completed: true, profit, amount: Number(inv.amount) })
})

const adjustSchema = z.object({ amount: z.number(), note: z.string().optional() })

admin.post('/users/:id/balance', validateBody(adjustSchema), async (c) => {
  const actor = c.get('user')
  const { amount, note } = c.get('validated') as z.infer<typeof adjustSchema>
  const target = await prisma.user.findUnique({ where: { id: c.req.param('id') } })
  if (!target) throw new ApiError(404, 'User not found')

  await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { balance: { increment: amount } } }),
    prisma.transaction.create({
      data: {
        userId: target.id,
        type: 'ADJUSTMENT',
        amount: Math.abs(amount),
        status: 'APPROVED',
        meta: { note: note ?? '', direction: amount >= 0 ? 'credit' : 'debit', byAdmin: actor.email },
      },
    }),
  ])
  await prisma.notification.create({
    data: {
      userId: target.id,
      type: 'INFO',
      title: 'Balance adjusted',
      message: `Your balance was ${amount >= 0 ? 'credited' : 'debited'} by $${Math.abs(amount)}.`,
    },
  })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.user.adjust_balance', meta: { target: target.id, amount } })
  return ok(c, { adjusted: true })
})

const depositQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const investmentQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

admin.get('/deposits', validateQuery(depositQuerySchema), async (c) => {
  const q = c.get('validated') as z.infer<typeof depositQuerySchema>
  const where = { ...(q.status ? { status: q.status } : {}) }
  const [items, total] = await Promise.all([
    prisma.deposit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { user: { select: { id: true, fullname: true, email: true } } },
    }),
    prisma.deposit.count({ where }),
  ])
  return ok(c, { data: items, page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) })
})

admin.patch('/deposits/:id', validateBody(statusSchema), async (c) => {
  const actor = c.get('user')
  const { status } = c.get('validated') as z.infer<typeof statusSchema>
  const deposit = await prisma.deposit.findUnique({ where: { id: c.req.param('id') } })
  if (!deposit) throw new ApiError(404, 'Deposit not found')
  if (deposit.status !== 'PENDING') throw new ApiError(400, 'Deposit already processed')

  const updated = await prisma.deposit.update({ where: { id: deposit.id }, data: { status } })

  if (status === 'APPROVED') {
    if (!deposit.txRef) throw new ApiError(400, 'Cannot approve a deposit without a transaction ID. Ask the user to provide it.')
    const depositMeta = (deposit.meta as Record<string, unknown> | null) ?? {}
    const isPackagePurchase = depositMeta.kind === 'package-purchase'

    if (isPackagePurchase) {
      const pkg = await prisma.package.findFirst({ where: { id: String(depositMeta.packageId ?? ''), status: true } })
      if (!pkg) throw new ApiError(400, 'The package for this purchase is no longer available.')
      const paidAmount = Number(deposit.amount)
      const investAmount = Number(depositMeta.fullAmount ?? paidAmount)
      const fresh = await prisma.user.findUniqueOrThrow({ where: { id: deposit.userId } })
      const dailyProfit = money(investAmount * (Number(pkg.dailyPercentage) / 100))
      const totalReturn = money(dailyProfit * pkg.durationDays)
      const now = new Date()
      const endDate = new Date(now.getTime() + pkg.durationDays * DAY)
      const afterCredit = money(Number(fresh.balance) + paidAmount)

      const investment = await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: deposit.userId }, data: { balance: { increment: paidAmount } } })
        await tx.user.update({ where: { id: deposit.userId }, data: { balance: { decrement: paidAmount } } })
        const created = await tx.investment.create({
          data: {
            userId: deposit.userId,
            packageId: pkg.id,
            packageName: pkg.name,
            amount: investAmount,
            dailyProfit,
            totalReturn,
            startDate: now,
            endDate,
            lastProfitDate: now,
          },
        })
        await tx.transaction.create({
          data: {
            userId: deposit.userId,
            type: 'DEPOSIT',
            amount: deposit.amount,
            status: 'APPROVED',
            balanceAfter: afterCredit,
            reference: `DEP-${deposit.id}`,
            meta: { method: deposit.method, txRef: deposit.txRef, packagePurchase: true },
          },
        })
        await tx.transaction.create({
          data: {
            userId: deposit.userId,
            type: 'INVESTMENT',
            amount: deposit.amount,
            status: 'APPROVED',
            balanceAfter: money(Number(fresh.balance)),
            reference: `INV-${created.id}`,
            meta: {
              packageId: pkg.id,
              packageName: pkg.name,
              ...(depositMeta.promoCode ? { promoCode: String(depositMeta.promoCode), percent: Number(depositMeta.percent), discount: Number(depositMeta.discount), originalAmount: investAmount } : {}),
            },
          },
        })
        return created
      })

      const buyer = await prisma.user.findUniqueOrThrow({ where: { id: deposit.userId } })
      if (buyer.referredById) await payReferralCommission(buyer.referredById, deposit.userId, investAmount)

      if (depositMeta.promoCode) {
        const promo = await prisma.promoCode.findUnique({ where: { code: String(depositMeta.promoCode).toUpperCase() } })
        if (promo) {
          await prisma.promoUsage.upsert({
            where: { promoId_userId: { promoId: promo.id, userId: deposit.userId } },
            update: {},
            create: { promoId: promo.id, userId: deposit.userId },
          })
        }
      }

      await prisma.notification.create({
        data: {
          userId: deposit.userId,
          type: 'SUCCESS',
          title: 'Investment activated',
          message: `Your $${investAmount} investment in ${pkg.name} is now active. Daily profit: $${dailyProfit}.`,
        },
      })
      sendToUser(deposit.userId, 'investment', { investmentId: investment.id, amount: investAmount })
    } else {
      await prisma.$transaction([
        prisma.user.update({ where: { id: deposit.userId }, data: { balance: { increment: deposit.amount } } }),
        prisma.transaction.create({
          data: {
            userId: deposit.userId,
            type: 'DEPOSIT',
            amount: deposit.amount,
            status: 'APPROVED',
            reference: `DEP-${deposit.id}`,
            meta: { method: deposit.method, txRef: deposit.txRef },
          },
        }),
      ])
      await prisma.notification.create({
        data: {
          userId: deposit.userId,
          type: 'SUCCESS',
          title: 'Deposit approved',
          message: `Your $${Number(deposit.amount)} deposit was approved and credited.`,
        },
      })
      sendToUser(deposit.userId, 'deposit', { status: 'APPROVED', amount: Number(deposit.amount) })
    }
  } else {
    await prisma.notification.create({
      data: {
        userId: deposit.userId,
        type: 'ERROR',
        title: 'Deposit rejected',
        message: `Your $${Number(deposit.amount)} deposit was rejected. Contact support.`,
      },
    })
    sendToUser(deposit.userId, 'deposit', { status: 'REJECTED' })
  }

  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.deposit.update', meta: { depositId: deposit.id, status } })
  return ok(c, updated)
})

const withdrawalQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

admin.get('/withdrawals', validateQuery(withdrawalQuerySchema), async (c) => {
  const q = c.get('validated') as z.infer<typeof withdrawalQuerySchema>
  const where = { ...(q.status ? { status: q.status } : {}) }
  const [items, total] = await Promise.all([
    prisma.withdrawal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { user: { select: { id: true, fullname: true, email: true } } },
    }),
    prisma.withdrawal.count({ where }),
  ])
  return ok(c, { data: items, page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) })
})

admin.patch('/withdrawals/:id', validateBody(statusSchema), async (c) => {
  const actor = c.get('user')
  const { status } = c.get('validated') as z.infer<typeof statusSchema>
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id: c.req.param('id') } })
  if (!withdrawal) throw new ApiError(404, 'Withdrawal not found')
  if (withdrawal.status !== 'PENDING') throw new ApiError(400, 'Withdrawal already processed')

  const updated = await prisma.withdrawal.update({
    where: { id: withdrawal.id },
    data: { status, processedAt: new Date() },
  })

  const refund = Number(withdrawal.amount) + Number(withdrawal.fee)

  if (status === 'APPROVED') {
    await prisma.transaction.updateMany({ where: { reference: `WDR-${withdrawal.id}` }, data: { status: 'APPROVED' } })
    await prisma.notification.create({
      data: {
        userId: withdrawal.userId,
        type: 'SUCCESS',
        title: 'Withdrawal approved',
        message: `Your $${Number(withdrawal.amount)} withdrawal was sent to your wallet.`,
      },
    })
    sendToUser(withdrawal.userId, 'withdrawal', { status: 'APPROVED', amount: Number(withdrawal.amount) })
  } else {
    await prisma.transaction.updateMany({ where: { reference: `WDR-${withdrawal.id}` }, data: { status: 'REJECTED' } })
    await prisma.$transaction([
      prisma.user.update({ where: { id: withdrawal.userId }, data: { balance: { increment: refund } } }),
      prisma.transaction.create({
        data: {
          userId: withdrawal.userId,
          type: 'ADJUSTMENT',
          amount: refund,
          status: 'APPROVED',
          reference: `RF-${withdrawal.id}`,
          meta: { reason: 'Withdrawal rejected - refund' },
        },
      }),
    ])
    await prisma.notification.create({
      data: {
        userId: withdrawal.userId,
        type: 'WARNING',
        title: 'Withdrawal rejected',
        message: `Your $${Number(withdrawal.amount)} withdrawal was rejected. Funds refunded.`,
      },
    })
    sendToUser(withdrawal.userId, 'withdrawal', { status: 'REJECTED' })
  }

  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.withdrawal.update', meta: { withdrawalId: withdrawal.id, status } })
  return ok(c, updated)
})

const txAdminQuerySchema = z.object({
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'PROFIT', 'MATURITY', 'REFERRAL', 'ADJUSTMENT', 'BONUS']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

admin.get('/transactions', validateQuery(txAdminQuerySchema), async (c) => {
  const q = c.get('validated') as z.infer<typeof txAdminQuerySchema>
  const where = { ...(q.type ? { type: q.type } : {}) }
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { user: { select: { id: true, fullname: true, email: true } } },
    }),
    prisma.transaction.count({ where }),
  ])
  return ok(c, { data: items, page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) })
})

admin.delete('/transactions/:id', async (c) => {
  const actor = c.get('user')
  const tx = await prisma.transaction.findUnique({ where: { id: c.req.param('id') } })
  if (!tx) throw new ApiError(404, 'Transaction not found')
  await prisma.transaction.delete({ where: { id: tx.id } })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.transaction.delete', meta: { target: tx.id, userId: tx.userId, type: tx.type, amount: Number(tx.amount) } })
  return ok(c, { deleted: true })
})

const packageSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(500).optional(),
  icon: z.string().max(30).optional(),
  investmentAmount: z.number().positive(),
  dailyPercentage: z.number().positive(),
  durationDays: z.number().int().positive(),
  status: z.boolean().optional(),
})

admin.get('/packages', async (c) => {
  const list = await prisma.package.findMany({ orderBy: { investmentAmount: 'asc' } })
  return ok(c, list)
})

admin.post('/packages', validateBody(packageSchema), async (c) => {
  const actor = c.get('user')
  const body = c.get('validated') as z.infer<typeof packageSchema>
  const totalReturn = money(((body.investmentAmount * body.dailyPercentage) / 100) * body.durationDays)
  const pkg = await prisma.package.create({ data: { ...body, totalReturn, status: body.status ?? true } })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.package.create', meta: { id: pkg.id, name: pkg.name } })
  return ok(c, pkg)
})

admin.put('/packages/:id', validateBody(packageSchema.partial()), async (c) => {
  const actor = c.get('user')
  const body = c.get('validated') as z.infer<typeof packageSchema>
  const existing = await prisma.package.findUnique({ where: { id: c.req.param('id') } })
  if (!existing) throw new ApiError(404, 'Package not found')
  const amount = body.investmentAmount ?? Number(existing.investmentAmount)
  const pct = body.dailyPercentage ?? Number(existing.dailyPercentage)
  const days = body.durationDays ?? existing.durationDays
  const totalReturn = money(((amount * pct) / 100) * days)
  const pkg = await prisma.package.update({ where: { id: existing.id }, data: { ...body, totalReturn } })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.package.update', meta: { id: pkg.id, name: pkg.name } })
  return ok(c, pkg)
})

admin.delete('/packages/:id', async (c) => {
  const actor = c.get('user')
  const id = c.req.param('id')
  const count = await prisma.investment.count({ where: { packageId: id } })
  if (count > 0) {
    await prisma.package.update({ where: { id }, data: { status: false } })
    await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.package.deactivate', meta: { id } })
    return ok(c, { deleted: false, deactivated: true })
  }
  await prisma.package.delete({ where: { id } })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.package.delete', meta: { id } })
  return ok(c, { deleted: true })
})

admin.get('/investments', validateQuery(investmentQuerySchema), async (c) => {
  const q = c.get('validated') as z.infer<typeof investmentQuerySchema>
  const where = { ...(q.status ? { status: q.status } : {}) }
  const [items, total] = await Promise.all([
    prisma.investment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { user: { select: { id: true, fullname: true, email: true } } },
    }),
    prisma.investment.count({ where }),
  ])
  const refs = items.map((i) => `INV-${i.id}`)
  const invTxs = refs.length
    ? await prisma.transaction.findMany({ where: { reference: { in: refs } } })
    : []
  const balancePaid = new Set(invTxs.filter((t) => (t.meta as { paidFromBalance?: boolean })?.paidFromBalance).map((t) => t.reference))
  const data = items.map((i) => ({
    ...i,
    paidFromBalance: balancePaid.has(`INV-${i.id}`),
  }))
  return ok(c, { data, page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) })
})

admin.get('/referrals', async (c) => {
  const [payments, referredCount] = await Promise.all([
    prisma.transaction.findMany({
      where: { type: 'REFERRAL' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, fullname: true, email: true } } },
    }),
    prisma.user.count({ where: { referredById: { not: null } } }),
  ])
  return ok(c, {
    total: money(payments.reduce((sum, t) => sum + Number(t.amount), 0)),
    count: referredCount,
    payments,
  })
})

admin.get('/kyc', async (c) => {
  const list = await prisma.kyc.findMany({
    orderBy: { submittedAt: 'desc' },
    include: { user: { select: { id: true, fullname: true, email: true } } },
  })
  return ok(c, list)
})

const kycDecisionSchema = z.object({ status: z.enum(['APPROVED', 'REJECTED']), note: z.string().optional() })

admin.patch('/kyc/:id', validateBody(kycDecisionSchema), async (c) => {
  const actor = c.get('user')
  const { status, note } = c.get('validated') as z.infer<typeof kycDecisionSchema>
  const record = await prisma.kyc.update({
    where: { id: c.req.param('id') },
    data: { status, adminNote: note, reviewedAt: new Date() },
  })
  await prisma.notification.create({
    data: {
      userId: record.userId,
      type: status === 'APPROVED' ? 'SUCCESS' : 'ERROR',
      title: `KYC ${status === 'APPROVED' ? 'approved' : 'rejected'}`,
      message: note ?? `Your identity verification was ${status === 'APPROVED' ? 'approved' : 'rejected'}.`,
    },
  })
  sendToUser(record.userId, 'kyc', { status })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.kyc.update', meta: { id: record.id, status } })
  return ok(c, record)
})

admin.get('/agents', async (c) => {
  const list = await prisma.agentApplication.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, fullname: true, email: true, role: true, balance: true } } },
  })
  return ok(c, list)
})

const agentDecisionSchema = z.object({ note: z.string().optional() })

admin.post('/agents/:id/approve', validateBody(agentDecisionSchema), async (c) => {
  const actor = c.get('user')
  const { note } = c.get('validated') as z.infer<typeof agentDecisionSchema>
  const application = await prisma.agentApplication.findUnique({ where: { id: c.req.param('id') } })
  if (!application) throw new ApiError(404, 'Application not found')
  if (application.status !== 'PENDING') throw new ApiError(400, 'Application is not pending')

  await prisma.$transaction([
    prisma.user.update({ where: { id: application.userId }, data: { role: 'AGENT' } }),
    prisma.agentApplication.update({
      where: { id: application.id },
      data: { status: 'APPROVED', reviewedBy: actor.id, reviewedAt: new Date() },
    }),
    prisma.notification.create({
      data: {
        userId: application.userId,
        type: 'SUCCESS',
        title: 'Agent application approved',
        message: note ?? 'Congratulations! You are now an official company agent.',
      },
    }),
  ])
  sendToUser(application.userId, 'notification', { title: 'Agent application approved', message: note ?? 'Congratulations! You are now an official company agent.', type: 'SUCCESS' })
  sendToUser(application.userId, 'agent', { status: 'APPROVED' })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.agent.approve', meta: { applicationId: application.id, target: application.userId } })
  return ok(c, { approved: true })
})

admin.post('/agents/:id/reject', validateBody(agentDecisionSchema), async (c) => {
  const actor = c.get('user')
  const { note } = c.get('validated') as z.infer<typeof agentDecisionSchema>
  const application = await prisma.agentApplication.findUnique({ where: { id: c.req.param('id') } })
  if (!application) throw new ApiError(404, 'Application not found')
  if (application.status !== 'PENDING') throw new ApiError(400, 'Application is not pending')

  await prisma.$transaction([
    prisma.agentApplication.update({
      where: { id: application.id },
      data: { status: 'REJECTED', reviewedBy: actor.id, reviewedAt: new Date() },
    }),
    prisma.notification.create({
      data: {
        userId: application.userId,
        type: 'ERROR',
        title: 'Agent application rejected',
        message: note ?? 'Your agent application was not approved at this time.',
      },
    }),
  ])
  sendToUser(application.userId, 'notification', { title: 'Agent application rejected', message: note ?? 'Your agent application was not approved at this time.', type: 'ERROR' })
  sendToUser(application.userId, 'agent', { status: 'REJECTED' })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.agent.reject', meta: { applicationId: application.id, target: application.userId } })
  return ok(c, { rejected: true })
})

admin.get('/logs', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = 50
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.auditLog.count(),
  ])
  return ok(c, { data: items, page, limit, total, pages: Math.ceil(total / limit) })
})

admin.get('/reports', async (c) => {
  const [deposits, withdrawals, investments, profitTx, referralTx, maturityTx, userCount] = await Promise.all([
    prisma.deposit.findMany({ where: { status: 'APPROVED' } }),
    prisma.withdrawal.findMany({ where: { status: 'APPROVED' } }),
    prisma.investment.findMany(),
    prisma.transaction.findMany({ where: { type: 'PROFIT' } }),
    prisma.transaction.findMany({ where: { type: 'REFERRAL' } }),
    prisma.transaction.findMany({ where: { type: 'MATURITY' } }),
    prisma.user.count(),
  ])
  return ok(c, {
    users: userCount,
    deposits: money(deposits.reduce((sum, d) => sum + Number(d.amount), 0)),
    withdrawals: money(withdrawals.reduce((sum, w) => sum + Number(w.amount), 0)),
    investments: money(investments.reduce((sum, i) => sum + Number(i.amount), 0)),
    profitsPaid: money(profitTx.reduce((sum, t) => sum + Number(t.amount), 0)),
    referralsPaid: money(referralTx.reduce((sum, t) => sum + Number(t.amount), 0)),
    principalReturned: money(maturityTx.reduce((sum, t) => sum + Number(t.amount), 0)),
    netRevenue: money(
      deposits.reduce((sum, d) => sum + Number(d.amount), 0) -
        withdrawals.reduce((sum, w) => sum + Number(w.amount), 0) -
        profitTx.reduce((sum, t) => sum + Number(t.amount), 0) -
        referralTx.reduce((sum, t) => sum + Number(t.amount), 0),
    ),
  })
})

admin.get('/reports/export', async (c) => {
  const tx = await prisma.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 5000, include: { user: { select: { email: true } } } })
  const rows = tx.map((t) => ({
    id: t.id,
    user: t.user?.email ?? '',
    type: t.type,
    amount: Number(t.amount),
    status: t.status,
    balanceAfter: t.balanceAfter ? Number(t.balanceAfter) : '',
    reference: t.reference ?? '',
    createdAt: t.createdAt,
  }))
  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header('Content-Disposition', 'attachment; filename="luna-report.csv"')
  return c.body(toCsv(rows))
})

const announcementSchema = z.object({ title: z.string().min(2).max(120), message: z.string().min(2).max(2000) })

admin.post('/announcements', validateBody(announcementSchema), async (c) => {
  const actor = c.get('user')
  const body = c.get('validated') as z.infer<typeof announcementSchema>
  const announcement = await prisma.announcement.create({ data: body })
  const users = await prisma.user.findMany({ select: { id: true } })
  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type: 'INFO', title: body.title, message: body.message })),
  })
  for (const u of users) sendToUser(u.id, 'announcement', body)
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.announcement.create', meta: { id: announcement.id } })
  return ok(c, announcement)
})

admin.get('/announcements', async (c) => {
  const list = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } })
  return ok(c, list)
})

admin.get('/settings', async (c) => ok(c, await getSettings()))

const settingsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))

admin.put('/settings', validateBody(settingsSchema), async (c) => {
  const actor = c.get('user')
  const body = c.get('validated') as Record<string, string | number | boolean>
  await saveSettings(body)
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.settings.update', meta: { keys: Object.keys(body) } })
  return ok(c, { saved: true })
})

admin.post('/engine/run', async (c) => {
  const actor = c.get('user')
  const settled = await runEarningsEngine()
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.engine.run', meta: { settled } })
  return ok(c, { settled })
})

admin.get('/support', async (c) => {
  const list = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } })
  return ok(c, list)
})

admin.patch('/support/:id', validateBody(z.object({ status: z.enum(['OPEN', 'RESOLVED']) })), async (c) => {
  const actor = c.get('user')
  const { status } = c.get('validated') as { status: 'OPEN' | 'RESOLVED' }
  const updated = await prisma.contactMessage.update({ where: { id: c.req.param('id') }, data: { status } })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.support.update', meta: { id: updated.id, status } })
  return ok(c, updated)
})

// ------------------------------------------------------------------ vouchers

const voucherCreateSchema = z.object({
  amount: z.number().positive(),
  count: z.number().int().min(1).max(50).default(1),
  code: z.string().trim().min(6).max(20).optional(),
  maxUses: z.number().int().min(1).max(100000).default(1),
})

function generateVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const block = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `LUNA-${block()}-${block()}`
}

admin.get('/vouchers', async (c) => {
  const list = await prisma.voucher.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      createdBy: { select: { fullname: true } },
      usedBy: { select: { fullname: true, email: true } },
    },
  })
  return ok(
    c,
    list.map((v) => ({ ...v, amount: Number(v.amount) })),
  )
})

admin.post('/vouchers', validateBody(voucherCreateSchema), async (c) => {
  const actor = c.get('user')
  const body = c.get('validated') as z.infer<typeof voucherCreateSchema>
  const amount = money(body.amount)

  const codes: string[] = []
  if (body.code) {
    const code = body.code.toUpperCase()
    const exists = await prisma.voucher.findUnique({ where: { code } })
    if (exists) throw new ApiError(409, `Voucher code ${code} already exists`)
    codes.push(code)
  } else {
    for (let i = 0; i < body.count; i++) {
      let code = generateVoucherCode()
      while (await prisma.voucher.findUnique({ where: { code } })) code = generateVoucherCode()
      codes.push(code)
    }
  }

  await prisma.voucher.createMany({
    data: codes.map((code) => ({ code, amount, maxUses: body.maxUses, createdById: actor.id })),
  })

  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.voucher.create', meta: { amount, codes } })

  const created = await prisma.voucher.findMany({ where: { code: { in: codes } } })
  return ok(c, created.map((v) => ({ ...v, amount: Number(v.amount) })))
})

// ------------------------------------------------------------------ promo codes

const promoCreateSchema = z.object({
  code: z.string().trim().min(3).max(20),
  percent: z.number().int().min(1).max(90),
  amount: z.number().positive().optional(),
  maxUses: z.number().int().min(1).max(100000).default(100),
  expiresAt: z.string().datetime().nullable().optional(),
})

admin.get('/promos', async (c) => {
  const list = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { createdBy: { select: { fullname: true } } },
  })
  return ok(c, list.map((p) => ({ ...p, expiresAt: p.expiresAt?.toISOString() ?? null })))
})

admin.post('/promos', validateBody(promoCreateSchema), async (c) => {
  const actor = c.get('user')
  const body = c.get('validated') as z.infer<typeof promoCreateSchema>
  const code = body.code.toUpperCase()
  const exists = await prisma.promoCode.findUnique({ where: { code } })
  if (exists) throw new ApiError(409, `Promo code ${code} already exists`)

  const created = await prisma.promoCode.create({
    data: {
      code,
      percent: body.percent,
      amount: money(body.amount ?? 0),
      maxUses: body.maxUses,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdById: actor.id,
    },
  })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.promo.create', meta: { code, percent: body.percent, amount: body.amount ?? 0 } })
  return ok(c, created)
})

admin.patch('/promos/:id', validateBody(z.object({ status: z.boolean() })), async (c) => {
  const actor = c.get('user')
  const { status } = c.get('validated') as { status: boolean }
  const updated = await prisma.promoCode.update({ where: { id: c.req.param('id') }, data: { status } })
  await logAudit({ userId: actor.id, actorRole: 'ADMIN', action: 'admin.promo.toggle', meta: { code: updated.code, status } })
  return ok(c, updated)
})

admin.get('/spins', async (c) => {
  const spins = await prisma.transaction.findMany({
    where: { type: 'SPIN' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      amount: true,
      balanceAfter: true,
      reference: true,
      meta: true,
      createdAt: true,
      user: { select: { id: true, fullname: true, email: true } },
    },
  })
  const list = spins.map((t) => {
    const meta = (t.meta ?? {}) as { cost?: number; won?: boolean; segmentIndex?: number }
    return {
      id: t.id,
      user: t.user,
      bet: Number(meta.cost ?? 0),
      prize: Number(t.amount),
      won: meta.won === true,
      segmentIndex: meta.segmentIndex ?? 0,
      balanceAfter: Number(t.balanceAfter),
      createdAt: t.createdAt,
    }
  })
  return ok(c, list)
})

admin.get('/spins/stats', async (c) => {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const [settings, todaySpins] = await Promise.all([
    getSettings(),
    prisma.transaction.findMany({ where: { type: 'SPIN', createdAt: { gte: todayStart } }, select: { amount: true, meta: true } }),
  ])

  let bets = 0
  let wins = 0
  for (const t of todaySpins) {
    const meta = (t.meta ?? {}) as { cost?: number; won?: boolean }
    bets += Number(meta.cost ?? 0)
    if (meta.won === true) wins++
  }
  const prizes = todaySpins.reduce((sum, t) => sum + Number(t.amount), 0)

  return ok(c, {
    spinsToday: todaySpins.length,
    winnersToday: wins,
    dailyWinners: Number(settings.spinDailyWinners),
    betsToday: money(bets),
    paidToday: money(prizes),
    netToday: money(bets - prizes),
    enabled: Boolean(settings.spinWheelEnabled),
  })
})

export { admin, txTypes }
export default admin
