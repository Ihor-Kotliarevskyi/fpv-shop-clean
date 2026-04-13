import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductInfo } from '@/components/product/ProductInfo'
import { ProductTabs } from '@/components/product/ProductTabs'
import { RelatedProducts } from '@/components/product/RelatedProducts'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { api } from '@/lib/api-server'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await api.get(`/products/${params.slug}`).catch(() => null)
  if (!product) return { title: 'Товар не знайдено' }
  const p = product.data
  return { title: p.metaTitle || p.name, description: p.metaDesc || p.shortDesc, openGraph: { title: p.name, images: p.thumbnailUrl ? [{ url: p.thumbnailUrl }] : [] } }
}

export default async function ProductPage({ params }: Props) {
  const res = await api.get(`/products/${params.slug}`).catch(() => null)
  if (!res) notFound()
  const product = res.data

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: product.name, image: product.images?.map((i: any) => i.url) ?? [],
    description: product.shortDesc, sku: product.skuBase,
    brand: { '@type': 'Brand', name: product.brandName },
    offers: { '@type': 'Offer', price: product.price, priceCurrency: 'UAH', availability: product.totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    aggregateRating: product.ratingCount > 0 ? { '@type': 'AggregateRating', ratingValue: product.ratingAvg, reviewCount: product.ratingCount } : undefined,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={[{ label: 'Каталог', href: '/catalog' }, { label: product.categoryName, href: `/catalog/${product.categorySlug}` }, { label: product.name }]} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          <ProductGallery images={product.images} thumbnail={product.thumbnailUrl} videoUrl={product.videoUrl} name={product.name} isNew={product.isNew} isBestseller={product.isBestseller} comparePrice={product.comparePrice} />
          <ProductInfo product={product} />
        </div>
        <div className="mt-12"><ProductTabs product={product} /></div>
        <div className="mt-12">
          <div className="section-header"><h2 className="text-xl font-display font-bold">Схожі товари</h2></div>
          <RelatedProducts productSlug={params.slug} />
        </div>
      </div>
    </>
  )
}
