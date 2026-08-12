import { useState } from 'react'
import { App, Button, Form, Input, Modal, Table } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Check, X } from 'lucide-react'
import { useAdminKyc, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatusTag } from '../../components/ui/StatusTag'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime } from '../../lib/format'
import type { KycRecord } from '../../lib/types'

type Row = KycRecord & { user?: { id: string; fullname: string; email: string } }

export default function AdminKyc() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<Row | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useAdminKyc()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.kyc })
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats })
  }

  const decide = async (status: 'APPROVED' | 'REJECTED') => {
    if (!target) return
    setBusy(true)
    try {
      await api.patch(`/admin/kyc/${target.id}`, { status, note: note || undefined })
      message.success(`KYC ${status.toLowerCase()}`)
      setTarget(null)
      setNote('')
      invalidate()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      title: 'Applicant',
      key: 'user',
      render: (record: Row) => (
        <div>
          <p className="font-medium text-ink">{record.user?.fullname}</p>
          <p className="text-xs text-ink2">{record.user?.email}</p>
        </div>
      ),
    },
    { title: 'Full Name', dataIndex: 'fullName', render: (v: string) => <span className="text-ink">{v}</span> },
    { title: 'Document', dataIndex: 'documentType', render: (v: string) => <span className="text-ink2">{v.replace('_', ' ')}</span> },
    { title: 'Doc Number', dataIndex: 'documentNumber', render: (v: string) => <code className="text-xs text-ink2">{v}</code> },
    { title: 'Country', dataIndex: 'country', render: (v: string | null) => <span className="text-ink2">{v ?? '—'}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <StatusTag status={v} /> },
    { title: 'Submitted', dataIndex: 'submittedAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Row) =>
        record.status === 'PENDING' ? (
          <Button size="small" type="primary" className="brand-gradient border-none" icon={<BadgeCheck size={14} />} onClick={() => { setTarget(record); setNote('') }}>
            Review
          </Button>
        ) : (
          <span className="text-xs text-ink2">{record.reviewedAt ? formatDateTime(record.reviewedAt) : '—'}</span>
        ),
    },
  ]

  if (isLoading && !data) return <PageLoader />

  return (
    <div>
      <PageHeader title="KYC Verification" subtitle="Review identity verification requests" />

      <GlassCard className="p-6">
        <Table
          rowKey="id"
          dataSource={data ?? []}
          columns={columns}
          loading={isLoading}
          pagination={false}
          size="small"
          locale={{ emptyText: <EmptyState icon={BadgeCheck} title="No verification requests" /> }}
        />
      </GlassCard>

      <Modal title={`Review KYC — ${target?.user?.fullname ?? ''}`} open={!!target} onCancel={() => setTarget(null)} footer={null} destroyOnClose>
        {target && (
          <div className="space-y-3 text-sm">
            <p className="flex justify-between"><span className="text-ink2">Name</span><span className="font-medium text-ink">{target.fullName}</span></p>
            <p className="flex justify-between"><span className="text-ink2">Email</span><span className="font-medium text-ink">{target.user?.email}</span></p>
            <p className="flex justify-between"><span className="text-ink2">Document</span><span className="text-ink">{target.documentType.replace('_', ' ')}</span></p>
            <p className="flex justify-between"><span className="text-ink2">Document number</span><code className="text-xs text-ink">{target.documentNumber}</code></p>
            {target.country && <p className="flex justify-between"><span className="text-ink2">Country</span><span className="text-ink">{target.country}</span></p>}
            {target.documents.length > 0 && (
              <div>
                <p className="mb-1 text-ink2">Documents</p>
                <div className="space-y-1">
                  {target.documents.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary underline">
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <Form layout="vertical" requiredMark={false}>
              <Form.Item label="Note to applicant">
                <Input.TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional message" />
              </Form.Item>
            </Form>
            <div className="flex justify-end gap-2 pt-2">
              <Button danger icon={<X size={15} />} loading={busy} onClick={() => decide('REJECTED')}>Reject</Button>
              <Button type="primary" className="brand-gradient border-none" icon={<Check size={15} />} loading={busy} onClick={() => decide('APPROVED')}>
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
