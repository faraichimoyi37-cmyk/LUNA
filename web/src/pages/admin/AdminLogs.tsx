import { useState } from 'react'
import { Table } from 'antd'
import { History } from 'lucide-react'
import { useAdminLogs } from '../../hooks/queries'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime } from '../../lib/format'
import type { AuditLog } from '../../lib/types'

export default function AdminLogs() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminLogs(page)

  if (isLoading || !data) return <PageLoader />

  const columns = [
    {
      title: 'Action',
      dataIndex: 'action',
      render: (v: string) => <code className="text-xs text-ink">{v}</code>,
    },
    {
      title: 'Actor',
      dataIndex: 'actorRole',
      render: (v: string | null, record: AuditLog) => (
        <span className="text-ink2">{v === 'ADMIN' ? 'Admin' : record.userId ? `User ${record.userId.slice(0, 6)}` : 'System'}</span>
      ),
    },
    { title: 'IP', dataIndex: 'ip', render: (v: string | null) => <code className="text-xs text-ink2">{v ?? '—'}</code> },
    { title: 'Timestamp', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Full administrative activity trail" />

      <GlassCard className="p-6">
        <Table
          rowKey="id"
          dataSource={data.data}
          columns={columns}
          loading={isLoading}
          pagination={{ current: page, pageSize: data.limit, total: data.total, onChange: setPage, showSizeChanger: false }}
          size="small"
          locale={{ emptyText: <EmptyState icon={History} title="No log entries" /> }}
        />
      </GlassCard>
    </div>
  )
}
