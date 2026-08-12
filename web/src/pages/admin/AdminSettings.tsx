import { useState } from 'react'
import { App, Button, Form, Input, InputNumber, Switch } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Settings as SettingsIcon, Zap, RefreshCw, Save } from 'lucide-react'
import { useAdminSettings, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'

interface SettingsForm {
  referralPercent: number
  minDeposit: number
  minWithdrawal: number
  maxWithdrawal: number
  withdrawalFee: number
  depositWalletTrc20: string
  depositWalletBep20: string
  depositWalletErc20: string
  supportEmail: string
  telegramUrl: string
  whatsappUrl: string
  maintenance: boolean
  registrationsEnabled: boolean
  depositsEnabled: boolean
  withdrawalsEnabled: boolean
  earningsEngineEnabled: boolean
  luckyBoxEnabled: boolean
  luckyBoxPrice: number
  luckyBoxMinMultiplier: number
  luckyBoxMaxMultiplier: number
  spinWheelEnabled: boolean
  spinCost: number
  spinPrizeMin: number
  spinPrizeMax: number
  spinDailyWinners: number
}

export default function AdminSettings() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { data, isLoading } = useAdminSettings()
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [form] = Form.useForm<SettingsForm>()

  const save = async (values: SettingsForm) => {
    setSaving(true)
    try {
      await api.put('/admin/settings', values)
      message.success('Settings saved')
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings })
      queryClient.invalidateQueries({ queryKey: queryKeys.config })
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setSaving(false)
    }
  }

  const runEngine = async () => {
    setRunning(true)
    try {
      const res = await api.post<{ settled: number }>('/admin/engine/run')
      message.success(`Earnings engine ran — ${res.settled} credits processed`)
      queryClient.invalidateQueries()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setRunning(false)
    }
  }

  if (isLoading || !data) return <PageLoader />

  const initial: Partial<SettingsForm> = {
    referralPercent: Number(data.referralPercent ?? 10),
    minDeposit: Number(data.minDeposit ?? 10),
    minWithdrawal: Number(data.minWithdrawal ?? 10),
    maxWithdrawal: Number(data.maxWithdrawal ?? 50000),
    withdrawalFee: Number(data.withdrawalFee ?? 0),
    depositWalletTrc20: String(data.depositWalletTrc20 ?? ''),
    depositWalletBep20: String(data.depositWalletBep20 ?? ''),
    depositWalletErc20: String(data.depositWalletErc20 ?? ''),
    supportEmail: String(data.supportEmail ?? ''),
    telegramUrl: String(data.telegramUrl ?? ''),
    whatsappUrl: String(data.whatsappUrl ?? ''),
    maintenance: Boolean(data.maintenance),
    registrationsEnabled: Boolean(data.registrationsEnabled),
    depositsEnabled: Boolean(data.depositsEnabled),
    withdrawalsEnabled: Boolean(data.withdrawalsEnabled),
    earningsEngineEnabled: Boolean(data.earningsEngineEnabled),
    luckyBoxEnabled: Boolean(data.luckyBoxEnabled),
    luckyBoxPrice: Number(data.luckyBoxPrice ?? 5),
    luckyBoxMinMultiplier: Number(data.luckyBoxMinMultiplier ?? 2),
    luckyBoxMaxMultiplier: Number(data.luckyBoxMaxMultiplier ?? 8),
    spinWheelEnabled: Boolean(data.spinWheelEnabled),
    spinCost: Number(data.spinCost ?? 2),
    spinPrizeMin: Number(data.spinPrizeMin ?? 1),
    spinPrizeMax: Number(data.spinPrizeMax ?? 25),
    spinDailyWinners: Number(data.spinDailyWinners ?? 1),
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Platform-wide configuration"
        actions={
          <Button icon={<Zap size={15} />} loading={running} onClick={runEngine}>
            Run earnings engine
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <h2 className="mb-5 flex items-center gap-2 font-semibold text-ink">
            <SettingsIcon size={18} className="text-primary" /> General settings
          </h2>
          <Form form={form} layout="vertical" requiredMark={false} initialValues={initial} onFinish={save}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Form.Item name="referralPercent" label="Referral commission (%)" rules={[{ required: true }]}>
                <InputNumber size="large" min={0} max={100} className="w-full" />
              </Form.Item>
              <Form.Item name="withdrawalFee" label="Withdrawal fee (%)" rules={[{ required: true }]}>
                <InputNumber size="large" min={0} max={100} className="w-full" />
              </Form.Item>
              <Form.Item name="minDeposit" label="Minimum deposit (USDT)" rules={[{ required: true }]}>
                <InputNumber size="large" min={1} className="w-full" prefix="$" />
              </Form.Item>
              <Form.Item name="minWithdrawal" label="Minimum withdrawal (USDT)" rules={[{ required: true }]}>
                <InputNumber size="large" min={1} className="w-full" prefix="$" />
              </Form.Item>
              <Form.Item name="maxWithdrawal" label="Maximum withdrawal (USDT)" rules={[{ required: true }]}>
                <InputNumber size="large" min={1} className="w-full" prefix="$" />
              </Form.Item>
              <Form.Item name="supportEmail" label="Support email" rules={[{ required: true, type: 'email' }]}>
                <Input size="large" />
              </Form.Item>
              <Form.Item name="telegramUrl" label="Telegram URL">
                <Input size="large" placeholder="https://t.me/..." />
              </Form.Item>
              <Form.Item name="whatsappUrl" label="WhatsApp URL">
                <Input size="large" placeholder="https://whatsapp.com/channel/..." />
              </Form.Item>
            </div>
            <Form.Item name="depositWalletTrc20" label="USDT TRC-20 deposit wallet" rules={[{ required: true, min: 10 }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="depositWalletBep20" label="USDT BEP-20 deposit wallet" rules={[{ required: true, min: 10 }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="depositWalletErc20" label="USDT ERC-20 deposit wallet" rules={[{ required: true, min: 10 }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="maintenance" label="Maintenance mode (blocks user operations)" valuePropName="checked">
              <Switch />
            </Form.Item>
            <h2 className="mt-2 mb-3 font-semibold text-ink">Platform controls</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Form.Item name="registrationsEnabled" label="Allow new registrations" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="depositsEnabled" label="Allow deposits" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="withdrawalsEnabled" label="Allow withdrawals" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="earningsEngineEnabled" label="Earnings engine (daily profits)" valuePropName="checked">
                <Switch />
              </Form.Item>
            </div>
            <h2 className="mt-2 mb-3 font-semibold text-ink">Lucky box</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Form.Item name="luckyBoxEnabled" label="Enable lucky box" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="luckyBoxPrice" label="Box price (USDT)" rules={[{ required: true }]}>
                <InputNumber size="large" min={0.1} precision={2} className="w-full" prefix="$" />
              </Form.Item>
              <Form.Item name="luckyBoxMinMultiplier" label="Min multiplier (x)" rules={[{ required: true }]}>
                <InputNumber size="large" min={1} className="w-full" />
              </Form.Item>
              <Form.Item name="luckyBoxMaxMultiplier" label="Max multiplier (x)" rules={[{ required: true }]}>
                <InputNumber size="large" min={1} className="w-full" />
              </Form.Item>
            </div>
            <h2 className="mt-2 mb-3 font-semibold text-ink">Spin wheel</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Form.Item name="spinWheelEnabled" label="Enable spin wheel" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="spinCost" label="Spin cost (USDT)" rules={[{ required: true }]}>
                <InputNumber size="large" min={0.1} precision={2} className="w-full" prefix="$" />
              </Form.Item>
              <Form.Item name="spinPrizeMin" label="Minimum prize (USDT)" rules={[{ required: true }]}>
                <InputNumber size="large" min={0} precision={2} className="w-full" prefix="$" />
              </Form.Item>
              <Form.Item name="spinPrizeMax" label="Maximum prize (USDT)" rules={[{ required: true }]}>
                <InputNumber size="large" min={1} precision={2} className="w-full" prefix="$" />
              </Form.Item>
              <Form.Item name="spinDailyWinners" label="Daily winners" extra="Max winning spins (prize ≥ cost) allowed per day platform-wide." rules={[{ required: true }]}>
                <InputNumber size="large" min={1} className="w-full" />
              </Form.Item>
            </div>
            <Button type="primary" htmlType="submit" size="large" loading={saving} icon={<Save size={16} />} className="brand-gradient border-none font-semibold">
              Save settings
            </Button>
          </Form>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
              <RefreshCw size={18} className="text-accent" /> Earnings engine
            </h2>
            <p className="text-sm text-ink2">
              Credits daily profits, processes maturities and referral commissions for all active investments. Normally runs on a
              schedule.
            </p>
            <Button className="mt-4 w-full" loading={running} onClick={runEngine}>
              Run now
            </Button>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="mb-3 font-semibold text-ink">Tip</h2>
            <p className="text-sm text-ink2">
              Wallet addresses are shown to users on the deposit page. Keep support email and wallet addresses accurate to avoid
              payment issues.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
