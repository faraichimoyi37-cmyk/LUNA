import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type {
  AdminSpin,
  AdminSpinStats,
  AdminStats,
  AdminTransaction,
  AdminUser,
  AdminUserDetail,
  AgentApplication,
  Announcement,
  AppNotification,
  ActivityItem,
  AuditLog,
  ContactMessage,
  DashboardData,
  Deposit,
  Investment,
  KycRecord,
  LeaderboardEntry,
  LuckyConfig,
  PackagePlan,
  Paginated,
  PromoCode,
  ReferralData,
  ReportData,
  SiteConfig,
  SpinConfig,
  Transaction,
  Voucher,
  Withdrawal,
} from '../lib/types'
import { useAuthStore } from '../store/auth'

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  investments: ['investments'] as const,
  packages: ['packages'] as const,
  transactions: ['transactions'] as const,
  deposits: ['deposits'] as const,
  withdrawals: ['withdrawals'] as const,
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread'] as const,
  referrals: ['referrals'] as const,
  leaderboard: ['leaderboard'] as const,
  kyc: ['kyc'] as const,
  agent: ['agent'] as const,
  config: ['config'] as const,
  activity: ['activity'] as const,
  user: ['user'] as const,
  lucky: ['lucky'] as const,
  spin: ['spin'] as const,
  admin: {
    stats: ['admin', 'stats'] as const,
    users: ['admin', 'users'] as const,
    deposits: ['admin', 'deposits'] as const,
    withdrawals: ['admin', 'withdrawals'] as const,
    transactions: ['admin', 'transactions'] as const,
    packages: ['admin', 'packages'] as const,
    investments: ['admin', 'investments'] as const,
    referrals: ['admin', 'referrals'] as const,
    kyc: ['admin', 'kyc'] as const,
    agents: ['admin', 'agents'] as const,
    logs: ['admin', 'logs'] as const,
    announcements: ['admin', 'announcements'] as const,
    reports: ['admin', 'reports'] as const,
    settings: ['admin', 'settings'] as const,
    support: ['admin', 'support'] as const,
    vouchers: ['admin', 'vouchers'] as const,
    promos: ['admin', 'promos'] as const,
    spins: ['admin', 'spins'] as const,
    spinsStats: ['admin', 'spins', 'stats'] as const,
  },
}

export function useSiteConfig() {
  return useQuery({ queryKey: queryKeys.config, queryFn: () => api.get<SiteConfig>('/config/public') })
}

export function useActivity() {
  return useQuery({
    queryKey: queryKeys.activity,
    queryFn: () => api.get<ActivityItem[]>('/config/activity'),
    refetchInterval: 30_000,
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get<DashboardData>('/users/dashboard'),
    refetchInterval: 30_000,
  })
}

export function usePackages() {
  return useQuery({ queryKey: queryKeys.packages, queryFn: () => api.get<PackagePlan[]>('/packages') })
}

export function useInvestments() {
  return useQuery({
    queryKey: queryKeys.investments,
    queryFn: () => api.get<Investment[]>('/investments'),
    refetchInterval: 30_000,
  })
}

export function useTransactions(page = 1, type?: string) {
  return useQuery({
    queryKey: [...queryKeys.transactions, page, type],
    queryFn: () =>
      api.get<Paginated<Transaction>>(
        `/transactions?page=${page}&limit=12${type && type !== 'ALL' ? `&type=${type}` : ''}`,
      ),
  })
}

export function useDeposits() {
  return useQuery({ queryKey: queryKeys.deposits, queryFn: () => api.get<Deposit[]>('/deposits') })
}

export function useWithdrawals() {
  return useQuery({ queryKey: queryKeys.withdrawals, queryFn: () => api.get<Withdrawal[]>('/withdrawals') })
}

export function useNotifications() {
  return useQuery({ queryKey: queryKeys.notifications, queryFn: () => api.get<AppNotification[]>('/notifications') })
}

export function useUnreadCount() {
  return useQuery({ queryKey: queryKeys.unreadCount, queryFn: () => api.get<{ count: number }>('/notifications/unread-count') })
}

export function useReferrals() {
  return useQuery({ queryKey: queryKeys.referrals, queryFn: () => api.get<ReferralData>('/users/referrals') })
}

export function useLeaderboard() {
  return useQuery({ queryKey: queryKeys.leaderboard, queryFn: () => api.get<LeaderboardEntry[]>('/users/leaderboard') })
}

export function useKyc() {
  return useQuery({ queryKey: queryKeys.kyc, queryFn: () => api.get<KycRecord | null>('/kyc') })
}

export function useAgentApplication() {
  return useQuery({ queryKey: queryKeys.agent, queryFn: () => api.get<AgentApplication | null>('/agents/my') })
}

export function useAdminAgentApplications() {
  return useQuery({ queryKey: queryKeys.admin.agents, queryFn: () => api.get<AgentApplication[]>('/admin/agents') })
}

export function useMe() {
  const token = useAuthStore((state) => state.token)
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: () => api.get<ReturnType<typeof useAuthStore.getState>['user'] & Record<string, unknown>>('/users/me'),
    enabled: !!token,
  })
}

