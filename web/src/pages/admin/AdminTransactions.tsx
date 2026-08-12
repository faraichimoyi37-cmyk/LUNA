import { useState } from 'react'
import { App, Button, Select, Table, Tag } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Receipt, Trash2 } from 'lucide-react'
import { useAdminTransactions, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatusTag } from '../../components/ui/StatusTag'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney, formatMoneySigned, shortId } from '../../lib/format'
import { isIncome, txLabel } from '../../lib/transactions'
import type { AdminTransaction } from '../../lib/types'

const typeColors: Record<string, string> = {
  DEPOSIT: 'green',
  WITHDRAWAL: 'red',
  INVESTMENT: 'blue',
  PROFIT: 'cyan',
  MATURITY: 'purple',
  REFERRAL: 'gold',
  ADJUSTMENT: 'orange',
  BONUS: 'magenta',
}

const typeOptions = [
  { value: 'ALL', label: 'All types' },
  ...['DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'PROFIT', 'MATURITY', 'REFERRAL', 'ADJUSTMENT', 'BONUS'].map((t) => ({
    value: t,
    label: txLabel(t as AdminTransaction['type']),
  })),
]

export default function AdminTransactions() {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const { data, isLoading } = useAdminTransactions(page, typeFilter)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.transactions })

  const remove = (record: AdminTransaction) => {
    modal.confirm({
      title: 'Delete transaction',
      content: `Permanently delete the ${txLabel(record.type)} of $${formatMoney(record.amount)} for ${record.user.fullname} (${record.user.email})? This cannot be undone.`,
      okText: 'Delete transaction',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.delete(`/admin/transactions/${record.id}`)
          message.success('Transaction deleted')
          invalidate()
        } catch (error) {
          message.error(errMsg(error))
        }
      },
    })
  }

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (record: AdminTransaction) => (
        <div>
          <p className="font-medium text-ink">{record.user.fullname}</p>
          <p className="text-xs text-ink2">{record.user.email}</p>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (v: AdminTransaction['type']) => <Tag color={typeColors[v] ?? 'default'}>{txLabel(v)}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (v: number, record: AdminTransaction) => (
        <span className={isIncome(record) ? 'font-semibold text-secondary' : 'font-semibold text-danger'}>
          {formatMoneySigned(v)}
        </span>
      ),
    },
    { title: 'Balance after', dataIndex: 'balanceAfter', render: (v: number | null | undefined) => <span className="text-ink2">{v != null ? `$${formatMoney(v)}` : '—'}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <StatusTag status={v} /> },
    { title: 'Reference', dataIndex: 'reference', render: (v: string | null | undefined) => <code className="text-xs text-ink2">{v ? shortId(v) : '—'}</code> },
    { title: 'Date', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: AdminTransaction) => (
        <Button size="small" danger icon={<Trash2 size={14} />} onClick={() => remove(record)}>
          Delete
        </Button>
      ),
    },
  ]

  if (isLoading && !data) return <PageLoader />

  return (
    <div>
      <PageHeader title="Transactions" subtitle="All transactions across the platform" />

      <GlassCard className="p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1) }}
            className="w-48"
            options={typeOptions}
          />
        </div>
        <Table
          rowKey="id"
          dataSource={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          pagination={{ current: page, pageSize: data?.limit ?? 20, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false }}
          size="small"
          locale={{ emptyText: <EmptyState icon={Receipt} title="No transactions found" description="No transactions match these filters." /> }}
        />
      </GlassCard>
    </div>
  )
}
