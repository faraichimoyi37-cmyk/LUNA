import { useState } from 'react'
import { App, Button, Progress, Select, Table } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, TrendingUp, Wallet } from 'lucide-react'
import { useAdminInvestments, queryKeys, type AdminInvestment } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatusTag } from '../../components/ui/StatusTag'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney } from '../../lib/format'

type Row = AdminInvestment

export default function AdminInvestments() {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>('ALL')
  const { data, isLoading } = useAdminInvestments(page, status)

  const complete = (record: Row) => {
    modal.confirm({
      title: 'Complete investment early',
      content: `This settles ${record.packageName} ($${formatMoney(record.amount)}) for ${record.user?.fullname}: final profit is credited and the principal returned.`,
      okText: 'Complete now',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.post(`/admin/investments/${record.id}/complete`)
          message.success('Investment completed')
          queryClient.invalidateQueries({ queryKey: queryKeys.admin.investments })
          queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats })
        } catch (error) {
          message.error(errMsg(error))
        }
      },
    })
  }

  if (isLoading && !data) return <PageLoader />

  const columns = [
    {
      title: 'Buyer',
      key: 'user',
      render: (record: Row) => (
        <div>
          <p className="font-medium text-ink">{record.user?.fullname}</p>
          <p className="text-xs text-ink2">{record.user?.email}</p>
        </div>
      ),
    },
    { title: 'Package', dataIndex: 'packageName', render: (v: string) => <span className="font-medium text-ink">{v}</span> },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => <span className="font-semibold text-ink">${formatMoney(v)}</span> },
    { title: 'Daily Profit', dataIndex: 'dailyProfit', render: (v: number) => <span className="text-secondary">+${formatMoney(v)}/day</span> },
    {
      title: 'Payment',
      dataIndex: 'paidFromBalance',
      render: (v: boolean | undefined) =>
        v ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink">
            <Wallet size={13} className="text-secondary" /> Balance
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink2">
            <Wallet size={13} /> Transfer
          </span>
        ),
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (record: Row) => (
        <div className="w-32">
          <Progress percent={record.progress ?? 0} size="small" showInfo={false} strokeColor={{ from: '#6C63FF', to: '#00D4FF' }} trailColor="var(--surface-2)" />
          <p className="mt-1 text-xs text-ink2">{record.remainingDays ?? 0} days left</p>
        </div>
      ),
    },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <StatusTag status={v} /> },
    { title: 'Started', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Row) =>
        record.status === 'ACTIVE' ? (
          <Button size="small" icon={<CheckCircle2 size={14} />} onClick={() => complete(record)}>
            Complete now
          </Button>
        ) : (
          <span className="text-ink2">—</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Investments"
        subtitle={`${data?.total ?? 0} packages bought total · each with its buyer`}
        actions={
          <Select
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'COMPLETED', label: 'Completed' },
            ]}
          />
        }
      />

      <GlassCard className="p-6">
        <Table
          rowKey="id"
          dataSource={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          size="small"
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
          locale={{ emptyText: <EmptyState icon={TrendingUp} title="No investments yet" /> }}
        />
      </GlassCard>
    </div>
  )
}
