import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ApiError, ok } from '../utils/http'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { logAudit } from '../utils/audit'

const kyc = new Hono<AppEnv>()

const kycSchema = z.object({
  fullName: z.string().min(2).max(120),
  documentType: z.enum(['PASSPORT', 'ID_CARD', 'DRIVERS_LICENSE']),
  documentNumber: z.string().min(3).max(60),
  country: z.string().min(2).max(60).optional(),
  documents: z.array(z.string().url()).optional(),
})

kyc.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  const record = await prisma.kyc.findUnique({ where: { userId: user.id } })
  return ok(c, record)
})

kyc.post('/', requireAuth, validateBody(kycSchema), async (c) => {
  const user = c.get('user')
  const body = c.get('validated') as z.infer<typeof kycSchema>
  const existing = await prisma.kyc.findUnique({ where: { userId: user.id } })
  if (existing?.status === 'APPROVED') throw new ApiError(400, 'Your identity is already verified')

  const record = await prisma.kyc.upsert({
    where: { userId: user.id },
    update: { ...body, status: 'PENDING', adminNote: null, reviewedAt: null, documents: body.documents ?? [] },
    create: { userId: user.id, ...body, documents: body.documents ?? [] },
  })

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'INFO',
      title: 'KYC submitted',
      message: 'Your verification documents are under review.',
    },
  })
  await logAudit({ userId: user.id, actorRole: 'USER', action: 'kyc.submit', meta: { documentType: body.documentType, country: body.country ?? null }, ip: c.req.header('x-forwarded-for') })
  return ok(c, record)
})

export default kyc
