import { Button } from 'antd'
import { Users, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Banknote, Gift, RotateCcw, LineChart, Download } from 'lucide-react'
import { useAdminReports } from '../../hooks/queries'
import { downloadFile } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatCard } from '../../components/ui/StatCard'

export default function AdminReports() {
  const { data, isLoading } = useAdminReports()

  if (isLoading || !data) return <PageLoader />

  const rows = [
    { label: 'Total Users', value: data.users, icon: Users, gradient: 'from-[#6C63FF] to-[#8B7BFF]', isCount: true },
    { label: 'Approved Deposits', value: data.deposits, icon: ArrowDownToLine, gradient: 'from-[#00E5A8] to-[#00B4A0]' },
    { label: 'Approved Withdrawals', value: data.withdrawals, icon: ArrowUpFromLine, gradient: 'from-[#FFB020] to-[#FF8B00]' },
    { label: 'Total Invested', value: data.investments, icon: TrendingUp, gradient: 'from-[#00D4FF] to-[#0090FF]' },
    { label: 'Profits Paid', value: data.profitsPaid, icon: Banknote, gradient: 'from-[#6C63FF] to-[#8B7BFF]' },
    { label: 'Referral Commissions', value: data.referralsPaid, icon: Gift, gradient: 'from-[#FFB020] to-[#FF8B00]' },
    { label: 'Principal Returned', value: data.principalReturned, icon: RotateCcw, gradient: 'from-[#00E5A8] to-[#00B4A0]' },
  ]

  return (
    <div>
      <PageHeader
        title="Financial Reports"
        subtitle="Platform-wide financial summary"
        actions={
          <Button icon={<Download size={15} />} onClick={() => downloadFile('/admin/reports/export', 'luna-report.csv')}>
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <StatCard
            key={row.label}
            label={row.label}
            value={row.value}
            decimals={row.isCount ? 0 : 2}
            prefix={row.isCount ? '' : '$'}
            icon={row.icon}
            gradient={row.gradient}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <LineChart size={18} className="text-primary" /> Net Revenue
          </h2>
          <p className="mt-1 text-3xl font-bold text-secondary">${data.netRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="mt-2 text-sm text-ink2">
            Deposits minus withdrawals, profits paid and referral commissions.
          </p>
          <div className="mt-4 space-y-2 border-t border-line/60 pt-4 text-sm">
            <p className="flex justify-between"><span className="text-ink2">Deposits</span><span className="font-medium text-ink">${data.deposits.toLocaleString()}</span></p>
            <p className="flex justify-between"><span className="text-ink2">Withdrawals</span><span className="font-medium text-ink">-${data.withdrawals.toLocaleString()}</span></p>
            <p className="flex justify-between"><span className="text-ink2">Profits paid</span><span className="font-medium text-ink">-${data.profitsPaid.toLocaleString()}</span></p>
            <p className="flex justify-between"><span className="text-ink2">Referral commissions</span><span className="font-medium text-ink">-${data.referralsPaid.toLocaleString()}</span></p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="mb-4 font-semibold text-ink">Financial Health</h2>
          <div className="space-y-4">
            {[
              { label: 'Deposit to withdrawal ratio', value: data.withdrawals > 0 ? (data.deposits / data.withdrawals).toFixed(2) : '∞' },
              { label: 'Total invested', value: `$${data.investments.toLocaleString()}` },
              { label: 'Users', value: data.users.toLocaleString() },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-xl bg-surface2 px-4 py-3 text-sm">
                <span className="text-ink2">{row.label}</span>
                <span className="font-semibold text-ink">{row.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
