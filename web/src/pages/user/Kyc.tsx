import { useState } from 'react'
import { App, Button, Form, Input, Select, Table } from 'antd'
import { BadgeCheck, Upload, ShieldCheck, Info } from 'lucide-react'
import { useKyc, useSiteConfig } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatusTag } from '../../components/ui/StatusTag'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime } from '../../lib/format'

interface KycValues {
  fullName: string
  documentType: string
  documentNumber: string
  country?: string
  documentUrl?: string
}

export default function Kyc() {
  const { data, isLoading } = useKyc()
  const { data: config } = useSiteConfig()
  const { message } = App.useApp()
  const [submitting, setSubmitting] = useState(false)
  const [docs, setDocs] = useState<string[]>([])

  if (isLoading) return <PageLoader />

  const onFinish = async (values: KycValues) => {
    setSubmitting(true)
    try {
      await api.post('/kyc', {
        fullName: values.fullName,
        documentType: values.documentType,
        documentNumber: values.documentNumber,
        country: values.country,
        documents: values.documentUrl ? [...docs, values.documentUrl] : docs,
      })
      message.success('Verification submitted for review')
      setDocs([])
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Account Verification" subtitle="Complete KYC to unlock the full investing experience" />

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E5A8] to-[#00B4A0] text-white">
              <BadgeCheck size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-ink">Verification Status</h2>
              <p className="text-xs text-ink2">Identity verification</p>
            </div>
          </div>

          {data ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-surface2 px-4 py-3 text-sm">
                <span className="text-ink2">Status</span>
                <StatusTag status={data.status} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface2 px-4 py-3 text-sm">
                <span className="text-ink2">Submitted</span>
                <span className="font-medium text-ink">{formatDateTime(data.submittedAt)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface2 px-4 py-3 text-sm">
                <span className="text-ink2">Document</span>
                <span className="font-medium text-ink">{data.documentType.replace('_', ' ')}</span>
              </div>
              {data.adminNote && (
                <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{data.adminNote}</div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="Not verified yet"
              description="Submit your identity document to get verified."
            />
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
            <Upload size={18} className="text-accent" /> Submit verification
          </h2>
          <p className="mb-5 text-xs text-ink2">Review usually takes a few minutes.</p>
          <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
            <Form.Item name="fullName" label="Full legal name" rules={[{ required: true, min: 2, message: 'Enter your legal name' }]}>
              <Input size="large" placeholder="As shown on your ID" />
            </Form.Item>
            <div className="grid gap-4 sm:grid-cols-2">
              <Form.Item name="documentType" label="Document type" rules={[{ required: true, message: 'Select a document' }]}>
                <Select
                  size="large"
                  placeholder="Select type"
                  options={[
                    { value: 'PASSPORT', label: 'Passport' },
                    { value: 'ID_CARD', label: 'National ID card' },
                    { value: 'DRIVERS_LICENSE', label: "Driver's license" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="documentNumber" label="Document number" rules={[{ required: true, min: 3, message: 'Invalid number' }]}>
                <Input size="large" placeholder="e.g. A1234567" />
              </Form.Item>
            </div>
            <Form.Item name="country" label="Country (optional)" rules={[{ min: 2 }]}>
              <Input size="large" placeholder="e.g. United States" />
            </Form.Item>
            <Form.Item name="documentUrl" label="Document URL (uploaded file link)" rules={[{ type: 'url', message: 'Enter a valid URL' }]}>
              <Input size="large" placeholder="https://..." />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={submitting} className="brand-gradient border-none font-semibold">
              Submit for review
            </Button>
            <p className="mt-4 flex items-start gap-2 text-xs text-ink2">
              <Info size={14} className="mt-0.5 shrink-0" />
              Your documents are encrypted and only used for identity verification. {config?.siteName} never shares your data.
            </p>
          </Form>
        </GlassCard>
      </div>
    </div>
  )
}
