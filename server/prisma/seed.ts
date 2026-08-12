import { PrismaClient, type TransactionType, type PaymentStatus } from '@prisma/client'
import { tronAddressFromPayload, keccak256Hex } from '../src/utils/txverify'

const prisma = new PrismaClient()

const DAY = 86_400_000
const money = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

// ------------------------------------------------------------------ packages
const packages = [
  { id: 'interns', name: 'Starter', description: 'Perfect entry point to start earning daily.', icon: 'seedling', investmentAmount: 10, dailyPercentage: 6, durationDays: 70 },
  { id: 'foundation', name: 'Foundation', description: 'The most popular plan for steady growth.', icon: 'layers', investmentAmount: 20, dailyPercentage: 6, durationDays: 69 },
  { id: 'bronze', name: 'Bronze', description: 'Premium tier with boosted daily returns.', icon: 'shield', investmentAmount: 100, dailyPercentage: 6.5, durationDays: 75 },
  { id: 'silver', name: 'Silver', description: 'VIP plan for experienced investors.', icon: 'award', investmentAmount: 400, dailyPercentage: 6.5, durationDays: 78 },
  { id: 'gold', name: 'Gold', description: 'High-capital plan with maximum earning power.', icon: 'crown', investmentAmount: 1600, dailyPercentage: 10, durationDays: 50 },
  { id: 'platinum', name: 'Platinum', description: 'Elite plan for high-net-worth investors.', icon: 'gem', investmentAmount: 10000, dailyPercentage: 12, durationDays: 40 },
  { id: 'diamond', name: 'Diamond', description: 'The ultimate plan for maximum returns.', icon: 'diamond', investmentAmount: 25000, dailyPercentage: 19, durationDays: 80 },
] as const

const settings = {
  referralPercent: 10,
  welcomeBonus: 5,
  minDeposit: 10,
  minWithdrawal: 10,
  maxWithdrawal: 50000,
  withdrawalFee: 0,
  depositWalletTrc20: 'TULo2oXkwmY5mkXLTPbvTWjo8696MHZFit',
  depositWalletErc20: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  txVerificationEnabled: true,
  maintenance: false,
  supportEmail: 'support@luna.com',
}

// ------------------------------------------------------------------ seed users
type Person = { name: string; referredBy: number }
const people: Person[] = [
  { name: 'James Carter', referredBy: -1 },
  { name: 'Sarah Mitchell', referredBy: 0 },
  { name: 'Michael Okafor', referredBy: 0 },
  { name: 'Priya Sharma', referredBy: 0 },
  { name: 'Tom Becker', referredBy: 0 },
  { name: 'James Chen', referredBy: 1 },
  { name: 'Fatima Al-Sayed', referredBy: 1 },
  { name: 'Sofia Rossi', referredBy: 1 },
  { name: 'David Kim', referredBy: 2 },
  { name: 'Elena Petrova', referredBy: 2 },
  { name: 'Andre Dubois', referredBy: 2 },
  { name: 'Nina Kovac', referredBy: 3 },
  { name: 'Mei Lin', referredBy: 3 },
  { name: 'Omar Haddad', referredBy: 4 },
  { name: 'Grace Adeyemi', referredBy: 4 },
  { name: 'Lucas Silva', referredBy: 6 },
  { name: 'Hans Mueller', referredBy: 7 },
  { name: 'Kenji Nakamura', referredBy: 8 },
  { name: 'Isabela Torres', referredBy: 9 },
  { name: 'Raj Patel', referredBy: 10 },
  { name: 'Yuki Tanaka', referredBy: 11 },
  { name: 'Carlos Mendez', referredBy: 12 },
  { name: 'Anna Nowak', referredBy: 13 },
  { name: 'Kwame Mensah', referredBy: 14 },
  { name: 'Zainab Ali', referredBy: 15 },
]

const mailDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'protonmail.com', 'icloud.com', 'hotmail.com', 'gmx.com', 'zoho.com']
const slug = (name: string) => name.replace(/[^A-Za-z]/g, '').toLowerCase()
const emailOf = (name: string, i: number) => `${slug(name)}@${mailDomains[i % mailDomains.length]}`
const codeOf = (name: string, i: number) => `${slug(name).slice(0, 6).toUpperCase()}${String(i + 1).padStart(2, '0')}`

const HEX_CHARS = '0123456789abcdef'
const hex = (rand: () => number, n: number) => {
  let s = ''
  for (let k = 0; k < n; k++) s += HEX_CHARS[Math.floor(rand() * 16)]
  return s
}

