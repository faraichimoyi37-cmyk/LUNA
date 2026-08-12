import { App, Button } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, BellRing, CheckCheck } from 'lucide-react'
import { useNotifications } from '../../hooks/queries'
import { api } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { timeAgo } from '../../lib/format'
import { queryKeys } from '../../hooks/queries'
import type { AppNotification } from '../../lib/types'

const typeColor: Record<string, string> = {
  INFO: '#00D4FF',
  SUCCESS: '#00E5A8',
  WARNING: '#FFB020',
  ERROR: '#FF4D6D',
}

export default function Notifications() {
  const { data, isLoading } = useNotifications()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  if (isLoading || !data) return <PageLoader />

  const markAll = async () => {
    await api.patch('/notifications/read-all')
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount })
    message.success('All notifications marked as read')
  }

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`)
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount })
  }

  const unread = data.filter((n) => !n.read).length

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Stay up to date with your account activity"
        actions={
          unread > 0 && (
            <Button icon={<CheckCheck size={15} />} onClick={markAll}>
              Mark all read
            </Button>
          )
        }
      />

      <div className="mx-auto max-w-3xl space-y-3">
        {data.length > 0 ? (
          data.map((item: AppNotification) => (
            <GlassCard
              key={item.id}
              hover
              onClick={() => !item.read && markRead(item.id)}
              className={`cursor-pointer p-5 ${item.read ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4">
                <span
                  className="mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${typeColor[item.type] ?? '#6C63FF'}22`, color: typeColor[item.type] ?? '#6C63FF' }}
                >
                  <BellRing size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{item.title}</p>
                    <span className="shrink-0 text-xs text-ink2">{timeAgo(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink2">{item.message}</p>
                </div>
                {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
            </GlassCard>
          ))
        ) : (
          <GlassCard className="p-6">
            <EmptyState icon={Bell} title="No notifications yet" description="You'll be notified about deposits, withdrawals, profits and announcements." />
          </GlassCard>
        )}
      </div>
    </div>
  )
}
