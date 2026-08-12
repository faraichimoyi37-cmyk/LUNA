import nodemailer from 'nodemailer'
import { env } from '../config/env'

const smtpConfigured = Boolean(env.SMTP_HOST)

let transporter: nodemailer.Transporter | null = null
if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })
}

function parseFrom(from: string): { email: string; name?: string } {
  const m = from.match(/^(.*?)\s*<([^>]+)>$/)
  if (m) return { name: m[1].trim(), email: m[2] }
  return { email: from.trim() }
}

async function sendViaBird(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(`https://${env.BIRD_REGION}.platform.bird.com/v1/email/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.BIRD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: parseFrom(env.BIRD_FROM), to: [to], subject, html, text: html.replace(/<[^>]+>/g, '') }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Bird email failed (${res.status}): ${body}`)
  }
}

export interface MailResult {
  sent: boolean
  debug?: string
}

export async function sendEmail(to: string, subject: string, text: string): Promise<MailResult> {
  const html = text.replace(/\n/g, '<br/>')
  if (env.BIRD_API_KEY) {
    try {
      await sendViaBird(to, subject, html)
      console.log(`[MAIL:BIRD] to=${to} subject=${subject} sent`)
      return { sent: true }
    } catch (error) {
      console.error('[MAIL:BIRD] send failed', error)
      return { sent: false, debug: text }
    }
  }
  if (transporter) {
    try {
      await transporter.sendMail({ from: env.SMTP_FROM, to, subject, text, html })
      return { sent: true }
    } catch (error) {
      console.error('[MAIL] send failed', error)
      return { sent: false, debug: text }
    }
  }
  console.log(`[MAIL:DEV] to=${to} subject=${subject}\n${text}`)
  return { sent: false, debug: text }
}
