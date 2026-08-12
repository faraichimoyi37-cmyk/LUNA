import { useState } from 'react'
import { Button, Pagination, Select, Table } from 'antd'
import { Receipt, Download } from 'lucide-react'
import { useTransactions } from '../../hooks/queries'
import { downloadFile } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney, shortId } from '../../lib/format'
import { isIncome, txLabel } from '../../lib/transactions'
import type { Transaction } from '../../lib/types'

const typeOptions = [
  { value: 'ALL', label: 'All types' },
  { value: 'DEPOSIT', label: 'Deposits' },
  { value: 'WITHDRAWAL', label: 'Withdrawals' },
  { value: 'INVESTMENT', label: 'Investments' },
  { value: 'PROFIT', label: 'Daily profits' },
  { value: 'MATURITY', label: 'Maturity' },
  { value: 'REFERRAL', label: 'Referrals' },
  { value: 'ADJUSTMENT', label: 'Adjustments' },
]

export default function Transactions() {
  const [page, setPage] = useState(1)
  const [type, setType] = useState('ALL')
  const { data, isLoading } = useTransactions(page, type)

  if (isLoading && !data) return <PageLoader />

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      render: (t: Transaction['type']) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{txLabel(t)}</span>
          {data?.data.find((x) => x.type === t)?.reference && (
            <span className="hidden text-[11px] text-ink2 sm:inline">{shortId(data.data.find((x) => x.type === t)?.reference ?? '')}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (amount: number, record: Transaction) => (
        <span className={isIncome(record) ? 'font-semibold text-secondary' : 'font-semibold text-danger'}>
          {isIncome(record) ? '+' : '−'}${formatMoney(amount)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: Transaction['status']) => (
        <span className={`text-xs font-semibold ${s === 'APPROVED' ? 'text-secondary' : s === 'PENDING' ? 'text-warning' : 'text-danger'}`}>
          {s}
        </span>
      ),
    },
    {
      title: 'Balance after',
      dataIndex: 'balanceAfter',
      render: (v: number | null) => (v == null ? <span className="text-ink2">—</span> : <span className="text-ink2">${formatMoney(v)}</span>),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle="Your complete transaction history"
        actions={
          <Button icon={<Download size={15} />} onClick={() => downloadFile('/transactions/export', 'luna-transactions.csv')}>
            Export CSV
          </Button>
        }
      />

      <GlassCard className="p-6">
        <div className="mb-4 max-w-xs">
          <Select
            value={type}
            onChange={(value) => {
              setType(value)
              setPage(1)
            }}
            options={typeOptions}
            className="w-full"
          />
        </div>
        <Table
          rowKey="id"
          dataSource={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          pagination={false}
          size="small"
          locale={{ emptyText: <EmptyState icon={Receipt} title="No transactions" description="Your financial activity will appear here." /> }}
        />
        {data && data.pages > 1 && (
          <div className="mt-4 flex justify-end">
            <Pagination current={data.page} total={data.total} pageSize={data.limit} onChange={setPage} showSizeChanger={false} />
          </div>
        )}
      </GlassCard>
    </div>
  )
}
