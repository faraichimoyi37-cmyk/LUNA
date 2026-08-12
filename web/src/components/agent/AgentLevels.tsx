import { Button } from 'antd'
import { BadgeCheck, Rocket } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'

interface AgentLevel {
  name: string
  salary: number
  requirement: string
}

const levels: AgentLevel[] = [
  {
    name: 'Junior Agent',
    salary: 100,
    requirement:
      'When your team has 12 A-level formal position members, you will obtain the Junior Agent position and receive a fixed monthly salary of 100 USDT.',
  },
  {
    name: 'Intermediate Agent',
    salary: 180,
    requirement:
      'When your team has 20 A-level formal position members, you will obtain the Intermediate Agent position and receive a fixed monthly salary of 180 USDT.',
  },
  {
    name: 'Senior Agent',
    salary: 300,
    requirement:
      'When the total number of A+B+C-level formal position members in your team reaches 100, you will obtain the Senior Agent position and receive a fixed monthly salary of 300 USDT.',
  },
  {
    name: 'Experienced Agent',
    salary: 1200,
    requirement:
      'When the total number of A+B+C-level formal position members in your team reaches 500, you will obtain the Experienced Agent position and receive a fixed monthly salary of 1,200 USDT.',
  },
  {
    name: 'Regional Agent',
    salary: 3000,
    requirement:
      'When the total number of A+B+C-level formal position members in your team reaches 1,200, you will obtain the Regional Agent position and receive a fixed monthly salary of 3,000 USDT.',
  },
  {
    name: 'Strategic Agent',
    salary: 10000,
    requirement:
      'When the total number of A+B+C-level formal position members in your team reaches 3,000, you will obtain the Strategic Agent position and receive a fixed monthly salary of 10,000 USDT.',
  },
]

const formatSalary = (salary: number) =>
  `USDT ${salary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function AgentLevels() {
  const scrollToApply = () => {
    document.getElementById('agent-apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ink">Agent Program</h2>
        <p className="mt-1 text-sm text-ink2">Build your team and climb the ranks to earn a fixed monthly salary.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {levels.map((level, index) => (
          <GlassCard key={level.name} className="flex flex-col p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold text-ink">
                <BadgeCheck size={18} className="shrink-0 text-primary" /> {level.name}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-ink2">Level {index + 1}</span>
            </div>

            <p className="mt-4 text-2xl font-bold text-ink">{formatSalary(level.salary)}</p>
            <p className="text-xs font-medium uppercase tracking-wider text-secondary">Fixed monthly salary</p>

            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink2">{level.requirement}</p>

            <Button type="primary" size="large" className="brand-gradient mt-5 border-none font-semibold" onClick={scrollToApply}>
              Apply Now
            </Button>
          </GlassCard>
        ))}
      </div>

      <p className="flex items-center gap-2 text-xs text-ink2">
        <Rocket size={14} className="text-primary" /> Requirements are based on verified formal position members in your team.
      </p>
    </section>
  )
}
