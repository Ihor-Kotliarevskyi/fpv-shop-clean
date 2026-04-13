'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingCart, ArrowRight, Trash2, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'

export default function CartPage() {
  const { items, subtotal, discountAmount, shippingAmount, total, promo, updateQuantity, removeItem, removePromoCode } = useCartStore()

  if (items.length === 0) return (
    <div className="container mx-auto px-4 py-24 text-center">
      <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
      <h1 className="text-2xl font-display font-bold mb-2">Кошик порожній</h1>
      <p className="text-muted-foreground mb-6">Додайте товари з каталогу</p>
      <Link href="/catalog/all" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
        До каталогу <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold mb-6">Кошик</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <motion.div key={item.variantId} layout className="flex gap-4 p-4 bg-card border border-border rounded-lg">
              <div className="w-20 h-20 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                {item.productImage && <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/product/${item.productSlug}`} className="font-medium hover:text-primary transition-colors line-clamp-2">{item.productName}</Link>
                <p className="text-xs text-muted-foreground mt-1">{Object.entries(item.variant.attributes ?? {}).map(([k,v]) => `${k}: ${v}`).join(' · ')}</p>
                <p className="text-xs text-muted-foreground">SKU: {item.variant.sku}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="qty-input">
                    <button className="qty-btn" onClick={() => updateQuantity(item.variantId, item.quantity - 1)}><Minus className="w-3 h-3"/></button>
                    <span className="qty-value">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.variantId, item.quantity + 1)} disabled={item.quantity >= item.variant.stock}><Plus className="w-3 h-3"/></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold">{formatPrice(item.subtotal)}</p>
                    <button onClick={() => removeItem(item.variantId)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-card border border-border rounded-lg p-5 h-fit">
          <h2 className="font-semibold mb-4">Підсумок</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Товари</span><span>{formatPrice(subtotal)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-destructive"><span>Знижка ({promo?.code})</span><span>-{formatPrice(discountAmount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Доставка</span><span>{shippingAmount === 0 ? <span className="text-neon-green">Безкоштовно</span> : formatPrice(shippingAmount)}</span></div>
            {shippingAmount > 0 && <p className="text-xs text-muted-foreground">Безкоштовна доставка від {formatPrice(2000)}</p>}
          </div>
          <div className="border-t border-border my-4" />
          <div className="flex justify-between font-bold text-lg mb-4"><span>Разом</span><span>{formatPrice(total)}</span></div>
          <Link href="/checkout" className="block w-full bg-primary text-primary-foreground text-center py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
            Оформити замовлення
          </Link>
          <Link href="/catalog/all" className="block text-center text-sm text-primary hover:underline mt-3">← Продовжити покупки</Link>
        </div>
      </div>
    </div>
  )
}
