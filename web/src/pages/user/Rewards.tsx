import { useState } from 'react'
import { App, Button, Modal } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Gift, Sparkles, PartyPopper, Coins } from 'lucide-react'
import { useLuckyConfig, useDashboard, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { formatMoney } from '../../lib/format'
import type { LuckyResult } from '../../lib/types'

export default function Rewards() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { data: lucky, isLoading: luckyLoading } = useLuckyConfig()
  const { data: dashboard } = useDashboard()
  const [opening, setOpening] = useState(false)
  const [prize, setPrize] = useState<LuckyResult | null>(null)

  const balance = dashboard?.balance ?? 0

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    queryClient.invalidateQueries({ queryKey: queryKeys.lucky })
  }

  const openBox = async () => {
    setOpening(true)
    try {
      const res = await api.post<LuckyResult>('/lucky/open')
      setPrize(res)
      refresh()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setOpening(false)
    }
  }

  if (luckyLoading && !lucky) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Lucky box"
        subtitle="Pay a small amount for a chance to win up to 8x your payment. Once per day."
        actions={
          <div className="rounded-xl border border-line bg-surface px-4 py-2 text-sm">
            <span className="text-ink2">Balance: </span>
            <span className="font-bold text-secondary">${formatMoney(balance)}</span>
          </div>
        }
      />

      <div className="mx-auto max-w-2xl">
        <GlassCard className="relative overflow-hidden p-6">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
            <Gift size={18} className="text-accent" /> Mystery box
          </h2>
          <p className="mb-4 text-sm text-ink2">
            Pay <span className="font-semibold text-ink">${formatMoney(lucky?.price ?? 0)}</span> to open a mystery box worth up to{' '}
            <span className="font-semibold text-ink">{lucky?.maxMultiplier ?? 8}x</span> your payment. Once per day.
          </p>

          {lucky?.openedToday ? (
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <Coins size={20} className="shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-ink">You already opened your box today</p>
                <p className="text-xs text-ink2">Come back tomorrow for another chance to win.</p>
              </div>
            </div>
          ) : (
            <>
              <Button
                type="primary"
                size="large"
                block
                loading={opening}
                onClick={openBox}
                disabled={!lucky?.enabled || balance < (lucky?.price ?? 0)}
                className="brand-gradient border-none font-semibold"
              >
                <Gift size={16} className="mr-2" /> Open for ${formatMoney(lucky?.price ?? 0)}
              </Button>
              {!lucky?.enabled && <p className="mt-3 text-center text-sm text-ink2">The lucky box is currently closed.</p>}
              {lucky?.enabled && balance < (lucky?.price ?? 0) && (
                <p className="mt-3 text-center text-sm text-ink2">Your balance is too low to open the lucky box.</p>
              )}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink2">
                <Sparkles size={13} className="text-accent" /> Win {lucky?.minMultiplier ?? 2}x to {lucky?.maxMultiplier ?? 8}x your payment
              </p>
            </>
          )}
        </GlassCard>
      </div>

      <Modal open={!!prize} onCancel={() => setPrize(null)} footer={null} centered width={360} destroyOnClose>
        {prize && (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
              <PartyPopper size={30} className="text-secondary" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-ink">You won ${formatMoney(prize.prize)}!</h2>
            <p className="mt-1 text-sm text-ink2">
              {prize.multiplier}x your ${formatMoney(prize.price)} payment
            </p>
            <div className="mt-4 rounded-xl border border-line bg-surface2 p-3 text-sm">
              <span className="text-ink2">New balance: </span>
              <span className="font-bold text-secondary">${formatMoney(prize.balanceAfter)}</span>
            </div>
            <Button type="primary" block size="large" className="brand-gradient mt-5 border-none font-semibold" onClick={() => setPrize(null)}>
              Awesome
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
