import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ApiError, money, ok } from '../utils/http'
import { runEarningsEngine, payReferralCommission, DAY } from '../services/engine'
import { verifyPayment } from '../services/depositService'
import { getSettings } from '../services/settings'
import { validatePromoCode, consumePromoCode } from '../services/promo'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { logAudit } from '../utils/audit'
import { sendToUser } from '../ws/hub'

const investments = new Hono<AppEnv>()

const buySchema = z.object({
  packageId: z.string().min(1),
  useBalance: z.boolean().optional(),
  method: z.enum(['USDT_TRC20', 'USDT_ERC20', 'USDT_BEP20']).optional(),
  txRef: z.string().trim().min(1, 'Provide the transaction ID or payment reference').max(100).optional(),
  promoCode: z.string().trim().min(2).max(20).optional(),
})

async function applyPromo(promoCode: string | undefined, amount: number, userId?: string): Promise<{ discount: number; promo?: Awaited<ReturnType<typeof validatePromoCode>> }> {
  if (!promoCode) return { discount: 0 }
  const promo = await validatePromoCode(promoCode, userId)
  const discount = money(amount * (promo.percent / 100))
  return { discount, promo }
}

investments.post('/buy', requireAuth, validateBody(buySchema), async (c) => {
  const user = c.get('user')
  const body = c.get('validated') as z.infer<typeof buySchema>
  const { packageId, useBalance } = body

  await runEarningsEngine()

  const pkg = await prisma.package.findFirst({ where: { id: packageId, status: true } })
  if (!pkg) throw new ApiError(404, 'Package not found')

  const amount = Number(pkg.investmentAmount)
  const dailyProfit = money(amount * (Number(pkg.dailyPercentage) / 100))
  const totalReturn = money(dailyProfit * pkg.durationDays)
  const now = new Date()
  const endDate = new Date(now.getTime() + pkg.durationDays * DAY)

  if (useBalance) {
    const { discount, promo } = await applyPromo(body.promoCode, amount, user.id)
    const payAmount = money(amount - discount)
    if (Number(user.balance) < payAmount) throw new ApiError(400, 'Insufficient balance for this package')
    const after = money(Number(user.balance) - payAmount)

    const investment = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { balance: { decrement: payAmount } } })
      if (promo) await tx.promoUsage.create({ data: { promoId: promo.promoId, userId: user.id } })
      const created = await tx.investment.create({
        data: {
          userId: user.id,
          packageId: pkg.id,
          packageName: pkg.name,
          amount,
          dailyProfit,
          totalReturn,
          startDate: now,
          endDate,
          lastProfitDate: now,
        },
      })
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'INVESTMENT',
          amount: payAmount,
          status: 'APPROVED',
          balanceAfter: after,
          reference: `INV-${created.id}`,
          meta: promo
            ? { packageId: pkg.id, packageName: pkg.name, paidFromBalance: true, promoCode: promo.code, percent: promo.percent, discount, originalAmount: amount }
            : { packageId: pkg.id, packageName: pkg.name, paidFromBalance: true },
        },
      })
      return created
    })

    if (promo) await consumePromoCode(promo.promoId)
    if (user.referredById) await payReferralCommission(user.referredById, user.id, amount)

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SUCCESS',
        title: 'Package purchased',
        message: `Your $${amount} ${pkg.name} package has been purchased and activated. Daily profit: $${dailyProfit}.`,
      },
    })
    sendToUser(user.id, 'investment', { investmentId: investment.id, amount })
    await logAudit({ userId: user.id, actorRole: 'USER', action: 'investment.purchase', meta: { packageId: pkg.id, amount, paidFromBalance: true } })
    return ok(c, {
      investmentId: investment.id,
      activated: true,
      balanceAfter: after,
      dailyProfit,
      totalReturn,
      ...(discount > 0 ? { discount, payAmount } : {}),
    })
  }

  const { method, txRef } = body
  if (!method || !txRef) throw new ApiError(400, 'Payment method and transaction ID are required')
  const { discount, promo } = await applyPromo(body.promoCode, amount, user.id)
  const payAmount = money(amount - discount)
  const verification = await verifyPayment({ amount: payAmount, method, txRef })

  const deposit = await prisma.deposit.create({
    data: {
      userId: user.id,
      amount: payAmount,
      method,
      txRef,
      meta: {
        kind: 'package-purchase',
        packageId: pkg.id,
        packageName: pkg.name,
        fullAmount: amount,
        ...(promo ? { promoCode: promo.code, percent: promo.percent, discount } : {}),
        ...verification,
      } as never,
    },
  })

  if (promo) await consumePromoCode(promo.promoId)

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'INFO',
      title: 'Package purchase submitted',
      message: `Your $${payAmount} purchase of ${pkg.name} is pending approval. Your investment will activate once the payment is approved.`,
    },
  })
  await logAudit({ userId: user.id, actorRole: 'USER', action: 'investment.purchase', meta: { packageId: pkg.id, amount, payAmount, promoCode: promo?.code ?? null, method, verification: verification.source } })

  const settings = await getSettings()
  return ok(c, deposit, {
    depositAddress: method === 'USDT_TRC20' ? settings.depositWalletTrc20 : method === 'USDT_BEP20' ? settings.depositWalletBep20 : settings.depositWalletErc20,
    verification: { checked: true, source: verification.source },
    dailyProfit,
    totalReturn,
    ...(discount > 0 ? { discount, payAmount } : {}),
  })
})

investments.post('/promo/validate', requireAuth, validateBody(z.object({ code: z.string().trim().min(2).max(20) })), async (c) => {
  const user = c.get('user')
  const { code } = c.get('validated') as { code: string }
  const promo = await validatePromoCode(code, user.id)
  return ok(c, { valid: true, percent: promo.percent })
})

investments.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  const now = Date.now()
  const list = await prisma.investment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { package: true },
  })
  const enriched = list.map((inv) => {
    const start = inv.startDate.getTime()
    const end = inv.endDate.getTime()
    const remainingDays = inv.status === 'ACTIVE' ? Math.max(0, Math.ceil((end - now) / DAY)) : 0
    const progress = inv.status === 'ACTIVE' ? Math.min(100, Math.round(((now - start) / Math.max(1, end - start)) * 100)) : 100
    return {
      ...inv,
      remainingDays,
      progress,
      amount: Number(inv.amount),
      dailyProfit: Number(inv.dailyProfit),
      totalReturn: Number(inv.totalReturn),
    }
  })
  return ok(c, enriched)
})

export default investments
