import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { App, Avatar, Button, Drawer, Dropdown } from 'antd'
import { LogOut, Menu, Moon, Sun, Globe, ChevronDown, User as UserIcon, Shield, Settings as SettingsIcon, Lock } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useThemeStore } from '../../store/theme'
import { useI18nStore, type Lang } from '../../store/i18n'
import { formatMoney } from '../../lib/format'
import { Logo } from '../ui/Logo'
import { NotificationsDropdown } from './NotificationsDropdown'
import WhatsAppPrompt from './WhatsAppPrompt'
import { VerifiedBadge } from '../ui/VerifiedBadge'
import type { NavItem } from '../../config/navigation'
import { mobileNav } from '../../config/navigation'

interface AppShellProps {
  nav: NavItem[]
  role: 'USER' | 'ADMIN'
}

const languages: { key: Lang; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'es', label: 'Español' },
  { key: 'fr', label: 'Français' },
]

function usePageMeta(nav: NavItem[]) {
  const { pathname } = useLocation()
  const active = nav.find((item) => (item.end ? pathname === item.path : pathname.startsWith(item.path)))
  return active ?? nav[0]
}

function SidebarContent({ nav, role }: { nav: NavItem[]; role: 'USER' | 'ADMIN' }) {
  const t = useI18nStore((state) => state.t)
  const { user } = useAuthStore()
  return (
    <div className="flex h-full flex-col">
      <div className="px-2 py-1">
        <Logo to={nav[0].path} size={38} />
      </div>
      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto pr-1">
        {nav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive ? 'bg-primary/15 text-primary' : 'text-ink2 hover:bg-surface2 hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} strokeWidth={2.2} />
                <span>{t(item.labelKey)}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 rounded-2xl border border-line bg-surface2/60 p-3">
        <div className="flex items-center gap-3">
          <Avatar size={40} className="brand-gradient font-bold text-white">
            {user?.fullname?.slice(0, 1) ?? 'A'}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="inline-flex max-w-full items-center gap-1 truncate text-sm font-semibold text-ink">
              {user?.fullname}
              {user?.role === 'AGENT' && <VerifiedBadge size={15} />}
            </p>
            <p className="truncate text-xs text-ink2">{user?.email}</p>
          </div>
        </div>
        {role === 'USER' && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-surface px-3 py-2">
            <span className="text-xs text-ink2">Balance</span>
            <span className="text-sm font-bold text-secondary">${formatMoney(user?.balance ?? 0)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function MobileBottomNav() {
  const t = useI18nStore((state) => state.t)
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-surface/90 backdrop-blur-xl lg:hidden">
      {mobileNav.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] text-[10px] font-medium ${
              isActive ? 'text-primary' : 'text-ink2'
            }`
          }
        >
          <item.icon size={20} />
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}

export default function AppShell({ nav, role }: AppShellProps) {
  const { user, logout } = useAuthStore()
  const { dark, toggle } = useThemeStore()
  const { lang, setLang, t } = useI18nStore()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const meta = usePageMeta(nav)

  const handleLogout = () => {
    logout()
    message.success('Logged out')
    navigate('/login')
  }

  const avatarMenu = {
    items: [
      role === 'ADMIN'
        ? { key: 'dashboard', icon: <UserIcon size={15} />, label: 'Admin Panel', onClick: () => navigate('/admin') }
        : { key: 'profile', icon: <UserIcon size={15} />, label: 'Profile', onClick: () => navigate('/dashboard/profile') },
      role === 'ADMIN'
        ? { key: 'settings', icon: <SettingsIcon size={15} />, label: 'Settings', onClick: () => navigate('/admin/settings') }
        : { key: 'security', icon: <Lock size={15} />, label: 'Security', onClick: () => navigate('/dashboard/security') },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogOut size={15} />, label: 'Log out', danger: true, onClick: handleLogout },
    ],
  }

  const langMenu = {
    items: languages.map((l) => ({
      key: l.key,
      label: (
        <span className={l.key === lang ? 'font-semibold text-primary' : ''}>{l.label}</span>
      ),
      onClick: () => setLang(l.key),
    })),
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-40" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface/60 px-4 py-5 backdrop-blur-xl lg:block">
        <SidebarContent nav={nav} role={role} />
      </aside>

      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={280}
        styles={{ body: { padding: '20px', background: 'var(--surface)' }, header: { display: 'none' } }}
      >
        <SidebarContent nav={nav} role={role} />
      </Drawer>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Button type="text" className="lg:hidden" icon={<Menu size={20} />} onClick={() => setDrawerOpen(true)} />
              <h2 className="text-sm font-semibold text-ink sm:text-base">{t(meta.labelKey)}</h2>
            </div>
            <div className="flex items-center gap-1">
              <Dropdown menu={langMenu} placement="bottomRight">
                <Button type="text" aria-label="Language" icon={<Globe size={18} className="text-ink" />}>
                  <span className="hidden text-xs font-semibold uppercase sm:inline">{lang}</span>
                </Button>
              </Dropdown>
              <Button
                type="text"
                aria-label="Toggle theme"
                icon={dark ? <Sun size={18} className="text-ink" /> : <Moon size={18} className="text-ink" />}
                onClick={toggle}
              />
              {role === 'USER' && <NotificationsDropdown />}
              <Dropdown menu={avatarMenu} placement="bottomRight">
                <button className="flex items-center gap-2 rounded-full p-1 pl-1.5 transition-colors hover:bg-surface2">
                  <Avatar size={30} className="brand-gradient text-sm font-bold text-white">
                    {user?.fullname?.slice(0, 1) ?? 'A'}
                  </Avatar>
                  <ChevronDown size={14} className="hidden text-ink2 sm:block" />
                </button>
              </Dropdown>
            </div>
          </div>
        </header>

        <main className="relative">
          <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:pb-10">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileBottomNav />

      <WhatsAppPrompt />
    </div>
  )
}
