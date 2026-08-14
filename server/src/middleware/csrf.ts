import type { MiddlewareHandler } from 'hono'
import { env } from '../config/env'
import { fail } from '../utils/http'

const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim())

function originAllowed(origin: string, c: Parameters<MiddlewareHandler>[0]): boolean {
  if (allowedOrigins.some((allowed) => allowed === '*' || origin === allowed)) return true
  // Same-origin requests: the browser's Origin matches the Host header the client used.
  // This keeps the site reachable on any domain it is served from (localhost, tunnels, etc.).
  const host = c.req.header('Host')
  if (!host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export const csrfProtection: MiddlewareHandler = async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return next()
  const origin = c.req.header('Origin')
  const referer = c.req.header('Referer')
  if (!origin && !referer) return next()
  const source = (origin ?? referer)!.replace(/\/$/, '')
  if (!originAllowed(source, c)) return fail(c, 403, 'Cross-origin request blocked')
  await next()
}
