import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import type { Context, ErrorHandler } from 'hono'
import { ApiError, fail } from '../utils/http'

export const errorHandler: ErrorHandler = (err, c: Context) => {
  if (err instanceof ApiError) return fail(c, err.status, err.message, err.details)
  if (err instanceof ZodError) return fail(c, 400, 'Validation failed', err.flatten())
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return fail(c, 409, 'A record with this value already exists', err.meta)
    if (err.code === 'P2025') return fail(c, 404, 'Record not found')
    if (err.code === 'P2003') return fail(c, 400, 'Related record does not exist')
  }
  if (err instanceof SyntaxError) return fail(c, 400, 'Invalid request payload')
  console.error('[error]', err)
  return fail(c, 500, 'Internal server error')
}
