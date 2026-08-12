import { useMemo, useState } from 'react'
import { InputNumber, Slider, Table } from 'antd'
import { Calculator as CalcIcon, TrendingUp, Banknote, Wallet } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { EarningsChart } from '../../components/charts/EarningsChart'
import { formatMoney } from '../../lib/format'

export default function Calculator() {
  const [amount, setAmount] = useState(100)
  const [dailyPercent, setDailyPercent] = useState(8)
  const [days, setDays] = useState(70)

  const results = useMemo(() => {
    const daily = (amount * dailyPercent) / 100
    const totalProfit = daily * days
    const totalReturn = amount + totalProfit
    const series = Array.from({ length: Math.min(days, 30) }, (_, index) => ({
      date: `Day ${index + 1}`,
      profit: Number((daily * (index + 1)).toFixed(2)),
    }))
    return { daily, totalProfit, totalReturn, series }
  }, [amount, dailyPercent, days])

  return (
    <div>
      <PageHeader title="Earnings Calculator" subtitle="Estimate your returns before you invest" />

      <div className="grid gap-6 lg:grid-cols-5">
        <GlassCard className="space-y-6 p-6 lg:col-span-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Investment amount (USDT)</label>
            <InputNumber value={amount} onChange={(v) => setAmount(Number(v ?? 0))} min={1} max={1000000} precision={2} prefix="$" className="w-full" size="large" />
            <Slider min={10} max={5000} step={10} value={amount} onChange={(v) => setAmount(v)} className="mt-4" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Daily return (%)</label>
            <InputNumber value={dailyPercent} onChange={(v) => setDailyPercent(Number(v ?? 0))} min={1} max={20} precision={2} suffix="%" className="w-full" size="large" />
            <Slider min={1} max={15} step={0.5} value={dailyPercent} onChange={(v) => setDailyPercent(v)} className="mt-4" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Duration (days)</label>
            <InputNumber value={days} onChange={(v) => setDays(Number(v ?? 0))} min={7} max={365} precision={0} suffix="days" className="w-full" size="large" />
            <Slider min={7} max={120} step={1} value={days} onChange={(v) => setDays(v)} className="mt-4" />
          </div>
        </GlassCard>

        <div className="space-y-6 lg:col-span-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 text-xs text-ink2"><TrendingUp size={14} className="text-secondary" /> Daily profit</div>
              <p className="mt-2 text-xl font-bold text-ink">${formatMoney(results.daily)}</p>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 text-xs text-ink2"><Banknote size={14} className="text-accent" /> Total profit</div>
              <p className="mt-2 text-xl font-bold text-ink">${formatMoney(results.totalProfit)}</p>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 text-xs text-ink2"><Wallet size={14} className="text-primary" /> Total return</div>
              <p className="mt-2 text-xl font-bold text-secondary">${formatMoney(results.totalReturn)}</p>
            </GlassCard>
          </div>

          <GlassCard className="p-6">
            <h2 className="mb-4 font-semibold text-ink">Projected Earnings</h2>
            <EarningsChart data={results.series} height={220} />
          </GlassCard>

          <GlassCard className="p-0">
            <Table
              rowKey="day"
              pagination={false}
              size="small"
              dataSource={[
                { key: '1', label: 'Day 1', value: results.daily },
                { key: '7', label: 'Day 7', value: results.daily * 7 },
                { key: '30', label: 'Day 30', value: results.daily * 30 },
                { key: 'end', label: `Day ${days} (maturity)`, value: results.totalProfit },
              ]}
              columns={[
                { title: 'Period', dataIndex: 'label', render: (v: string) => <span className="font-medium text-ink">{v}</span> },
                { title: 'Cumulative earnings', dataIndex: 'value', render: (v: number) => <span className="font-semibold text-secondary">${formatMoney(v)}</span> },
              ]}
            />
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
