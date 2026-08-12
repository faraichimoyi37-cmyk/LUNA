import { useState } from 'react'
import { App, Button, Form, Input, Switch } from 'antd'
import { KeyRound, Lock, Shield, Smartphone, ShieldCheck } from 'lucide-react'
import { api, errMsg } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard } from '../../components/ui/GlassCard'
import { useAuthStore } from '../../store/auth'

interface PasswordValues {
  currentPassword: string
  newPassword: string
  confirm: string
}

export default function Security() {
  const { message } = App.useApp()
  const user = useAuthStore((state) => state.user)
  const [changing, setChanging] = useState(false)
  const [twoFactor, setTwoFactor] = useState(user?.settings?.twoFactorEnabled ?? false)
  const [toggling, setToggling] = useState(false)

  const onChangePassword = async (values: PasswordValues) => {
    if (values.newPassword !== values.confirm) {
      message.error('Passwords do not match')
      return
    }
    setChanging(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      message.success('Password changed successfully')
      ;(document.getElementById('security-password-form') as HTMLFormElement | null)?.reset()
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setChanging(false)
    }
  }

  const toggle2fa = async (enabled: boolean) => {
    setToggling(true)
    try {
      await api.post('/users/security/2fa', { enabled })
      setTwoFactor(enabled)
      message.success(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled')
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setToggling(false)
    }
  }

  return (
    <div>
      <PageHeader title="Security" subtitle="Keep your account safe and secure" />

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink">
            <KeyRound size={18} className="text-primary" /> Change password
          </h2>
          <p className="mb-5 text-xs text-ink2">Use a strong password you don't use elsewhere.</p>
          <Form id="security-password-form" layout="vertical" requiredMark={false} onFinish={onChangePassword}>
            <Form.Item name="currentPassword" label="Current password" rules={[{ required: true, message: 'Enter your current password' }]}>
              <Input.Password size="large" prefix={<Lock size={16} className="text-ink2" />} />
            </Form.Item>
            <Form.Item name="newPassword" label="New password" rules={[{ required: true, min: 8, message: 'At least 8 characters' }]}>
              <Input.Password size="large" prefix={<KeyRound size={16} className="text-ink2" />} />
            </Form.Item>
            <Form.Item name="confirm" label="Confirm new password" rules={[{ required: true }]}>
              <Input.Password size="large" prefix={<KeyRound size={16} className="text-ink2" />} />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" loading={changing} className="brand-gradient border-none font-semibold">
              Update password
            </Button>
          </Form>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface2">
                  <Shield size={18} className="text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-ink">Two-Factor Authentication</p>
                  <p className="mt-0.5 text-xs text-ink2">
                    Add an extra layer of security to your account. When enabled you will be asked for a verification code on sign-in.
                  </p>
                </div>
              </div>
              <Switch checked={twoFactor} loading={toggling} onChange={toggle2fa} />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface2">
                <Smartphone size={18} className="text-secondary" />
              </div>
              <div>
                <p className="font-semibold text-ink">Signed in as</p>
                <p className="text-xs text-ink2">{user?.email}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-start gap-3 rounded-xl border border-line bg-surface2 p-4 text-sm text-ink2">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-secondary" />
              <p>
                Never share your password or verification codes with anyone. Our team will never ask for your password.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
