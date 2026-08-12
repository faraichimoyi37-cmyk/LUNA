type WsClient = { send(data: string): void; close?: () => void }

const connections = new Map<string, Set<WsClient>>()

export type { WsClient }

export function addConnection(userId: string, ws: WsClient) {
  const set = connections.get(userId) ?? new Set<WsClient>()
  set.add(ws)
  connections.set(userId, set)
}

export function removeConnection(ws: WsClient) {
  for (const [userId, set] of connections.entries()) {
    if (set.delete(ws) && set.size === 0) connections.delete(userId)
  }
}

export function sendToUser(userId: string, type: string, data: unknown): number {
  const set = connections.get(userId)
  if (!set) return 0
  const message = JSON.stringify({ type, data })
  let sent = 0
  for (const ws of set) {
    try {
      ws.send(message)
      sent++
    } catch {
      // drop dead connections
    }
  }
  return sent
}

export function connectionCount(): number {
  let count = 0
  for (const set of connections.values()) count += set.size
  return count
}

export function disconnectUser(userId: string): number {
  const set = connections.get(userId)
  if (!set) return 0
  let closed = 0
  for (const ws of set) {
    try {
      ws.close?.()
      closed++
    } catch {
      // drop dead connections
    }
  }
  connections.delete(userId)
  return closed
}
