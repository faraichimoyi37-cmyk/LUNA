import { useState } from 'react'
import { Button, Table } from 'antd'
import { Gift, Users, Link2, Trophy, Check } from 'lucide-react'
import { useReferrals, useLeaderboard, useSiteConfig } from '../../hooks/queries'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatCard } from '../../components/ui/StatCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDate, formatMoney } from '../../lib/format'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'

export default function Referrals() {
  const { data, isLoading } = useReferrals()
  const { data: leaderboard } = useLeaderboard()
  const { data: config } = useSiteConfig()
  const [copied, setCopied] = useState(false)

  if (isLoading || !data) return <PageLoader />

  const copyLink = async () => {
    await navigator.clipboard.writeText(data.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const columns = [
    {
      title: 'User',
      dataIndex: 'fullname',
      render: (v: string, r: { role?: string }) => (
        <span className="inline-flex items-center gap-1 font-medium text-ink">
          {v}
          {r.role === 'AGENT' && <VerifiedBadge />}
        </span>
      ),
    },
    { title: 'Email', dataIndex: 'email', render: (v: string) => <span className="text-ink2">{v}</span> },
    { title: 'Invested', dataIndex: 'totalInvested', render: (v: number) => <span className="font-semibold text-ink">${formatMoney(v)}</span> },
    { title: 'Joined', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDate(v)}</span> },
  ]

  const boardColumns = [
    { title: 'Rank', dataIndex: 'rank', render: (v: number) => <span className={`font-bold ${v <= 3 ? 'text-warning' : 'text-ink2'}`}>#{v}</span> },
    { title: 'Investor', dataIndex: 'name', render: (v: string) => <span className="font-medium text-ink">{v}</span> },
    { title: 'Invested', dataIndex: 'amount', render: (v: number) => <span className="font-semibold text-ink">${formatMoney(v)}</span> },
  ]

  return (
    <div>
      <PageHeader title="Referral Program" subtitle="Invite friends and earn commission on their investments" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassCard className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFB020] to-[#FF8B00] text-white">
            <Gift size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-ink2">Referral Code</p>
            <p className="truncate font-mono text-lg font-bold text-ink">{data.code}</p>
          </div>
        </GlassCard>
        <StatCard label="People Referred" value={data.count} decimals={0} prefix="" suffix="" icon={Users} gradient="from-[#6C63FF] to-[#8B7BFF]" sub="Active referral network" />
        <StatCard label="Commission Earned" value={data.totalEarned} icon={Gift} gradient="from-[#00E5A8] to-[#00B4A0]" sub="From referrals" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="mb-1 font-semibold text-ink">Your referral link</h2>
          <p className="mb-4 text-xs text-ink2">
            Earn {config?.referralPercent ?? 10}% commission on every investment made by your referrals.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 truncate rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-ink2">
              {data.link}
            </div>
            <Button
              type="primary"
              className={copied ? 'border-none bg-green-500 hover:bg-green-500' : 'brand-gradient border-none'}
              icon={copied ? <Check size={16} /> : <Link2 size={16} />}
              onClick={copyLink}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="mt-4 rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-sm text-ink2">
            💡 Share this link on social media or with friends. Commission is credited instantly when a referral invests.
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-warning" />
            <h2 className="font-semibold text-ink">Leaderboard</h2>
          </div>
          <Table
            rowKey="rank"
            dataSource={leaderboard ?? []}
            columns={boardColumns}
            pagination={false}
            size="small"
            locale={{ emptyText: <EmptyState icon={Trophy} title="Be the first investor" /> }}
          />
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h2 className="mb-4 font-semibold text-ink">Referred Investors</h2>
        <Table
          rowKey="id"
          dataSource={data.referrals}
          columns={columns}
          pagination={false}
          size="small"
          locale={{ emptyText: <EmptyState icon={Users} title="No referrals yet" description="Share your link to start earning." /> }}
        />
      </GlassCard>
    </div>
  )
}
