'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ProductCard } from '@/components/product/ProductCard'
import { CatalogFilters } from '@/components/product/CatalogFilters'
import { CatalogSort } from '@/components/product/CatalogSort'
import { Pagination } from '@/components/ui/Pagination'
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton'
import { SlidersHorizontal } from 'lucide-react'
import { useSearchParams, useParams } from 'next/navigation'

export default function CatalogPage() {
  const { category } = useParams() as { category: string }
  const searchParams = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const params = Object.fromEntries(searchParams.entries())
  const page = Number(params.page ?? 1)

  const { data, isLoading } = useQuery({
    queryKey: ['catalog', category, params],
    queryFn: () => api.get('/products', { params: { category: category === 'all' ? undefined : category, ...params } }).then(r => r.data),
    staleTime: 30_000,
  })

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold capitalize">{category === 'all' ? 'Весь каталог' : category}</h1>
          {data && <p className="text-sm text-muted-foreground mt-1">{data.total} товарів</p>}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary transition-colors lg:hidden">
            <SlidersHorizontal className="w-4 h-4" /> Фільтри
          </button>
          <CatalogSort />
        </div>
      </div>
      <div className="flex gap-6">
        <aside className={`w-64 flex-shrink-0 hidden lg:block`}>
          <CatalogFilters category={category} />
        </aside>
        <div className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : data?.items.map((p: any) => <ProductCard key={p.id} product={p} />)
            }
          </div>
          {data && <div className="mt-8"><Pagination total={data.total} limit={24} page={page} /></div>}
        </div>
      </div>
    </div>
  )
}
