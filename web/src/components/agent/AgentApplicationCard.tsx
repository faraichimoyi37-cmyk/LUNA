import { useState } from 'react'
import { App, Button, Form, Input, Modal, Tag } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Briefcase, CheckCircle2, Clock, XCircle, ShieldCheck, User as UserIcon } from 'lucide-react'
import { useAgentApplication, useSiteConfig, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { GlassCard } from '../ui/GlassCard'
import { useAuthStore } from '../../store/auth'
import { formatMoney } from '../../lib/format'

interface ApplyValues {
  businessRegistration: string
  applicationFeeTx: string
}

export default function AgentApplicationCard() {
  const { message } = App.useApp()
  const { data: config } = useSiteConfig()
  const { data: application } = useAgentApplication()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<ApplyValues>()

  const fee = Number(config?.agentApplicationFee ?? 25)

  const submit = async (values: ApplyValues) => {
    setSubmitting(true)
    try {
      await api.post('/agents/apply', values)
      message.success('Agent application submitted — it is now under review.')
      setOpen(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: queryKeys.agent })
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setSubmitting(false)
    }
  }

  const status = application?.status
  const statusTag =
    status === 'APPROVED' ? (
      <Tag color="green" icon={<CheckCircle2 size={13} />}>Approved</Tag>
    ) : status === 'REJECTED' ? (
      <Tag color="red" icon={<XCircle size={13} />}>Rejected</Tag>
    ) : status === 'PENDING' ? (
      <Tag color="gold" icon={<Clock size={13} />}>Under review</Tag>
    ) : null

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Briefcase size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-ink">Company Agent</h2>
            <p className="text-xs text-ink2">Partner with us and grow your income</p>
          </div>
        </div>
        {statusTag}
      </div>

      {user?.role === 'AGENT' ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-sm text-ink2">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-secondary" />
          <p>
            You are an official company agent. Your application was approved and your agent status is active.
          </p>
        </div>
      ) : status === 'PENDING' ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm text-ink2">
          <Clock size={18} className="mt-0.5 shrink-0 text-warning" />
          <p>Your application is being reviewed by our team. You will be notified once a decision is made.</p>
        </div>
      ) : status === 'REJECTED' ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-ink2">
          <XCircle size={18} className="mt-0.5 shrink-0 text-danger" />
          <p>Your previous application was rejected. You can submit a new application with corrected information.</p>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-surface2 p-4 text-sm text-ink2">
          <UserIcon size={18} className="mt-0.5 shrink-0 text-primary" />
          <p>
            Become an official company agent, earn higher commissions and build your own team. A non-refundable application fee of{' '}
            <span className="font-semibold text-ink">${formatMoney(fee)}</span> applies.
          </p>
        </div>
      )}

      {user?.role !== 'AGENT' && status !== 'PENDING' && (
        <Button
          type="primary"
          size="large"
          className="brand-gradient mt-5 w-full border-none font-semibold"
          onClick={() => setOpen(true)}
        >
          {status === 'REJECTED' ? 'Apply again' : 'Apply to be an agent'}
        </Button>
      )}

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText={submitting ? 'Submitting…' : 'Submit application'}
        confirmLoading={submitting}
        cancelText="Cancel"
        centered
        width={720}
        title="Company Agent Application"
      >
        <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
          <div className="space-y-6 pr-2">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-ink2">
              <span><span className="font-medium text-ink">{user?.fullname}</span></span>
              <span>{user?.email}</span>
              {user?.phone && <span>{user.phone}</span>}
              <span className="ml-auto text-xs">Applied using your account</span>
            </div>

            <div className="rounded-xl border border-line bg-surface2 p-4 text-sm text-ink2">
              <p className="font-semibold text-ink">How to apply</p>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>
                  Send the application fee of <span className="font-semibold text-ink">${formatMoney(fee)}</span> to the payment
                  details shown on the Deposit page.
                </li>
                <li>Enter your registered document (company or business registration).</li>
                <li>Paste your proof of payment so our team can verify your application.</li>
              </ol>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Form.Item name="businessRegistration" label="Registered document" rules={[{ required: true, min: 3, message: 'Enter your registered document' }]}>
                <Input size="large" placeholder="Registration number or document URL" />
              </Form.Item>
              <Form.Item name="applicationFeeTx" label="Proof of payment" rules={[{ required: true, min: 5, message: 'Enter your proof of payment' }]}>
                <Input size="large" placeholder="Transaction ID / payment reference" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>
    </GlassCard>
  )
}
