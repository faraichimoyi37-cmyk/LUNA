import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { sanitizeUser } from '../utils/user'
import { ApiError, money, ok } from '../utils/http'
import { buildProfitSeries, aggregateByPackage } from '../utils/stats'
import { env } from '../config/env'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { logAudit } from '../utils/audit'
import { sendToUser } from '../ws/hub'

const users = new Hono<AppEnv>()

users.get('/me', requireAuth, async (c) => {
  const user = c.get('user')
  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })
  return ok(c, { ...sanitizeUser(user), settings })
})

const updateProfileSchema = z.object({
  fullname: z.string().min(2).max(80).optional(),
  phone: z.string().min(5).max(30).nullable().optional(),
})

users.put('/me', requireAuth, validateBody(updateProfileSchema), async (c) => {
  throw new ApiError(403, 'Profile editing is disabled')
})

users.get('/dashboard', requireAuth, async (c) => {
  const user = c.get('user')
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const [activeInvestments, transactions, pendingWithdrawals, pendingDeposits, completedCount, welcomeBonus] = await Promise.all([
    prisma.investment.findMany({ where: { userId: user.id, status: 'ACTIVE' } }),
    prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.withdrawal.findMany({ where: { userId: user.id, status: 'PENDING' } }),
    prisma.deposit.findMany({ where: { userId: user.id, status: 'PENDING' } }),
    prisma.investment.count({ where: { userId: user.id, status: 'COMPLETED' } }),
    prisma.transaction.aggregate({
      where: { userId: user.id, type: 'BONUS', reference: 'WELCOME', status: 'APPROVED' },
      _sum: { amount: true },
    }),
  ])

  const earningTypes = ['PROFIT', 'MATURITY', 'REFERRAL', 'BONUS']
  const totalEarnings = transactions.filter((t) => earningTypes.includes(t.type)).reduce((sum, t) => sum + Number(t.amount), 0)
  const todayEarnings = transactions
    .filter((t) => t.type === 'PROFIT' && t.createdAt >= todayStart)
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const totalDeposits = transactions
    .filter((t) => t.type === 'DEPOSIT' && t.status === 'APPROVED')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const totalWithdrawals = transactions
    .filter((t) => t.type === 'WITHDRAWAL' && t.status === 'APPROVED')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const activeAmount = activeInvestments.reduce((sum, i) => sum + Number(i.amount), 0)
  const expectedDaily = activeInvestments.reduce((sum, i) => sum + Number(i.dailyProfit), 0)
  const welcomeBonusAmount = Number(welcomeBonus._sum.amount ?? 0)
  const profitSeries = buildProfitSeries(transactions, 14)

  return ok(c, {
    balance: Number(user.balance),
    earnings: { total: money(totalEarnings), today: money(todayEarnings) },
    activeInvestments: {
      count: activeInvestments.length,
      amount: money(activeAmount + welcomeBonusAmount),
      expectedDaily: money(expectedDaily),
    },
    completedInvestments: { count: completedCount },
    pendingWithdrawals: {
      count: pendingWithdrawals.length,
      amount: money(pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0)),
    },
    pendingDeposits: {
      count: pendingDeposits.length,
      amount: money(pendingDeposits.reduce((sum, d) => sum + Number(d.amount), 0)),
    },
    totals: { deposits: money(totalDeposits), withdrawals: money(totalWithdrawals), earnings: money(totalEarnings) },
    profitSeries,
    portfolio: aggregateByPackage(activeInvestments),
    recentTransactions: transactions.slice(0, 8),
  })
})

users.get('/daily-profit', requireAuth, async (c) => {
  const user = c.get('user')
  const days = Math.min(60, Math.max(7, Number(c.req.query('days') ?? 14)))
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  from.setDate(from.getDate() - (days - 1))
  const tx = await prisma.transaction.findMany({
    where: { userId: user.id, type: 'PROFIT', createdAt: { gte: from } },
    orderBy: { createdAt: 'asc' },
  })
  return ok(c, buildProfitSeries(tx, days))
})

users.get('/referrals', requireAuth, async (c) => {
  const user = c.get('user')
  const [referrals, earnings] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: user.id },
      select: { id: true, fullname: true, email: true, role: true, createdAt: true, investments: { select: { amount: true } } },
    }),
    prisma.transaction.findMany({ where: { userId: user.id, type: 'REFERRAL' } }),
  ])
  const totalEarned = earnings.reduce((sum, t) => sum + Number(t.amount), 0)
  return ok(c, {
    code: user.referralCode,
    link: `${env.APP_URL}/register?ref=${user.referralCode}`,
    count: referrals.length,
    totalEarned: money(totalEarned),
    referrals: referrals.map((r) => ({
      ...r,
      totalInvested: money(r.investments.reduce((sum, i) => sum + Number(i.amount), 0)),
    })),
  })
})

users.get('/leaderboard', async (c) => {
  const rows = await prisma.investment.groupBy({
    by: ['userId'],
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 20,
  })
  const ids = rows.map((r) => r.userId)
  const found = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullname: true } })
    : []
  const nameMap = new Map(found.map((u) => [u.id, u.fullname]))
  return ok(
    c,
    rows.map((r, idx) => ({
      rank: idx + 1,
      name: nameMap.get(r.userId) ?? 'Investor',
      amount: money(r._sum.amount ?? 0),
    })),
  )
})

