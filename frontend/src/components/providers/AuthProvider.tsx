'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { loadUser } = useAuthStore()
  useEffect(() => { loadUser() }, [])
  return <>{children}</>
}
