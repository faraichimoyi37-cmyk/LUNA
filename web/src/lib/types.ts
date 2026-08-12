export interface Paginated<T> {
  data: T[]
  page: number
  limit: number
  total: number
  pages: number
}

export interface PackagePlan {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  investmentAmount: number
  dailyPercentage: number
  durationDays: number
  totalReturn: number
  status: boolean
  createdAt: string
}

export interface Investment {
  id: string
  userId: string
  packageId?: string | null
  packageName: string
  amount: number
  dailyProfit: number
  totalReturn: number
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'COMPLETED'
  createdAt: string
  remainingDays?: number
  progress?: number
  package?: PackagePlan | null
}

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'INVESTMENT'
  | 'PROFIT'
  | 'MATURITY'
  | 'REFERRAL'
  | 'ADJUSTMENT'
  | 'BONUS'

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface Transaction {
  id: string
  userId: string
  type: TransactionType
  amount: number
  balanceAfter?: number | null
  status: PaymentStatus
  reference?: string | null
  meta?: Record<string, unknown> | null
  createdAt: string
}

export interface AdminTransaction extends Transaction {
  user: { id: string; fullname: string; email: string }
}

export interface Deposit {
  id: string
  userId: string
  amount: number
  method: string
  txRef?: string | null
  status: PaymentStatus
  meta?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  user?: { id: string; fullname: string; email: string }
}

export interface Withdrawal {
  id: string
  userId: string
  amount: number
  fee: number
  walletAddress: string
  network?: string | null
  status: PaymentStatus
  processedAt?: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; fullname: string; email: string }
}

export interface AppNotification {
  id: string
  userId: string
  title: string
  message: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  read: boolean
  createdAt: string
}

export interface KycRecord {
  id: string
  userId: string
  fullName: string
  documentType: string
  documentNumber: string
  country?: string | null
  documents: string[]
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  adminNote?: string | null
  submittedAt: string
  reviewedAt?: string | null
  user?: { id: string; fullname: string; email: string }
}

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AgentApplication {
  id: string
  userId: string
  fullName: string
  email: string
  phone: string
  address: string
  idType: 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID'
  idNumber: string
  idDocumentUrl?: string | null
  proofOfAddressUrl?: string | null
  applicationFeeAmount: number
  applicationFeeTx?: string | null
  registrationFeeAck: boolean
  education: 'HIGH_SCHOOL' | 'GED' | 'UNIVERSITY' | 'OTHER'
  resumeUrl?: string | null
  referenceOneName: string
  referenceOneContact: string
  referenceTwoName: string
  referenceTwoContact: string
  tin: string
  criminalRecordOk: boolean
  license?: string | null
  businessRegistration?: string | null
  hasDevice: boolean
  hasInternet: boolean
  banking: string
  status: ApplicationStatus
  reviewedAt?: string | null
  createdAt: string
  user?: { id: string; fullname: string; email: string; role: string; balance: number }
}

export interface DashboardData {
  balance: number
  earnings: { total: number; today: number }
  activeInvestments: { count: number; amount: number; expectedDaily: number }
  completedInvestments: { count: number }
  pendingWithdrawals: { count: number; amount: number }
  pendingDeposits: { count: number; amount: number }
  totals: { deposits: number; withdrawals: number; earnings: number }
  profitSeries: { date: string; profit: number }[]
  portfolio: { name: string; value: number }[]
  recentTransactions: Transaction[]
}

export interface ReferralData {
  code: string
  link: string
  count: number
  totalEarned: number
  referrals: {
    id: string
    fullname: string
    email: string
    role: string
    createdAt: string
    totalInvested: number
  }[]
}

export interface LeaderboardEntry {
  rank: number
  name: string
  amount: number
}

export interface SiteConfig {
  referralPercent: number
  minDeposit: number
  minWithdrawal: number
  maxWithdrawal: number
  withdrawalFee: number
  depositWalletTrc20: string
  depositWalletBep20: string
  depositWalletErc20: string
  maintenance: boolean
  supportEmail: string
  telegramUrl: string
  whatsappUrl: string
  siteName: string
  appUrl: string
  agentApplicationFee?: number
  agentRegistrationFee?: number
}

