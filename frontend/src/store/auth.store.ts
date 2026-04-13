import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: 'customer' | 'manager' | 'admin' | 'super_admin'
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/users/login', { email, password })
          localStorage.setItem('access_token', data.accessToken)
          localStorage.setItem('refresh_token', data.refreshToken)
          set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken })
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (formData) => {
        const { data } = await api.post('/users/register', formData)
        localStorage.setItem('access_token', data.accessToken)
        set({ user: data.user, accessToken: data.accessToken })
      },

      logout: async () => {
        try { await api.post('/users/logout') } catch {}
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, accessToken: null, refreshToken: null })
      },

      loadUser: async () => {
        if (!get().accessToken) return
        try {
          const { data } = await api.get('/users/me')
          set({ user: data })
        } catch {
          set({ user: null })
        }
      },
    }),
    {
      name: 'fpv-auth',
      partialize: s => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }),
    }
  )
)
