import { App, Avatar } from 'antd'
import { Mail, Copy, BadgeCheck, ShieldCheck } from 'lucide-react'
import { useMe } from '../../hooks/queries'
import { PageLoader } from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import AgentApplicationCard from '../../components/agent/AgentApplicationCard'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'

export default function Profile() {
  const { data, isLoading } = useMe()
  const { message } = App.useApp()

  if (isLoading || !data) return <PageLoader />

  const copyCode = async () => {
    await navigator.clipboard.writeText(data.referralCode)
    message.success('Referral code copied')
  }

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your account information" />

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-6">
          <div className="flex flex-col items-center text-center">
            <Avatar size={88} className="brand-gradient text-2xl font-bold text-white">
              {data.fullname.slice(0, 1).toUpperCase()}
            </Avatar>
            <h2 className="mt-4 flex items-center justify-center gap-1.5 text-lg font-bold text-ink">
              {data.fullname}
              {data.role === 'AGENT' && <VerifiedBadge />}
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-ink2">
              <Mail size={13} /> {data.email}
            </p>
            <p className="mt-1 text-xs text-ink2">
              {data.role === 'ADMIN' ? 'Administrator' : data.role === 'AGENT' ? 'Company agent' : 'Member'}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-surface2 px-4 py-3 text-sm">
              <span className="text-ink2">Referral code</span>
              <button onClick={copyCode} className="flex items-center gap-1.5 font-mono font-semibold text-ink hover:text-primary">
                {data.referralCode} <Copy size={13} />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-surface2 px-4 py-3 text-sm">
              <span className="text-ink2">Status</span>
              <span className="font-semibold text-secondary">{data.status}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-surface2 px-4 py-3 text-sm">
              <span className="text-ink2">Phone</span>
              <span className="font-medium text-ink">{data.phone ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-surface2 px-4 py-3 text-sm">
              <span className="text-ink2">Member since</span>
              <span className="font-medium text-ink">{new Date(data.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 lg:col-span-2">
          <h2 className="mb-5 font-semibold text-ink">Account details</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 p-4 text-sm">
              <span className="text-ink2">Full name</span>
              <span className="font-medium text-ink">{data.fullname}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 p-4 text-sm">
              <span className="text-ink2">Email</span>
              <span className="font-medium text-ink">{data.email}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 p-4 text-sm">
              <span className="text-ink2">Phone</span>
              <span className="font-medium text-ink">{data.phone ?? '—'}</span>
            </div>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-line bg-surface2 p-4 text-sm text-ink2">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-secondary" />
            <p>
              Profile editing is disabled for security. Contact support if your personal information needs to be updated.
            </p>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-surface2 p-4 text-sm text-ink2">
            <BadgeCheck size={18} className="mt-0.5 shrink-0 text-secondary" />
            <p>
              Email address cannot be changed from here for security reasons. Need to update your identity documents? Visit the
              verification page.
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-0 lg:col-span-2">
          <AgentApplicationCard />
        </GlassCard>
      </div>
    </div>
  )
}
