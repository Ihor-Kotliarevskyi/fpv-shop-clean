import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductInfo } from '@/components/product/ProductInfo'
import { ProductTabs } from '@/components/product/ProductTabs'
import { RelatedProducts } from '@/components/product/RelatedProducts'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { mapProduct } from '@/lib/supabase/mappers'

interface Props { params: { slug: string } }

async function getProductBySlug(slug: string) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, slug, name, short_desc, description, price, compare_price, thumbnail_url,
      images, video_url, is_new, is_bestseller, is_featured, rating_avg, rating_count,
      category_id, brand_id, sku_base, meta_title, meta_desc, is_active,
      categories (name, slug),
      brands (name, slug),
      product_variants (id, sku, attributes, image_url, stock_quantity, price, compare_price)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return mapProduct(data)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug)
  if (!product) return { title: 'Product not found' }
  return {
    title: product.metaTitle || product.name,
    description: product.metaDesc || product.shortDesc,
    openGraph: { title: product.name, images: product.thumbnailUrl ? [{ url: product.thumbnailUrl }] : [] },
  }
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug(params.slug)
  if (!product) notFound()

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: product.name, image: product.images?.map((i: any) => i.url) ?? [],
    description: product.shortDesc, sku: product.skuBase,
    brand: { '@type': 'Brand', name: product.brandName },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'UAH',
      availability: product.totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    aggregateRating: product.ratingCount > 0 ? { '@type': 'AggregateRating', ratingValue: product.ratingAvg, reviewCount: product.ratingCount } : undefined,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={[{ label: 'Catalog', href: '/catalog' }, { label: product.categoryName, href: `/catalog/${product.categorySlug}` }, { label: product.name }]} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          <ProductGallery images={product.images} thumbnail={product.thumbnailUrl} videoUrl={product.videoUrl} name={product.name} isNew={product.isNew} isBestseller={product.isBestseller} comparePrice={product.comparePrice} />
          <ProductInfo product={product as any} />
        </div>
        <div className="mt-12"><ProductTabs product={product} /></div>
        <div className="mt-12">
          <div className="section-header"><h2 className="text-xl font-display font-bold">Related products</h2></div>
          <RelatedProducts productSlug={params.slug} />
        </div>
      </div>
    </>
  )
}