const KYC_DOC_TYPES = ['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE']
const KYC_PENDING = new Set([3, 7, 11, 15, 20])
const KYC_REJECTED = new Set([22])
const kycStatus = (i: number): 'APPROVED' | 'PENDING' | 'REJECTED' =>
  KYC_PENDING.has(i) ? 'PENDING' : KYC_REJECTED.has(i) ? 'REJECTED' : 'APPROVED'
const kycDocNumber = (i: number): string => {
  const t = KYC_DOC_TYPES[i % KYC_DOC_TYPES.length]
  const d = String(1000000 + i * 173)
  if (t === 'PASSPORT') return `${String.fromCharCode(65 + (i % 26))}${d.slice(0, 7)}`
  if (t === 'NATIONAL_ID') return `ID-${d.slice(0, 8)}`
  return `DL-${String(1000 + i * 43).slice(0, 4)}-${String(1000 + i * 7).slice(0, 4)}`
}
const checksumAddress = (address: string): string => {
  const lower = address.toLowerCase().slice(2)
  const hash = keccak256Hex(lower)
  let out = '0x'
  for (let k = 0; k < lower.length; k++) out += Number.parseInt(hash[k], 16) >= 8 ? lower[k].toUpperCase() : lower[k]
  return out
}

const countries = ['US', 'UK', 'DE', 'FR', 'NG', 'IN', 'BR', 'JP', 'KR', 'IT', 'AE', 'PL', 'EG', 'MX', 'ES', 'TR', 'UA', 'ID', 'PH', 'CA']

// deterministic PRNG so re-seeding produces the same dataset
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TIERS = [0, 0, 1, 1, 2, 2, 3, 3, 4]
const pkg = (id: string) => packages.find((p) => p.id === id)!

type Plan = { pkg: (typeof packages)[number]; startDaysAgo: number; completed: boolean }

function plansFor(index: number, rand: () => number): Plan[] {
  if (index === 0) {
    return [
      { pkg: pkg('interns'), startDaysAgo: 28, completed: false },
      { pkg: pkg('foundation'), startDaysAgo: 74, completed: true },
      { pkg: pkg('bronze'), startDaysAgo: 45, completed: false },
      { pkg: pkg('silver'), startDaysAgo: 18, completed: false },
    ]
  }
  if (index === 24) {
    return [
      { pkg: pkg('gold'), startDaysAgo: 20, completed: false },
      { pkg: pkg('foundation'), startDaysAgo: 12, completed: false },
    ]
  }
  const count = 1 + Math.floor(rand() * 3)
  const plans: Plan[] = []
  for (let k = 0; k < count; k++) {
    const p = packages[TIERS[Math.floor(rand() * TIERS.length)]]
    const dur = p.durationDays
    const completed = rand() < 0.4
    const startDaysAgo = completed
      ? dur + Math.round(rand() * 18) + 4
      : Math.min(dur - 1, 1 + Math.round(rand() * Math.min(42, dur - 1)))
    plans.push({ pkg: p, startDaysAgo, completed })
  }
  return plans
}

type TxSeed = {
  type: TransactionType
  amount: number
  at: Date
  priority: number
  status?: PaymentStatus
  ref?: string
  meta?: Record<string, string | number | boolean>
}

const INCOME = new Set<TransactionType>(['DEPOSIT', 'PROFIT', 'MATURITY', 'REFERRAL', 'BONUS'])

