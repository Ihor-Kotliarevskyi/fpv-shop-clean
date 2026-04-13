import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase/client'

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
  isInitialized: boolean
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
      isInitialized: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          await get().loadUser()
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (formData) => {
        set({ isLoading: true })
        try {
          const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                first_name: formData.firstName,
                last_name: formData.lastName,
              },
            },
          })
          if (error) throw error

          if (data.user) {
            await supabase.from('users').upsert({
              id: data.user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              role: 'customer',
            })
          }

          await get().loadUser()
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, accessToken: null, refreshToken: null })
      },

      loadUser: async () => {
        set({ isLoading: true })
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const session = sessionData.session
          if (!session?.user) {
            set({ user: null, isInitialized: true })
            return
          }

          const { data: dbUser, error } = await supabase
            .from('users')
            .select('id,email,first_name,last_name,avatar_url,role')
            .eq('id', session.user.id)
            .maybeSingle()

          if (error) throw error

          if (!dbUser) {
            const fallback = {
              id: session.user.id,
              email: session.user.email ?? '',
              first_name: (session.user.user_metadata?.first_name as string) ?? '',
              last_name: (session.user.user_metadata?.last_name as string) ?? '',
              avatar_url: null,
              role: 'customer',
            }
            await supabase.from('users').upsert(fallback)
            set({
              user: {
                id: fallback.id,
                email: fallback.email,
                firstName: fallback.first_name,
                lastName: fallback.last_name,
                avatarUrl: undefined,
                role: 'customer',
              },
              isInitialized: true,
            })
            return
          }

          set({
            user: {
              id: dbUser.id,
              email: dbUser.email,
              firstName: dbUser.first_name ?? '',
              lastName: dbUser.last_name ?? '',
              avatarUrl: dbUser.avatar_url ?? undefined,
              role: dbUser.role,
            },
            isInitialized: true,
          })
        } catch {
          set({ user: null, isInitialized: true })
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'fpv-auth',
      partialize: s => ({ user: s.user }),
    }
  )
)
