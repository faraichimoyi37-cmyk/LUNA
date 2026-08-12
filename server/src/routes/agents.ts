import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ApiError, ok } from '../utils/http'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { getSettings } from '../services/settings'
import { money } from '../utils/http'
import { logAudit } from '../utils/audit'

const agents = new Hono<AppEnv>()

const applySchema = z.object({
  businessRegistration: z.string().min(3).max(500),
  applicationFeeTx: z.string().min(5).max(200),
})

agents.get('/my', requireAuth, async (c) => {
  const user = c.get('user')
  const application = await prisma.agentApplication.findUnique({ where: { userId: user.id } })
  return ok(c, application)
})

agents.post('/apply', requireAuth, validateBody(applySchema), async (c) => {
  const user = c.get('user')
  const body = c.get('validated') as z.infer<typeof applySchema>

  if (user.role === 'AGENT') throw new ApiError(400, 'You are already a company agent')
  if (user.role === 'ADMIN') throw new ApiError(403, 'Admins cannot apply as agents')

  const existing = await prisma.agentApplication.findUnique({ where: { userId: user.id } })
  if (existing?.status === 'APPROVED') throw new ApiError(400, 'Your agent application has already been approved')
  if (existing?.status === 'PENDING') throw new ApiError(409, 'You already have a pending agent application')

  const settings = await getSettings()
  const fee = money(Number(settings.agentApplicationFee ?? 25))

  if (existing?.status === 'REJECTED') {
    await prisma.agentApplication.delete({ where: { userId: user.id } })
  }

  const application = await prisma.agentApplication.create({
    data: {
      userId: user.id,
      fullName: user.fullname,
      email: user.email,
      phone: user.phone ?? '',
      address: '',
      idType: 'NATIONAL_ID',
      idNumber: '',
      education: 'OTHER',
      referenceOneName: '',
      referenceOneContact: '',
      referenceTwoName: '',
      referenceTwoContact: '',
      tin: '',
      criminalRecordOk: false,
      hasDevice: false,
      hasInternet: false,
      banking: '',
      ...body,
      applicationFeeAmount: fee,
    },
  })

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'INFO',
      title: 'Agent application submitted',
      message: `Your company agent application is under review. Application fee: $${fee}.`,
    },
  })
  await logAudit({ userId: user.id, actorRole: 'USER', action: 'agent.apply', meta: { applicationId: application.id } })

  return ok(c, application)
})

export default agents
