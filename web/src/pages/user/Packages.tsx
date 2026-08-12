import { useState } from 'react'
import { App, Button, Modal } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Boxes, TrendingUp, CalendarDays, Banknote, ShieldCheck, Zap, Gem, Wallet } from 'lucide-react'
import { usePackages, useDashboard, useInvestments, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { formatMoney } from '../../lib/format'
import type { PackagePlan } from '../../lib/types'

const iconMap: Record<string, typeof Zap> = {
  seedling: TrendingUp,
  layers: Boxes,
  zap: Zap,
  crown: TrendingUp,
  gem: Zap,
  shield: ShieldCheck,
  award: TrendingUp,
  diamond: Gem,
}

export default function Packages() {
  const { data: packages, isLoading } = usePackages()
  const { data: dashboard } = useDashboard()
  const { data: investments } = useInvestments()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [selected, setSelected] = useState<PackagePlan | null>(null)
  const [buying, setBuying] = useState(false)

  const balance = dashboard?.balance ?? 0
  const purchasedIds = new Set((investments ?? []).map((i) => i.packageId).filter(Boolean))

  const buy = async () => {
    if (!selected) return
    try {
      setBuying(true)
      await api.post('/investments/buy', { packageId: selected.id, useBalance: true })
      message.success(`${selected.name} package purchased — paid from your balance`)
      setSelected(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.deposits })
      queryClient.invalidateQueries({ queryKey: queryKeys.investments })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals })
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBuying(false)
    }
  }

  if (isLoading || !packages) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Investment Packages"
        subtitle="Choose a package, pay with your preferred method, and start earning daily returns"
        actions={
          <div className="rounded-xl border border-line bg-surface px-4 py-2 text-sm">
            <span className="text-ink2">Available balance: </span>
            <span className="font-bold text-secondary">${formatMoney(balance)}</span>
          </div>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {packages.map((pkg, index) => {
          const Icon = iconMap[pkg.icon ?? 'zap'] ?? Zap
          return (
            <GlassCard
              key={pkg.id}
              hover
              delay={index * 0.06}
              className="relative flex flex-col overflow-hidden p-6"
            >
              <div className="absolute -top-14 -right-14 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl brand-gradient text-white shadow-lg">
                  <Icon size={22} />
                </div>
                <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">
                  {pkg.dailyPercentage}% daily
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink">{pkg.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-ink2">{pkg.description}</p>
              <p className="mt-4 text-3xl font-extrabold text-ink">${formatMoney(pkg.investmentAmount)}</p>
              <div className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink2"><TrendingUp size={15} /> Daily profit</span>
                  <span className="font-semibold text-secondary">${formatMoney(Number(pkg.investmentAmount) * Number(pkg.dailyPercentage) / 100)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink2"><CalendarDays size={15} /> Duration</span>
                  <span className="font-semibold text-ink">{pkg.durationDays} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink2"><Banknote size={15} /> Total return</span>
                  <span className="font-semibold text-ink">${formatMoney(pkg.totalReturn)}</span>
                </div>
              </div>
              {purchasedIds.has(pkg.id) ? (
                <Button
                  size="large"
                  block
                  disabled
                  className="mt-6 border-none font-semibold text-secondary"
                >
                  Invested
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  block
                  className="brand-gradient mt-6 border-none font-semibold"
                  onClick={() => setSelected(pkg)}
                >
                  Invest now
                </Button>
              )}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink2">
                <ShieldCheck size={13} className="text-secondary" /> Principal returned at maturity
              </p>
            </GlassCard>
          )
        })}
      </div>

      <Modal
        open={!!selected}
        onCancel={() => setSelected(null)}
        onOk={buy}
        okText={buying ? 'Activating…' : 'Confirm & activate'}
        okButtonProps={{ disabled: selected ? balance < Number(selected.investmentAmount) : false }}
        confirmLoading={buying}
        cancelText="Cancel"
        centered
        title="Confirm package purchase"
      >
        {selected && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 p-3 text-sm">
              <span className="text-ink2">Package</span>
              <span className="font-semibold text-ink">{selected.name}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 p-3 text-sm">
              <span className="text-ink2">Investment amount</span>
              <span className="font-bold text-ink">${formatMoney(selected.investmentAmount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 p-3 text-sm">
              <span className="text-ink2">Daily profit</span>
              <span className="font-semibold text-secondary">${formatMoney(Number(selected.investmentAmount) * Number(selected.dailyPercentage) / 100)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 p-3 text-sm">
              <span className="text-ink2">Total return ({selected.durationDays} days)</span>
              <span className="font-semibold text-ink">${formatMoney(selected.totalReturn)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 p-3 text-sm">
              <span className="text-ink2">Available balance</span>
              <span className="font-semibold text-secondary">${formatMoney(balance)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 p-3 text-sm">
              <span className="text-ink2">Balance after purchase</span>
              <span className="font-semibold text-ink">${formatMoney(Math.max(0, balance - Number(selected.investmentAmount)))}</span>
            </div>
            {balance < Number(selected.investmentAmount) && (
              <div className="rounded-xl border border-danger/25 bg-danger/5 p-3 text-sm font-medium text-danger">
                Insufficient balance — please deposit funds to your account before purchasing this package.
              </div>
            )}
            <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-ink2">
              <Wallet size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>
                The amount is deducted from your account balance and your investment activates instantly — no deposit or approval needed.
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
