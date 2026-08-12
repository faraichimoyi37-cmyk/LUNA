import { Link } from 'react-router-dom'

interface LogoProps {
  size?: number
  withText?: boolean
  textClassName?: string
  to?: string
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="luna-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6C63FF" />
          <stop offset="0.5" stopColor="#00D4FF" />
          <stop offset="1" stopColor="#00E5A8" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#luna-logo-g)" />
      <path d="M32 14 L46 50 H40 L32 28 L24 50 H18 Z" fill="#0B1020" />
    </svg>
  )
}

export function Logo({ size = 40, withText = true, textClassName = '', to }: LogoProps) {
  const content = (
    <span className="flex items-center gap-3">
      <LogoMark size={size} />
      {withText && (
        <span className={`text-xl font-extrabold tracking-tight ${textClassName}`}>
          <span className="gradient-text">LUNA</span>
        </span>
      )}
    </span>
  )
  if (to) return <Link to={to}>{content}</Link>
  return content
}
