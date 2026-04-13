'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

export function useWishlist(productId?: string) {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/users/me/wishlist').then(r => r.data),
    enabled: !!user,
    staleTime: 60_000,
  })

  const addMutation = useMutation({
    mutationFn: (pid: string) => api.post('/users/me/wishlist', { productId: pid }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  })

  const removeMutation = useMutation({
    mutationFn: (pid: string) => api.delete(`/users/me/wishlist/${pid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  })

  const isInWishlist = productId
    ? (data?.items ?? []).some((i: any) => i.productId === productId)
    : false

  const toggle = (pid: string) => {
    if (!user) return
    const inWishlist = (data?.items ?? []).some((i: any) => i.productId === pid)
    inWishlist ? removeMutation.mutate(pid) : addMutation.mutate(pid)
  }

  return { isInWishlist, toggle, items: data?.items ?? [] }
}
