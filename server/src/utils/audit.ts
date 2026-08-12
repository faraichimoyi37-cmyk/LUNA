import { prisma } from '../config/prisma'

export async function logAudit(entry: {
  userId?: string
  actorRole?: string
  action: string
  ip?: string
  meta?: unknown
}) {
  try {
    await prisma.auditLog.create({ data: { ...entry, meta: entry.meta ?? undefined } })
  } catch {
    // audit failures must never break the request flow
  }
}
