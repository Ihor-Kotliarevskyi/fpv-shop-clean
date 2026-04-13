'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Heart, GitCompare, Share2, Star, Truck, Shield, RotateCcw, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/store/cart.store'
import { useWishlist } from '@/hooks/useWishlist'
import { StockBadge } from '@/components/ui/StockBadge'
import { RatingStars } from '@/components/ui/RatingStars'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/product'

interface Props {
  product: Product
}

export function ProductInfo({ product }: Props) {
  const { addItem, syncing } = useCartStore()
  const { isInWishlist, toggle: toggleWishlist } = useWishlist(product.id)

  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>(() => {
    // Auto-select first available variant's attributes
    if (!product.variants?.length) return {}
    const first = product.variants.find(v => v.stockQuantity > 0) ?? product.variants[0]
    return first.attributes
  })
  const [qty, setQty] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)

  // ── Визначаємо поточний варіант ──────────────────────────
  const selectedVariant = useMemo(() => {
    if (!product.variants?.length) return null
    return product.variants.find(v =>
      Object.entries(selectedAttrs).every(([k, val]) => v.attributes[k] === val)
    ) ?? null
  }, [product.variants, selectedAttrs])

  const currentPrice   = selectedVariant?.price ?? product.price
  const comparePrice   = selectedVariant?.comparePrice ?? product.comparePrice
  const currentStock   = selectedVariant?.stockQuantity ?? product.totalStock ?? 0
  const discountPct    = comparePrice ? Math.round((1 - currentPrice / comparePrice) * 100) : 0

  // ── Групуємо атрибути варіантів ──────────────────────────
  const attrGroups = useMemo<Record<string, Set<string>>>(() => {
    if (!product.variants?.length) return {}
    const groups: Record<string, Set<string>> = {}
    for (const v of product.variants) {
      for (const [k, val] of Object.entries(v.attributes)) {
        if (!groups[k]) groups[k] = new Set()
        groups[k].add(val)
      }
    }
    return groups
  }, [product.variants])

  // Перевірка доступності комбінації
  const isAttrAvailable = (key: string, value: string) => {
    const testAttrs = { ...selectedAttrs, [key]: value }
    return product.variants?.some(v =>
      Object.entries(testAttrs).every(([k, val]) => v.attributes[k] === val) &&
      v.stockQuantity > 0
    ) ?? true
  }

  // ── Додати до кошика ─────────────────────────────────────
  const handleAddToCart = async () => {
    if (!selectedVariant && product.variants?.length) {
      toast.error('Оберіть варіант товару')
      return
    }
    setAddingToCart(true)
    await addItem(selectedVariant?.id ?? product.id, qty)
    setAddingToCart(false)
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Бренд + категорія ─────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {product.brandName && (
          <>
            <a href={`/catalog?brand=${product.brandSlug}`} className="hover:text-primary transition-colors font-medium">
              {product.brandName}
            </a>
            <span>·</span>
          </>
        )}
        <a href={`/catalog/${product.categorySlug}`} className="hover:text-primary transition-colors">
          {product.categoryName}
        </a>
        {product.skuBase && (
          <>
            <span>·</span>
            <span className="font-mono text-xs">SKU: {selectedVariant?.sku ?? product.skuBase}</span>
          </>
        )}
      </div>

      {/* ── Назва ────────────────────────────────── */}
      <h1 className="text-2xl lg:text-3xl font-display font-bold text-balance leading-tight">
        {product.name}
      </h1>

      {/* ── Рейтинг ──────────────────────────────── */}
      {product.ratingCount > 0 && (
        <div className="flex items-center gap-2">
          <RatingStars value={product.ratingAvg} size="sm" />
          <span className="text-sm text-muted-foreground">
            {product.ratingAvg.toFixed(1)} ({product.ratingCount} відгуків)
          </span>
          <a href="#reviews" className="text-sm text-primary hover:underline">
            Читати відгуки
          </a>
        </div>
      )}

      {/* ── Ціна ─────────────────────────────────── */}
      <div className="flex items-end gap-3 py-2">
        <span className="text-4xl font-display font-bold text-foreground">
          {currentPrice.toLocaleString('uk-UA')} ₴
        </span>
        {comparePrice && (
          <>
            <span className="text-xl text-muted-foreground line-through pb-1">
              {comparePrice.toLocaleString('uk-UA')} ₴
            </span>
            <span className="bg-destructive/10 text-destructive text-sm font-bold px-2 py-1 rounded pb-1">
              -{discountPct}%
            </span>
          </>
        )}
      </div>

      {/* ── Наявність ────────────────────────────── */}
      <StockBadge qty={currentStock} />

      {/* ── Варіанти атрибутів ───────────────────── */}
      {Object.entries(attrGroups).map(([attrKey, values]) => (
        <div key={attrKey} className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground capitalize">
            {attrKey === 'color' ? 'Колір' :
             attrKey === 'kv' ? 'KV мотора' :
             attrKey === 'cell_count' ? 'Кількість банок' :
             attrKey === 'capacity' ? 'Ємність' : attrKey}
            : <span className="text-foreground">{selectedAttrs[attrKey]}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {[...values].map(val => {
              const selected = selectedAttrs[attrKey] === val
              const available = isAttrAvailable(attrKey, val)
              return (
                <button
                  key={val}
                  onClick={() => available && setSelectedAttrs(p => ({ ...p, [attrKey]: val }))}
                  disabled={!available}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-md border transition-all',
                    selected
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : available
                        ? 'border-border hover:border-primary/50 text-foreground'
                        : 'border-border/30 text-muted-foreground/30 line-through cursor-not-allowed'
                  )}
                >
                  {val}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* ── Кількість + Кошик ────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Qty */}
        <div className="qty-input flex-shrink-0">
          <button
            onClick={() => setQty(q => Math.max(1, q - 1))}
            className="qty-btn"
            aria-label="Зменшити"
          >−</button>
          <span className="qty-value">{qty}</span>
          <button
            onClick={() => setQty(q => Math.min(currentStock, q + 1))}
            className="qty-btn"
            disabled={qty >= currentStock}
            aria-label="Збільшити"
          >+</button>
        </div>

        {/* Add to cart */}
        <motion.button
          onClick={handleAddToCart}
          disabled={currentStock === 0 || addingToCart || syncing}
          whileTap={{ scale: 0.97 }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-semibold text-sm transition-all',
            currentStock > 0
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-neon'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          <ShoppingCart className="w-4 h-4" />
          {currentStock === 0 ? 'Немає в наявності' : addingToCart ? 'Додаємо...' : 'Додати до кошика'}
        </motion.button>

        {/* Wishlist */}
        <button
          onClick={() => toggleWishlist(product.id)}
          className={cn(
            'p-2.5 rounded-lg border transition-all',
            isInWishlist
              ? 'border-destructive/50 bg-destructive/10 text-destructive'
              : 'border-border hover:border-primary/50 text-muted-foreground hover:text-primary'
          )}
          aria-label={isInWishlist ? 'Видалити з обраного' : 'Додати до обраного'}
        >
          <Heart className={cn('w-5 h-5', isInWishlist && 'fill-current')} />
        </button>

        {/* Compare */}
        <button
          className="p-2.5 rounded-lg border border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-all"
          aria-label="Порівняти"
        >
          <GitCompare className="w-5 h-5" />
        </button>
      </div>

      {/* ── Пільги ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {[
          { icon: Truck,       text: 'Доставка Новою Поштою', sub: 'Від 2000 грн — безкоштовно' },
          { icon: Shield,      text: 'Офіційна гарантія',     sub: '12 місяців на всі товари' },
          { icon: RotateCcw,   text: 'Повернення 14 днів',    sub: 'За законом України' },
          { icon: Zap,         text: 'Швидка відправка',       sub: 'В день оплати до 16:00' },
        ].map(({ icon: Icon, text, sub }) => (
          <div key={text} className="flex items-start gap-2 p-3 bg-secondary/50 rounded-lg">
            <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">{text}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Короткий опис ────────────────────────── */}
      {product.shortDesc && (
        <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
          {product.shortDesc}
        </p>
      )}

      {/* ── Поділитись ───────────────────────────── */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Поділитись:</span>
        {['Telegram', 'Viber', 'Facebook'].map(s => (
          <button
            key={s}
            className="text-xs px-2 py-1 rounded bg-secondary hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {s}
          </button>
        ))}
        <button
          onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Посилання скопійовано') }}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
