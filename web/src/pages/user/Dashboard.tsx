import { Link } from 'react-router-dom'
import { Button, Progress, Table } from 'antd'
import {
  Wallet,
  TrendingUp,
  Banknote,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ArrowRight,
  Activity,
} from 'lucide-react'
import { useActivity, useDashboard, useInvestments } from '../../hooks/queries'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatCard } from '../../components/ui/StatCard'
import { GlassCard } from '../../components/ui/GlassCard'
import { EarningsChart } from '../../components/charts/EarningsChart'
import { DonutChart } from '../../components/charts/DonutChart'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney, timeAgo } from '../../lib/format'
import { isIncome, txLabel } from '../../lib/transactions'
import type { Transaction } from '../../lib/types'

export default function Dashboard() {
  const { data, isLoading } = useDashboard()
  const { data: investments } = useInvestments()
  const { data: activity } = useActivity()

  if (isLoading || !data) return <PageLoader />

  const activeInvestments = (investments ?? []).filter((i) => i.status === 'ACTIVE')

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      render: (type: Transaction['type']) => <span className="font-medium text-ink">{txLabel(type)}</span>,
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
      title: 'Date',
      dataIndex: 'createdAt',
      render: (value: string) => <span className="text-ink2">{formatDateTime(value)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Welcome back 👋</h1>
        <p className="mt-1 text-sm text-ink2">Here's your financial overview.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Balance"
          value={data.balance + data.activeInvestments.amount}
          icon={Wallet}
          gradient="from-[#6C63FF] to-[#8B7BFF]"
          delay={0}
          sub={`Available ${formatMoney(data.balance)} · ${formatMoney(data.activeInvestments.amount)} invested`}
        />
        <StatCard label="Active Investments" value={data.activeInvestments.amount} icon={TrendingUp} gradient="from-[#00D4FF] to-[#0090FF]" delay={0.06} sub={`${data.activeInvestments.count} active · +$${formatMoney(data.activeInvestments.expectedDaily)}/day`} />
        <StatCard label="Total Earnings" value={data.earnings.total} icon={Banknote} gradient="from-[#00E5A8] to-[#00B4A0]" delay={0.12} sub={`+$${formatMoney(data.earnings.today)} today`} />
        <StatCard label="Pending Withdrawals" value={data.pendingWithdrawals.amount} icon={Clock} gradient="from-[#FFB020] to-[#FF8B00]" delay={0.18} sub={`${data.pendingWithdrawals.count} pending requests`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-ink">Daily Profit Statistics</h2>
              <p className="text-xs text-ink2">Last 14 days</p>
            </div>
            <Link to="/dashboard/transactions">
              <Button type="text" size="small" className="text-primary">
                View all <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
          </div>
          <EarningsChart data={data.profitSeries} />
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="mb-2 font-semibold text-ink">Portfolio Breakdown</h2>
          <p className="text-xs text-ink2">Active investment allocation</p>
          <DonutChart data={data.portfolio} height={220} />
          <div className="mt-2 space-y-2">
            {data.portfolio.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: ['#6C63FF', '#00D4FF', '#00E5A8', '#FFB020'][index % 4] }} />
                  {item.name}
                </span>
                <span className="font-medium text-ink">${formatMoney(item.value)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 font-semibold text-ink">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link to="/dashboard/deposit">
            <Button block size="large" className="h-14 border-line font-medium">
              <ArrowDownToLine size={18} className="mr-2 text-secondary" /> Deposit Funds
            </Button>
          </Link>
          <Link to="/dashboard/withdraw">
            <Button block size="large" className="h-14 border-line font-medium">
              <ArrowUpFromLine size={18} className="mr-2 text-warning" /> Withdraw Funds
            </Button>
          </Link>
          <Link to="/dashboard/packages">
            <Button block size="large" className="h-14 border-line font-medium">
              <Boxes size={18} className="mr-2 text-primary" /> Buy Investment
            </Button>
          </Link>
        </div>
      </div>

      <GlassCard className="p-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <Activity size={18} className="text-secondary" /> Recent Activity
          </h2>
          <p className="mt-0.5 text-xs text-ink2">Latest deposits &amp; withdrawals by investors</p>
        </div>
        {activity && activity.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {activity.map((item, index) => (
              <div key={`${item.type}-${index}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface2/50 p-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    item.type === 'DEPOSIT' ? 'bg-secondary/10 text-secondary' : 'bg-warning/10 text-warning'
                  }`}
                >
                  {item.type === 'DEPOSIT' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink2">
                    <span className="font-medium text-ink">{item.name}</span> {item.type === 'DEPOSIT' ? 'deposited' : 'withdrew'}
                  </p>
                  <p className="text-xs text-ink2">
                    {item.method.replace('_', ' · ')} · {timeAgo(item.createdAt)}
                  </p>
                </div>
                <span className={`font-semibold ${item.type === 'DEPOSIT' ? 'text-secondary' : 'text-warning'}`}>
                  {item.type === 'DEPOSIT' ? '+' : '−'}${formatMoney(item.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Activity} title="No activity yet" description="Recent deposits and withdrawals by investors will appear here." />
        )}
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-0 lg:col-span-1">
          <div className="mb-2 flex items-center justify-between px-6 pt-6">
            <h2 className="font-semibold text-ink">Active Investments</h2>
            <Link to="/dashboard/investments" className="text-xs font-medium text-primary">
              View all
            </Link>
          </div>
          {activeInvestments.length > 0 ? (
            <Table
              rowKey="id"
              dataSource={activeInvestments.slice(0, 5)}
              pagination={false}
              size="small"
              className="mt-2"
              columns={[
                {
                  title: 'Package',
                  dataIndex: 'packageName',
                  render: (v: string) => <span className="font-medium text-ink">{v}</span>,
                },
                {
                  title: 'Invested',
                  dataIndex: 'amount',
                  align: 'right' as const,
                  render: (v: number) => <span className="font-semibold text-ink">${formatMoney(v)}</span>,
                },
                {
                  title: 'Daily return',
                  dataIndex: 'dailyProfit',
                  align: 'right' as const,
                  render: (v: number) => <span className="font-semibold text-secondary">+${formatMoney(v)}/day</span>,
                },
                {
                  title: 'Progress',
                  dataIndex: 'progress',
                  width: 110,
                  render: (v: number) => (
                    <Progress
                      percent={v ?? 0}
                      showInfo={false}
                      strokeColor={{ from: '#6C63FF', to: '#00D4FF' }}
                      trailColor="var(--surface-2)"
                      size="small"
                    />
                  ),
                },
              ]}
              locale={{ emptyText: <EmptyState icon={TrendingUp} title="No active investments" description="Buy a package to start earning daily returns." /> }}
            />
          ) : (
            <div className="px-6 pb-6">
              <EmptyState icon={TrendingUp} title="No active investments" description="Buy a package to start earning daily returns." />
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-0 lg:col-span-2">
          <div className="flex items-center justify-between px-6 pt-6">
            <h2 className="font-semibold text-ink">Recent Transactions</h2>
            <Link to="/dashboard/transactions" className="text-xs font-medium text-primary">
              View all
            </Link>
          </div>
          <Table
            rowKey="id"
            dataSource={data.recentTransactions}
            columns={columns}
            pagination={false}
            size="middle"
            className="mt-2"
            locale={{ emptyText: <EmptyState icon={Wallet} title="No transactions yet" /> }}
          />
        </GlassCard>
      </div>
    </div>
  )
}
