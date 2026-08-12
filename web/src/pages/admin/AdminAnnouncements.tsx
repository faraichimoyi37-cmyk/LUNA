import { useState } from 'react'
import { App, Button, Form, Input, Modal, Table } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, Send } from 'lucide-react'
import { useAdminAnnouncements, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime } from '../../lib/format'
import type { Announcement } from '../../lib/types'

interface AnnouncementForm {
  title: string
  message: string
}

export default function AdminAnnouncements() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useAdminAnnouncements()
  const [form] = Form.useForm<AnnouncementForm>()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements })

  const send = async (values: AnnouncementForm) => {
    setBusy(true)
    try {
      await api.post('/admin/announcements', values)
      message.success('Announcement sent to all users')
      setOpen(false)
      form.resetFields()
      invalidate()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    { title: 'Title', dataIndex: 'title', render: (v: string) => <span className="font-medium text-ink">{v}</span> },
    { title: 'Message', dataIndex: 'message', render: (v: string) => <span className="line-clamp-1 text-ink2">{v}</span> },
    { title: 'Sent At', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  if (isLoading && !data) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Broadcast messages to every user"
        actions={
          <Button type="primary" className="brand-gradient border-none" icon={<Plus size={16} />} onClick={() => setOpen(true)}>
            New announcement
          </Button>
        }
      />

      <GlassCard className="p-6">
        <Table
          rowKey="id"
          dataSource={data ?? []}
          columns={columns}
          loading={isLoading}
          pagination={false}
          size="small"
          locale={{ emptyText: <EmptyState icon={Megaphone} title="No announcements yet" description="Announcements appear in user notification centers." /> }}
        />
      </GlassCard>

      <Modal title="New announcement" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={send} requiredMark={false}>
          <Form.Item name="title" label="Title" rules={[{ required: true, min: 2, max: 120 }]}>
            <Input size="large" placeholder="e.g. New investment packages available" />
          </Form.Item>
          <Form.Item name="message" label="Message" rules={[{ required: true, min: 2, max: 2000 }]}>
            <Input.TextArea rows={5} placeholder="Write the announcement content..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy} icon={<Send size={15} />} className="brand-gradient border-none">
            Send to all users
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
