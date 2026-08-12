import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ApiError, money, ok } from '../utils/http'
import { runEarningsEngine } from '../services/engine'
import { getSettings } from '../services/settings'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { logAudit } from '../utils/audit'
import { validateWalletAddress } from '../utils/txverify'

const withdrawals = new Hono<AppEnv>()

const withdrawSchema = z.object({
  amount: z.number().positive(),
  walletAddress: z.string().trim().min(1).max(200),
  network: z.enum(['TRC20', 'ERC20', 'BEP20']).optional(),
})

withdrawals.post('/', requireAuth, validateBody(withdrawSchema), async (c) => {
  const user = c.get('user')
  const body = c.get('validated') as z.infer<typeof withdrawSchema>
  const settings = await getSettings()

  if (!settings.withdrawalsEnabled) throw new ApiError(403, 'Withdrawals are temporarily disabled')

  const network = body.network ?? 'TRC20'
  const addressCheck = validateWalletAddress(network, body.walletAddress)
  if (!addressCheck.valid) throw new ApiError(400, addressCheck.error ?? 'Invalid wallet address')

  if (body.amount < Number(settings.minWithdrawal)) throw new ApiError(400, `Minimum withdrawal is $${settings.minWithdrawal}`)
  if (body.amount > Number(settings.maxWithdrawal)) throw new ApiError(400, `Maximum withdrawal is $${settings.maxWithdrawal}`)

  await runEarningsEngine()

  const hasInvestment = await prisma.investment.findFirst({ where: { userId: user.id } })
  if (!hasInvestment) throw new ApiError(403, 'You must purchase an investment package before requesting a withdrawal')

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayWithdrawals = await prisma.withdrawal.count({
    where: { userId: user.id, createdAt: { gte: todayStart }, status: { not: 'REJECTED' } },
  })
  if (todayWithdrawals > 0) throw new ApiError(400, 'You can only request one withdrawal per day. Try again tomorrow.')

  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  const fee = money((body.amount * Number(settings.withdrawalFee)) / 100)
  const total = money(body.amount + fee)
  if (Number(fresh.balance) < total) throw new ApiError(400, 'Insufficient balance')

  const withdrawal = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { balance: { decrement: total } } })
    const created = await tx.withdrawal.create({
      data: { userId: user.id, amount: money(body.amount), fee, walletAddress: body.walletAddress, network: body.network },
    })
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: 'WITHDRAWAL',
        amount: total,
        status: 'PENDING',
        balanceAfter: money(Number(fresh.balance) - total),
        reference: `WDR-${created.id}`,
        meta: { walletAddress: body.walletAddress, network: body.network },
      },
    })
    return created
  })

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'INFO',
      title: 'Withdrawal submitted',
      message: `Your $${body.amount} withdrawal is pending approval.`,
    },
  })
  await logAudit({ userId: user.id, actorRole: 'USER', action: 'withdrawal.create', meta: { amount: body.amount } })

  return ok(c, withdrawal)
})

withdrawals.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  const list = await prisma.withdrawal.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  return ok(c, list)
})

export default withdrawals
