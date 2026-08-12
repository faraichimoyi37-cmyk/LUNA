import { prisma } from '../config/prisma'
import type { Prisma } from '@prisma/client'

export const DEFAULT_SETTINGS = {
  referralPercent: 10,
  welcomeBonus: 5,
  minDeposit: 10,
  minWithdrawal: 10,
  maxWithdrawal: 50000,
  withdrawalFee: 0,
  depositWalletTrc20: 'TVLfwapDwRMveafYfmY6TWuvNC7si8w6sU',
  depositWalletBep20: '0x057df1a2bece5b93907acd071314652cda900818',
  depositWalletErc20: '0x057df1a2bece5b93907acd071314652cda900818',
  txVerificationEnabled: true,
  maintenance: false,
  registrationsEnabled: true,
  depositsEnabled: true,
  withdrawalsEnabled: true,
  earningsEngineEnabled: true,
  supportEmail: 'spoiremongae@gmail.com',
  telegramUrl: 'https://t.me/+17426664547',
  whatsappUrl: 'https://whatsapp.com/channel/0029VbDOL3x6hENjeGM23u01',
  luckyBoxEnabled: true,
  luckyBoxPrice: 5,
  luckyBoxMinMultiplier: 2,
  luckyBoxMaxMultiplier: 8,
  spinWheelEnabled: true,
  spinCost: 2,
  spinPrizeMin: 1,
  spinPrizeMax: 25,
  spinDailyWinners: 1,
  agentApplicationFee: 25,
  agentRegistrationFee: 100,
}

export type SiteSettings = typeof DEFAULT_SETTINGS

export async function getSettings(): Promise<SiteSettings> {
  const rows = await prisma.systemSetting.findMany()
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const row of rows) out[row.key] = row.value
  return out as SiteSettings
}

export async function saveSettings(input: Record<string, unknown>) {
  for (const [key, value] of Object.entries(input)) {
    const jsonValue = value as Prisma.InputJsonValue
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: jsonValue },
      create: { key, value: jsonValue },
    })
  }
}
