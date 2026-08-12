import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ApiError, money, ok } from '../utils/http'
import { getSettings } from '../services/settings'
import { requireAuth } from '../middleware/auth'
import { logAudit } from '../utils/audit'
import { sendToUser } from '../ws/hub'

const lucky = new Hono<AppEnv>()

const DAY = 86_400_000

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function weightedMultiplier(min: number, max: number): number {
  const opts: number[] = []
  for (let m = min; m <= max; m++) {
    const weight = max - m + 1
    for (let i = 0; i < weight; i++) opts.push(m)
  }
  return opts[Math.floor(Math.random() * opts.length)]
}

lucky.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  const settings = await getSettings()
  const openedToday = await prisma.transaction.count({
    where: { userId: user.id, type: 'LUCKY', createdAt: { gte: startOfToday() } },
  })
  return ok(c, {
    enabled: Boolean(settings.luckyBoxEnabled),
    price: Number(settings.luckyBoxPrice),
    minMultiplier: Number(settings.luckyBoxMinMultiplier),
    maxMultiplier: Number(settings.luckyBoxMaxMultiplier),
    openedToday: openedToday > 0,
    canOpen: openedToday === 0,
  })
})

lucky.post('/open', requireAuth, async (c) => {
  const user = c.get('user')
  const settings = await getSettings()
  if (!settings.luckyBoxEnabled) throw new ApiError(400, 'The lucky box is currently closed')

  const price = money(Number(settings.luckyBoxPrice))
  if (price <= 0) throw new ApiError(400, 'Lucky box price is not configured')

  const openedToday = await prisma.transaction.count({
    where: { userId: user.id, type: 'LUCKY', createdAt: { gte: startOfToday() } },
  })
  if (openedToday > 0) throw new ApiError(429, 'You already opened your lucky box today. Come back tomorrow!')

  if (Number(user.balance) < price) throw new ApiError(400, 'Insufficient balance to open the lucky box')

  const min = Math.max(1, Number(settings.luckyBoxMinMultiplier))
  const max = Math.max(min, Number(settings.luckyBoxMaxMultiplier))
  const multiplier = weightedMultiplier(min, max)
  const prize = money(price * multiplier)
  const net = money(prize - price)
  const balanceAfter = money(Number(user.balance) + net)

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { balance: { increment: net } } }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'LUCKY',
        amount: prize,
        status: 'APPROVED',
        balanceAfter,
        reference: `LUCK-${crypto.randomUUID().slice(0, 8)}`,
        meta: { multiplier, price, prize, boxPrice: price },
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SUCCESS',
        title: 'Lucky box opened!',
        message: `You opened the lucky box and won $${prize}! (${multiplier}x on your $${price})`,
      },
    }),
  ])

  sendToUser(user.id, 'lucky', { prize, multiplier })
  await logAudit({ userId: user.id, actorRole: 'USER', action: 'lucky.open', meta: { multiplier, price, prize } })

  return ok(c, { prize, multiplier, price, balanceAfter })
})

export default lucky