async function main() {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const daysAgo = (n: number) => new Date(todayStart.getTime() - n * DAY)
  const capNow = (d: Date) => new Date(Math.min(d.getTime(), now.getTime() - 60_000))

  const adminPassword = await Bun.password.hash('Admin@123', { algorithm: 'argon2id' })
  const userPassword = await Bun.password.hash('Demo@123', { algorithm: 'argon2id' })

  // Reset only the managed seed users (admin and any other users are kept).
  await prisma.user.deleteMany({ where: { email: { in: ['demo@luna.com', ...people.map((p, i) => emailOf(p.name, i))] } } })

  await prisma.user.upsert({
    where: { email: 'admin@luna.com' },
    update: {},
    create: {
      fullname: 'Luna Admin',
      email: 'admin@luna.com',
      password: adminPassword,
      role: 'ADMIN',
      referralCode: 'LUNAADMIN',
      createdAt: daysAgo(200),
      settings: { create: {} },
    },
  })

  // Replace the old package set with the current VIP plans.
  await prisma.package.deleteMany({ where: { id: { notIn: packages.map((p) => p.id) } } })

  for (const p of packages) {
    const daily = money((p.investmentAmount * p.dailyPercentage) / 100)
    const totalReturn = money(daily * p.durationDays)
    await prisma.package.upsert({
      where: { id: p.id },
      update: { name: p.name, description: p.description, icon: p.icon, investmentAmount: p.investmentAmount, dailyPercentage: p.dailyPercentage, durationDays: p.durationDays, totalReturn, status: true },
      create: { id: p.id, name: p.name, description: p.description, icon: p.icon, investmentAmount: p.investmentAmount, dailyPercentage: p.dailyPercentage, durationDays: p.durationDays, totalReturn },
    })
  }

  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
  }

  for (const a of [
    { title: 'Welcome to LUNA', message: 'Start earning daily returns on your USDT investments today.' },
    { title: 'Referral program live', message: 'Earn up to 10% commission on every referral investment.' },
    { title: 'New: Diamond plan', message: 'The ultimate VIP plan is live — up to 19% daily return over 80 days.' },
  ]) {
    await prisma.announcement.upsert({ where: { id: `${a.title}` }, update: {}, create: a })
  }

  const rand = mulberry32(20260810)
  const referralPercent = Number(settings.referralPercent)

  const created: Record<number, { id: string; createdAt: Date }> = {}
  const ledgers: Record<number, TxSeed[]> = {}
  const notifications: Record<number, { title: string; message: string; type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'; at: Date }[]> = {}

  // A few accounts created in the last two weeks so the admin growth chart isn't empty.
  const RECENT_AT: Record<number, number> = { 3: 2, 9: 5, 14: 8, 19: 11, 24: 13 }

  for (let i = 0; i < people.length; i++) {
    const p = people[i]
    const createdAt = RECENT_AT[i] !== undefined ? daysAgo(RECENT_AT[i]) : daysAgo(28 + Math.floor(rand() * 60))
    const user = await prisma.user.create({
      data: {
        fullname: p.name,
        email: emailOf(p.name, i),
        password: userPassword,
        role: 'USER',
        referralCode: codeOf(p.name, i),
        ...(p.referredBy >= 0 ? { referredById: created[p.referredBy].id } : {}),
        balance: 0,
        settings: { create: {} },
        kyc: {
          create: {
            fullName: p.name,
            documentType: KYC_DOC_TYPES[i % KYC_DOC_TYPES.length],
            documentNumber: kycDocNumber(i),
            country: countries[i % countries.length],
            documents: [],
            status: kycStatus(i),
            submittedAt: capNow(new Date(createdAt.getTime() + 2 * DAY + (i % 4) * DAY)),
            ...(kycStatus(i) === 'PENDING'
              ? {}
              : { reviewedAt: capNow(new Date(createdAt.getTime() + (6 + (i % 5)) * DAY)) }),
          },
        },
        createdAt,
      },
    })
    created[i] = user
    ledgers[i] = []
    notifications[i] = [
      {
        title: 'Welcome to LUNA',
        message: `Hi ${p.name.split(' ')[0]}, your account is ready. Make your first deposit and start earning.`,
        type: 'INFO',
        at: capNow(new Date(createdAt.getTime() + DAY)),
      },
    ]

    const bonusAt = capNow(new Date(createdAt.getTime() + 2 * DAY))
    ledgers[i].push({ type: 'BONUS', amount: Number(settings.welcomeBonus), at: bonusAt, priority: 0, ref: 'WELCOME', meta: { reason: 'Welcome bonus' } })
    notifications[i].push({
      title: 'Welcome bonus',
      message: `You received a $${Number(settings.welcomeBonus)} welcome bonus.`,
      type: 'SUCCESS',
      at: bonusAt,
    })
  }

  const referralEvents: { referrer: number; amount: number; at: Date }[] = []
  const completedInvestments: { userId: number; packageName: string; amount: number; endDate: Date }[] = []

  for (let i = 0; i < people.length; i++) {
    const p = people[i]
    const plans = plansFor(i, rand)
    let totalInvested = 0
    let firstStart = Infinity

    for (const plan of plans) {
      const amount = plan.pkg.investmentAmount
      totalInvested += amount
      firstStart = Math.min(firstStart, plan.startDaysAgo)
      const startDate = daysAgo(plan.startDaysAgo)
      const dailyProfit = money((amount * plan.pkg.dailyPercentage) / 100)
      const totalReturn = money(dailyProfit * plan.pkg.durationDays)
      const endDate = new Date(startDate.getTime() + plan.pkg.durationDays * DAY)

      const inv = await prisma.investment.create({
        data: {
          userId: created[i].id,
          packageId: plan.pkg.id,
          packageName: plan.pkg.name,
          amount,
          dailyProfit,
          totalReturn,
          startDate,
          endDate,
          lastProfitDate: plan.completed ? endDate : todayStart,
          status: plan.completed ? 'COMPLETED' : 'ACTIVE',
          createdAt: startDate,
        },
      })

      ledgers[i].push({
        type: 'INVESTMENT',
        amount,
        at: startDate,
        priority: 1,
        ref: `INV-${inv.id}`,
        meta: { packageId: plan.pkg.id, packageName: plan.pkg.name },
      })

      const elapsed = Math.floor((todayStart.getTime() - startDate.getTime()) / DAY)
      const profitDays = plan.completed ? plan.pkg.durationDays : Math.min(plan.pkg.durationDays, Math.max(0, elapsed + 1))
      for (let d = 0; d < profitDays; d++) {
        ledgers[i].push({
          type: 'PROFIT',
          amount: dailyProfit,
          at: new Date(startDate.getTime() + d * DAY),
          priority: 2,
          ref: `PRF-${inv.id}`,
          meta: { investmentId: inv.id, packageName: plan.pkg.name },
        })
      }

      if (plan.completed) {
        ledgers[i].push({ type: 'MATURITY', amount, at: endDate, priority: 4, ref: `MAT-${inv.id}`, meta: { investmentId: inv.id, packageName: plan.pkg.name } })
        completedInvestments.push({ userId: i, packageName: plan.pkg.name, amount, endDate })
      }

      if (p.referredBy >= 0) {
        referralEvents.push({ referrer: p.referredBy, amount: money((amount * referralPercent) / 100), at: startDate })
      }
    }

    const depositDate = daysAgo(firstStart + 1)
    const isErc = i % 3 === 0
    const d = await prisma.deposit.create({
      data: {
        userId: created[i].id,
        amount: totalInvested,
        method: isErc ? 'USDT_ERC20' : 'USDT_TRC20',
        txRef: isErc ? `0x${hex(rand, 64)}` : hex(rand, 64),
        status: 'APPROVED',
        createdAt: depositDate,
        meta: isErc
          ? { verified: true, source: 'ETH-RPC', to: settings.depositWalletErc20, amount: totalInvested, token: 'USDT' }
          : { verified: true, source: 'TRONGRID', to: settings.depositWalletTrc20, amount: totalInvested, token: 'USDT (TRC20)' },
      },
    })
    ledgers[i].push({ type: 'DEPOSIT', amount: totalInvested, at: depositDate, priority: 0, ref: `DEP-${d.id}`, meta: { method: d.method } })
    notifications[i].push({
      title: 'Deposit approved',
      message: `Your $${totalInvested} deposit was approved and credited to your balance.`,
      type: 'SUCCESS',
      at: new Date(depositDate.getTime() + 3_600_000),
    })
  }

  // A few recent deposits still awaiting admin approval (not credited to balances).
  const pendingDeposits = [4, 10, 16, 23]
  const pendingAmounts = [250, 620, 90, 1400]
  for (let k = 0; k < pendingDeposits.length; k++) {
    const i = pendingDeposits[k]
    const isErc = i % 3 === 0
    await prisma.deposit.create({
      data: {
        userId: created[i].id,
        amount: pendingAmounts[k],
        method: isErc ? 'USDT_ERC20' : 'USDT_TRC20',
        txRef: isErc ? `0x${hex(rand, 64)}` : hex(rand, 64),
        status: 'PENDING',
        createdAt: daysAgo(k * 2 + 1),
        meta: isErc
          ? { verified: true, source: 'ETH-RPC', to: settings.depositWalletErc20, amount: pendingAmounts[k], token: 'USDT' }
          : { verified: true, source: 'TRONGRID', to: settings.depositWalletTrc20, amount: pendingAmounts[k], token: 'USDT (TRC20)' },
      },
    })
  }

  for (const { userId, packageName, amount, endDate } of completedInvestments) {
    notifications[userId].push({
      title: 'Investment matured',
      message: `Your ${packageName} investment of $${amount} completed and the principal was returned.`,
      type: 'SUCCESS',
      at: endDate,
    })
  }

  // referral commissions
  const referralNotified = new Set<number>()
  for (const ev of referralEvents) {
    ledgers[ev.referrer].push({ type: 'REFERRAL', amount: ev.amount, at: ev.at, priority: 3 })
    if (!referralNotified.has(ev.referrer)) {
      referralNotified.add(ev.referrer)
      notifications[ev.referrer].push({
        title: 'Referral commission',
        message: `You earned $${ev.amount} in referral commission.`,
        type: 'SUCCESS',
        at: ev.at,
      })
    }
  }

  // -------- first pass: compute balances without withdrawals
  const available: Record<number, number> = {}
  for (let i = 0; i < people.length; i++) {
    const sorted = [...ledgers[i]].sort((a, b) => a.at.getTime() - b.at.getTime() || a.priority - b.priority)
    let bal = 0
    for (const t of sorted) bal = money(bal + (INCOME.has(t.type) ? t.amount : -t.amount))
    available[i] = bal
  }

  // -------- withdrawals (approved + a couple pending)
  const tronWallet = () => tronAddressFromPayload(hex(rand, 40))
  const ethWallet = () => checksumAddress(`0x${hex(rand, 40)}`)

  const approvedW = [1, 2, 4, 5, 6, 8, 12, 19]
  const pendingW = [0, 3]

  for (let i = 0; i < people.length; i++) {
    const wants = approvedW.includes(i) || pendingW.includes(i)
    if (!wants || available[i] < 40) continue
    const isPending = pendingW.includes(i)
    const amount = money(available[i] * (isPending ? 0.25 : 0.3))
    const w = await prisma.withdrawal.create({
      data: {
        userId: created[i].id,
        amount,
        fee: 0,
        walletAddress: i % 2 === 0 ? tronWallet() : ethWallet(),
        network: i % 2 === 0 ? 'TRC20' : 'ERC20',
        status: isPending ? 'PENDING' : 'APPROVED',
        processedAt: isPending ? null : daysAgo(Math.max(1, 6 + (i % 5))),
        createdAt: daysAgo(isPending ? 0 : 8 + (i % 6)),
      },
    })
    ledgers[i].push({
      type: 'WITHDRAWAL',
      amount,
      at: daysAgo(isPending ? 0 : 8 + (i % 6)),
      priority: 5,
      status: isPending ? 'PENDING' : 'APPROVED',
      ref: `WDR-${w.id}`,
      meta: { walletAddress: w.walletAddress ?? '', network: w.network ?? '' },
    })
    notifications[i].push({
      title: isPending ? 'Withdrawal submitted' : 'Withdrawal completed',
      message: `Your $${amount} withdrawal was ${isPending ? 'submitted and is pending approval' : 'sent to your wallet'}.`,
      type: isPending ? 'INFO' : 'SUCCESS',
      at: daysAgo(isPending ? 0 : 8 + (i % 6)),
    })
  }

  // -------- final pass: write transactions and final balance
  for (let i = 0; i < people.length; i++) {
    const sorted = [...ledgers[i]].sort((a, b) => a.at.getTime() - b.at.getTime() || a.priority - b.priority)
    let bal = 0
    const rows = sorted.map((t) => {
      bal = money(bal + (INCOME.has(t.type) ? t.amount : -t.amount))
      return {
        userId: created[i].id,
        type: t.type,
        amount: t.amount,
        status: t.status ?? ('APPROVED' as PaymentStatus),
        balanceAfter: bal,
        reference: t.ref,
        meta: t.meta,
        createdAt: t.at,
      }
    })
    await prisma.transaction.createMany({ data: rows })
    await prisma.user.update({ where: { id: created[i].id }, data: { balance: bal } })
  }

  await prisma.notification.createMany({
    data: people.flatMap((_, i) =>
      notifications[i].map((n) => ({ userId: created[i].id, title: n.title, message: n.message, type: n.type, createdAt: n.at })),
    ),
  })

  const totals = await prisma.transaction.groupBy({ by: ['type'], _count: { _all: true } })
  const brief = totals.map((t) => `${t.type}:${t._count._all}`).join(' ')

  console.log(`Seed complete. ${people.length} users created. Admin login: admin@luna.com (Admin@123). User login: ${emailOf(people[0].name, 0)} (Demo@123). Tx: ${brief}`)
  console.log('Withdrawal rule active: users must own an investment package before withdrawing.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
