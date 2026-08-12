import { useState } from 'react'
import { App, Button, Modal, Select, Table } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpFromLine, Check, X } from 'lucide-react'
import { useAdminWithdrawals, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatusTag } from '../../components/ui/StatusTag'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney } from '../../lib/format'
import type { Withdrawal } from '../../lib/types'

export default function AdminWithdrawals() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [target, setTarget] = useState<Withdrawal | null>(null)
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useAdminWithdrawals(page, statusFilter)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.withdrawals })
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats })
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })
  }

  const decide = async (status: 'APPROVED' | 'REJECTED') => {
    if (!target) return
    setBusy(true)
    try {
      await api.patch(`/admin/withdrawals/${target.id}`, { status })
      message.success(`Withdrawal ${status.toLowerCase()}`)
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
      render: (record: Withdrawal) => (
        <div>
          <p className="font-medium text-ink">{record.user?.fullname}</p>
          <p className="text-xs text-ink2">{record.user?.email}</p>
        </div>
      ),
    },
    { title: 'Amount', dataIndex: 'amount', render: (v: number, r: Withdrawal) => <span className="font-semibold text-ink">${formatMoney(v)} <span className="font-normal text-ink2">(+${formatMoney(r.fee)} fee)</span></span> },
    { title: 'Wallet', dataIndex: 'walletAddress', render: (v: string) => <code className="text-xs text-ink2">{v}</code> },
    { title: 'Network', dataIndex: 'network', render: (v: string | null) => <span className="text-ink2">{v ?? '—'}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <StatusTag status={v} /> },
    { title: 'Requested', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Withdrawal) =>
        record.status === 'PENDING' ? (
          <Button size="small" type="primary" className="brand-gradient border-none" icon={<Check size={14} />} onClick={() => setTarget(record)}>
            Review
          </Button>
        ) : (
          <span className="text-xs text-ink2">Processed</span>
        ),
    },
  ]

  if (isLoading && !data) return <PageLoader />

  return (
    <div>
      <PageHeader title="Withdrawals" subtitle="Process user withdrawal requests" />

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
          locale={{ emptyText: <EmptyState icon={ArrowUpFromLine} title="No withdrawals" description="Withdrawals will appear here." /> }}
        />
      </GlassCard>

      <Modal
        title={`Review withdrawal — $${target ? formatMoney(target.amount) : ''}`}
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
            <p className="flex justify-between"><span className="text-ink2">Fee</span><span className="text-ink">${formatMoney(target.fee)}</span></p>
            <p className="flex justify-between"><span className="text-ink2">Wallet</span><code className="break-all text-xs text-ink">{target.walletAddress}</code></p>
            {target.network && <p className="flex justify-between"><span className="text-ink2">Network</span><span className="text-ink">{target.network}</span></p>}
            <p className="flex justify-between"><span className="text-ink2">Requested</span><span className="text-ink">{formatDateTime(target.createdAt)}</span></p>
            <div className="flex justify-end gap-2 pt-3">
              <Button danger icon={<X size={15} />} loading={busy} onClick={() => decide('REJECTED')}>Reject & refund</Button>
              <Button type="primary" className="brand-gradient border-none" icon={<Check size={15} />} loading={busy} onClick={() => decide('APPROVED')}>
                Approve & send
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
