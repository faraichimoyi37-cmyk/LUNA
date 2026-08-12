import { useMemo, useRef, useState } from 'react'
import { App, Button, InputNumber, Modal } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Disc3, PartyPopper } from 'lucide-react'
import { useSpinConfig, useDashboard, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { formatMoney } from '../../lib/format'
import type { SpinResult } from '../../lib/types'

const SEGMENT_ANGLE = 360 / 8
const COLORS = ['#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#14b8a6', '#6366f1']

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}

function wedgePath(cx: number, cy: number, r: number, start: number, end: number) {
  const p1 = polar(cx, cy, r, start)
  const p2 = polar(cx, cy, r, end)
  return `M ${cx} ${cy} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`
}

function formatMult(m: number) {
  return `${formatMoney(m)}x`
}

export default function SpinWheel() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { data: config, isLoading } = useSpinConfig()
  const { data: dashboard } = useDashboard()
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [bet, setBet] = useState<number | null>(null)

  const balance = dashboard?.balance ?? 0
  const multipliers = config?.multipliers ?? []
  const amount = bet ?? config?.cost ?? 2
  const minBet = config?.minBet ?? 2

  const wheelSVG = useMemo(() => {
    const cx = 150
    const cy = 150
    const r = 140
    return multipliers.map((value, i) => {
      const start = i * SEGMENT_ANGLE
      const end = start + SEGMENT_ANGLE
      const mid = start + SEGMENT_ANGLE / 2
      const label = polar(cx, cy, 96, mid)
      return (
        <g key={i}>
          <path d={wedgePath(cx, cy, r, start, end)} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />
          <text x={label.x} y={label.y} fill="#fff" fontSize={16} fontWeight={700} textAnchor="middle" dominantBaseline="central">
            {formatMult(value)}
          </text>
        </g>
      )
    })
  }, [multipliers])

  const spin = async () => {
    if (spinning) return
    if (!amount || amount < minBet) {
      message.error(`The minimum spin amount is $${minBet}`)
      return
    }
    if (amount > balance) {
      message.error('Your balance is too low for that amount')
      return
    }
    setSpinning(true)
    try {
      const res = await api.post<SpinResult>('/spin/spin', { amount })
      const segAngle = 360 / res.multipliers.length
      const mid = res.segmentIndex * segAngle + segAngle / 2
      const targetDelta = (360 - mid) % 360
      const currentMod = rotation % 360
      const adjustment = (targetDelta - currentMod + 360) % 360
      const next = rotation + 5 * 360 + adjustment
      setRotation(next)
      setTimeout(() => {
        setResult(res)
        setSpinning(false)
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
        queryClient.invalidateQueries({ queryKey: queryKeys.spin })
      }, 4300)
    } catch (error) {
      message.error(errMsg(error))
      setSpinning(false)
    }
  }

  if (isLoading && !config) return <PageLoader />

  const canSpin = config?.enabled && amount >= minBet && amount <= balance && !spinning

  return (
    <div>
      <PageHeader
        title="Spin Wheel"
        subtitle="Choose your amount and spin for a cash prize"
        actions={
          <div className="rounded-xl border border-line bg-surface px-4 py-2 text-sm">
            <span className="text-ink2">Balance: </span>
            <span className="font-bold text-secondary">${formatMoney(balance)}</span>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="flex flex-col items-center p-8">
          <div className="relative">
            <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
              <div className="h-0 w-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-accent drop-shadow" />
            </div>
            <div
              className="rounded-full shadow-2xl"
              style={{
                width: 300,
                height: 300,
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 4.2s cubic-bezier(0.15, 0.6, 0.2, 1)' : 'none',
              }}
            >
              <svg viewBox="0 0 300 300" className="h-full w-full">
                {wheelSVG}
                <circle cx={150} cy={150} r={26} fill="#fff" stroke="#e2e8f0" strokeWidth={2} />
              </svg>
            </div>
          </div>
          <div className="mt-6 w-full">
            <label className="mb-2 block text-sm font-medium text-ink2">Spin amount (minimum ${minBet})</label>
            <InputNumber
              size="large"
              min={minBet}
              precision={2}
              prefix="$"
              className="w-full"
              value={amount}
              onChange={(v) => setBet(v ?? null)}
              disabled={spinning}
            />
          </div>
          <Button
            type="primary"
            size="large"
            className="brand-gradient mt-4 w-full border-none font-semibold"
            onClick={spin}
            loading={spinning}
            disabled={!canSpin}
          >
            {spinning ? 'Spinning…' : `Spin for $${formatMoney(amount)}`}
          </Button>
          {!config?.enabled && <p className="mt-3 text-sm text-ink2">The spin wheel is currently unavailable.</p>}
          {config?.enabled && amount > balance && (
            <p className="mt-3 text-sm text-ink2">Your balance is too low for that amount.</p>
          )}
          {(config?.winnersToday ?? 0) >= (config?.dailyWinners ?? 1) ? (
            <p className="mt-4 w-full rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-center text-sm text-ink">
              Today's winner quota is reached — the wheel only pays its lowest prize until midnight.
            </p>
          ) : (
            <p className="mt-4 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-center text-xs text-ink2">
              {config?.winnersToday ?? 0} of {config?.dailyWinners ?? 1} daily winner{config?.dailyWinners === 1 ? '' : 's'} claimed
              today. Once reached, spins pay only the lowest prize until midnight.
            </p>
          )}
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="mb-3 font-semibold text-ink">Prizes</h2>
            <p className="mb-4 text-xs text-ink2">
              The wheel is fixed to {multipliers.length} multipliers. Your prize = spin amount × multiplier. You win when the multiplier
              takes the prize to at least your spin amount.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {multipliers.map((value, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-ink2">
                    <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    Multiplier {i + 1}
                  </span>
                  <span className="font-semibold text-ink">{formatMult(value)}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-ink2">
              <Disc3 size={14} className="shrink-0 text-accent" />
              If the prize is lower than your spin amount, you lose the difference — spin wisely!
            </p>
          </GlassCard>
        </div>
      </div>

      <Modal open={!!result} onCancel={() => setResult(null)} footer={null} centered width={360} destroyOnClose>
        {result && (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
              <PartyPopper size={30} className="text-secondary" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-ink">
              {result.won ? `You won $${formatMoney(result.prize)}!` : `You received $${formatMoney(result.prize)}`}
            </h2>
            <p className="mt-1 text-sm text-ink2">
              Spin amount: ${formatMoney(result.cost)}
            </p>
            {!result.won && (
              <p className="mt-2 text-xs text-accent">
                Today's winner quota is already reached — spins pay only the lowest prize until midnight.
              </p>
            )}
            <div className="mt-4 rounded-xl border border-line bg-surface2 p-3 text-sm">
              <span className="text-ink2">New balance: </span>
              <span className="font-bold text-secondary">${formatMoney(result.balanceAfter)}</span>
            </div>
            <Button type="primary" block size="large" className="brand-gradient mt-5 border-none font-semibold" onClick={() => setResult(null)}>
              Spin again
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
