import type { MiddlewareHandler } from 'hono'
import type { User } from '@prisma/client'
import { fail } from '../utils/http'

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const user = c.get('user') as User
  if (user.role !== 'ADMIN') return fail(c, 403, 'Admin access required')
  await next()
}
