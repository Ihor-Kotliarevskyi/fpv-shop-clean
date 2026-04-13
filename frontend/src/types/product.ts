export interface ProductVariant {
  id: string
  sku: string
  attributes: Record<string, string>
  imageUrl?: string
  stockQuantity: number
  price?: number
  comparePrice?: number
}

export interface Product {
  id: string
  slug: string
  name: string
  shortDesc?: string
  description?: string
  price: number
  comparePrice?: number
  thumbnailUrl?: string
  images?: Array<{ url: string; alt?: string; sort_order?: number }>
  videoUrl?: string
  isNew?: boolean
  isBestseller?: boolean
  isFeatured?: boolean
  ratingAvg: number
  ratingCount: number
  totalStock: number
  brandName?: string
  brandSlug?: string
  categoryName?: string
  categorySlug?: string
  skuBase?: string
  metaTitle?: string
  metaDesc?: string
  variants?: ProductVariant[]
}

