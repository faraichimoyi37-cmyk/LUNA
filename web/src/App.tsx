import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { App as AntApp, Spin } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore, type AuthUser } from './store/auth'
import { api } from './lib/api'
import { connectRealtime } from './lib/websocket'
import { Logo } from './components/ui/Logo'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const NotFound = lazy(() => import('./pages/NotFound'))

const UserLayout = lazy(() => import('./components/layout/UserLayout'))
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'))

const Dashboard = lazy(() => import('./pages/user/Dashboard'))
const Deposit = lazy(() => import('./pages/user/Deposit'))
const Withdraw = lazy(() => import('./pages/user/Withdraw'))
const Packages = lazy(() => import('./pages/user/Packages'))
const Investments = lazy(() => import('./pages/user/Investments'))
const Transactions = lazy(() => import('./pages/user/Transactions'))
const Referrals = lazy(() => import('./pages/user/Referrals'))
const Calculator = lazy(() => import('./pages/user/Calculator'))
const Notifications = lazy(() => import('./pages/user/Notifications'))
const Profile = lazy(() => import('./pages/user/Profile'))
const Agent = lazy(() => import('./pages/user/Agent'))
const Security = lazy(() => import('./pages/user/Security'))
const Kyc = lazy(() => import('./pages/user/Kyc'))
const Support = lazy(() => import('./pages/user/Support'))
const Rewards = lazy(() => import('./pages/user/Rewards'))
const GiftCodes = lazy(() => import('./pages/user/GiftCodes'))
const PromoCodes = lazy(() => import('./pages/user/PromoCodes'))
const SpinWheel = lazy(() => import('./pages/user/SpinWheel'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminDeposits = lazy(() => import('./pages/admin/AdminDeposits'))
const AdminWithdrawals = lazy(() => import('./pages/admin/AdminWithdrawals'))
const AdminTransactions = lazy(() => import('./pages/admin/AdminTransactions'))
const AdminPackages = lazy(() => import('./pages/admin/AdminPackages'))
const AdminInvestments = lazy(() => import('./pages/admin/AdminInvestments'))
const AdminReferrals = lazy(() => import('./pages/admin/AdminReferrals'))
const AdminKyc = lazy(() => import('./pages/admin/AdminKyc'))
const AdminAgents = lazy(() => import('./pages/admin/AdminAgents'))
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'))
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminVouchers = lazy(() => import('./pages/admin/AdminVouchers'))
const AdminPromos = lazy(() => import('./pages/admin/AdminPromoCodes'))
const AdminSpinWheel = lazy(() => import('./pages/admin/AdminSpinWheel'))

function FullPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-bg">
      <Logo size={56} />
      <Spin size="large" />
    </div>
  )
}

function AuthGuard({ role }: { role: 'USER' | 'AGENT' | 'ADMIN' }) {
  const { token, user, logout } = useAuthStore()
  const location = useLocation()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!token) {
      setChecked(true)
      return
    }
    api
      .get<AuthUser>('/auth/me')
      .then((me) => {
        useAuthStore.setState({ user: me })
        setChecked(true)
      })
      .catch(() => {
        logout()
        setChecked(true)
      })
  }, [token, logout])

  const allowed = role === 'USER' ? ['USER', 'AGENT'] : [role]

  if (!token) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (user && !allowed.includes(user.role)) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />
  }
  if (!checked) return <FullPageLoader />
  return <Outlet />
}

function AuthSessionSync() {
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.clear()
  }, [token, queryClient])

  return null
}

function RealtimeSync() {
  const queryClient = useQueryClient()
  const { notification } = AntApp.useApp()
  const logout = useAuthStore((state) => state.logout)
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    return connectRealtime((message) => {
      const { type, data } = message
      if (type === 'account' && data.status === 'SUSPENDED') {
        logout()
        window.location.assign('/login?suspended=1')
        return
      }
      if (type === 'agent') {
        const status = String(data.status ?? '')
        queryClient.invalidateQueries({ queryKey: ['agent'] })
        if (status === 'APPROVED') {
          api
            .get<ReturnType<typeof useAuthStore.getState>['user']>('/auth/me')
            .then((fresh) => setUser(fresh as never))
            .catch(() => undefined)
        }
        return
      }
      if (type === 'profit') {
        const amount = Number(data.amount ?? 0)
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['investments'] })
        queryClient.invalidateQueries({ queryKey: ['activity'] })
        if (amount > 0) {
          notification.success({ message: 'Daily profit credited', description: `+$${amount.toFixed(2)} added to your balance` })
        }
      } else if (
        ['maturity', 'investment', 'deposit', 'withdrawal', 'referral', 'kyc', 'account', 'announcement'].includes(type)
      ) {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['investments'] })
        queryClient.invalidateQueries({ queryKey: ['activity'] })
        queryClient.invalidateQueries({ queryKey: ['deposits'] })
        queryClient.invalidateQueries({ queryKey: ['withdrawals'] })
        if (type === 'announcement') {
          notification.info({ message: String(data.title ?? 'Announcement'), description: String(data.message ?? '') })
        }
        if (type === 'notification') {
          const kind = String(data.type ?? 'INFO')
          const title = String(data.title ?? 'Notification')
          const desc = String(data.message ?? '')
          if (kind === 'SUCCESS') notification.success({ message: title, description: desc })
          else if (kind === 'ERROR') notification.error({ message: title, description: desc })
          else if (kind === 'WARNING') notification.warning({ message: title, description: desc })
          else notification.info({ message: title, description: desc })
        }
      }
    })
  }, [queryClient, notification, logout])

  return null
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spin size="large" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <AuthSessionSync />
      <RealtimeSync />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<AuthGuard role="USER" />}>
          <Route element={<UserLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/deposit" element={<Deposit />} />
            <Route path="/dashboard/withdraw" element={<Withdraw />} />
            <Route path="/dashboard/packages" element={<Packages />} />
            <Route path="/dashboard/investments" element={<Investments />} />
            <Route path="/dashboard/transactions" element={<Transactions />} />
            <Route path="/dashboard/referrals" element={<Referrals />} />
            <Route path="/dashboard/calculator" element={<Calculator />} />
            <Route path="/dashboard/notifications" element={<Notifications />} />
            <Route path="/dashboard/profile" element={<Profile />} />
            <Route path="/dashboard/agent" element={<Agent />} />
            <Route path="/dashboard/security" element={<Security />} />
            <Route path="/dashboard/kyc" element={<Kyc />} />
            <Route path="/dashboard/support" element={<Support />} />
            <Route path="/dashboard/rewards" element={<Rewards />} />
            <Route path="/dashboard/gifts" element={<GiftCodes />} />
            <Route path="/dashboard/promos" element={<PromoCodes />} />
            <Route path="/dashboard/spin" element={<SpinWheel />} />
          </Route>
        </Route>

        <Route element={<AuthGuard role="ADMIN" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/deposits" element={<AdminDeposits />} />
            <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
            <Route path="/admin/transactions" element={<AdminTransactions />} />
            <Route path="/admin/packages" element={<AdminPackages />} />
            <Route path="/admin/investments" element={<AdminInvestments />} />
            <Route path="/admin/referrals" element={<AdminReferrals />} />
            <Route path="/admin/kyc" element={<AdminKyc />} />
            <Route path="/admin/agents" element={<AdminAgents />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/vouchers" element={<AdminVouchers />} />
            <Route path="/admin/promos" element={<AdminPromos />} />
            <Route path="/admin/spin-wheel" element={<AdminSpinWheel />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
