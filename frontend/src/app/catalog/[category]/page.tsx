'use client'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ProductCard } from '@/components/product/ProductCard'
import { CatalogFilters } from '@/components/product/CatalogFilters'
import { CatalogSort } from '@/components/product/CatalogSort'
import { Pagination } from '@/components/ui/Pagination'
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton'
import { SlidersHorizontal } from 'lucide-react'
import { useSearchParams, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { mapProduct } from '@/lib/supabase/mappers'

export default function CatalogPage() {
  const { category } = useParams() as { category: string }
  const searchParams = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams])
  const page = Number(params.page ?? 1)
  const limit = 24

  const { data, isLoading } = useQuery({
    queryKey: ['catalog', category, params],
    queryFn: async () => {
      const sort = params.sort ?? 'popular'
      let query = supabase
        .from('products')
        .select(`
          id, slug, name, short_desc, description, price, compare_price, thumbnail_url,
          images, video_url, is_new, is_bestseller, is_featured, rating_avg, rating_count,
          category_id, brand_id, sku_base, meta_title, meta_desc, is_active,
          categories (name, slug),
          brands (name, slug),
          product_variants (id, sku, attributes, image_url, stock_quantity, price, compare_price)
        `, { count: 'exact' })
        .eq('is_active', true)

      if (category !== 'all') {
        const { data: cat } = await supabase.from('categories').select('id').eq('slug', category).maybeSingle()
        if (!cat?.id) return { items: [], total: 0 }
        query = query.eq('category_id', cat.id)
      }

      if (params.new === 'true') query = query.eq('is_new', true)
      if (params.featured === 'true') query = query.eq('is_featured', true)
      if (params.bestseller === 'true') query = query.eq('is_bestseller', true)
      if (params.q) query = query.ilike('name', `%${params.q}%`)

      if (sort === 'price_asc') query = query.order('price', { ascending: true })
      else if (sort === 'price_desc') query = query.order('price', { ascending: false })
      else if (sort === 'newest') query = query.order('created_at', { ascending: false })
      else if (sort === 'rating') query = query.order('rating_avg', { ascending: false })
      else query = query.order('order_count', { ascending: false })

      query = query.range((page - 1) * limit, page * limit - 1)

      const { data: rows, error, count } = await query
      if (error) throw error

      return {
        items: (rows ?? []).map(mapProduct),
        total: count ?? 0,
      }
    },
    staleTime: 30_000,
  })

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold capitalize">{category === 'all' ? 'Catalog' : category}</h1>
          {data && <p className="text-sm text-muted-foreground mt-1">{data.total} items</p>}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary transition-colors lg:hidden">
            <SlidersHorizontal className="w-4 h-4" /> Filters
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
