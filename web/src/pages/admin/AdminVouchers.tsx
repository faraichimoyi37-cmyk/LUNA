import { useState } from 'react'
import { App, Button, Form, Input, InputNumber, Modal, Table, Tag, Tooltip } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Ticket, Plus, Copy, Send, CheckCheck } from 'lucide-react'
import { useAdminVouchers, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney } from '../../lib/format'
import type { Voucher } from '../../lib/types'

interface VoucherForm {
  amount: number
  count?: number
  code?: string
  maxUses?: number
}

export default function AdminVouchers() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useAdminVouchers()
  const [form] = Form.useForm<VoucherForm>()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.vouchers })

  const create = async (values: VoucherForm) => {
    setBusy(true)
    try {
      const res = await api.post<{ code: string; amount: number }[]>('/admin/vouchers', {
        amount: values.amount,
        count: values.count ?? 1,
        code: values.code?.trim() || undefined,
        maxUses: values.maxUses ?? 1,
      })
      message.success(`Created ${res.length} gift code${res.length > 1 ? 's' : ''}`)
      setOpen(false)
      form.resetFields()
      invalidate()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBusy(false)
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
      render: (v: string, r: Voucher) => (
        <div className="flex items-center gap-2">
          <code className="font-medium text-primary">{v}</code>
          <Tooltip title="Copy code">
            <Button type="text" size="small" icon={<Copy size={14} />} onClick={() => copy(v)} aria-label="Copy code" />
          </Tooltip>
          {r.status === 'USED' && <CheckCheck size={14} className="text-ink2" />}
        </div>
      ),
    },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => <span className="font-semibold text-secondary">${formatMoney(v)}</span> },
    {
      title: 'Uses',
      dataIndex: 'usedCount',
      render: (v: number, r: Voucher) => <span className="text-ink2">{v}/{r.maxUses}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: Voucher['status']) =>
        v === 'ACTIVE' ? <Tag color="green">Active</Tag> : <Tag color="default">Used</Tag>,
    },
    {
      title: 'Used by',
      dataIndex: 'usedBy',
      render: (v?: Voucher['usedBy'], r?: Voucher) =>
        r?.status === 'USED' && v ? <span className="text-ink2">{v.fullname} · {v.email}</span> : <span className="text-ink2">—</span>,
    },
    { title: 'Created', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  if (isLoading && !data) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Gift codes"
        subtitle="Create bonus gift codes that users can redeem for credit"
        actions={
          <Button type="primary" className="brand-gradient border-none" icon={<Plus size={16} />} onClick={() => setOpen(true)}>
            Create gift code
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
          locale={{ emptyText: <EmptyState icon={Ticket} title="No vouchers yet" description="Create a voucher and share the code with users to redeem." /> }}
        />
      </GlassCard>

      <Modal title="Create gift code" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={create} requiredMark={false} initialValues={{ count: 1, maxUses: 1 }}>
          <Form.Item name="amount" label="Bonus amount (USDT)" rules={[{ required: true, message: 'Enter an amount' }]}>
            <InputNumber size="large" min={0.01} precision={2} prefix="$" className="w-full" placeholder="50.00" />
          </Form.Item>
          <Form.Item name="count" label="Number of codes" extra="Generate multiple codes at once." rules={[{ required: true }]}>
            <InputNumber size="large" min={1} max={50} className="w-full" />
          </Form.Item>
          <Form.Item name="maxUses" label="Max uses" extra="How many times this gift code can be redeemed. Defaults to 1." rules={[{ required: true }]}>
            <InputNumber size="large" min={1} max={100000} className="w-full" />
          </Form.Item>
          <Form.Item name="code" label="Custom code (optional)" extra="Leave empty to auto-generate codes like LUNA-XXXX-XXXX.">
            <Input size="large" placeholder="BONUS50" maxLength={20} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy} icon={<Send size={15} />} className="brand-gradient border-none">
            Create gift code
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
