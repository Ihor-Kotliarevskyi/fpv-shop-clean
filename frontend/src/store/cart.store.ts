import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth.store'

export interface CartVariant {
  id: string
  sku: string
  attributes: Record<string, string>
  imageUrl?: string
  stock: number
}

export interface CartItem {
  id: string
  variantId: string
  variant: CartVariant
  productId: string
  productName: string
  productSlug: string
  productImage?: string
  unitPrice: number
  quantity: number
  subtotal: number
}

export interface CartPromo {
  code: string
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping'
  discountValue: number
  discountAmount: number
}

export interface CartState {
  items: CartItem[]
  promo: CartPromo | null
  sessionId: string
  subtotal: number
  discountAmount: number
  shippingAmount: number
  total: number
  itemCount: number
  syncing: boolean
  lastSyncAt: number | null
  addItem: (variantId: string, quantity?: number) => Promise<void>
  removeItem: (variantId: string) => Promise<void>
  updateQuantity: (variantId: string, quantity: number) => Promise<void>
  applyPromoCode: (code: string) => Promise<void>
  removePromoCode: () => void
  clear: () => void
  syncWithServer: () => Promise<void>
  mergeWithUser: (userId: string) => Promise<void>
}

const FREE_SHIPPING_THRESHOLD = 2000

function computeTotals(items: CartItem[], promo: CartPromo | null) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  let discountAmount = 0
  if (promo) {
    if (promo.discountType === 'percentage') discountAmount = Math.round((subtotal * promo.discountValue) / 100)
    else if (promo.discountType === 'fixed_amount') discountAmount = Math.min(promo.discountValue, subtotal)
  }
  const afterDiscount = subtotal - discountAmount
  const shippingAmount = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : 79
  const isFreeShipping = promo?.discountType === 'free_shipping'
  return {
    subtotal,
    discountAmount,
    shippingAmount: isFreeShipping ? 0 : shippingAmount,
    total: afterDiscount + (isFreeShipping ? 0 : shippingAmount),
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
  }
}

async function getOrCreateCart(sessionId: string, userId?: string) {
  let query = supabase.from('carts').select('id').limit(1)
  query = userId ? query.eq('user_id', userId) : query.eq('session_id', sessionId)

  const existing = await query.maybeSingle()
  if (existing.data?.id) return existing.data.id as string

  const payload = userId ? { user_id: userId } : { session_id: sessionId }
  const created = await supabase.from('carts').insert(payload).select('id').single()
  if (created.error) throw created.error
  return created.data.id as string
}

function mapCartRows(rows: any[]): CartItem[] {
  return (rows ?? []).map((r: any) => {
    const variant = r.product_variants
    const product = variant?.products
    const unitPrice = Number(r.unit_price ?? variant?.price ?? product?.price ?? 0)
    const quantity = r.quantity ?? 1
    return {
      id: r.id,
      variantId: r.variant_id,
      variant: {
        id: variant?.id,
        sku: variant?.sku ?? '',
        attributes: variant?.attributes ?? {},
        imageUrl: variant?.image_url ?? undefined,
        stock: variant?.stock_quantity ?? 0,
      },
      productId: product?.id ?? '',
      productName: product?.name ?? 'Product',
      productSlug: product?.slug ?? '',
      productImage: product?.thumbnail_url ?? undefined,
      unitPrice,
      quantity,
      subtotal: unitPrice * quantity,
    }
  })
}

