'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ProductCard } from '@/components/product/ProductCard'

export default function WishlistPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/users/me/wishlist').then(r => r.data),
  })

  return (
    <div>
      <h1 className="text-xl font-display font-bold mb-6">Обране</h1>
      {isLoading ? <p className="text-muted-foreground">Завантаження...</p> :
       data?.items?.length === 0 ? <div className="text-center py-16 text-muted-foreground">Список обраного порожній</div> :
       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
         {data?.items?.map((item: any) => <ProductCard key={item.id} product={item.product} />)}
       </div>}
    </div>
  )
}
