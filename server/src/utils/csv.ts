export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = rows.map((row) =>
    headers
      .map((header) => {
        const value = row[header]
        if (value == null) return ''
        if (value instanceof Date) return escape(value.toISOString())
        if (typeof value === 'object') return escape(JSON.stringify(value))
        return escape(String(value))
      })
      .join(','),
  )
  return [headers.join(','), ...lines].join('\n')
}
