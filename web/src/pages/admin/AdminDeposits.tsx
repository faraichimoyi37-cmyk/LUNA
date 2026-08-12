import { useState } from 'react'
import { App, Alert, Button, Modal, Select, Table, Tag } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, Check, X } from 'lucide-react'
import { useAdminDeposits, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatusTag } from '../../components/ui/StatusTag'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney, shortId } from '../../lib/format'
import type { Deposit } from '../../lib/types'

function VerificationTag({ meta }: { meta?: Record<string, unknown> | null }) {
  const source = typeof meta?.source === 'string' ? meta.source : null
  const verified = meta?.verified === true
  const manual = source === 'MANUAL' || source === undefined
  if (manual) return <Tag className="border-line bg-surface2 text-ink2">Not on-chain</Tag>
  return verified ? (
    <Tag color="success">Verified · {source}</Tag>
  ) : (
    <Tag color="error">Failed · {source}</Tag>
  )
}

function PackageTag({ meta }: { meta?: Record<string, unknown> | null }) {
  if (meta?.kind !== 'package-purchase') return null
  return <Tag color="geekblue">{String(meta.packageName ?? 'Package purchase')}</Tag>
}

export default function AdminDeposits() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [target, setTarget] = useState<Deposit | null>(null)
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useAdminDeposits(page, statusFilter)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.deposits })
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats })
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })
  }

  const decide = async (status: 'APPROVED' | 'REJECTED') => {
    if (!target) return
    setBusy(true)
    try {
      await api.patch(`/admin/deposits/${target.id}`, { status })
      message.success(`Deposit ${status.toLowerCase()}`)
      setTarget(null)
      invalidate()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (record: Deposit) => (
        <div>
          <p className="font-medium text-ink">{record.user?.fullname}</p>
          <p className="text-xs text-ink2">{record.user?.email}</p>
        </div>
      ),
    },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => <span className="font-semibold text-ink">${formatMoney(v)}</span> },
    { title: 'Method', dataIndex: 'method', render: (v: string, record: Deposit) => (
      <div>
        <span className="text-ink2">{v.replace('_', ' · ')}</span>
        <PackageTag meta={record.meta} />
      </div>
    ) },
    { title: 'Reference', dataIndex: 'txRef', render: (v: string | null) => <code className="text-xs text-ink2">{v ? shortId(v) : '—'}</code> },
    { title: 'Verification', dataIndex: 'meta', render: (v: Record<string, unknown> | null) => <VerificationTag meta={v} /> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <StatusTag status={v} /> },
    { title: 'Date', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Deposit) =>
        record.status === 'PENDING' ? (
          <div className="flex gap-2">
            <Button size="small" type="primary" className="brand-gradient border-none" icon={<Check size={14} />} onClick={() => setTarget(record)}>
              Review
            </Button>
          </div>
        ) : (
          <span className="text-xs text-ink2">Processed</span>
        ),
    },
  ]

  if (isLoading && !data) return <PageLoader />

  return (
    <div>
      <PageHeader title="Deposits" subtitle="Approve or reject incoming deposits" />

      <GlassCard className="p-6">
        <div className="mb-4">
          <Select
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            className="w-44"
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
        </div>
        <Table
          rowKey="id"
          dataSource={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          pagination={{ current: page, pageSize: data?.limit ?? 20, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false }}
          size="small"
          locale={{ emptyText: <EmptyState icon={ArrowDownToLine} title="No deposits" description="Deposits will appear here." /> }}
        />
      </GlassCard>

      <Modal
        title={`Review deposit — $${target ? formatMoney(target.amount) : ''}`}
        open={!!target}
        onCancel={() => setTarget(null)}
        footer={null}
        destroyOnClose
      >
        {target && (
          <div className="space-y-3 text-sm">
            <p className="flex justify-between"><span className="text-ink2">User</span><span className="font-medium text-ink">{target.user?.fullname}</span></p>
            <p className="flex justify-between"><span className="text-ink2">Email</span><span className="font-medium text-ink">{target.user?.email}</span></p>
            <p className="flex justify-between"><span className="text-ink2">Amount</span><span className="font-semibold text-ink">${formatMoney(target.amount)}</span></p>
            <p className="flex justify-between"><span className="text-ink2">Method</span><span className="text-ink">{target.method.replace('_', ' · ')}</span></p>
            {target.meta?.kind === 'package-purchase' && (
              <p className="flex justify-between"><span className="text-ink2">Package purchase</span><span className="font-medium text-ink">{String(target.meta.packageName ?? '')}</span></p>
            )}
            {target.txRef && (
              <p className="flex justify-between"><span className="text-ink2">Tx reference</span><code className="text-xs text-ink">{target.txRef}</code></p>
            )}
            <p className="flex items-center justify-between"><span className="text-ink2">Verification</span><VerificationTag meta={target.meta} /></p>
            {target.meta?.reason ? <Alert type="warning" showIcon message={String(target.meta.reason)} /> : null}
            <p className="flex justify-between"><span className="text-ink2">Submitted</span><span className="text-ink">{formatDateTime(target.createdAt)}</span></p>
            {!target.txRef && (
              <Alert
                type="warning"
                showIcon
                message="No transaction ID provided"
                description="This deposit cannot be approved until the user provides the transaction ID. Reject it so they can resubmit."
              />
            )}
            <div className="flex justify-end gap-2 pt-3">
              <Button danger icon={<X size={15} />} loading={busy} onClick={() => decide('REJECTED')}>Reject</Button>
              <Button type="primary" className="brand-gradient border-none" icon={<Check size={15} />} loading={busy} disabled={!target.txRef} onClick={() => decide('APPROVED')}>
                {target.meta?.kind === 'package-purchase' ? 'Approve & activate investment' : 'Approve & credit'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
