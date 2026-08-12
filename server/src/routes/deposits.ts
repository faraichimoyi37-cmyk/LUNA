import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ApiError, money, ok } from '../utils/http'
import { getSettings } from '../services/settings'
import { verifyPayment } from '../services/depositService'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { logAudit } from '../utils/audit'

const deposits = new Hono<AppEnv>()

const depositSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['USDT_TRC20', 'USDT_ERC20', 'USDT_BEP20']),
  txRef: z.string().trim().min(1, 'Provide the transaction ID or payment reference').max(100),
})

deposits.post('/', requireAuth, validateBody(depositSchema), async (c) => {
  const user = c.get('user')
  const body = c.get('validated') as z.infer<typeof depositSchema>
  const settings = await getSettings()

  if (!settings.depositsEnabled) throw new ApiError(403, 'Deposits are temporarily disabled')

  const verification = await verifyPayment({ amount: body.amount, method: body.method, txRef: body.txRef })

  const deposit = await prisma.deposit.create({
    data: { userId: user.id, amount: money(body.amount), method: body.method, txRef: body.txRef, meta: verification as never },
  })

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'INFO',
      title: 'Deposit submitted',
      message: `Your $${Number(deposit.amount)} deposit is pending approval.`,
    },
  })
  await logAudit({ userId: user.id, actorRole: 'USER', action: 'deposit.create', meta: { amount: Number(deposit.amount), method: body.method, verification: verification.source } })

  return ok(c, deposit, {
    depositAddress:
      body.method === 'USDT_TRC20' ? settings.depositWalletTrc20 : body.method === 'USDT_BEP20' ? settings.depositWalletBep20 : settings.depositWalletErc20,
    verification: { checked: true, source: verification.source },
  })
})

deposits.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  const list = await prisma.deposit.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  return ok(c, list)
})

export default deposits
