import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartTooltip } from './chartTheme'

interface EarningsChartProps {
  data: { date: string; profit: number }[]
  height?: number
}

export function EarningsChart({ data, height = 260 }: EarningsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C63FF" stopOpacity={0.45} />
            <stop offset="60%" stopColor="#00D4FF" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="profitStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6C63FF" />
            <stop offset="100%" stopColor="#00D4FF" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 6" stroke="var(--line)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v: number) => `$${v}`}
        />
        <Tooltip {...chartTooltip} formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Profit']} />
        <Area
          type="monotone"
          dataKey="profit"
          stroke="url(#profitStroke)"
          strokeWidth={2.5}
          fill="url(#profitFill)"
          dot={false}
          activeDot={{ r: 4, fill: '#00D4FF' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
