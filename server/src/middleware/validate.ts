import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'
import { fail } from '../utils/http'

export function validateBody(schema: z.ZodTypeAny): MiddlewareHandler {
  return async (c, next) => {
    const body = await c.req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) return fail(c, 400, 'Validation failed', parsed.error.flatten())
    c.set('validated', parsed.data)
    await next()
  }
}

export function validateQuery(schema: z.ZodTypeAny): MiddlewareHandler {
  return async (c, next) => {
    const parsed = schema.safeParse(c.req.query())
    if (!parsed.success) return fail(c, 400, 'Invalid query parameters', parsed.error.flatten())
    c.set('validated', parsed.data)
    await next()
  }
}
