import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  Users,
  Calculator,
  Bell,
  User,
  Shield,
  BadgeCheck,
  LifeBuoy,
  Gift,
  Megaphone,
  BarChart3,
  History,
  Settings,
  Ticket,
  Disc3,
  BadgePercent,
  Briefcase,
} from 'lucide-react'

export interface NavItem {
  labelKey: string
  path: string
  icon: LucideIcon
  end?: boolean
}

export const userNav: NavItem[] = [
  { labelKey: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard, end: true },
  { labelKey: 'nav.packages', path: '/dashboard/packages', icon: Boxes },
  { labelKey: 'nav.investments', path: '/dashboard/investments', icon: TrendingUp },
  { labelKey: 'nav.deposit', path: '/dashboard/deposit', icon: ArrowDownToLine },
  { labelKey: 'nav.withdraw', path: '/dashboard/withdraw', icon: ArrowUpFromLine },
  { labelKey: 'nav.transactions', path: '/dashboard/transactions', icon: Receipt },
  { labelKey: 'nav.referrals', path: '/dashboard/referrals', icon: Users },
  { labelKey: 'nav.gifts', path: '/dashboard/gifts', icon: Ticket },
  { labelKey: 'nav.promos', path: '/dashboard/promos', icon: BadgePercent },
  { labelKey: 'nav.lucky', path: '/dashboard/rewards', icon: Gift },
  { labelKey: 'nav.spin', path: '/dashboard/spin', icon: Disc3 },
  { labelKey: 'nav.calculator', path: '/dashboard/calculator', icon: Calculator },
  { labelKey: 'nav.notifications', path: '/dashboard/notifications', icon: Bell },
  { labelKey: 'nav.profile', path: '/dashboard/profile', icon: User },
  { labelKey: 'nav.agent', path: '/dashboard/agent', icon: Briefcase },
  { labelKey: 'nav.security', path: '/dashboard/security', icon: Shield },
  { labelKey: 'nav.kyc', path: '/dashboard/kyc', icon: BadgeCheck },
  { labelKey: 'nav.support', path: '/dashboard/support', icon: LifeBuoy },
]

export const adminNav: NavItem[] = [
  { labelKey: 'nav.admin', path: '/admin', icon: LayoutDashboard, end: true },
  { labelKey: 'nav.users', path: '/admin/users', icon: Users },
  { labelKey: 'nav.deposits', path: '/admin/deposits', icon: ArrowDownToLine },
  { labelKey: 'nav.withdrawals', path: '/admin/withdrawals', icon: ArrowUpFromLine },
  { labelKey: 'nav.transactions', path: '/admin/transactions', icon: Receipt },
  { labelKey: 'nav.packages', path: '/admin/packages', icon: Boxes },
  { labelKey: 'nav.investments', path: '/admin/investments', icon: TrendingUp },
  { labelKey: 'nav.referrals', path: '/admin/referrals', icon: Gift },
  { labelKey: 'nav.kyc', path: '/admin/kyc', icon: BadgeCheck },
  { labelKey: 'nav.agents', path: '/admin/agents', icon: Briefcase },
  { labelKey: 'nav.announcements', path: '/admin/announcements', icon: Megaphone },
  { labelKey: 'nav.vouchers', path: '/admin/vouchers', icon: Ticket },
  { labelKey: 'nav.promos', path: '/admin/promos', icon: Gift },
  { labelKey: 'nav.spinWheel', path: '/admin/spin-wheel', icon: Disc3 },
  { labelKey: 'nav.reports', path: '/admin/reports', icon: BarChart3 },
  { labelKey: 'nav.logs', path: '/admin/logs', icon: History },
  { labelKey: 'nav.settings', path: '/admin/settings', icon: Settings },
]

export const mobileNav: NavItem[] = [
  { labelKey: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard, end: true },
  { labelKey: 'nav.packages', path: '/dashboard/packages', icon: Boxes },
  { labelKey: 'nav.deposit', path: '/dashboard/deposit', icon: ArrowDownToLine },
  { labelKey: 'nav.withdraw', path: '/dashboard/withdraw', icon: ArrowUpFromLine },
]
