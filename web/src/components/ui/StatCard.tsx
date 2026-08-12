import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { CountUp } from './CountUp'
import { GlassCard } from './GlassCard'

interface StatCardProps {
  label: string
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  icon: LucideIcon
  gradient: string
  delay?: number
  sub?: string
}

export function StatCard({ label, value, decimals = 2, prefix = '$', suffix = '', icon: Icon, gradient, delay = 0, sub }: StatCardProps) {
  return (
    <GlassCard hover delay={delay} className="relative overflow-hidden p-5">
      <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl`} />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-ink2">{label}</p>
          <motion.div
            key={value}
            initial={{ opacity: 0.4, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl font-bold text-ink"
          >
            <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
          </motion.div>
          {sub && <p className="text-xs text-ink2">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          <Icon size={20} />
        </div>
      </div>
    </GlassCard>
  )
}
