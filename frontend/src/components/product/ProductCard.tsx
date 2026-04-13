'use client'
import Link from 'next/link'
import { ShoppingCart, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCartStore } from '@/store/cart.store'
import { useWishlist } from '@/hooks/useWishlist'
import { RatingStars } from '@/components/ui/RatingStars'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props { product: any }

export function ProductCard({ product }: Props) {
  const { addItem } = useCartStore()
  const { isInWishlist, toggle } = useWishlist(product.id)

  const firstVariant = product.variants?.[0]
  const inStock = (product.totalStock ?? product.variantCount ?? 1) > 0
  const price = product.price
  const comparePrice = product.comparePrice
  const discountPct = comparePrice ? Math.round((1 - price / comparePrice) * 100) : 0

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="product-card">
      {/* Image */}
      <div className="product-card-image">
        <Link href={`/product/${product.slug}`}>
          {product.thumbnailUrl ? (
            <img src={product.thumbnailUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-carbon flex items-center justify-center text-4xl">🚁</div>
          )}
        </Link>

        {/* Badges */}
        {product.isNew && <span className="badge-new">NEW</span>}
        {!product.isNew && product.isBestseller && <span className="badge-bestseller">ХІТ</span>}
        {discountPct >= 5 && !product.isNew && <span className="badge-sale">-{discountPct}%</span>}

        {/* Quick actions */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.preventDefault(); toggle(product.id) }}
            className={cn('w-8 h-8 rounded-full bg-background/90 flex items-center justify-center transition-colors', isInWishlist ? 'text-destructive' : 'text-muted-foreground hover:text-destructive')}
          >
            <Heart className={cn('w-4 h-4', isInWishlist && 'fill-current')} />
          </button>
          {inStock && (
            <button
              onClick={(e) => { e.preventDefault(); addItem(firstVariant?.id ?? product.id, 1) }}
              className="w-8 h-8 rounded-full bg-background/90 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
        </div>

        {!inStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="text-xs font-semibold text-muted-foreground bg-background px-2 py-1 rounded">Немає в наявності</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5">
        {product.brandName && <p className="text-xs text-muted-foreground">{product.brandName}</p>}

        <Link href={`/product/${product.slug}`} className="text-sm font-medium leading-tight hover:text-primary transition-colors line-clamp-2">
          {product.name}
        </Link>

        {product.ratingCount > 0 && (
          <div className="flex items-center gap-1">
            <RatingStars value={product.ratingAvg} size="xs" />
            <span className="text-xs text-muted-foreground">({product.ratingCount})</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-1">
          <div>
            <span className="font-bold text-base">{formatPrice(price)}</span>
            {comparePrice && <span className="text-xs text-muted-foreground line-through ml-1.5">{formatPrice(comparePrice)}</span>}
          </div>

          {inStock && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => addItem(firstVariant?.id ?? product.id, 1)}
              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
              aria-label="Додати до кошика"
            >
              <ShoppingCart className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
