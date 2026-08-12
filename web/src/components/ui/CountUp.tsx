import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '../../lib/format'

interface CountUpProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
}

export function CountUp({ value, decimals = 0, prefix = '', suffix = '', duration = 1.1 }: CountUpProps) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    prevRef.current = to
    if (from === to) {
      setDisplay(to)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const progress = Math.min(1, (t - start) / (duration * 1000))
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (to - from) * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return (
    <span>
      {prefix}
      {formatMoney(display, decimals)}
      {suffix}
    </span>
  )
}
