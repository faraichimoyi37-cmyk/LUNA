import type { Transaction, TransactionType } from './types'

const incomeTypes: TransactionType[] = ['PROFIT', 'MATURITY', 'REFERRAL', 'BONUS', 'DEPOSIT']

export function isIncome(tx: Transaction): boolean {
  if (tx.type === 'ADJUSTMENT') {
    const direction = (tx.meta as { direction?: string } | null)?.direction
    if (direction) return direction === 'credit'
    return true
  }
  return incomeTypes.includes(tx.type)
}

export function txLabel(type: TransactionType): string {
  const map: Record<TransactionType, string> = {
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
    INVESTMENT: 'Investment',
    PROFIT: 'Daily profit',
    MATURITY: 'Maturity',
    REFERRAL: 'Referral',
    ADJUSTMENT: 'Adjustment',
    BONUS: 'Bonus',
  }
  return map[type]
}
