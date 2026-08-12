import { useAuthStore } from '../store/auth'

export interface RealtimeMessage {
  type: string
  data: Record<string, unknown>
}

export function connectRealtime(onMessage: (message: RealtimeMessage) => void): () => void {
  const { token } = useAuthStore.getState()
  if (!token) return () => undefined

  const base = import.meta.env.VITE_WS_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
  let ws: WebSocket | null = null
  let closed = false
  let retry = 0

  const open = () => {
    ws = new WebSocket(`${base}/ws?token=${encodeURIComponent(token)}`)
    ws.onopen = () => {
      retry = 0
    }
    ws.onmessage = (event) => {
      try {
        onMessage(JSON.parse(String(event.data)) as RealtimeMessage)
      } catch {
        // ignore malformed frames
      }
    }
    ws.onclose = () => {
      if (!closed) {
        retry += 1
        setTimeout(open, Math.min(15_000, 2_000 * retry))
      }
    }
    ws.onerror = () => {
      ws?.close()
    }
  }

  open()

  return () => {
    closed = true
    ws?.close()
  }
}
