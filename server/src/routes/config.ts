import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { getSettings } from '../services/settings'
import { ok } from '../utils/http'
import { env } from '../config/env'

const config = new Hono<AppEnv>()

const maskName = (fullname: string): string =>
  fullname
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]}${'•'.repeat(Math.max(2, part.length - 2))}${part[part.length - 1]}`)
    .join(' ')

config.get('/public', async (c) => {
  const settings = await getSettings()
  return ok(c, { ...settings, siteName: 'LUNA', appUrl: env.APP_URL })
})

config.get('/activity', async (c) => {
  const [deposits, withdrawals] = await Promise.all([
    prisma.deposit.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { fullname: true } } },
    }),
    prisma.withdrawal.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { fullname: true } } },
    }),
  ])

  const items = [
    ...deposits.map((d) => ({
      type: 'DEPOSIT' as const,
      amount: Number(d.amount),
      method: d.method,
      name: maskName(d.user.fullname),
      createdAt: d.createdAt,
    })),
    ...withdrawals.map((w) => ({
      type: 'WITHDRAWAL' as const,
      amount: Number(w.amount),
      method: w.network ?? 'USDT',
      name: maskName(w.user.fullname),
      createdAt: w.createdAt,
    })),
  ]
  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return ok(c, items.slice(0, 12))
})

export default config