export function useAdminStats() {
  return useQuery({ queryKey: queryKeys.admin.stats, queryFn: () => api.get<AdminStats>('/admin/stats') })
}

export function useAdminReports() {
  return useQuery({ queryKey: queryKeys.admin.reports, queryFn: () => api.get<ReportData>('/admin/reports') })
}

export function useAdminUsers(page = 1, search = '', status = 'ALL') {
  return useQuery({
    queryKey: [...queryKeys.admin.users, page, search, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '100' })
      if (search) params.set('search', search)
      if (status && status !== 'ALL') params.set('status', status)
      const res = await api.get<Paginated<AdminUser> | AdminUser[]>(`/admin/users?${params.toString()}`)
      if (Array.isArray(res)) {
        return { data: res, page, limit: res.length, total: res.length, pages: 1 }
      }
      return res
    },
  })
}

export function useAdminUser(id?: string) {
  return useQuery({
    queryKey: [...queryKeys.admin.users, 'detail', id],
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}`),
    enabled: !!id,
  })
}

export function useAdminDeposits(page = 1, status = 'ALL') {
  return useQuery({
    queryKey: [...queryKeys.admin.deposits, page, status],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (status && status !== 'ALL') params.set('status', status)
      return api.get<Paginated<Deposit>>(`/admin/deposits?${params.toString()}`)
    },
  })
}

export function useAdminWithdrawals(page = 1, status = 'ALL') {
  return useQuery({
    queryKey: [...queryKeys.admin.withdrawals, page, status],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (status && status !== 'ALL') params.set('status', status)
      return api.get<Paginated<Withdrawal>>(`/admin/withdrawals?${params.toString()}`)
    },
  })
}

export function useAdminPackages() {
  return useQuery({ queryKey: queryKeys.admin.packages, queryFn: () => api.get<PackagePlan[]>('/admin/packages') })
}

export type AdminInvestment = Investment & {
  user?: { id: string; fullname: string; email: string }
  paidFromBalance?: boolean
}

export function useAdminInvestments(page = 1, status?: string) {
  return useQuery({
    queryKey: [...queryKeys.admin.investments, page, status],
    queryFn: () =>
      api.get<Paginated<AdminInvestment>>(
        `/admin/investments?page=${page}&limit=20${status && status !== 'ALL' ? `&status=${status}` : ''}`,
      ),
  })
}

export function useAdminTransactions(page = 1, type?: string) {
  return useQuery({
    queryKey: [...queryKeys.admin.transactions, page, type],
    queryFn: () =>
      api.get<Paginated<AdminTransaction>>(
        `/admin/transactions?page=${page}&limit=20${type && type !== 'ALL' ? `&type=${type}` : ''}`,
      ),
  })
}

export function useAdminReferrals() {
  return useQuery({
    queryKey: queryKeys.admin.referrals,
    queryFn: () =>
      api.get<{ total: number; count: number; payments: (Transaction & { user?: { id: string; fullname: string; email: string } })[] }>(
        '/admin/referrals',
      ),
  })
}

export function useAdminKyc() {
  return useQuery({ queryKey: queryKeys.admin.kyc, queryFn: () => api.get<(KycRecord & { user?: { id: string; fullname: string; email: string } })[]>('/admin/kyc') })
}

export function useAdminLogs(page = 1) {
  return useQuery({
    queryKey: [...queryKeys.admin.logs, page],
    queryFn: () => api.get<Paginated<AuditLog>>(`/admin/logs?page=${page}`),
  })
}

export function useAdminAnnouncements() {
  return useQuery({ queryKey: queryKeys.admin.announcements, queryFn: () => api.get<Announcement[]>('/admin/announcements') })
}

export function useAdminSettings() {
  return useQuery({ queryKey: queryKeys.admin.settings, queryFn: () => api.get<Record<string, string | number | boolean>>('/admin/settings') })
}

export function useAdminSupport() {
  return useQuery({ queryKey: queryKeys.admin.support, queryFn: () => api.get<ContactMessage[]>('/admin/support') })
}

export function useAdminVouchers() {
  return useQuery({ queryKey: queryKeys.admin.vouchers, queryFn: () => api.get<Voucher[]>('/admin/vouchers') })
}

export function useAdminPromos() {
  return useQuery({ queryKey: queryKeys.admin.promos, queryFn: () => api.get<PromoCode[]>('/admin/promos') })
}

export function useAdminSpins() {
  return useQuery({ queryKey: queryKeys.admin.spins, queryFn: () => api.get<AdminSpin[]>('/admin/spins') })
}

export function useAdminSpinStats() {
  return useQuery({ queryKey: queryKeys.admin.spinsStats, queryFn: () => api.get<AdminSpinStats>('/admin/spins/stats') })
}

export function useLuckyConfig() {
  return useQuery({ queryKey: queryKeys.lucky, queryFn: () => api.get<LuckyConfig>('/lucky') })
}

export function useSpinConfig() {
  return useQuery({ queryKey: queryKeys.spin, queryFn: () => api.get<SpinConfig>('/spin') })
}
