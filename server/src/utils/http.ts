import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { serialize } from './serializers'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function ok(c: Context, data: unknown, meta?: Record<string, unknown>) {
  return c.json(serialize({ success: true, ...meta, data }))
}

export function fail(c: Context, status: number, message: string, details?: unknown) {
  return c.json(serialize({ success: false, message, ...(details ? { errors: details } : {}) }) as never, status as ContentfulStatusCode)
}

export const toNum = (v: unknown): number => (v == null || Number.isNaN(Number(v)) ? 0 : Number(v))

export const money = (n: number | string | null | { toNumber(): number }): number => {
  const v = typeof n === 'number' ? n : Number(n ?? 0)
  return Math.round((v + Number.EPSILON) * 100) / 100
}
