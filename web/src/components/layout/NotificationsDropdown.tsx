import { useQueryClient } from '@tanstack/react-query'
import { App, Badge, Button, Dropdown } from 'antd'
import { Bell, CheckCheck, BellRing } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNotifications, useUnreadCount } from '../../hooks/queries'
import { api } from '../../lib/api'
import { timeAgo } from '../../lib/format'
import { queryKeys } from '../../hooks/queries'

const typeColor: Record<string, string> = {
  INFO: '#00D4FF',
  SUCCESS: '#00E5A8',
  WARNING: '#FFB020',
  ERROR: '#FF4D6D',
}

export function NotificationsDropdown() {
  const { data: notifications } = useNotifications()
  const { data: unread } = useUnreadCount()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const markAll = async () => {
    await api.patch('/notifications/read-all')
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount })
  }

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`)
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount })
  }

  const panel = (
    <div className="w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <BellRing size={15} className="text-primary" /> Notifications
        </p>
        <Button type="text" size="small" icon={<CheckCheck size={15} />} onClick={markAll}>
          Mark all read
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications && notifications.length > 0 ? (
          notifications.slice(0, 8).map((item) => (
            <button
              key={item.id}
              onClick={() => markRead(item.id)}
              className="flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left transition-colors hover:bg-surface2"
            >
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ background: typeColor[item.type] ?? '#6C63FF' }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                <span className="block truncate text-xs text-ink2">{item.message}</span>
                <span className="mt-0.5 block text-[11px] text-ink2/70">{timeAgo(item.createdAt)}</span>
              </span>
              {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </button>
          ))
        ) : (
          <div className="px-4 py-10 text-center text-sm text-ink2">No notifications yet</div>
        )}
      </div>
      <Link to="/dashboard/notifications" className="block border-t border-line px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-surface2">
        View all notifications
      </Link>
    </div>
  )

  return (
    <Dropdown dropdownRender={() => panel} trigger={['click']} placement="bottomRight">
      <Button
        type="text"
        aria-label="Notifications"
        icon={
          <Badge count={unread?.count ?? 0} size="small" offset={[2, -2]}>
            <Bell size={19} className="text-ink" />
          </Badge>
        }
      />
    </Dropdown>
  )
}
