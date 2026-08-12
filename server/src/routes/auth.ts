import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { hashPassword, verifyPassword } from '../utils/password'
import { signToken } from '../utils/jwt'
import { generateReferralCode } from '../utils/referral'
import { sanitizeUser } from '../utils/user'
import { ApiError, ok } from '../utils/http'
import { getSettings } from '../services/settings'
import { logAudit } from '../utils/audit'
import { validateBody } from '../middleware/validate'
import { requireAuth } from '../middleware/auth'
import { sendToUser } from '../ws/hub'

const auth = new Hono<AppEnv>()

const registerSchema = z.object({
  fullname: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().regex(/^\+[1-9]\d{5,14}$/, 'Enter a valid phone number with country code, e.g. +234 801 234 5678'),
  password: z.string().min(8).max(72),
  referralCode: z.string().max(20).optional(),
})

auth.post('/register', validateBody(registerSchema), async (c) => {
  const body = c.get('validated') as z.infer<typeof registerSchema>
  const email = body.email.toLowerCase()
  const gateSettings = await getSettings()
  if (!gateSettings.registrationsEnabled) throw new ApiError(403, 'Registrations are currently disabled')
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new ApiError(409, 'An account with this email already exists')

  let referredBy = null
  if (body.referralCode) {
    referredBy = await prisma.user.findUnique({ where: { referralCode: body.referralCode.toUpperCase() } })
  }

  const password = await hashPassword(body.password)
  let referralCode = generateReferralCode(body.fullname)
  while (await prisma.user.findUnique({ where: { referralCode } })) referralCode = generateReferralCode(body.fullname)

  const user = await prisma.$transaction(async (tx) =>
    tx.user.create({
      data: {
        fullname: body.fullname,
        email,
        phone: body.phone,
        password,
        referralCode,
        referredById: referredBy?.id ?? null,
        settings: { create: {} },
      },
    }),
  )

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'INFO',
      title: 'Welcome to LUNA',
      message: 'Your account is ready. Start earning daily returns today.',
    },
  })
  sendToUser(user.id, 'notification', { title: 'Welcome to LUNA', message: 'Your account is ready. Start earning daily returns today.', type: 'INFO' })

  if (referredBy) {
    await prisma.notification.create({
      data: {
        userId: referredBy.id,
        type: 'SUCCESS',
        title: 'New referral',
        message: `${body.fullname} joined using your referral link.`,
      },
    })
    sendToUser(referredBy.id, 'notification', {
      title: 'New referral',
      message: `${body.fullname} joined using your referral link.`,
      type: 'SUCCESS',
    })
  }

  await logAudit({ userId: user.id, actorRole: 'USER', action: 'auth.register', ip: c.req.header('x-forwarded-for') })

  const token = await signToken({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion })
  const freshUser = await prisma.user.findUnique({ where: { id: user.id } })
  return ok(c, { token, user: sanitizeUser(freshUser ?? user) })
})

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

auth.post('/login', validateBody(loginSchema), async (c) => {
  const body = c.get('validated') as z.infer<typeof loginSchema>
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })
  if (!user) throw new ApiError(401, 'Invalid email or password')
  const valid = await verifyPassword(body.password, user.password)
  if (!valid) throw new ApiError(401, 'Invalid email or password')
  if (user.status === 'SUSPENDED') throw new ApiError(403, 'Your account has been suspended')

  await logAudit({ userId: user.id, actorRole: user.role, action: 'auth.login', ip: c.req.header('x-forwarded-for') })

  const token = await signToken({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion })
  return ok(c, { token, user: sanitizeUser(user) })
})

auth.get('/me', requireAuth, (c) => {
  const user = c.get('user')
  return ok(c, sanitizeUser(user))
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
})

auth.post('/change-password', requireAuth, validateBody(changePasswordSchema), async (c) => {
  const user = c.get('user')
  const body = c.get('validated') as z.infer<typeof changePasswordSchema>
  const valid = await verifyPassword(body.currentPassword, user.password)
  if (!valid) throw new ApiError(400, 'Current password is incorrect')
  const password = await hashPassword(body.newPassword)
  await prisma.user.update({ where: { id: user.id }, data: { password } })
  await logAudit({ userId: user.id, actorRole: user.role, action: 'auth.change_password', ip: c.req.header('x-forwarded-for') })
  return ok(c, { updated: true })
})

export default auth
