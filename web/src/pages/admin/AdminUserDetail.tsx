import { useState } from 'react'
import { App, Button, Descriptions, Drawer, Empty, Form, Input, InputNumber, Modal, Select, Spin, Switch, Table, Tabs } from 'antd'
import { KeyRound, Bell, Pencil } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminUser, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { StatusTag } from '../../components/ui/StatusTag'
import { formatDate, formatDateTime, formatMoney, formatMoneySigned, shortId } from '../../lib/format'
import type { Transaction } from '../../lib/types'

interface AdminUserDetailProps {
  userId: string | null
  onClose: () => void
}

export default function AdminUserDetail({ userId, onClose }: AdminUserDetailProps) {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useAdminUser(userId ?? undefined)
  const [busy, setBusy] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [pwdForm] = Form.useForm()
  const [notifyForm] = Form.useForm()
  const [detailsForm] = Form.useForm()

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })

  const resetPassword = async (values: { newPassword: string }) => {
    if (!user) return
    setBusy(true)
    try {
      await api.post(`/admin/users/${user.id}/password`, values)
      message.success('Password reset')
      setPwdOpen(false)
      pwdForm.resetFields()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBusy(false)
    }
  }

  const sendNotification = async (values: { title: string; message: string }) => {
    if (!user) return
    setBusy(true)
    try {
      await api.post(`/admin/users/${user.id}/notify`, values)
      message.success('Notification sent')
      setNotifyOpen(false)
      notifyForm.resetFields()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBusy(false)
    }
  }

  const saveDetails = async (values: { language: string; notificationsOn: boolean; twoFactorEnabled: boolean; businessRegistration?: string; applicationFeeTx?: string; applicationFeeAmount?: number }) => {
    if (!user) return
    setBusy(true)
    try {
      await api.patch(`/admin/users/${user.id}`, {
        settings: { language: values.language, notificationsOn: values.notificationsOn, twoFactorEnabled: values.twoFactorEnabled },
        ...(user.agentApplication ? { agentApplication: { businessRegistration: values.businessRegistration ?? '', applicationFeeTx: values.applicationFeeTx ?? '', applicationFeeAmount: values.applicationFeeAmount } } : {}),
      })
      message.success('Details updated')
      setDetailsOpen(false)
      refresh()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBusy(false)
    }
  }

  const openDetails = () => {
    if (!user) return
    detailsForm.setFieldsValue({
      language: user.settings?.language ?? 'en',
      notificationsOn: user.settings?.notificationsOn ?? true,
      twoFactorEnabled: user.settings?.twoFactorEnabled ?? false,
      businessRegistration: user.agentApplication?.businessRegistration ?? '',
      applicationFeeTx: user.agentApplication?.applicationFeeTx ?? '',
      applicationFeeAmount: user.agentApplication?.applicationFeeAmount ?? 0,
    })
    setDetailsOpen(true)
  }

  const txColumns = [
    { title: 'Reference', dataIndex: 'reference', render: (v: string | null) => <code className="text-xs text-ink2">{v ? shortId(v) : '—'}</code> },
    { title: 'Type', dataIndex: 'type', render: (v: string) => <StatusTag status={v} /> },
    { title: 'Amount', dataIndex: 'amount', render: (v: number, r: Transaction) => <span className="font-medium text-ink">{formatMoneySigned(v)}</span> },
    { title: 'Balance after', dataIndex: 'balanceAfter', render: (v: number | null) => <span className="text-ink2">{v != null ? `$${formatMoney(v)}` : '—'}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <StatusTag status={v} /> },
    { title: 'Date', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  const invColumns = [
    { title: 'Package', dataIndex: 'packageName', render: (v: string) => <span className="font-medium text-ink">{v}</span> },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => <span className="font-medium text-ink">${formatMoney(v)}</span> },
    { title: 'Daily', dataIndex: 'dailyProfit', render: (v: number) => <span className="text-ink2">${formatMoney(v)}</span> },
    { title: 'Total return', dataIndex: 'totalReturn', render: (v: number) => <span className="text-ink2">${formatMoney(v)}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <StatusTag status={v} /> },
    { title: 'End date', dataIndex: 'endDate', render: (v: string) => <span className="text-ink2">{formatDate(v)}</span> },
  ]

  const depColumns = [
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => <span className="font-medium text-ink">${formatMoney(v)}</span> },
    { title: 'Method', dataIndex: 'method', render: (v: string) => <span className="text-ink2">{v.replace('_', ' · ')}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <StatusTag status={v} /> },
    { title: 'Date', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  const wdColumns = [
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => <span className="font-medium text-ink">${formatMoney(v)}</span> },
    { title: 'Fee', dataIndex: 'fee', render: (v: number) => <span className="text-ink2">${formatMoney(v)}</span> },
    { title: 'Wallet', dataIndex: 'walletAddress', render: (v: string) => <code className="text-xs text-ink2">{shortId(v)}</code> },
    { title: 'Network', dataIndex: 'network', render: (v: string | null) => <span className="text-ink2">{v ?? '—'}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <StatusTag status={v} /> },
    { title: 'Date', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  const refColumns = [
    { title: 'Name', dataIndex: 'fullname', render: (v: string) => <span className="font-medium text-ink">{v}</span> },
    { title: 'Email', dataIndex: 'email', render: (v: string) => <span className="text-ink2">{v}</span> },
    { title: 'Joined', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDate(v)}</span> },
  ]

  const logColumns = [
    { title: 'Action', dataIndex: 'action', render: (v: string) => <code className="text-xs text-ink">{v}</code> },
    { title: 'IP', dataIndex: 'ip', render: (v: string | null) => <code className="text-xs text-ink2">{v ?? '—'}</code> },
    { title: 'Timestamp', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  return (
    <Drawer
      title={user ? `${user.fullname} — activity` : 'User activity'}
      open={!!userId}
      onClose={onClose}
      width={860}
      destroyOnClose
      styles={{ body: { padding: 0 } }}
    >
      {isLoading || !user ? (
        <div className="flex items-center justify-center py-24"><Spin size="large" /></div>
      ) : (
        <div>
          <div className="border-b border-line/60 px-6 py-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {user.fullname.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-ink">{user.fullname}</p>
                  <StatusTag status={user.role} />
                  <StatusTag status={user.status} />
                </div>
                <p className="text-sm text-ink2">
                  {user.email} · Joined {formatDate(user.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink2">Balance</p>
                <p className="text-xl font-bold text-primary">${formatMoney(user.balance)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="small" icon={<Pencil size={14} />} onClick={openDetails}>
                    Edit details
                  </Button>
                  <Button size="small" icon={<KeyRound size={14} />} onClick={() => setPwdOpen(true)}>
                    Reset password
                  </Button>
                  <Button size="small" icon={<Bell size={14} />} onClick={() => setNotifyOpen(true)}>
                    Notify
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pt-4">
            <Descriptions
              size="small"
              column={2}
              colon={false}
              items={[
                { key: 'ref', label: 'Referral code', children: <code className="text-xs text-ink">{user.referralCode}</code> },
                { key: 'phone', label: 'Phone', children: <span className="text-ink">{user.phone ?? '—'}</span> },
                {
                  key: 'referredBy',
                  label: 'Referred by',
                  children: <span className="text-ink">{user.referredBy ? `${user.referredBy.fullname} (${user.referredBy.email})` : '—'}</span>,
                },
                {
                  key: 'agent',
                  label: 'Agent application',
                  children: user.agentApplication ? <StatusTag status={user.agentApplication.status} /> : <span className="text-ink2">None</span>,
                },
                { key: 'kyc', label: 'KYC', children: user.kyc ? <StatusTag status={user.kyc.status} /> : <span className="text-ink2">Not submitted</span> },
              ]}
            />

            <Modal
              open={pwdOpen}
              onCancel={() => setPwdOpen(false)}
              onOk={() => pwdForm.submit()}
              okText="Reset password"
              confirmLoading={busy}
              centered
              title="Reset password"
            >
              <Form form={pwdForm} layout="vertical" onFinish={resetPassword} requiredMark={false} className="mt-3">
                <Form.Item
                  name="newPassword"
                  label="New password"
                  rules={[{ required: true, min: 8, message: 'Minimum 8 characters' }]}
                >
                  <Input.Password size="large" placeholder="New password" />
                </Form.Item>
              </Form>
            </Modal>

            <Modal
              open={notifyOpen}
              onCancel={() => setNotifyOpen(false)}
              onOk={() => notifyForm.submit()}
              okText="Send notification"
              confirmLoading={busy}
              centered
              title="Send notification"
            >
              <Form form={notifyForm} layout="vertical" onFinish={sendNotification} requiredMark={false} className="mt-3">
                <Form.Item name="title" label="Title" rules={[{ required: true, max: 120, message: 'Enter a title' }]}>
                  <Input size="large" placeholder="e.g. Deposit approved" />
                </Form.Item>
                <Form.Item name="message" label="Message" rules={[{ required: true, max: 1000, message: 'Enter a message' }]}>
                  <Input.TextArea rows={4} size="large" placeholder="Write the message…" />
                </Form.Item>
              </Form>
            </Modal>

            <Modal
              open={detailsOpen}
              onCancel={() => setDetailsOpen(false)}
              onOk={() => detailsForm.submit()}
              okText="Save changes"
              confirmLoading={busy}
              centered
              width={640}
              title={`Edit details — ${user.fullname}`}
            >
              <Form form={detailsForm} layout="vertical" onFinish={saveDetails} requiredMark={false} className="mt-3">
                <div className="grid gap-x-3 sm:grid-cols-2">
                  <Form.Item name="language" label="Language">
                    <Select size="large" options={[
                      { value: 'en', label: 'English' },
                      { value: 'es', label: 'Español' },
                      { value: 'fr', label: 'Français' },
                    ]} />
                  </Form.Item>
                  <Form.Item name="notificationsOn" label="Notifications" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="twoFactorEnabled" label="Two-factor auth" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </div>

                {user.agentApplication && (
                  <>
                    <p className="mb-2 mt-1 text-sm font-semibold text-ink">Agent application</p>
                    <div className="grid gap-x-3 sm:grid-cols-2">
                      <Form.Item name="businessRegistration" label="Registered document">
                        <Input size="large" placeholder="Registration number or document URL" />
                      </Form.Item>
                      <Form.Item name="applicationFeeTx" label="Proof of payment">
                        <Input size="large" placeholder="Transaction ID / payment reference" />
                      </Form.Item>
                      <Form.Item name="applicationFeeAmount" label="Application fee" rules={[{ required: true }]}>
                        <InputNumber size="large" className="w-full" min={0} precision={2} prefix="$" />
                      </Form.Item>
                    </div>
                  </>
                )}
              </Form>
            </Modal>

            <Tabs
              className="mt-2"
              items={[
                {
                  key: 'transactions',
                  label: `Transactions (${user.transactions?.length ?? 0})`,
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      columns={txColumns}
                      dataSource={user.transactions ?? []}
                      pagination={false}
                      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transactions" /> }}
                    />
                  ),
                },
                {
                  key: 'investments',
                  label: `Investments (${user.investments?.length ?? 0})`,
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      columns={invColumns}
                      dataSource={user.investments ?? []}
                      pagination={false}
                      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No investments" /> }}
                    />
                  ),
                },
                {
                  key: 'deposits',
                  label: `Deposits (${user.deposits?.length ?? 0})`,
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      columns={depColumns}
                      dataSource={user.deposits ?? []}
                      pagination={false}
                      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No deposits" /> }}
                    />
                  ),
                },
                {
                  key: 'withdrawals',
                  label: `Withdrawals (${user.withdrawals?.length ?? 0})`,
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      columns={wdColumns}
                      dataSource={user.withdrawals ?? []}
                      pagination={false}
                      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No withdrawals" /> }}
                    />
                  ),
                },
                {
                  key: 'referrals',
                  label: `Referrals (${user.referrals?.length ?? 0})`,
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      columns={refColumns}
                      dataSource={user.referrals ?? []}
                      pagination={false}
                      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No referrals" /> }}
                    />
                  ),
                },
                {
                  key: 'logs',
                  label: `Activity logs (${user.auditLogs?.length ?? 0})`,
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      columns={logColumns}
                      dataSource={user.auditLogs ?? []}
                      pagination={false}
                      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No logged activity" /> }}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}
    </Drawer>
  )
}
