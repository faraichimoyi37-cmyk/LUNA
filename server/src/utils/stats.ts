import type { Transaction, Investment } from '@prisma/client'
import { money } from './http'

export function buildProfitSeries(transactions: Transaction[], days: number): { date: string; profit: number }[] {
  const series: { date: string; profit: number }[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
    const profit = transactions
      .filter((t) => t.type === 'PROFIT' && t.createdAt >= day && t.createdAt < next)
      .reduce((sum, t) => sum + Number(t.amount), 0)
    series.push({ date: day.toISOString().slice(0, 10), profit: money(profit) })
  }
  return series
}

export function buildDailyCount(dates: Date[], days: number): { date: string; count: number }[] {
  const series: { date: string; count: number }[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
    series.push({
      date: day.toISOString().slice(0, 10),
      count: dates.filter((d) => d >= day && d < next).length,
    })
  }
  return series
}

export function aggregateByPackage(investments: Investment[]): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const inv of investments) {
    map.set(inv.packageName, (map.get(inv.packageName) ?? 0) + Number(inv.amount))
  }
  return [...map.entries()].map(([name, value]) => ({ name, value: money(value) }))
}