export interface ActivityItem {
  type: 'DEPOSIT' | 'WITHDRAWAL'
  amount: number
  method: string
  name: string
  createdAt: string
}

export interface Voucher {
  id: string
  code: string
  amount: number
  status: 'ACTIVE' | 'USED'
  maxUses: number
  usedCount: number
  createdById: string | null
  createdBy?: { fullname: string } | null
  usedById: string | null
  usedBy?: { fullname: string; email: string } | null
  usedAt: string | null
  createdAt: string
}

export interface PromoCode {
  id: string
  code: string
  percent: number
  amount: number
  maxUses: number
  usedCount: number
  expiresAt: string | null
  status: boolean
  createdBy?: { fullname: string } | null
  createdAt: string
}

export interface LuckyConfig {
  enabled: boolean
  price: number
  minMultiplier: number
  maxMultiplier: number
  openedToday: boolean
  canOpen: boolean
}

export interface LuckyResult {
  prize: number
  multiplier: number
  price: number
  balanceAfter: number
}

export interface SpinConfig {
  enabled: boolean
  cost: number
  minBet: number
  multipliers: number[]
  dailyWinners: number
  winnersToday: number
}

export interface SpinResult {
  prize: number
  cost: number
  balanceAfter: number
  segmentIndex: number
  multipliers: number[]
  won: boolean
  winnersToday: number
  dailyWinners: number
  minBet: number
}

export interface AdminSpin {
  id: string
  user: { id: string; fullname: string; email: string }
  bet: number
  prize: number
  won: boolean
  segmentIndex: number
  balanceAfter: number
  createdAt: string
}

export interface AdminSpinStats {
  spinsToday: number
  winnersToday: number
  dailyWinners: number
  betsToday: number
  paidToday: number
  netToday: number
  enabled: boolean
}

export interface AdminUser {
  id: string
  fullname: string
  email: string
  phone: string | null
  role: 'USER' | 'AGENT' | 'ADMIN'
  status: 'ACTIVE' | 'SUSPENDED'
  balance: number
  referralCode: string
  referredBy?: { id: string; fullname: string; email: string } | null
  createdAt: string
  _count: { investments: number; deposits: number; withdrawals: number; referrals: number }
}

export interface AdminStats {
  users: number
  activeInvestors: number
  totalBalance: number
  totalDeposits: number
  totalWithdrawals: number
  totalInvestments: number
  totalProfits: number
  totalReferrals: number
  totalBonuses: number
  revenue: number
  growth: { date: string; count: number }[]
  activity: { date: string; count: number }[]
  topInvestors: { rank: number; name: string; email: string; amount: number }[]
  recentUsers: { id: string; fullname: string; email: string; createdAt: string }[]
  recentLogs: { id: string; userId: string | null; action: string; ip: string | null; createdAt: string }[]
}

export interface AdminUserDetail {
  id: string
  fullname: string
  email: string
  phone: string | null
  role: 'USER' | 'AGENT' | 'ADMIN'
  status: 'ACTIVE' | 'SUSPENDED'
  balance: number
  referralCode: string
  referredById: string | null
  referredBy?: { id: string; fullname: string; email: string } | null
  settings?: {
    language: string
    notificationsOn: boolean
    twoFactorEnabled: boolean
  } | null
  agentApplication?: AgentApplication | null
  kyc?: KycRecord | null
  referrals?: { id: string; fullname: string; email: string; createdAt: string }[]
  investments?: Investment[]
  deposits?: Deposit[]
  withdrawals?: Withdrawal[]
  transactions?: Transaction[]
  notifications?: AppNotification[]
  auditLogs?: AuditLog[]
  createdAt: string
}

export interface AuditLog {
  id: string
  userId: string | null
  actorRole: string | null
  action: string
  ip: string | null
  meta?: Record<string, unknown> | null
  createdAt: string
}

export interface Announcement {
  id: string
  title: string
  message: string
  createdAt: string
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'OPEN' | 'RESOLVED'
  createdAt: string
}

export interface ReportData {
  users: number
  deposits: number
  withdrawals: number
  investments: number
  profitsPaid: number
  referralsPaid: number
  principalReturned: number
  netRevenue: number
}
