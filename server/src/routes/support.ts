import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ok } from '../utils/http'
import { validateBody } from '../middleware/validate'

const support = new Hono<AppEnv>()

const faq = [
  { question: 'How do I start earning with LUNA?', answer: 'Create an account, deposit USDT into your wallet, then purchase an investment package. Daily profits are credited automatically every 24 hours.' },
  { question: 'What is the minimum deposit?', answer: 'The minimum deposit is $10 and the minimum package investment is $10.' },
  { question: 'When are daily returns paid?', answer: 'Returns accrue every full 24-hour cycle after your investment starts and are credited directly to your balance.' },
  { question: 'Can I withdraw my profits anytime?', answer: 'Yes. Request a withdrawal from your dashboard; funds are sent to your wallet address after admin approval.' },
  { question: 'How does the referral program work?', answer: 'Share your unique referral link. When a referred user purchases a package you earn a commission on their investment.' },
  { question: 'Is my capital returned?', answer: 'Yes, when an investment reaches maturity your principal is returned to your balance along with the final profit payment.' },
]

support.get('/faq', (c) => ok(c, faq))

const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  subject: z.string().min(2).max(200),
  message: z.string().min(5).max(5000),
})

support.post('/contact', validateBody(contactSchema), async (c) => {
  const body = c.get('validated') as z.infer<typeof contactSchema>
  const message = await prisma.contactMessage.create({ data: body })
  return ok(c, message)
})

export default support
