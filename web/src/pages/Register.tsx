import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { App, Button, Form, Input, Select } from 'antd'
import { Lock, Mail, User, Gift, ArrowRight } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Logo } from '../components/ui/Logo'
import { buildPhone, countries } from '../lib/countries'
interface RegisterValues {
  fullname: string
  email: string
  country: string
  phone: string
  password: string
  referralCode?: string
}

const countryOptions = countries.map((c) => ({ value: c.code, label: `${c.name} (${c.dial})` }))

export default function Register() {
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { message } = App.useApp()
  const [form] = Form.useForm<RegisterValues>()
  const country = Form.useWatch('country', form) || 'US'
  const dial = countries.find((c) => c.code === country)?.dial ?? '+1'

  const onFinish = async (values: RegisterValues) => {
    setLoading(true)
    try {
      const referralCode = values.referralCode || searchParams.get('ref') || undefined
      const phone = buildPhone(dial, values.phone)
      const res = await api.post<{ token: string; user: { role: 'USER' | 'ADMIN' } & Record<string, unknown> }>(
        '/auth/register',
        {
          fullname: values.fullname,
          email: values.email,
          phone,
          password: values.password,
          referralCode: referralCode ? referralCode.toUpperCase() : undefined,
        },
      )
      setAuth(res.token, res.user as never)
      message.success('Account created. Welcome to LUNA!')
      navigate('/dashboard')
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[600px] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-secondary/20 blur-[100px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-block">
            <Logo size={56} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink2">Join LUNA and start earning daily returns</p>
        </div>

        <div className="glass-card p-8">
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="fullname" label="Full name" rules={[{ required: true, min: 2, message: 'Enter your full name' }]}>
              <Input size="large" autoComplete="name" prefix={<User size={16} className="text-ink2" />} placeholder="John Doe" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
              <Input size="large" autoComplete="username" prefix={<Mail size={16} className="text-ink2" />} placeholder="you@example.com" />
            </Form.Item>
            <Form.Item name="country" label="Country" initialValue="US" rules={[{ required: true, message: 'Select your country' }]}>
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                placeholder="Select country"
                options={countryOptions}
              />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Phone number"
              rules={[
                { required: true, message: 'Enter your phone number' },
                { pattern: /^[0-9 ]{6,15}$/, message: 'Enter a valid phone number' },
              ]}
            >
              <Input
                size="large"
                autoComplete="tel"
                addonBefore={<span className="font-semibold text-primary">{dial}</span>}
                placeholder="801 234 5678"
              />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, min: 8, message: 'Minimum 8 characters' }]}>
              <Input.Password size="large" autoComplete="new-password" prefix={<Lock size={16} className="text-ink2" />} placeholder="••••••••" />
            </Form.Item>
            <Form.Item
              name="referralCode"
              label="Referral code (optional)"
              extra="If you were invited, enter the referral code to earn bonus rewards for both of you."
            >
              <Input
                size="large"
                prefix={<Gift size={16} className="text-ink2" />}
                placeholder="REFCODE"
                defaultValue={searchParams.get('ref') ?? undefined}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading} className="brand-gradient border-none font-semibold">
              Create account <ArrowRight size={16} className="ml-1" />
            </Button>
          </Form>
        </div>

        <p className="mt-6 text-center text-sm text-ink2">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
