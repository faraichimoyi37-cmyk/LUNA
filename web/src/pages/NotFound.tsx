import { Link } from 'react-router-dom'
import { Button } from 'antd'
import { Compass } from 'lucide-react'
import { Logo } from '../components/ui/Logo'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-bg px-4 text-center">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <Logo size={56} />
      <div>
        <p className="text-7xl font-extrabold gradient-text">404</p>
        <h1 className="mt-4 text-2xl font-bold text-ink">Page not found</h1>
        <p className="mt-2 max-w-sm text-ink2">The page you are looking for doesn't exist or has been moved.</p>
      </div>
      <Link to="/">
        <Button type="primary" className="brand-gradient border-none" icon={<Compass size={16} />}>
          Back to home
        </Button>
      </Link>
    </div>
  )
}
