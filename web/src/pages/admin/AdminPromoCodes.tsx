import { useState } from 'react'
import { App, Button, Form, Input, InputNumber, Modal, Switch, Table, Tag, Tooltip } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Gift, Plus, Copy, Send } from 'lucide-react'
import { useAdminPromos, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney } from '../../lib/format'
import type { PromoCode } from '../../lib/types'

interface PromoForm {
  code: string
  percent: number
  amount?: number
  maxUses: number
}

export default function AdminPromoCodes() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useAdminPromos()
  const [form] = Form.useForm<PromoForm>()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.promos })

  const create = async (values: PromoForm) => {
    setBusy(true)
    try {
      await api.post('/admin/promos', values)
      message.success(`Promo code ${values.code.toUpperCase()} created`)
      setOpen(false)
      form.resetFields()
      invalidate()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (promo: PromoCode) => {
    try {
      await api.patch(`/admin/promos/${promo.id}`, { status: !promo.status })
      invalidate()
    } catch (error) {
      message.error(errMsg(error))
    }
  }

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code)
    message.success(`Copied ${code}`)
  }

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      render: (v: string) => (
        <div className="flex items-center gap-2">
          <code className="font-medium text-primary">{v}</code>
          <Tooltip title="Copy code">
            <Button type="text" size="small" icon={<Copy size={14} />} onClick={() => copy(v)} aria-label="Copy code" />
          </Tooltip>
        </div>
      ),
    },
    { title: 'Discount', dataIndex: 'percent', render: (v: number) => <span className="font-semibold text-secondary">{v}% off</span> },
    {
      title: 'Balance reward',
      dataIndex: 'amount',
      render: (v: number) => <span className={v > 0 ? 'font-semibold text-primary' : 'text-ink2'}>{v > 0 ? `$${formatMoney(v)}` : '—'}</span>,
    },
    {
      title: 'Usage',
      dataIndex: 'usedCount',
      render: (v: number, r: PromoCode) => (
        <span className="text-ink2">
          {v}/{r.maxUses}
        </span>
      ),
    },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      render: (v: string | null) => (v ? <span className="text-ink2">{formatDateTime(v)}</span> : <span className="text-ink2">Never</span>),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: boolean, r: PromoCode) => (
        <div className="flex items-center gap-2">
          <Switch checked={v} onChange={() => toggle(r)} size="small" />
          <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Disabled'}</Tag>
        </div>
      ),
    },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  if (isLoading && !data) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Promo codes"
        subtitle="Create discount and balance-reward codes users apply when buying packages"
        actions={
          <Button type="primary" className="brand-gradient border-none" icon={<Plus size={16} />} onClick={() => setOpen(true)}>
            Create promo code
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
          locale={{ emptyText: <EmptyState icon={Gift} title="No promo codes yet" description="Create a promo code and share it with users." /> }}
        />
      </GlassCard>

      <Modal title="Create promo code" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={create} requiredMark={false} initialValues={{ maxUses: 100 }}>
          <Form.Item name="code" label="Code" rules={[{ required: true, min: 3, max: 20 }]}>
            <Input size="large" placeholder="e.g. WELCOME10" maxLength={20} />
          </Form.Item>
          <Form.Item name="percent" label="Discount (%)" rules={[{ required: true, message: 'Enter a discount percentage' }]}>
            <InputNumber size="large" min={1} max={90} className="w-full" placeholder="10" />
          </Form.Item>
          <Form.Item name="amount" label="Balance reward (USDT)" extra="Optional. Amount credited to a user's balance when they redeem this code.">
            <InputNumber size="large" min={0.01} precision={2} prefix="$" className="w-full" placeholder="25.00" />
          </Form.Item>
          <Form.Item name="maxUses" label="Max uses" rules={[{ required: true }]}>
            <InputNumber size="large" min={1} max={100000} className="w-full" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy} icon={<Send size={15} />} className="brand-gradient border-none">
            Create promo code
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
