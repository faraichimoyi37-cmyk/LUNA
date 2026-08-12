import { useState } from 'react'
import { App, Button, Descriptions, Form, Input, Modal, Table, Tag } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Briefcase, Check, X, ExternalLink } from 'lucide-react'
import { useAdminAgentApplications, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatusTag } from '../../components/ui/StatusTag'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney } from '../../lib/format'
import type { AgentApplication } from '../../lib/types'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'

type Row = AgentApplication & { user?: { id: string; fullname: string; email: string; role: string; balance: number } }

const statusTag = (status: string) =>
  status === 'APPROVED' ? <Tag color="green">Approved</Tag> : status === 'REJECTED' ? <Tag color="red">Rejected</Tag> : <Tag color="gold">Pending</Tag>

export default function AdminAgents() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<Row | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useAdminAgentApplications()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.agents })
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })
  }

  const decide = async (status: 'approve' | 'reject') => {
    if (!target) return
    setBusy(true)
    try {
      await api.post(`/admin/agents/${target.id}/${status}`, { note: note || undefined })
      message.success(`Application ${status === 'approve' ? 'approved' : 'rejected'}`)
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
          <p className="inline-flex items-center gap-1 font-medium text-ink">
            {record.fullName}
            {record.user?.role === 'AGENT' && <VerifiedBadge size={14} />}
          </p>
          <p className="text-xs text-ink2">{record.user?.email}</p>
        </div>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', render: (v: string) => <span className="text-ink2">{v}</span> },
    { title: 'Fee paid', dataIndex: 'applicationFeeAmount', render: (v: number) => <span className="font-medium text-ink">${formatMoney(v)}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => statusTag(v) },
    { title: 'Submitted', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Row) =>
        record.status === 'PENDING' ? (
          <Button size="small" type="primary" className="brand-gradient border-none" icon={<Briefcase size={14} />} onClick={() => { setTarget(record); setNote('') }}>
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
      <PageHeader title="Agent Applications" subtitle="Review company agent applications" />

      <GlassCard className="p-6">
        <Table
          rowKey="id"
          dataSource={data ?? []}
          columns={columns}
          loading={isLoading}
          pagination={false}
          size="small"
          locale={{ emptyText: <EmptyState icon={Briefcase} title="No agent applications" description="Users can apply to become company agents from their profile." /> }}
        />
      </GlassCard>

      <Modal title={`Review application — ${target?.fullName ?? ''}`} open={!!target} onCancel={() => setTarget(null)} footer={null} width={720} destroyOnClose>
        {target && (
          <div className="space-y-4 text-sm">
            <Descriptions column={2} size="small" bordered className="[&_.ant-descriptions-item-label]:bg-surface2">
              <Descriptions.Item label="Full name">{target.fullName}</Descriptions.Item>
              <Descriptions.Item label="Email">{target.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{target.phone}</Descriptions.Item>
              <Descriptions.Item label="Application fee">${formatMoney(target.applicationFeeAmount)}</Descriptions.Item>
              <Descriptions.Item label="Registered document">
                {target.businessRegistration ? (
                  <a href={target.businessRegistration} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">
                    <ExternalLink size={13} /> {target.businessRegistration}
                  </a>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Proof of payment">
                <code className="text-xs">{target.applicationFeeTx ?? '—'}</code>
              </Descriptions.Item>
            </Descriptions>

            <Form layout="vertical" requiredMark={false}>
              <Form.Item label="Note to applicant">
                <Input.TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional message" />
              </Form.Item>
            </Form>

            <div className="flex justify-end gap-2 pt-2">
              <Button danger icon={<X size={15} />} loading={busy} onClick={() => decide('reject')}>Reject</Button>
              <Button type="primary" className="brand-gradient border-none" icon={<Check size={15} />} loading={busy} onClick={() => decide('approve')}>
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
