import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface2 text-ink2">
        <Icon size={24} />
      </div>
      <p className="mt-2 font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink2">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
