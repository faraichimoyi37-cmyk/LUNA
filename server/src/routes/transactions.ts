import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ok } from '../utils/http'
import { toCsv } from '../utils/csv'
import { requireAuth } from '../middleware/auth'
import { validateQuery } from '../middleware/validate'

const transactions = new Hono<AppEnv>()

const txTypes = ['DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'PROFIT', 'MATURITY', 'REFERRAL', 'ADJUSTMENT', 'BONUS'] as const

const txQuerySchema = z.object({
  type: z.enum(txTypes).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

transactions.get('/', requireAuth, validateQuery(txQuerySchema), async (c) => {
  const user = c.get('user')
  const q = c.get('validated') as z.infer<typeof txQuerySchema>
  const where = { userId: user.id, ...(q.type ? { type: q.type } : {}) }
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
    prisma.transaction.count({ where }),
  ])
  return ok(c, { data: items, page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) })
})

transactions.get('/export', requireAuth, async (c) => {
  const user = c.get('user')
  const items = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  const csv = toCsv(items)
  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header('Content-Disposition', 'attachment; filename="luna-transactions.csv"')
  return c.body(csv)
})

export default transactions
