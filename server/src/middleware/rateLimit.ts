import type { MiddlewareHandler } from 'hono'
import { fail } from '../utils/http'

const hits = new Map<string, number[]>()

export function rateLimit(options: { windowMs?: number; max?: number } = {}): MiddlewareHandler {
  const { windowMs = 60_000, max = 300 } = options
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'local'
    const key = `${ip}:${c.req.path}`
    const now = Date.now()
    const window = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (window.length >= max) return fail(c, 429, 'Too many requests, slow down')
    window.push(now)
    hits.set(key, window)
    if (hits.size > 10_000) hits.clear()
    await next()
  }
}
