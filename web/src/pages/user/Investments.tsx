import { Link } from 'react-router-dom'
import { Button, Progress, Table, Tabs } from 'antd'
import { TrendingUp, CheckCircle2, Wallet, Clock, Boxes } from 'lucide-react'
import { useInvestments } from '../../hooks/queries'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatCard } from '../../components/ui/StatCard'
import { StatusTag } from '../../components/ui/StatusTag'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDate, formatMoney } from '../../lib/format'
import type { Investment } from '../../lib/types'

export default function Investments() {
  const { data: investments, isLoading } = useInvestments()

  if (isLoading || !investments) return <PageLoader />

  const active = investments.filter((i) => i.status === 'ACTIVE')
  const completed = investments.filter((i) => i.status === 'COMPLETED')
  const activeAmount = active.reduce((sum, i) => sum + i.amount, 0)
  const expectedDaily = active.reduce((sum, i) => sum + i.dailyProfit, 0)

  const completedColumns = [
    { title: 'Package', dataIndex: 'packageName', render: (v: string) => <span className="font-medium text-ink">{v}</span> },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => <span className="font-semibold text-ink">${formatMoney(v)}</span> },
    { title: 'Total return', dataIndex: 'totalReturn', render: (v: number) => <span className="font-semibold text-secondary">${formatMoney(v)}</span> },
    { title: 'Started', dataIndex: 'startDate', render: (v: string) => <span className="text-ink2">{formatDate(v)}</span> },
    { title: 'Ended', dataIndex: 'endDate', render: (v: string) => <span className="text-ink2">{formatDate(v)}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: Investment['status']) => <StatusTag status={v} /> },
  ]

  return (
    <div>
      <PageHeader
        title="My Investments"
        subtitle="Track your active and completed investments"
        actions={
          <Link to="/dashboard/packages">
            <Button type="primary" size="large" className="brand-gradient border-none font-semibold">
              <Boxes size={16} className="mr-2" /> Buy package
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active Investments" value={activeAmount} icon={TrendingUp} gradient="from-[#00D4FF] to-[#0090FF]" sub={`${active.length} investments`} />
        <StatCard label="Expected Daily Profit" value={expectedDaily} icon={Wallet} gradient="from-[#00E5A8] to-[#00B4A0]" sub="Auto-credited every 24h" />
        <StatCard label="Completed" value={completed.length} decimals={0} suffix="" icon={CheckCircle2} gradient="from-[#6C63FF] to-[#8B7BFF]" sub="Principal returned" />
      </div>

      <Tabs
        items={[
          {
            key: 'active',
            label: `Active (${active.length})`,
            children: (
              <div className="grid gap-4 lg:grid-cols-2">
                {active.length > 0 ? (
                  active.map((inv) => (
                    <GlassCard key={inv.id} hover className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-ink">{inv.packageName}</p>
                          <p className="text-xs text-ink2">
                            Started {formatDate(inv.startDate)} · Ends {formatDate(inv.endDate)}
                          </p>
                        </div>
                        <StatusTag status={inv.status} label="Active" />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-surface2 p-3 text-center">
                          <p className="text-[11px] text-ink2">Invested</p>
                          <p className="font-bold text-ink">${formatMoney(inv.amount)}</p>
                        </div>
                        <div className="rounded-xl bg-surface2 p-3 text-center">
                          <p className="text-[11px] text-ink2">Daily</p>
                          <p className="font-bold text-secondary">${formatMoney(inv.dailyProfit)}</p>
                        </div>
                        <div className="rounded-xl bg-surface2 p-3 text-center">
                          <p className="text-[11px] text-ink2">Remaining</p>
                          <p className="font-bold text-ink">{inv.remainingDays}d</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between text-xs text-ink2">
                          <span>Progress</span>
                          <span>{inv.progress}%</span>
                        </div>
                        <Progress
                          percent={inv.progress ?? 0}
                          showInfo={false}
                          strokeColor={{ from: '#6C63FF', to: '#00D4FF' }}
                          trailColor="var(--surface-2)"
                        />
                      </div>
                    </GlassCard>
                  ))
                ) : (
                  <GlassCard className="p-6 lg:col-span-2">
                    <EmptyState
                      icon={Clock}
                      title="No active investments"
                      description="Buy a package to start earning daily returns."
                      action={
                        <Link to="/dashboard/packages">
                          <Button type="primary" className="brand-gradient border-none font-semibold">
                            <Boxes size={16} className="mr-2" /> Buy package
                          </Button>
                        </Link>
                      }
                    />
                  </GlassCard>
                )}
              </div>
            ),
          },
          {
            key: 'completed',
            label: `Completed (${completed.length})`,
            children: (
              <GlassCard className="p-0">
                <Table
                  rowKey="id"
                  dataSource={completed}
                  columns={completedColumns}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: <EmptyState icon={CheckCircle2} title="No completed investments yet" /> }}
                />
              </GlassCard>
            ),
          },
        ]}
      />
    </div>
  )
}
