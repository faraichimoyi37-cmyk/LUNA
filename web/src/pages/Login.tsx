import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, App, Button, Form, Input } from 'antd'
import { Lock, Mail, ArrowRight } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Logo } from '../components/ui/Logo'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const [searchParams] = useSearchParams()
  const suspended = searchParams.get('suspended') === '1'
  const [form] = Form.useForm<{ email: string; password: string }>()

  const readDomValue = (id: string): string => (document.getElementById(id) as HTMLInputElement | null)?.value ?? ''

  const onFinish = async () => {
    const values = form.getFieldsValue()
    const email = (values.email || readDomValue('email')).trim()
    const password = values.password || readDomValue('password')
    if (!email || !password) {
      form.setFields([
        ...(!email ? [{ name: 'email' as const, errors: ['Enter a valid email'] }] : []),
        ...(!password ? [{ name: 'password' as const, errors: ['Enter your password'] }] : []),
      ])
      return
    }
    setLoading(true)
    try {
      const res = await api.post<{ token: string; user: { role: 'USER' | 'ADMIN' } & Record<string, unknown> }>('/auth/login', { email, password })
      setAuth(res.token, res.user as never)
      message.success('Welcome back!')
      navigate((location.state as { from?: string })?.from ?? (res.user.role === 'ADMIN' ? '/admin' : '/dashboard'))
    } catch (error) {
      message.error(errMsg(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[600px] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/20 blur-[100px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-block">
            <Logo size={56} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink2">Log in to your LUNA account</p>
        </div>

        <div className="glass-card p-8">
          {suspended && (
            <Alert
              type="error"
              showIcon
              className="mb-4"
              message="Account suspended"
              description="Your account has been suspended by the administrator. Contact support for assistance."
            />
          )}
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
              <Input size="large" autoComplete="username" prefix={<Mail size={16} className="text-ink2" />} placeholder="you@example.com" />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password' }]}>
              <Input.Password size="large" autoComplete="current-password" prefix={<Lock size={16} className="text-ink2" />} placeholder="••••••••" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading} className="brand-gradient border-none font-semibold">
              Log in <ArrowRight size={16} className="ml-1" />
            </Button>
          </Form>
        </div>

        <p className="mt-6 text-center text-sm text-ink2">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
