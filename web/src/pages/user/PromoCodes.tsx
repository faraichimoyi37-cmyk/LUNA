import { useState } from 'react'
import { App, Button, Input } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { BadgePercent, Sparkles } from 'lucide-react'
import { useDashboard, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { formatMoney } from '../../lib/format'

export default function PromoCodes() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { data: dashboard } = useDashboard()
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  const balance = dashboard?.balance ?? 0

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
  }

  const redeem = async () => {
    if (!code.trim()) {
      message.error('Enter your promo code')
      return
    }
    setRedeeming(true)
    try {
      const res = await api.post<{ amount: number }>('/users/promos/redeem', { code })
      message.success(`Promo code redeemed — $${formatMoney(res.amount)} added to your balance`)
      setCode('')
      refresh()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Promo codes"
        subtitle="Redeem a promo code to receive its balance reward"
        actions={
          <div className="rounded-xl border border-line bg-surface px-4 py-2 text-sm">
            <span className="text-ink2">Balance: </span>
            <span className="font-bold text-secondary">${formatMoney(balance)}</span>
          </div>
        }
      />

      <div className="mx-auto max-w-2xl">
        <GlassCard className="p-6">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
            <BadgePercent size={18} className="text-accent" /> Redeem promo code
          </h2>
          <p className="mb-4 text-sm text-ink2">Enter a promo code to receive its balance reward. Promo codes also unlock discounts when buying packages.</p>
          <div className="flex gap-2">
            <Input
              size="large"
              placeholder="WELCOME10"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onPressEnter={redeem}
              maxLength={20}
            />
            <Button size="large" loading={redeeming} onClick={redeem} className="brand-gradient border-none font-semibold">
              Redeem
            </Button>
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-ink2">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-accent" />
            <span>Each promo code has a usage limit and expiration date set by the platform.</span>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
