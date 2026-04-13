'use client'
import { useWishlist } from '@/hooks/useWishlist'
import { ProductCard } from '@/components/product/ProductCard'

export default function WishlistPage() {
  const { items, isLoading } = useWishlist()

  return (
    <div>
      <h1 className="text-xl font-display font-bold mb-6">Wishlist</h1>
      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Your wishlist is empty</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item: any) => item.product && <ProductCard key={item.id} product={item.product} />)}
        </div>
      )}
    </div>
  )
}
