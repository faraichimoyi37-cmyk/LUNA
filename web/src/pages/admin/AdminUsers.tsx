import { useState } from 'react'
import { App, Button, Form, Input, InputNumber, Modal, Select, Table } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Users, Search, Wallet, Ban, Play, Pencil, Eye, Trash } from 'lucide-react'
import { useAdminUsers, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatusTag } from '../../components/ui/StatusTag'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDate, formatMoney } from '../../lib/format'
import AdminUserDetail from './AdminUserDetail'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'
import type { AdminUser } from '../../lib/types'

export default function AdminUsers() {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [adjusting, setAdjusting] = useState<AdminUser | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useAdminUsers(page, search, statusFilter)

  const [form] = Form.useForm()
  const [adjustForm] = Form.useForm()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })

  const saveUser = async (values: { fullname: string; email: string; phone?: string | null; referralCode: string; role?: string; status?: string; balance?: number }) => {
    if (!editing) return
    setBusy(true)
    try {
      await api.patch(`/admin/users/${editing.id}`, values)
      message.success('User updated')
      setEditing(null)
      invalidate()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBusy(false)
    }
  }

  const adjustBalance = async (values: { amount: number; note?: string }) => {
    if (!adjusting) return
    setBusy(true)
    try {
      await api.post(`/admin/users/${adjusting.id}/balance`, values)
      message.success('Balance adjusted')
      setAdjusting(null)
      invalidate()
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats })
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBusy(false)
    }
  }

  const toggleStatus = (record: AdminUser) => {
    const suspend = record.status === 'ACTIVE'
    modal.confirm({
      title: suspend ? 'Suspend account' : 'Reactivate account',
      content: suspend
        ? `${record.fullname} (${record.email}) will be immediately logged out and blocked from logging in.`
        : `${record.fullname} (${record.email}) will be allowed to log in again.`,
      okText: suspend ? 'Suspend' : 'Reactivate',
      okButtonProps: suspend ? { danger: true } : {},
      cancelText: 'Cancel',
      onOk: async () => {
        setBusy(true)
        try {
          await api.patch(`/admin/users/${record.id}`, { status: suspend ? 'SUSPENDED' : 'ACTIVE' })
          message.success(suspend ? 'Account suspended' : 'Account reactivated')
          invalidate()
        } catch (error) {
          message.error(errMsg(error))
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const deleteUser = (record: AdminUser) => {    modal.confirm({
      title: 'Delete account permanently',
      content: `This will permanently delete ${record.fullname} (${record.email}) along with all their investments, deposits, withdrawals and transactions. This cannot be undone.`,
      okText: 'Delete permanently',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        setBusy(true)
        try {
          await api.delete(`/admin/users/${record.id}`)
          message.success('Account deleted permanently')
          invalidate()
          queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats })
        } catch (error) {
          message.error(errMsg(error))
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const columns = [
    {
      title: 'User',
      dataIndex: 'fullname',
      render: (v: string, record: AdminUser) => (
        <div>
          <p className="inline-flex items-center gap-1 font-medium text-ink">
            {v}
            {record.role === 'AGENT' && <VerifiedBadge size={14} />}
          </p>
          <p className="text-xs text-ink2">{record.email}</p>
        </div>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', render: (v: string | null) => <span className="text-ink2">{v ?? '—'}</span> },
    { title: 'Referral code', dataIndex: 'referralCode', render: (v: string) => <code className="text-xs text-ink">{v}</code> },
    {
      title: 'Joined under',
      key: 'referredBy',
      render: (_: unknown, record: AdminUser) =>
        record.referredBy ? (
          <div>
            <p className="text-xs text-ink">{record.referredBy.fullname}</p>
            <p className="text-[11px] text-ink2">{record.referredBy.email}</p>
          </div>
        ) : (
          <span className="text-ink2">—</span>
        ),
    },
    { title: 'Role', dataIndex: 'role', render: (v: string) => <StatusTag status={v} /> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <StatusTag status={v} /> },
    { title: 'Balance', dataIndex: 'balance', render: (v: number) => <span className="font-semibold text-ink">${formatMoney(v)}</span> },
    {
      title: 'Stats',
      key: 'stats',
      render: (record: AdminUser) => (
        <span className="text-xs text-ink2">
          {record._count.investments} inv · {record._count.deposits} dep · {record._count.referrals} ref
        </span>
      ),
    },
    { title: 'Registered', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDate(v)}</span> },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: AdminUser) => (
        <div className="flex gap-2">
          <Button size="small" icon={<Eye size={14} />} onClick={() => setViewing(record.id)}>
            View
          </Button>
          <Button size="small" icon={<Wallet size={14} />} onClick={() => { setAdjusting(record); adjustForm.resetFields() }}>
            Adjust
          </Button>
          <Button
            size="small"
            icon={record.status === 'SUSPENDED' ? <Play size={14} /> : <Ban size={14} />}
            danger={record.status === 'ACTIVE'}
            onClick={() => toggleStatus(record)}
          >
            {record.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
          </Button>
          <Button size="small" icon={<Pencil size={14} />} onClick={() => { setEditing(record); form.setFieldsValue({
            fullname: record.fullname,
            email: record.email,
            phone: record.phone ?? undefined,
            referralCode: record.referralCode,
            role: record.role,
            status: record.status,
            balance: record.balance,
          }) }}>
            Edit
          </Button>
          <Button size="small" danger icon={<Trash size={14} />} onClick={() => deleteUser(record)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  if (isLoading && !data) return <PageLoader />

  return (
    <div>
      <PageHeader title="Users" subtitle="Manage all registered users" />

      <GlassCard className="p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            allowClear
            prefix={<Search size={15} className="text-ink2" />}
            placeholder="Search by name or email"
            className="max-w-xs"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          <Select
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            className="w-40"
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'SUSPENDED', label: 'Suspended' },
            ]}
          />
        </div>
        <Table
          rowKey="id"
          dataSource={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          pagination={{ current: page, pageSize: data?.limit ?? 20, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false }}
          size="small"
          locale={{ emptyText: <EmptyState icon={Users} title="No users found" description="Try a different search." /> }}
        />
      </GlassCard>

      <AdminUserDetail userId={viewing} onClose={() => setViewing(null)} />

      <Modal title={`Edit user — ${editing?.fullname ?? ''}`} open={!!editing} onCancel={() => setEditing(null)} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={saveUser} requiredMark={false}>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Form.Item name="fullname" label="Full name" rules={[{ required: true, min: 2, message: 'Enter a full name' }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input size="large" placeholder="+1 234 567 8900" />
            </Form.Item>
            <Form.Item name="referralCode" label="Referral code" rules={[{ required: true, min: 4, max: 20, message: 'Enter a referral code' }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="role" label="Role">
              <Select options={[{ value: 'USER', label: 'User' }, { value: 'AGENT', label: 'Agent' }, { value: 'ADMIN', label: 'Admin' }]} />
            </Form.Item>
            <Form.Item name="status" label="Status">
              <Select options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }]} />
            </Form.Item>
            <Form.Item name="balance" label="Balance" rules={[{ required: true }]}>
              <InputNumber size="large" className="w-full" min={0} precision={2} prefix="$" />
            </Form.Item>
          </div>
          <Button type="primary" htmlType="submit" loading={busy} className="brand-gradient border-none">Save</Button>
        </Form>
      </Modal>

      <Modal title={`Adjust balance — ${adjusting?.fullname ?? ''}`} open={!!adjusting} onCancel={() => setAdjusting(null)} footer={null} destroyOnClose>
        <Form form={adjustForm} layout="vertical" onFinish={adjustBalance} requiredMark={false} initialValues={{ note: '' }}>
          <Form.Item name="amount" label="Amount (positive = credit, negative = debit)" rules={[{ required: true }]}>
            <InputNumber size="large" className="w-full" prefix={<Play size={14} className="mr-1 text-ink2" />} />
          </Form.Item>
          <Form.Item name="note" label="Note">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy} className="brand-gradient border-none">Apply</Button>
        </Form>
      </Modal>
    </div>
  )
}