async function loadCartItems(cartId: string) {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id, variant_id, quantity, unit_price,
      product_variants (
        id, sku, attributes, image_url, stock_quantity, price,
        products (id, name, slug, thumbnail_url, price)
      )
    `)
    .eq('cart_id', cartId)

  if (error) throw error
  return mapCartRows(data ?? [])
}

export const useCartStore = create<CartState>()(
  persist(
    immer((set, get) => ({
      items: [],
      promo: null,
      sessionId: crypto.randomUUID(),
      syncing: false,
      lastSyncAt: null,
      subtotal: 0,
      discountAmount: 0,
      shippingAmount: 0,
      total: 0,
      itemCount: 0,

      addItem: async (variantId, quantity = 1) => {
        set({ syncing: true })
        try {
          const userId = useAuthStore.getState().user?.id
          const cartId = await getOrCreateCart(get().sessionId, userId)

          const variantRes = await supabase
            .from('product_variants')
            .select('id, stock_quantity, price, product_id, products(price)')
            .eq('id', variantId)
            .maybeSingle()

          if (variantRes.error || !variantRes.data) throw new Error('Variant not found')
          if ((variantRes.data.stock_quantity ?? 0) < 1) throw new Error('Out of stock')

          const existing = await supabase
            .from('cart_items')
            .select('id, quantity')
            .eq('cart_id', cartId)
            .eq('variant_id', variantId)
            .maybeSingle()

          const parentProduct: any = Array.isArray((variantRes.data as any).products)
            ? (variantRes.data as any).products[0]
            : (variantRes.data as any).products
          const unitPrice = Number((variantRes.data as any).price ?? parentProduct?.price ?? 0)

          if (existing.data?.id) {
            const nextQty = existing.data.quantity + quantity
            const { error } = await supabase
              .from('cart_items')
              .update({ quantity: nextQty, unit_price: unitPrice })
              .eq('id', existing.data.id)
            if (error) throw error
          } else {
            const { error } = await supabase.from('cart_items').insert({
              cart_id: cartId,
              product_id: variantRes.data.product_id,
              variant_id: variantId,
              quantity,
              unit_price: unitPrice,
            })
            if (error) throw error
          }

          const items = await loadCartItems(cartId)
          set((state) => {
            state.items = items
            Object.assign(state, computeTotals(items, state.promo))
            state.syncing = false
            state.lastSyncAt = Date.now()
          })
          toast.success('Added to cart')
        } catch (err: any) {
          set({ syncing: false })
          toast.error(err?.message ?? 'Failed to add item')
        }
      },

      removeItem: async (variantId) => {
        set({ syncing: true })
        try {
          const userId = useAuthStore.getState().user?.id
          const cartId = await getOrCreateCart(get().sessionId, userId)
          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('cart_id', cartId)
            .eq('variant_id', variantId)
          if (error) throw error

          const items = await loadCartItems(cartId)
          set((state) => {
            state.items = items
            Object.assign(state, computeTotals(items, state.promo))
            state.syncing = false
          })
        } catch {
          set({ syncing: false })
        }
      },

      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) return get().removeItem(variantId)
        set({ syncing: true })
        try {
          const userId = useAuthStore.getState().user?.id
          const cartId = await getOrCreateCart(get().sessionId, userId)
          const { error } = await supabase
            .from('cart_items')
            .update({ quantity })
            .eq('cart_id', cartId)
            .eq('variant_id', variantId)
          if (error) throw error

          const items = await loadCartItems(cartId)
          set((state) => {
            state.items = items
            Object.assign(state, computeTotals(items, state.promo))
            state.syncing = false
          })
        } catch {
          set({ syncing: false })
        }
      },

      applyPromoCode: async () => {
        toast.error('Promo codes are not configured in frontend-only mode yet')
      },

      removePromoCode: () => {
        set((state) => {
          state.promo = null
          Object.assign(state, computeTotals(state.items, null))
        })
      },

      clear: () => {
        set((state) => {
          state.items = []
          state.promo = null
          state.subtotal = 0
          state.discountAmount = 0
          state.shippingAmount = 0
          state.total = 0
          state.itemCount = 0
        })
      },

      syncWithServer: async () => {
        const userId = useAuthStore.getState().user?.id
        const cartId = await getOrCreateCart(get().sessionId, userId)
        const items = await loadCartItems(cartId)
        set((state) => {
          state.items = items
          Object.assign(state, computeTotals(items, state.promo))
          state.lastSyncAt = Date.now()
        })
      },

      mergeWithUser: async (userId) => {
        const sessionId = get().sessionId
        const guestCart = await supabase.from('carts').select('id').eq('session_id', sessionId).maybeSingle()
        const userCartId = await getOrCreateCart(sessionId, userId)

        if (guestCart.data?.id && guestCart.data.id !== userCartId) {
          const guestItems = await supabase
            .from('cart_items')
            .select('variant_id, quantity, unit_price, product_id')
            .eq('cart_id', guestCart.data.id)

          for (const item of guestItems.data ?? []) {
            const existing = await supabase
              .from('cart_items')
              .select('id, quantity')
              .eq('cart_id', userCartId)
              .eq('variant_id', item.variant_id)
              .maybeSingle()

            if (existing.data?.id) {
              await supabase
                .from('cart_items')
                .update({ quantity: existing.data.quantity + item.quantity })
                .eq('id', existing.data.id)
            } else {
              await supabase.from('cart_items').insert({
                cart_id: userCartId,
                variant_id: item.variant_id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
              })
            }
          }

          await supabase.from('cart_items').delete().eq('cart_id', guestCart.data.id)
          await supabase.from('carts').delete().eq('id', guestCart.data.id)
        }

        await get().syncWithServer()
      },
    })),
    {
      name: 'fpv-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        promo: state.promo,
        sessionId: state.sessionId,
      }),
    }
  )
)
