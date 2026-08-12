import { App, Button, Form, InputNumber, Statistic, Switch, Table, Tag } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Disc3, TrendingUp, Trophy, Wallet, Save } from 'lucide-react'
import { useAdminSpins, useAdminSpinStats, useAdminSettings, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney } from '../../lib/format'
import type { AdminSpin } from '../../lib/types'
import { useMemo, useState } from 'react'

interface SpinSettingsForm {
  spinWheelEnabled: boolean
  spinCost: number
  spinPrizeMin: number
  spinPrizeMax: number
  spinDailyWinners: number
}

export default function AdminSpinWheel() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { data: settings, isLoading: settingsLoading } = useAdminSettings()
  const { data: stats, isLoading: statsLoading } = useAdminSpinStats()
  const { data: spins, isLoading: spinsLoading } = useAdminSpins()
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<SpinSettingsForm>()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings })
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.spinsStats })
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.spins })
  }

  const save = async (values: SpinSettingsForm) => {
    setSaving(true)
    try {
      await api.put('/admin/settings', values)
      message.success('Spin wheel settings saved')
      invalidate()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setSaving(false)
    }
  }

  const initial = useMemo<Partial<SpinSettingsForm>>(
    () =>
      settings
        ? {
            spinWheelEnabled: Boolean(settings.spinWheelEnabled),
            spinCost: Number(settings.spinCost ?? 2),
            spinPrizeMin: Number(settings.spinPrizeMin ?? 1),
            spinPrizeMax: Number(settings.spinPrizeMax ?? 25),
            spinDailyWinners: Number(settings.spinDailyWinners ?? 1),
          }
        : {},
    [settings],
  )

  const columns = [
    {
      title: 'User',
      dataIndex: 'user',
      render: (v: AdminSpin['user']) => (
        <div>
          <div className="font-medium text-ink">{v.fullname}</div>
          <div className="text-xs text-ink2">{v.email}</div>
        </div>
      ),
    },
    { title: 'Bet', dataIndex: 'bet', render: (v: number) => <span className="text-ink2">${formatMoney(v)}</span> },
    { title: 'Prize', dataIndex: 'prize', render: (v: number, r: AdminSpin) => <span className="font-semibold text-secondary">${formatMoney(v)}</span> },
    {
      title: 'Result',
      dataIndex: 'won',
      render: (v: boolean, r: AdminSpin) => {
        const net = r.prize - r.bet
        return v ? <Tag color="green">Win +${formatMoney(net)}</Tag> : <Tag color="default">Lose {net < 0 ? `-${formatMoney(Math.abs(net))}` : `+${formatMoney(net)}`}</Tag>
      },
    },
    { title: 'Date', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  if ((settingsLoading && !settings) || (statsLoading && !stats)) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Spin Wheel"
        subtitle="Configure the wheel and monitor today's spins"
        actions={
          <Tag color={stats?.enabled ? 'green' : 'default'} className="px-3 py-1">
            {stats?.enabled ? 'Enabled' : 'Disabled'}
          </Tag>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <GlassCard className="p-5">
          <Statistic title="Spins today" value={stats?.spinsToday ?? 0} prefix={<Disc3 size={18} className="text-primary" />} />
        </GlassCard>
        <GlassCard className="p-5">
          <Statistic
            title={`Winners today (of ${stats?.dailyWinners ?? 1})`}
            value={stats?.winnersToday ?? 0}
            prefix={<Trophy size={18} className="text-accent" />}
          />
        </GlassCard>
        <GlassCard className="p-5">
          <Statistic title="Bets today" value={stats?.betsToday ?? 0} precision={2} prefix={<Wallet size={18} className="text-primary" />} />
        </GlassCard>
        <GlassCard className="p-5">
          <Statistic
            title="Net today (bets − prizes)"
            value={stats?.netToday ?? 0}
            precision={2}
            valueStyle={{ color: (stats?.netToday ?? 0) >= 0 ? '#16a34a' : '#ef4444' }}
            prefix={<TrendingUp size={18} />}
          />
        </GlassCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="mb-3 font-semibold text-ink">Wheel settings</h2>
          <Form form={form} layout="vertical" initialValues={initial} onFinish={save} requiredMark={false}>
            <Form.Item name="spinWheelEnabled" label="Enable spin wheel" valuePropName="checked">
              <Switch />
            </Form.Item>
            <div className="grid gap-4 sm:grid-cols-2">
              <Form.Item name="spinCost" label="Default spin amount (USDT)" extra="Players can choose any amount, minimum $2." rules={[{ required: true }]}>
                <InputNumber size="large" min={2} precision={2} className="w-full" prefix="$" />
              </Form.Item>
              <Form.Item name="spinDailyWinners" label="Daily winners" extra="Max winning spins (prize ≥ bet) per day platform-wide." rules={[{ required: true }]}>
                <InputNumber size="large" min={1} className="w-full" />
              </Form.Item>
              <Form.Item name="spinPrizeMin" label="Minimum prize (USDT) at default amount" rules={[{ required: true }]}>
                <InputNumber size="large" min={0} precision={2} className="w-full" prefix="$" />
              </Form.Item>
              <Form.Item name="spinPrizeMax" label="Maximum prize (USDT) at default amount" rules={[{ required: true }]}>
                <InputNumber size="large" min={1} precision={2} className="w-full" prefix="$" />
              </Form.Item>
            </div>
            <Button type="primary" htmlType="submit" size="large" loading={saving} icon={<Save size={16} />} className="brand-gradient border-none font-semibold">
              Save settings
            </Button>
          </Form>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="mb-3 font-semibold text-ink">Recent spins</h2>
          <Table
            rowKey="id"
            dataSource={spins ?? []}
            columns={columns}
            loading={spinsLoading}
            pagination={false}
            size="small"
            scroll={{ y: 380 }}
            locale={{ emptyText: <EmptyState icon={Disc3} title="No spins yet" description="Users spins will appear here." /> }}
          />
        </GlassCard>
      </div>
    </div>
  )
}
