import { motion, type MotionProps } from 'framer-motion'
import type { HTMLAttributes, ReactNode } from 'react'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  delay?: number
}

export function GlassCard({ children, hover = false, delay = 0, className = '', ...rest }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className={`glass-card ${hover ? 'glass-card-hover' : ''} ${className}`}
      {...(rest as MotionProps)}
    >
      {children}
    </motion.div>
  )
}
