import type { MiddlewareHandler } from 'hono'
import { env } from '../config/env'
import { fail } from '../utils/http'

const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim())

function originAllowed(origin: string): boolean {
  return allowedOrigins.some((allowed) => {
    if (allowed === '*') return true
    return origin === allowed
  })
}

export const csrfProtection: MiddlewareHandler = async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return next()
  const origin = c.req.header('Origin')
  const referer = c.req.header('Referer')
  if (!origin && !referer) return next()
  const source = origin ?? referer
  if (source && !originAllowed(source.replace(/\/$/, ''))) return fail(c, 403, 'Cross-origin request blocked')
  await next()
}
