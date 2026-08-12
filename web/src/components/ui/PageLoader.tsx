import { Spin } from 'antd'

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <Spin size="large" />
      <p className="text-sm text-ink2">Loading…</p>
    </div>
  )
}
