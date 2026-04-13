import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { api } from '@/lib/api'
import { toast } from 'sonner'

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

  // Computed
  subtotal: number
  discountAmount: number
  shippingAmount: number
  total: number
  itemCount: number

  // Sync state
  syncing: boolean
  lastSyncAt: number | null

  // Actions
  addItem:        (variantId: string, quantity?: number) => Promise<void>
  removeItem:     (variantId: string) => Promise<void>
  updateQuantity: (variantId: string, quantity: number) => Promise<void>
  applyPromoCode: (code: string) => Promise<void>
  removePromoCode: () => void
  clear:          () => void
  syncWithServer: () => Promise<void>
  mergeWithUser:  (userId: string) => Promise<void>
}

const FREE_SHIPPING_THRESHOLD = 2000

function computeTotals(items: CartItem[], promo: CartPromo | null) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  let discountAmount = 0
  if (promo) {
    if (promo.discountType === 'percentage') {
      discountAmount = Math.round(subtotal * promo.discountValue / 100)
    } else if (promo.discountType === 'fixed_amount') {
      discountAmount = Math.min(promo.discountValue, subtotal)
    }
  }
  const afterDiscount = subtotal - discountAmount
  const shippingAmount = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : 79 // грн
  const isFreeShipping = promo?.discountType === 'free_shipping'
  return {
    subtotal,
    discountAmount,
    shippingAmount: isFreeShipping ? 0 : shippingAmount,
    total: afterDiscount + (isFreeShipping ? 0 : shippingAmount),
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
  }
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
          const { data } = await api.post('/cart/items', { variantId, quantity })
          set((state) => {
            state.items = data.items
            const totals = computeTotals(data.items, state.promo)
            Object.assign(state, totals)
            state.syncing = false
            state.lastSyncAt = Date.now()
          })
          toast.success('Додано до кошика')
        } catch (err: any) {
          set({ syncing: false })
          toast.error(err.response?.data?.error ?? 'Помилка додавання')
        }
      },

      removeItem: async (variantId) => {
        set({ syncing: true })
        try {
          const { data } = await api.delete(`/cart/items/${variantId}`)
          set((state) => {
            state.items = data.items
            const totals = computeTotals(data.items, state.promo)
            Object.assign(state, totals)
            state.syncing = false
          })
        } catch {
          set({ syncing: false })
        }
      },

      updateQuantity: async (variantId, quantity) => {
        if (quantity === 0) {
          return get().removeItem(variantId)
        }
        set({ syncing: true })
        try {
          const { data } = await api.patch(`/cart/items/${variantId}`, { quantity })
          set((state) => {
            state.items = data.items
            const totals = computeTotals(data.items, state.promo)
            Object.assign(state, totals)
            state.syncing = false
          })
        } catch {
          set({ syncing: false })
        }
      },

      applyPromoCode: async (code) => {
        try {
          const { data } = await api.post('/cart/promo-code', { code })
          set((state) => {
            state.promo = data.promo
            const totals = computeTotals(state.items, data.promo)
            Object.assign(state, totals)
          })
          toast.success(`Промокод ${code} застосовано! -${data.promo.discountAmount} грн`)
        } catch (err: any) {
          toast.error(err.response?.data?.error ?? 'Невірний промокод')
        }
      },

      removePromoCode: () => {
        set((state) => {
          state.promo = null
          const totals = computeTotals(state.items, null)
          Object.assign(state, totals)
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
        const { data } = await api.get('/cart')
        set((state) => {
          state.items = data.items
          state.promo = data.promo
          const totals = computeTotals(data.items, data.promo)
          Object.assign(state, totals)
          state.lastSyncAt = Date.now()
        })
      },

      mergeWithUser: async () => {
        const { sessionId } = get()
        await api.post('/cart/merge', { sessionId })
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
