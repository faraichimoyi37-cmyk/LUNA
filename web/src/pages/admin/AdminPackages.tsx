import { useState } from 'react'
import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Boxes, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAdminPackages, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatMoney } from '../../lib/format'
import type { PackagePlan } from '../../lib/types'

interface PackageForm {
  name: string
  description?: string
  icon?: string
  investmentAmount: number
  dailyPercentage: number
  durationDays: number
  status: boolean
}

export default function AdminPackages() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PackagePlan | null>(null)
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useAdminPackages()
  const [form] = Form.useForm<PackageForm>()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.packages })

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: true })
    setOpen(true)
  }

  const openEdit = (pkg: PackagePlan) => {
    setEditing(pkg)
    form.setFieldsValue({
      name: pkg.name,
      description: pkg.description ?? '',
      icon: pkg.icon ?? '',
      investmentAmount: pkg.investmentAmount,
      dailyPercentage: pkg.dailyPercentage,
      durationDays: pkg.durationDays,
      status: pkg.status,
    })
    setOpen(true)
  }

  const save = async (values: PackageForm) => {
    setBusy(true)
    try {
      const body = { ...values, description: values.description || undefined, icon: values.icon || undefined }
      if (editing) {
        await api.put(`/admin/packages/${editing.id}`, body)
        message.success('Package updated')
      } else {
        await api.post('/admin/packages', body)
        message.success('Package created')
      }
      setOpen(false)
      invalidate()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (pkg: PackagePlan) => {
    try {
      const res = await api.delete<{ deleted: boolean; deactivated?: boolean }>(`/admin/packages/${pkg.id}`)
      message.success(res.deleted ? 'Package deleted' : 'Package deactivated (has investments)')
      invalidate()
    } catch (error) {
      message.error(errMsg(error))
    }
  }

  const toggle = async (pkg: PackagePlan, active: boolean) => {
    try {
      await api.put(`/admin/packages/${pkg.id}`, { status: active })
      message.success(`${pkg.name} ${active ? 'activated' : 'deactivated'}`)
      invalidate()
    } catch (error) {
      message.error(errMsg(error))
    }
  }

  const columns = [
    {
      title: 'Package',
      dataIndex: 'name',
      render: (v: string, r: PackagePlan) => (
        <div>
          <p className="font-medium text-ink">{v}</p>
          {r.description && <p className="text-xs text-ink2">{r.description}</p>}
        </div>
      ),
    },
    { title: 'Investment', dataIndex: 'investmentAmount', render: (v: number) => <span className="font-semibold text-ink">${formatMoney(v)}</span> },
    { title: 'Daily %', dataIndex: 'dailyPercentage', render: (v: number) => <span className="text-ink">{v}%</span> },
    { title: 'Duration', dataIndex: 'durationDays', render: (v: number) => <span className="text-ink2">{v} days</span> },
    { title: 'Total Return', dataIndex: 'totalReturn', render: (v: number) => <span className="font-semibold text-secondary">${formatMoney(v)}</span> },
    { title: 'Active', dataIndex: 'status', render: (v: boolean, r: PackagePlan) => <Switch checked={v} size="small" onChange={(checked) => toggle(r, checked)} /> },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: PackagePlan) => (
        <div className="flex gap-2">
          <Button size="small" icon={<Pencil size={14} />} onClick={() => openEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this package?" onConfirm={() => remove(record)} okText="Delete" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<Trash2 size={14} />} />
          </Popconfirm>
        </div>
      ),
    },
  ]

  if (isLoading && !data) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Investment Packages"
        subtitle="Create and manage packages"
        actions={
          <Button type="primary" className="brand-gradient border-none" icon={<Plus size={16} />} onClick={openCreate}>
            New package
          </Button>
        }
      />

      <GlassCard className="p-6">
        <Table
          rowKey="id"
          dataSource={data ?? []}
          columns={columns}
          pagination={false}
          size="small"
          locale={{ emptyText: <EmptyState icon={Boxes} title="No packages" description="Create your first package." /> }}
        />
      </GlassCard>

      <Modal title={editing ? 'Edit package' : 'New package'} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true, min: 2 }]}>
            <Input size="large" placeholder="e.g. Starter Plan" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="icon" label="Icon name">
            <Select
              size="large"
              allowClear
              options={['Rocket', 'Gem', 'Zap', 'Crown', 'TrendingUp', 'Wallet'].map((i) => ({ value: i, label: i }))}
            />
          </Form.Item>
          <div className="grid gap-4 sm:grid-cols-3">
            <Form.Item name="investmentAmount" label="Investment ($)" rules={[{ required: true }]}>
              <InputNumber size="large" min={1} className="w-full" />
            </Form.Item>
            <Form.Item name="dailyPercentage" label="Daily %" rules={[{ required: true }]}>
              <InputNumber size="large" min={0.1} max={50} className="w-full" />
            </Form.Item>
            <Form.Item name="durationDays" label="Days" rules={[{ required: true }]}>
              <InputNumber size="large" min={1} className="w-full" />
            </Form.Item>
          </div>
          <Form.Item name="status" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy} className="brand-gradient border-none">
            {editing ? 'Save changes' : 'Create package'}
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
