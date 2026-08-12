import type { MiddlewareHandler } from 'hono'
import { prisma } from '../config/prisma'
import { fail } from '../utils/http'
import { verifyToken } from '../utils/jwt'

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) return fail(c, 401, 'Authentication required')
  const payload = await verifyToken(header.slice(7))
  if (!payload) return fail(c, 401, 'Invalid or expired token')
  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) return fail(c, 401, 'Account not found')
  if (user.status === 'SUSPENDED') return fail(c, 403, 'Account suspended')
  if (payload.tokenVersion != null && payload.tokenVersion !== user.tokenVersion) return fail(c, 401, 'Session expired, please log in again')
  c.set('user', user)
  await next()
}
