'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase/client'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { loadUser } = useAuthStore()

  useEffect(() => {
    loadUser()
    const { data } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })
    return () => data.subscription.unsubscribe()
  }, [loadUser])

  return <>{children}</>
}
