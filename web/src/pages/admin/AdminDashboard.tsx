import { Link } from 'react-router-dom'
import { Button } from 'antd'
import { Users, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Crown, Clock, Wallet, Banknote } from 'lucide-react'
import { useAdminStats } from '../../hooks/queries'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatCard } from '../../components/ui/StatCard'
import { ActivityChart } from '../../components/charts/ActivityChart'
import { formatDateTime, formatMoney } from '../../lib/format'

export default function AdminDashboard() {
  const { data, isLoading } = useAdminStats()

  if (isLoading || !data) return <PageLoader />

  const revenuePct = data.totalDeposits > 0 ? ((data.revenue / data.totalDeposits) * 100).toFixed(1) : '0'

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Platform overview & live metrics" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Balance" value={data.totalBalance} icon={Wallet} gradient="from-[#6C63FF] to-[#8B7BFF]" sub={`Real funds held (deposits + bonuses − withdrawals) · +$${formatMoney(data.totalBonuses)} bonuses`} />
        <StatCard label="Total Users" value={data.users} decimals={0} prefix="" icon={Users} gradient="from-[#00D4FF] to-[#0090FF]" sub={`${data.activeInvestors} active investors`} />
        <StatCard label="Total Deposits" value={data.totalDeposits} icon={ArrowDownToLine} gradient="from-[#00E5A8] to-[#00B4A0]" sub="Approved deposits" />
        <StatCard label="Total Withdrawals" value={data.totalWithdrawals} icon={ArrowUpFromLine} gradient="from-[#FFB020] to-[#FF8B00]" sub="Approved withdrawals" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Profits" value={data.totalProfits} icon={TrendingUp} gradient="from-[#00E5A8] to-[#00B4A0]" sub="All profit credits" />
        <StatCard label="Net Revenue" value={data.revenue} icon={Banknote} gradient="from-[#FFB020] to-[#FF8B00]" sub={`${revenuePct}% of deposits`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-ink">Platform Activity</h2>
              <p className="text-xs text-ink2">Transactions over the last 14 days</p>
            </div>
            <Button size="small" className="border-line" onClick={() => undefined}>
              Daily
            </Button>
          </div>
          <ActivityChart data={data.activity} height={260} />
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="mb-4 font-semibold text-ink">Top Investors</h2>
          <div className="space-y-3">
            {data.topInvestors.slice(0, 6).map((inv) => (
              <div key={inv.rank} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${inv.rank === 1 ? 'bg-warning/20 text-warning' : 'bg-surface2 text-ink2'}`}>
                    {inv.rank === 1 ? <Crown size={13} /> : inv.rank}
                  </span>
                  <span className="max-w-[140px] truncate font-medium text-ink">{inv.name}</span>
                </span>
                <span className="font-semibold text-ink">${formatMoney(inv.amount)}</span>
              </div>
            ))}
            {data.topInvestors.length === 0 && <p className="text-sm text-ink2">No investments yet</p>}
          </div>
        </GlassCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-0">
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="font-semibold text-ink">New Users</h2>
            <Link to="/admin/users" className="text-xs font-medium text-primary">View all</Link>
          </div>
          <div className="mt-3 divide-y divide-line/60">
            {data.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{u.fullname}</p>
                  <p className="truncate text-xs text-ink2">{u.email}</p>
                </div>
                <span className="shrink-0 text-xs text-ink2">{formatDateTime(u.createdAt)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-0">
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="flex items-center gap-2 font-semibold text-ink"><Clock size={16} className="text-ink2" /> Recent Activity</h2>
            <Link to="/admin/logs" className="text-xs font-medium text-primary">View all</Link>
          </div>
          <div className="mt-3 divide-y divide-line/60">
            {data.recentLogs.map((log) => (
              <div key={log.id} className="px-6 py-3 text-sm">
                <p className="truncate font-mono text-xs text-ink">{log.action}</p>
                <p className="text-xs text-ink2">{formatDateTime(log.createdAt)}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
