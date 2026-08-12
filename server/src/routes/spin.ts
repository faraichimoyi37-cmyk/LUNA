import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ApiError, money, ok } from '../utils/http'
import { getSettings } from '../services/settings'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { logAudit } from '../utils/audit'

const spin = new Hono<AppEnv>()

const SEGMENTS = 8
const MIN_BET = 2

function buildMultipliers(minPrize: number, maxPrize: number, cost: number): number[] {
  const minMult = minPrize / cost
  const maxMult = maxPrize / cost
  const segs: number[] = []
  for (let i = 0; i < SEGMENTS; i++) {
    const value = minMult + ((maxMult - minMult) * i) / (SEGMENTS - 1)
    segs.push(Math.round(value * 100) / 100)
  }
  return segs
}

function pickSegment(segments: number[]): number {
  const weights = segments.map((_, i) => segments.length - i)
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  for (let i = 0; i < segments.length; i++) {
    roll -= weights[i]
    if (roll < 0) return i
  }
  return segments.length - 1
}

function minIndex(segments: number[]): number {
  let idx = 0
  for (let i = 1; i < segments.length; i++) if (segments[i] < segments[idx]) idx = i
  return idx
}

async function countWinnersToday(): Promise<number> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const spins = await prisma.transaction.findMany({
    where: { type: 'SPIN', createdAt: { gte: todayStart } },
    select: { meta: true },
  })
  return spins.filter((t) => (t.meta as { won?: boolean } | null)?.won === true).length
}

spin.get('/', requireAuth, async (c) => {
  const settings = await getSettings()
  const cost = Number(settings.spinCost)
  const multipliers = buildMultipliers(Number(settings.spinPrizeMin), Number(settings.spinPrizeMax), cost)
  return ok(c, {
    enabled: Boolean(settings.spinWheelEnabled),
    cost,
    minBet: Math.max(MIN_BET, cost),
    multipliers,
    dailyWinners: Number(settings.spinDailyWinners),
    winnersToday: await countWinnersToday(),
  })
})

const spinSchema = z.object({ amount: z.number().positive().optional() })

spin.post('/spin', requireAuth, validateBody(spinSchema), async (c) => {
  const user = c.get('user')
  const body = c.get('validated') as z.infer<typeof spinSchema>
  const settings = await getSettings()
  if (!settings.spinWheelEnabled) throw new ApiError(400, 'The spin wheel is currently unavailable')

  const cost = Number(settings.spinCost)
  const minBet = Math.max(MIN_BET, cost)
  const bet = body.amount ? money(body.amount) : money(cost)

  if (bet < minBet) throw new ApiError(400, `The minimum spin amount is $${minBet}`)
  if (Number(user.balance) < bet) throw new ApiError(400, 'Insufficient balance to spin the wheel')

  const multipliers = buildMultipliers(Number(settings.spinPrizeMin), Number(settings.spinPrizeMax), cost)
  const dailyWinners = Number(settings.spinDailyWinners)
  const winnersToday = await countWinnersToday()
  const quotaMet = winnersToday >= dailyWinners

  const segmentIndex = quotaMet ? minIndex(multipliers) : pickSegment(multipliers)
  const prize = money(bet * multipliers[segmentIndex])
  const won = !quotaMet && prize >= bet
  const net = money(prize - bet)
  const balanceAfter = money(Number(user.balance) + net)

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { balance: { increment: net } } }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'SPIN',
        amount: prize,
        status: 'APPROVED',
        balanceAfter,
        reference: `SPIN-${crypto.randomUUID().slice(0, 8)}`,
        meta: { cost: bet, prize, segmentIndex, won },
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SUCCESS',
        title: 'Spin wheel result',
        message: quotaMet
          ? `Today's winner quota is already reached. You received $${prize} this spin.`
          : `You spun the wheel and won $${prize}!`,
      },
    }),
  ])

  await logAudit({ userId: user.id, actorRole: 'USER', action: 'spin.spin', meta: { cost: bet, prize, segmentIndex, won } })

  return ok(c, {
    prize,
    cost: bet,
    balanceAfter,
    segmentIndex,
    multipliers,
    won,
    winnersToday: quotaMet ? winnersToday : winnersToday + (won ? 1 : 0),
    dailyWinners,
    minBet,
  })
})

export default spin
