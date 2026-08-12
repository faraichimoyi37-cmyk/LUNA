export function formatMoney(value: number | string, decimals = 2): string {
  const n = Number(value)
  if (Number.isNaN(n)) return '0.00'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatMoneySigned(value: number | string): string {
  const n = Number(value)
  return `${n >= 0 ? '+' : '-'}$${formatMoney(Math.abs(n))}`
}

export function formatDate(value: string | Date): string {
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value: string | Date): string {
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(value: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(value)
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}
