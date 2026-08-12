import { useMemo, useState } from 'react'
import { App, Button, Form, Input, InputNumber, Select, Table } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, Copy, CheckCircle2, Wallet, Info } from 'lucide-react'
import { useDeposits, useSiteConfig, queryKeys } from '../../hooks/queries'
import { api, errMsg } from '../../lib/api'
import { PageLoader } from '../../components/ui/PageLoader'
import { GlassCard } from '../../components/ui/GlassCard'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusTag } from '../../components/ui/StatusTag'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime, formatMoney } from '../../lib/format'
import type { Deposit } from '../../lib/types'

export default function Deposit() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { data: deposits, isLoading } = useDeposits()
  const { data: config } = useSiteConfig()

  const method = Form.useWatch('method', form)
  const address = useMemo(() => {
    if (method === 'USDT_ERC20') return config?.depositWalletErc20
    if (method === 'USDT_BEP20') return config?.depositWalletBep20
    return config?.depositWalletTrc20
  }, [method, config])

  const formatHint = useMemo(() => {
    if (method === 'USDT_TRC20') return 'TRC-20 transaction IDs are exactly 64 hex characters (0-9, a-f). Paste the full hash from your wallet.'
    if (method === 'USDT_ERC20') return 'ERC-20 transaction hashes start with 0x and are 66 characters total (0x + 64 hex).'
    return 'BEP-20 transaction hashes start with 0x and are 66 characters total (0x + 64 hex).'
  }, [method])

  const txRules = [
    { required: true, message: 'Enter the transaction ID of your transfer' },
    {
      validator: (_: unknown, value: string) => {
        if (!value) return Promise.resolve()
        const ref = value.trim()
        let ok = false
        if (method === 'USDT_TRC20') ok = /^[a-fA-F0-9]{64}$/.test(ref)
        else ok = /^0x[a-fA-F0-9]{64}$/.test(ref)
        return ok ? Promise.resolve() : Promise.reject(new Error(formatHint))
      },
    },
  ]

  const copyAddress = async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    message.success('Wallet address copied')
  }

  const onFinish = async (values: { amount: number; method: string; txRef: string }) => {
    setLoading(true)
    try {
      await api.post('/deposits', values)
      message.success('Deposit submitted for approval')
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: queryKeys.deposits })
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => <span className="font-semibold text-ink">${formatMoney(v)}</span> },
    { title: 'Method', dataIndex: 'method', render: (v: string) => <span className="text-ink2">{v.replace('_', ' · ')}</span> },
    { title: 'TxID', dataIndex: 'txRef', ellipsis: true, render: (v?: string) => <code className="text-xs text-ink2">{v ?? '—'}</code> },
    { title: 'Status', dataIndex: 'status', render: (v: Deposit['status']) => <StatusTag status={v} /> },
    { title: 'Date', dataIndex: 'createdAt', render: (v: string) => <span className="text-ink2">{formatDateTime(v)}</span> },
  ]

  return (
    <div>
      <PageHeader title="Deposit Funds" subtitle="Add USDT to your balance" />

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="amount"
              label="Amount (USDT)"
              rules={[{ required: true, message: 'Enter an amount' }]}
              extra={`Minimum deposit: $${formatMoney(config?.minDeposit ?? 10)}`}
            >
              <InputNumber size="large" min={config?.minDeposit ?? 10} precision={2} prefix="$" className="w-full" placeholder="100.00" />
            </Form.Item>
            <Form.Item name="method" label="Payment method" rules={[{ required: true, message: 'Select a method' }]}>
              <Select
                size="large"
                placeholder="Select network"
                options={[
                  { value: 'USDT_TRC20', label: 'USDT (TRC-20 network)' },
                  { value: 'USDT_BEP20', label: 'USDT (BEP-20 network)' },
                  { value: 'USDT_ERC20', label: 'USDT (ERC-20 network)' },
                ]}
              />
            </Form.Item>

            {method ? (
              <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-primary" />
                  <p className="text-sm font-medium text-ink">
                    Deposit wallet address — <span className="font-semibold">{method.replace('_', ' ')}</span>
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface2 p-3">
                  <code className="flex-1 break-all text-xs text-ink">{address}</code>
                  <Button type="text" icon={<Copy size={16} />} onClick={copyAddress} aria-label="Copy address" />
                </div>
                <p className="mt-2 text-xs text-ink2">Send the exact USDT amount to this address, then paste your transaction ID below.</p>
              </div>
            ) : (
              <div className="mb-6 flex items-start gap-2 rounded-xl border border-line bg-surface2 p-4 text-sm text-ink2">
                <Info size={16} className="mt-0.5 shrink-0 text-accent" />
                <span>
                  Select a USDT network to see the receiving wallet address. Complete the transfer, then paste the transaction ID below —
                  deposits cannot be approved without it.
                </span>
              </div>
            )}

            <Form.Item
              name="txRef"
              label="Transaction ID"
              rules={txRules}
              extra="After sending USDT, paste the transaction hash from your wallet. Crypto deposits are verified on-chain automatically; only exact matches are accepted."
            >
              <Input
                size="large"
                placeholder={method === 'USDT_TRC20' ? '64-character transaction hash' : '0x… transaction hash (66 chars)'}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading} className="brand-gradient border-none font-semibold">
              <ArrowDownToLine size={16} className="mr-2" /> Submit deposit
            </Button>
            <div className="mt-4 flex items-start gap-2 text-xs text-ink2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-secondary" />
              <span>
                Crypto deposits are verified automatically against the blockchain (recipient wallet, token and exact amount). Approved deposits
                are credited to your balance by an administrator.
              </span>
            </div>
          </Form>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="mb-3 font-semibold text-ink">Deposit History</h2>
            <Table
              rowKey="id"
              dataSource={deposits ?? []}
              columns={columns}
              loading={isLoading}
              pagination={false}
              size="small"
              locale={{ emptyText: <EmptyState icon={Wallet} title="No deposits yet" description="Your deposit history will appear here." /> }}
            />
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
