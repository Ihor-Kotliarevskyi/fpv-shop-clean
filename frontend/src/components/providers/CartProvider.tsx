'use client'
import { useEffect } from 'react'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { syncWithServer, mergeWithUser } = useCartStore()
  const { user } = useAuthStore()
  useEffect(() => {
    if (user?.id) mergeWithUser(user.id)
    else syncWithServer()
  }, [user?.id])
  return <>{children}</>
}
