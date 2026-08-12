import { prisma } from '../config/prisma'
import { money } from '../utils/http'
import { sendToUser } from '../ws/hub'
import { getSettings } from './settings'

export const DAY = 86_400_000

export function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / DAY))
}

async function creditProfit(investment: {
  id: string
  userId: string
  dailyProfit: { toString(): string }
  lastProfitDate: Date | null
  startDate: Date
  packageName: string
}, days: number) {
  const profit = money(Number(investment.dailyProfit.toString()) * days)
  if (profit <= 0) return
  const last = investment.lastProfitDate ?? investment.startDate
  const newLast = new Date(last.getTime() + days * DAY)
  await prisma.$transaction([
    prisma.user.update({ where: { id: investment.userId }, data: { balance: { increment: profit } } }),
    prisma.investment.update({ where: { id: investment.id }, data: { lastProfitDate: newLast } }),
    prisma.transaction.create({
      data: {
        userId: investment.userId,
        type: 'PROFIT',
        amount: profit,
        reference: `PRF-${investment.id}`,
        meta: { investmentId: investment.id, days, packageName: investment.packageName },
      },
    }),
  ])
  sendToUser(investment.userId, 'profit', { amount: profit, investmentId: investment.id, packageName: investment.packageName })
}

export async function runEarningsEngine(): Promise<number> {
  const now = new Date()
  const active = await prisma.investment.findMany({
    where: { status: 'ACTIVE', user: { status: 'ACTIVE' } },
  })
  let settled = 0

  for (const inv of active) {
    if (inv.endDate.getTime() <= now.getTime()) {
      const last = inv.lastProfitDate ?? inv.startDate
      const days = daysBetween(last, inv.endDate)
      if (days > 0) await creditProfit(inv, days)
      await prisma.$transaction([
        prisma.user.update({ where: { id: inv.userId }, data: { balance: { increment: inv.amount } } }),
        prisma.investment.update({ where: { id: inv.id }, data: { status: 'COMPLETED' } }),
        prisma.transaction.create({
          data: {
            userId: inv.userId,
            type: 'MATURITY',
            amount: inv.amount,
            reference: `MAT-${inv.id}`,
            meta: { investmentId: inv.id, packageName: inv.packageName },
          },
        }),
        prisma.notification.create({
          data: {
            userId: inv.userId,
            type: 'SUCCESS',
            title: 'Investment matured',
            message: `Your ${inv.packageName} investment of $${Number(inv.amount)} has completed and principal was returned.`,
          },
        }),
      ])
      sendToUser(inv.userId, 'maturity', { investmentId: inv.id, amount: Number(inv.amount), packageName: inv.packageName })
      settled++
    } else {
      const last = inv.lastProfitDate ?? inv.startDate
      const days = daysBetween(last, now)
      if (days > 0) await creditProfit(inv, days)
    }
  }

  return settled
}

export async function payReferralCommission(referrerId: string, referredUserId: string, amount: number) {
  const settings = await getSettings()
  const percent = Number(settings.referralPercent ?? 0)
  const commission = money((amount * percent) / 100)
  if (commission <= 0) return
  const referrer = await prisma.user.findUnique({ where: { id: referrerId } })
  if (!referrer || referrer.status === 'SUSPENDED') return
  await prisma.$transaction([
    prisma.user.update({ where: { id: referrerId }, data: { balance: { increment: commission } } }),
    prisma.transaction.create({
      data: {
        userId: referrerId,
        type: 'REFERRAL',
        amount: commission,
        reference: `REF-${referredUserId}`,
        meta: { referredUserId },
      },
    }),
    prisma.notification.create({
      data: {
        userId: referrerId,
        type: 'SUCCESS',
        title: 'Referral commission',
        message: `You earned $${commission} in referral commission.`,
      },
    }),
  ])
  sendToUser(referrerId, 'referral', { amount: commission })
}
