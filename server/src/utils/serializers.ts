export function serialize(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (typeof item === 'bigint') return Number(item)
      if (item && typeof item === 'object' && typeof (item as { toNumber?: unknown }).toNumber === 'function') {
        return Number((item as { toNumber: () => unknown }).toNumber())
      }
      return item
    }),
  )
}
