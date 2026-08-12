import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  fullname: string
  email: string
  phone: string | null
  role: 'USER' | 'AGENT' | 'ADMIN'
  balance: number
  status: 'ACTIVE' | 'SUSPENDED'
  referralCode: string
  createdAt: string
  settings?: {
    language: string
    notificationsOn: boolean
    twoFactorEnabled: boolean
  }
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  setUser: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'luna-auth' },
  ),
)
