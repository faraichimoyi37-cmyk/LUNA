import { useState } from 'react'
import { App, Button, Collapse, Form, Input } from 'antd'
import { Mail, LifeBuoy, Send, MessagesSquare, MessageCircle, ExternalLink } from 'lucide-react'
import { api, errMsg } from '../../lib/api'
import { useSiteConfig } from '../../hooks/queries'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { useAuthStore } from '../../store/auth'

const faq = [
  { key: 'start', label: 'How do I start earning?', children: 'Create an account, deposit USDT, then purchase an investment package. Daily profits are credited automatically every 24 hours.' },
  { key: 'deposit', label: 'What is the minimum deposit?', children: 'The minimum deposit is $10 and the minimum package investment is $10.' },
  { key: 'returns', label: 'When are daily returns paid?', children: 'Returns accrue every full 24-hour cycle after your investment starts and are credited directly to your balance.' },
  { key: 'withdraw', label: 'Can I withdraw my profits anytime?', children: 'Yes. Request a withdrawal from your dashboard; funds are sent to your wallet address after admin approval.' },
  { key: 'referral', label: 'How does the referral program work?', children: 'Share your unique referral link. When a referred user purchases a package you earn a commission on their investment.' },
  { key: 'capital', label: 'Is my capital returned?', children: 'Yes, when an investment reaches maturity your principal is returned to your balance along with the final profit payment.' },
]

interface ContactValues {
  subject: string
  message: string
}

export default function Support() {
  const { message } = App.useApp()
  const user = useAuthStore((state) => state.user)
  const { data: config } = useSiteConfig()
  const [sending, setSending] = useState(false)

  const onFinish = async (values: ContactValues) => {
    setSending(true)
    try {
      await api.post('/support/contact', {
        name: user?.fullname ?? '',
        email: user?.email ?? '',
        subject: values.subject,
        message: values.message,
      })
      message.success('Message sent! Our team will get back to you shortly.')
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <PageHeader title="Support Center" subtitle="We're here to help" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
              <LifeBuoy size={18} className="text-accent" /> Frequently asked questions
            </h2>
            <p className="mb-4 text-xs text-ink2">Answers to the most common questions.</p>
            <Collapse accordion items={faq} />
          </GlassCard>
          <GlassCard className="p-6">
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
              <Mail size={18} className="text-primary" /> Contact email
            </h2>
            <p className="mb-4 text-xs text-ink2">Prefer email? Write to us directly.</p>
            <a href={`mailto:${config?.supportEmail}`} className="text-sm font-semibold text-primary">
              {config?.supportEmail ?? 'support@luna.com'}
            </a>
          </GlassCard>
          <div className="grid gap-6 sm:grid-cols-2">
            <GlassCard className="p-6">
              <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
                <Send size={18} className="text-primary" /> Telegram
              </h2>
              <p className="mb-4 text-xs text-ink2">Join us on Telegram for updates and support.</p>
              {config?.telegramUrl ? (
                <a href={config.telegramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Open Telegram <ExternalLink size={14} />
                </a>
              ) : (
                <span className="text-sm text-ink2">Not configured</span>
              )}
            </GlassCard>
            <GlassCard className="p-6">
              <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
                <MessageCircle size={18} className="text-secondary" /> WhatsApp
              </h2>
              <p className="mb-4 text-xs text-ink2">Chat with us on our WhatsApp channel.</p>
              {config?.whatsappUrl ? (
                <a href={config.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary">
                  Open WhatsApp <ExternalLink size={14} />
                </a>
              ) : (
                <span className="text-sm text-ink2">Not configured</span>
              )}
            </GlassCard>
          </div>
        </div>

        <GlassCard className="p-6">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
            <MessagesSquare size={18} className="text-secondary" /> Send us a message
          </h2>
          <p className="mb-5 text-xs text-ink2">We usually respond within a few hours.</p>
          <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
            <Form.Item name="subject" label="Subject" rules={[{ required: true, min: 2, message: 'Enter a subject' }]}>
              <Input size="large" placeholder="e.g. Withdrawal issue" />
            </Form.Item>
            <Form.Item name="message" label="Message" rules={[{ required: true, min: 5, message: 'Describe your issue' }]}>
              <Input.TextArea size="large" rows={7} placeholder="How can we help you?" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={sending} icon={<Send size={16} />} className="brand-gradient border-none font-semibold">
              Send message
            </Button>
          </Form>
        </GlassCard>
      </div>
    </div>
  )
}