const userSettingsSchema = z.object({
  language: z.string().min(2).max(8).optional(),
  notificationsOn: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
})

const redeemSchema = z.object({ code: z.string().trim().min(4).max(20) })

users.post('/vouchers/redeem', requireAuth, validateBody(redeemSchema), async (c) => {
  const user = c.get('user')
  const { code } = c.get('validated') as { code: string }
  const normalized = code.toUpperCase()

  const voucher = await prisma.voucher.findUnique({ where: { code: normalized } })
  if (!voucher) throw new ApiError(404, 'Invalid gift code')
  if (voucher.status === 'USED') throw new ApiError(400, 'This gift code has already reached its usage limit')
  if (voucher.usedCount >= voucher.maxUses) throw new ApiError(400, 'This gift code has already reached its usage limit')

  const amount = money(Number(voucher.amount))
  const newCount = voucher.usedCount + 1
  const nextStatus = newCount >= voucher.maxUses ? 'USED' : 'ACTIVE'
  const result = await prisma.$transaction(async (tx) => {
    await tx.voucher.update({
      where: { id: voucher.id },
      data: { usedCount: { increment: 1 }, status: nextStatus, usedById: user.id, usedAt: new Date() },
    })
    await tx.user.update({ where: { id: user.id }, data: { balance: { increment: amount } } })
    return tx.transaction.create({
      data: {
        userId: user.id,
        type: 'BONUS',
        amount,
        status: 'APPROVED',
        balanceAfter: money(Number(user.balance) + amount),
        reference: `GIFT:${normalized}#${newCount}`,
        meta: { reason: 'Gift code redemption', voucherId: voucher.id },
      },
    })
  })

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'SUCCESS',
      title: 'Gift code redeemed',
      message: `You redeemed gift code ${normalized} for $${amount}.`,
    },
  })
  sendToUser(user.id, 'notification', { title: 'Gift code redeemed', message: `You redeemed gift code ${normalized} for $${amount}.`, type: 'SUCCESS' })
  await logAudit({ userId: user.id, actorRole: 'USER', action: 'voucher.redeem', meta: { code: normalized, amount } })

  return ok(c, { redeemed: true, amount, balance: money(Number(user.balance) + amount) })
})

users.post('/promos/redeem', requireAuth, validateBody(redeemSchema), async (c) => {
  const user = c.get('user')
  const { code } = c.get('validated') as { code: string }
  const normalized = code.toUpperCase()

  const promo = await prisma.promoCode.findUnique({ where: { code: normalized } })
  if (!promo) throw new ApiError(404, 'Invalid promo code')
  if (!promo.status) throw new ApiError(400, 'This promo code is no longer active')
  if (promo.expiresAt && promo.expiresAt.getTime() <= Date.now()) throw new ApiError(400, 'This promo code has expired')
  if (promo.usedCount >= promo.maxUses) throw new ApiError(400, 'This promo code has reached its usage limit')

  const used = await prisma.promoUsage.findUnique({ where: { promoId_userId: { promoId: promo.id, userId: user.id } } })
  if (used) throw new ApiError(400, 'You have already used this promo code')

  const amount = money(Number(promo.amount))
  if (amount <= 0) throw new ApiError(400, 'This promo code does not include a balance reward')

  const newCount = promo.usedCount + 1
  const result = await prisma.$transaction(async (tx) => {
    await tx.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } })
    await tx.promoUsage.create({ data: { promoId: promo.id, userId: user.id } })
    await tx.user.update({ where: { id: user.id }, data: { balance: { increment: amount } } })
    return tx.transaction.create({
      data: {
        userId: user.id,
        type: 'BONUS',
        amount,
        status: 'APPROVED',
        balanceAfter: money(Number(user.balance) + amount),
        reference: `PROMO:${normalized}#${newCount}`,
        meta: { reason: 'Promo code redemption', promoId: promo.id, percent: promo.percent },
      },
    })
  })

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'SUCCESS',
      title: 'Promo code redeemed',
      message: `You redeemed promo code ${normalized} for $${amount}.`,
    },
  })
  sendToUser(user.id, 'notification', { title: 'Promo code redeemed', message: `You redeemed promo code ${normalized} for $${amount}.`, type: 'SUCCESS' })
  await logAudit({ userId: user.id, actorRole: 'USER', action: 'promo.redeem', meta: { code: normalized, amount } })

  return ok(c, { redeemed: true, amount, balance: money(Number(user.balance) + amount) })
})

users.get('/settings', requireAuth, async (c) => {
  const user = c.get('user')
  const settings = await prisma.userSettings.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
  return ok(c, settings)
})

users.put('/settings', requireAuth, validateBody(userSettingsSchema), async (c) => {
  const user = c.get('user')
  const body = c.get('validated') as z.infer<typeof userSettingsSchema>
  const updated = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: body,
    create: { userId: user.id, ...body },
  })
  return ok(c, updated)
})

users.post('/security/2fa', requireAuth, validateBody(z.object({ enabled: z.boolean() })), async (c) => {
  const user = c.get('user')
  const body = c.get('validated') as { enabled: boolean }
  const updated = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: { twoFactorEnabled: body.enabled },
    create: { userId: user.id, twoFactorEnabled: body.enabled },
  })
  if (!body.enabled) throw new ApiError(400, 'Two-factor authentication is not fully configured')
  return ok(c, updated)
})

export default users
