'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase/client'
import { mapProduct } from '@/lib/supabase/mappers'

async function ensureWishlist(userId: string) {
  const existing = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (existing.data?.id) return existing.data.id as string

  const created = await supabase
    .from('wishlists')
    .insert({ user_id: userId, name: 'Обране' })
    .select('id')
    .single()

  if (created.error) throw created.error
  return created.data.id as string
}

async function fetchWishlist(userId: string) {
  const wishlistId = await ensureWishlist(userId)
  const { data, error } = await supabase
    .from('wishlist_items')
    .select(`
      id,
      product_id,
      products (
        id, slug, name, short_desc, description, price, compare_price, thumbnail_url,
        images, video_url, is_new, is_bestseller, is_featured, rating_avg, rating_count,
        category_id, brand_id, sku_base, meta_title, meta_desc,
        categories (name, slug),
        brands (name, slug),
        product_variants (id, sku, attributes, image_url, stock_quantity, price, compare_price)
      )
    `)
    .eq('wishlist_id', wishlistId)

  if (error) throw error

  return {
    items: (data ?? []).map((i: any) => ({
      id: i.id,
      productId: i.product_id,
      product: i.products ? mapProduct(i.products) : null,
    })),
  }
}

export function useWishlist(productId?: string) {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => fetchWishlist(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  })

  const addMutation = useMutation({
    mutationFn: async (pid: string) => {
      const wishlistId = await ensureWishlist(user!.id)
      const { error } = await supabase
        .from('wishlist_items')
        .insert({ wishlist_id: wishlistId, product_id: pid })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  })

  const removeMutation = useMutation({
    mutationFn: async (pid: string) => {
      const wishlistId = await ensureWishlist(user!.id)
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('wishlist_id', wishlistId)
        .eq('product_id', pid)
      if (error) throw error
    },
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

  return { isInWishlist, toggle, items: data?.items ?? [], isLoading }
}
