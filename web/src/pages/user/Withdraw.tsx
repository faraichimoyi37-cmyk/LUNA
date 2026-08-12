import { useState } from 'react'
import { Link } from 'react-router-dom'
import { App, Alert, Button, Form, Input, InputNumber, Select, Table } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpFromLine, Wallet, Info, Boxes } from 'lucide-react'
import { useWithdrawals, useSiteConfig, useDashboard, useInvestments, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { GlassCard } from '../../components/ui/GlassCard'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusTag } from '../../components/ui/StatusTag'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney } from '../../lib/format'
import type { Withdrawal } from '../../lib/types'

export default function Withdraw() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { data: withdrawals, isLoading } = useWithdrawals()
  const { data: config } = useSiteConfig()
  const { data: dashboard } = useDashboard()
  const { data: investments } = useInvestments()

  const network = Form.useWatch('network', form)
  const hasInvestment = (investments ?? []).length > 0

  const addressHint =
    network === 'TRC20'
      ? 'Tron addresses start with T and are 34 characters (base58). Example: TULo2oXkwmY5mkXLTPbvTWjo8696MHZFit'
      : network === 'ERC20' || network === 'BEP20'
        ? 'Ethereum/BSC addresses start with 0x and are 42 characters total (0x + 40 hex).'
        : 'Select a network to see the required wallet address format.'

  const addressRules = [
    { required: true, message: 'Enter your wallet address' },
    {
      validator: (_: unknown, value: string) => {
        if (!value) return Promise.resolve()
        const addr = value.trim()
        let ok = false
        if (network === 'TRC20') ok = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)
        else if (network === 'ERC20' || network === 'BEP20') ok = /^0x[0-9a-fA-F]{40}$/.test(addr)
        else ok = addr.length >= 8
        return ok ? Promise.resolve() : Promise.reject(new Error(`Invalid ${network ?? ''} address format.`))
      },
    },
  ]

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const usedToday = (withdrawals ?? []).filter((w) => w.status !== 'REJECTED' && new Date(w.createdAt) >= todayStart).length
  const dailyLimitReached = usedToday >= 1

  const onFinish = async (values: { amount: number; network: string; walletAddress: string }) => {
    setLoading(true)
    try {
      await api.post('/withdrawals', values)
      message.success('Withdrawal submitted for approval')
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: queryKeys.withdrawals })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: 'Amount', dataIndex: 'amount', render: (v: number, r: Withdrawal) => <span className="font-semibold text-ink">${formatMoney(v)}</span> },
    { title: 'Wallet', dataIndex: 'walletAddress', ellipsis: true, render: (v: string) => <code className="text-xs text-ink2">{v}</code> },
    { title: 'Network', dataIndex: 'network', render: (v?: string) => <span className="text-ink2">{v ?? '—'}</span> },
    { title: 'Status', dataIndex: 'status', render: (v: Withdrawal['status']) => <StatusTag status={v} /> },
    { title: 'Date', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  return (
    <div>
      <PageHeader title="Withdraw Funds" subtitle="Send earnings to your wallet" />

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          {!hasInvestment ? (
            <Alert
              type="info"
              showIcon
              className="mb-0"
              message="Withdrawals require an active investment"
              description="You need to purchase an investment package before you can withdraw your funds. Pick a plan and start earning daily returns first."
              action={
                <Link to="/dashboard/packages">
                  <Button size="small" type="primary" className="brand-gradient border-none">
                    <Boxes size={14} className="mr-1" /> Buy a package
                  </Button>
                </Link>
              }
            />
          ) : dailyLimitReached ? (
            <Alert
              type="warning"
              showIcon
              className="mb-0"
              message="Daily withdrawal limit reached"
              description="You have already submitted a withdrawal request today. You can submit your next request tomorrow."
            />
          ) : (
            <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
              <Form.Item
                name="amount"
                label="Amount (USDT)"
                rules={[{ required: true, message: 'Enter an amount' }]}
                extra={`Available: $${formatMoney(dashboard?.balance ?? 0)} · Min $${formatMoney(config?.minWithdrawal ?? 10)} · Max $${formatMoney(config?.maxWithdrawal ?? 50000)}`}
              >
                <InputNumber size="large" min={config?.minWithdrawal ?? 10} max={config?.maxWithdrawal ?? 50000} precision={2} prefix="$" className="w-full" placeholder="50.00" />
              </Form.Item>
              <Form.Item name="network" label="Network" rules={[{ required: true, message: 'Select a network' }]}>
                <Select
                  size="large"
                  placeholder="Select network"
                  options={[
                    { value: 'TRC20', label: 'TRC-20 (Tron)' },
                    { value: 'ERC20', label: 'ERC-20 (Ethereum)' },
                    { value: 'BEP20', label: 'BEP-20 (BSC)' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="walletAddress" label="Wallet address" rules={addressRules} extra={addressHint}>
                <Input size="large" placeholder={network === 'TRC20' ? 'T… (34-character Tron address)' : '0x… (42-character address)'} />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={loading} className="brand-gradient border-none font-semibold">
                <ArrowUpFromLine size={16} className="mr-2" /> Request withdrawal
              </Button>
            </Form>
          )}
          {hasInvestment && (
            <div className="mt-4 flex items-start gap-2 text-xs text-ink2">
              <Info size={14} className="mt-0.5 shrink-0 text-accent" />
              <span>
                Withdrawal fee is {formatMoney(config?.withdrawalFee ?? 0)}% and is deducted from your balance. Funds are sent after
                admin approval. Limit: one withdrawal request per day.
              </span>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="mb-3 font-semibold text-ink">Withdrawal History</h2>
          <Table
            rowKey="id"
            dataSource={withdrawals ?? []}
            columns={columns}
            loading={isLoading}
            pagination={false}
            size="small"
            locale={{ emptyText: <EmptyState icon={Wallet} title="No withdrawals yet" description="Your withdrawal requests will appear here." /> }}
          />
        </GlassCard>
      </div>
    </div>
  )
}
