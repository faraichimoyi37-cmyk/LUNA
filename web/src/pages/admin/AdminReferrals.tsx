import { Table } from 'antd'
import { Gift, Users } from 'lucide-react'
import { useAdminReferrals } from '../../hooks/queries'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatCard } from '../../components/ui/StatCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney } from '../../lib/format'
import type { Transaction } from '../../lib/types'

type Row = Transaction & { user?: { id: string; fullname: string; email: string } }

export default function AdminReferrals() {
  const { data, isLoading } = useAdminReferrals()

  if (isLoading || !data) return <PageLoader />

  const columns = [
    {
      title: 'Earned By',
      key: 'user',
      render: (record: Row) => (
        <div>
          <p className="font-medium text-ink">{record.user?.fullname}</p>
          <p className="text-xs text-ink2">{record.user?.email}</p>
        </div>
      ),
    },
    { title: 'Commission', dataIndex: 'amount', render: (v: number) => <span className="font-semibold text-secondary">+${formatMoney(v)}</span> },
    { title: 'Reference', dataIndex: 'reference', render: (v: string | null) => <code className="text-xs text-ink2">{v ?? '—'}</code> },
    { title: 'Paid At', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  return (
    <div>
      <PageHeader title="Referral Program" subtitle="Track commission paid out through referrals" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total Commission Paid" value={data.total} icon={Gift} gradient="from-[#FFB020] to-[#FF8B00]" sub="All-time referral payouts" />
        <StatCard label="Referrals Registered" value={data.count} decimals={0} prefix="" icon={Users} gradient="from-[#6C63FF] to-[#8B7BFF]" sub="Users who joined via a referral" />
      </div>

      <GlassCard className="p-6">
        <Table
          rowKey="id"
          dataSource={data.payments}
          columns={columns}
          pagination={false}
          size="small"
          locale={{ emptyText: <EmptyState icon={Gift} title="No referral payouts yet" /> }}
        />
      </GlassCard>
    </div>
  )
}
