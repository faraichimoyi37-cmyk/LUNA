import { BadgeCheck } from 'lucide-react'

export function VerifiedBadge({ size = 16, label = 'Verified agent' }: { size?: number; label?: string }) {
  return <BadgeCheck size={size} className="inline-block shrink-0 text-[#3b82f6]" aria-label={label} />
}
