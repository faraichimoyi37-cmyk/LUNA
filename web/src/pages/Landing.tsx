import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button, Collapse } from 'antd'
import {
  ShieldCheck,
  TrendingUp,
  Wallet,
  Gift,
  Zap,
  Globe,
  ArrowRight,
  ChevronRight,
  Users,
  Lock,
  BarChart3,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/auth'
import { usePackages, useSiteConfig } from '../hooks/queries'
import { formatMoney } from '../lib/format'
import { Logo } from '../components/ui/Logo'

const features = [
  { icon: TrendingUp, title: 'Daily Returns', text: 'Earn automatic daily returns on every package — credited to your balance every 24 hours.' },
  { icon: Wallet, title: 'Secure Wallet', text: 'Deposit and withdraw USDT with full transparency and instant balance updates.' },
  { icon: Gift, title: 'Referral Rewards', text: 'Invite friends and earn a commission on every investment they make.' },
  { icon: ShieldCheck, title: 'Bank-Grade Security', text: 'Argon2 password hashing, JWT auth and audit logging keep your account safe.' },
  { icon: Zap, title: 'Instant Payouts', text: 'Withdraw your earnings quickly to your own USDT wallet address.' },
  { icon: BarChart3, title: 'Live Analytics', text: 'Track earnings, investments and portfolio performance with beautiful charts.' },
]

const steps = [
  { icon: Users, title: 'Create account', text: 'Register in seconds with just your name and email.' },
  { icon: Wallet, title: 'Deposit USDT', text: 'Add funds to your balance using your preferred network.' },
  { icon: TrendingUp, title: 'Invest & earn', text: 'Pick a package and start receiving daily returns automatically.' },
]

const faqItems = [
  {
    key: '1',
    label: 'How do I start earning?',
    children: 'Create an account, deposit USDT and purchase an investment package. Daily profits are credited automatically every 24 hours.',
  },
  {
    key: '2',
    label: 'When are returns paid?',
    children: 'Returns accrue every full 24-hour cycle after your investment starts and are credited directly to your balance.',
  },
  {
    key: '3',
    label: 'Can I withdraw anytime?',
    children: 'Yes. Request a withdrawal from your dashboard and funds are sent to your wallet after approval.',
  },
  {
    key: '4',
    label: 'Is my capital safe?',
    children: 'Your principal is returned in full when an investment reaches maturity, alongside the final profit payment.',
  },
  {
    key: '5',
    label: 'How does the referral program work?',
    children: 'Share your unique referral link. You earn a commission every time a referred user purchases a package.',
  },
]

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { token } = useAuthStore()
  const { data: config } = useSiteConfig()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all ${
        scrolled ? 'border-b border-line bg-bg/80 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo to="/" size={36} />
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink2 md:flex">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#packages" className="hover:text-ink">Packages</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          {token ? (
            <Link to="/dashboard">
              <Button type="primary" className="brand-gradient border-none">
                Open dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button type="text">Log in</Button>
              </Link>
              <Link to="/register">
                <Button type="primary" className="brand-gradient border-none">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-40 right-0 h-72 w-72 rounded-full bg-accent/20 blur-[100px]" />
      <div className="pointer-events-none absolute top-64 left-0 h-72 w-72 rounded-full bg-secondary/20 blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Zap size={13} /> Daily returns · Up to 19%
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-6xl"
        >
          Grow your wealth with <span className="gradient-text">daily returns</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-5 max-w-2xl text-base text-ink2 sm:text-lg"
        >
          LUNA is a modern digital investment platform. Deposit USDT, purchase investment packages and
          watch your balance grow automatically — every single day.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link to="/register">
            <Button type="primary" size="large" className="brand-gradient border-none font-semibold">
              Start earning <ArrowRight size={16} className="ml-1" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="large" className="font-semibold">
              Log in
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { value: '$10+', label: 'Minimum deposit' },
            { value: '6–19%', label: 'Daily returns' },
            { value: '40–80 days', label: 'Package duration' },
            { value: '24/7', label: 'Automatic earnings' },
          ].map((item) => (
            <div key={item.label} className="glass-card px-4 py-5">
              <p className="text-2xl font-extrabold gradient-text">{item.value}</p>
              <p className="mt-1 text-xs text-ink2">{item.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function PackagesSection() {
  const { data: packages } = usePackages()
  return (
    <section id="packages" className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-ink sm:text-4xl">Investment packages</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink2">
            Choose a plan that fits your goals. Every package pays a fixed daily return and returns your capital at maturity.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(packages ?? []).slice(0, 6).map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="glass-card glass-card-hover relative overflow-hidden p-6"
            >
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{pkg.name}</p>
              <p className="mt-3 text-3xl font-extrabold text-ink">
                ${formatMoney(pkg.investmentAmount)}
              </p>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink2">Daily return</span>
                  <span className="font-bold text-secondary">{pkg.dailyPercentage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink2">Duration</span>
                  <span className="font-semibold text-ink">{pkg.durationDays} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink2">Total return</span>
                  <span className="font-semibold text-ink">${formatMoney(pkg.totalReturn)}</span>
                </div>
              </div>
              <Link to="/register">
                <Button type="primary" block className="brand-gradient mt-6 border-none">
                  Invest now
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-ink sm:text-4xl">Why LUNA</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink2">
            Everything you need to invest, track and grow — in one modern platform.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="glass-card glass-card-hover p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl brand-gradient text-white shadow-lg">
                <feature.icon size={22} />
              </div>
              <h3 className="mt-4 font-semibold text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink2">{feature.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-ink sm:text-4xl">How it works</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink2">Start earning in three simple steps.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card relative p-6 text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl brand-gradient text-white shadow-lg">
                <step.icon size={26} />
              </div>
              <span className="absolute top-4 right-5 text-4xl font-extrabold text-surface2">{index + 1}</span>
              <h3 className="mt-4 font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-ink2">{step.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ReferralCta() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="glass-card brand-glow relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full bg-secondary/20 blur-[90px]" />
          <div className="relative grid items-center gap-8 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-xs font-semibold text-secondary">
                <Gift size={13} /> Referral program
              </span>
              <h2 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">
                Earn commission on every referral
              </h2>
              <p className="mt-3 text-ink2">
                Share your unique referral link and earn a percentage of every investment made by the people you invite.
              </p>
              <Link to="/register">
                <Button type="primary" size="large" className="brand-gradient mt-6 border-none font-semibold">
                  Create your link <ChevronRight size={16} className="ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-line bg-surface/60 p-5">
                <Globe size={20} className="text-accent" />
                <p className="mt-2 text-2xl font-bold text-ink">Unlimited</p>
                <p className="text-xs text-ink2">Referrals</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface/60 p-5">
                <Lock size={20} className="text-primary" />
                <p className="mt-2 text-2xl font-bold text-ink">Instant</p>
                <p className="text-xs text-ink2">Commission</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-ink sm:text-4xl">Frequently asked questions</h2>
        </div>
        <div className="mt-10">
          <Collapse
            accordion
            items={faqItems}
            className="glass-card overflow-hidden"
            expandIconPosition="end"
          />
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Logo size={34} />
          <p className="text-sm text-ink2">
            © {new Date().getFullYear()} LUNA. Modern digital investment platform.
          </p>
          <div className="flex items-center gap-4 text-sm text-ink2">
            <a href="#faq" className="hover:text-ink">FAQ</a>
            <a href="#packages" className="hover:text-ink">Packages</a>
            <a href="#features" className="hover:text-ink">Features</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <Hero />
      <PackagesSection />
      <FeaturesSection />
      <HowItWorks />
      <ReferralCta />
      <Faq />
      <Footer />
    </div>
  )
}
