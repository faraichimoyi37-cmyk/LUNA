import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { COLORS, chartTooltip } from './chartTheme'
import { formatMoney } from '../../lib/format'

interface DonutChartProps {
  data: { name: string; value: number }[]
  height?: number
}

export function DonutChart({ data, height = 240 }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const safeData = data.filter((d) => d.value > 0)

  if (!safeData.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-ink2">
        No active investments yet
      </div>
    )
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip
            {...chartTooltip}
            formatter={(value) => [`$${formatMoney(Number(value ?? 0))}`, 'Invested']}
          />
          <Pie
            data={safeData}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={3}
            stroke="none"
          >
            {safeData.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[11px] uppercase tracking-wider text-ink2">Portfolio</p>
        <p className="text-xl font-bold text-ink">${formatMoney(total)}</p>
      </div>
    </div>
  )
}
