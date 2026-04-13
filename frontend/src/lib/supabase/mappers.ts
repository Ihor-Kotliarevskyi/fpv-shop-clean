export function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function mapProduct(row: any) {
  const variants = (row.product_variants ?? []).map((v: any) => ({
    id: v.id,
    sku: v.sku,
    attributes: v.attributes ?? {},
    imageUrl: v.image_url ?? undefined,
    stockQuantity: v.stock_quantity ?? 0,
    price: v.price != null ? toNumber(v.price) : undefined,
    comparePrice: v.compare_price != null ? toNumber(v.compare_price) : undefined,
  }))

  const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stockQuantity ?? 0), 0)

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDesc: row.short_desc ?? '',
    description: row.description ?? '',
    price: toNumber(row.price),
    comparePrice: row.compare_price != null ? toNumber(row.compare_price) : undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    images: Array.isArray(row.images) ? row.images : [],
    videoUrl: row.video_url ?? undefined,
    isNew: !!row.is_new,
    isBestseller: !!row.is_bestseller,
    isFeatured: !!row.is_featured,
    ratingAvg: toNumber(row.rating_avg),
    ratingCount: row.rating_count ?? 0,
    totalStock,
    brandName: row.brands?.name ?? '',
    brandSlug: row.brands?.slug ?? '',
    categoryName: row.categories?.name ?? '',
    categorySlug: row.categories?.slug ?? '',
    skuBase: row.sku_base ?? '',
    metaTitle: row.meta_title ?? '',
    metaDesc: row.meta_desc ?? '',
    variants,
  }
}

