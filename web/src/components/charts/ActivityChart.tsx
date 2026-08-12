import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartTooltip } from './chartTheme'

interface ActivityChartProps {
  data: { date: string; count: number }[]
  height?: number
}

export function ActivityChart({ data, height = 240 }: ActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E5A8" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#00E5A8" stopOpacity={0.15} />
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
        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip {...chartTooltip} cursor={{ fill: 'rgba(0,229,168,0.08)' }} />
        <Bar dataKey="count" fill="url(#activityFill)" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
