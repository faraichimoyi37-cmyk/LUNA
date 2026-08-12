import { useAuthStore } from '../store/auth'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  status: number
  errors?: unknown

  constructor(message: string, status = 400, errors?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const { token, logout } = useAuthStore.getState()
  const headers = new Headers(options.headers)
  if (options.body && typeof options.body === 'string') headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; data?: T; errors?: unknown }

  if (res.status === 401) {
    logout()
    if (window.location.pathname !== '/login') window.location.assign('/login')
    throw new ApiError('Session expired', 401)
  }

  if (res.status === 403 && /suspend/i.test(json.message ?? '')) {
    logout()
    if (window.location.pathname !== '/login') window.location.assign('/login?suspended=1')
    throw new ApiError(json.message ?? 'Account suspended', 403)
  }

  if (!res.ok || !json.success) throw new ApiError(json.message ?? 'Request failed', res.status, json.errors)
  return json.data as T
}

export function downloadFile(path: string, filename: string) {
  const { token } = useAuthStore.getState()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  fetch(`${API_BASE}${path}`, { headers })
    .then((res) => res.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    })
    .catch(() => undefined)
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export function errMsg(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}
