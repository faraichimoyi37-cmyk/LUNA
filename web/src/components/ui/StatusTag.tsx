import { Tag } from 'antd'

const colorMap: Record<string, string> = {
  ACTIVE: 'green',
  COMPLETED: 'blue',
  PENDING: 'gold',
  APPROVED: 'green',
  REJECTED: 'red',
  SUSPENDED: 'red',
  USER: 'blue',
  ADMIN: 'purple',
  OPEN: 'gold',
  RESOLVED: 'green',
  INFO: 'blue',
  SUCCESS: 'green',
  WARNING: 'gold',
  ERROR: 'red',
}

export function StatusTag({ status, label }: { status: string; label?: string }) {
  return <Tag color={colorMap[status] ?? 'default'}>{label ?? status}</Tag>
}
