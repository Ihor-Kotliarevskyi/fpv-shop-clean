import type { FastifyInstance } from 'fastify'

export class ProductService {
  constructor(private readonly fastify: FastifyInstance) {}

  async findAll(filters: any) {
    const { page = 1, limit = 24, sort = 'popular', q, category, brand, minPrice, maxPrice, inStock, featured, isNew } = filters
    const skip = (page - 1) * limit

    const where: any = { isActive: true }
    if (q)          where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { skuBase: { contains: q, mode: 'insensitive' } }]
    if (category)   where.category = { slug: category }
    if (brand)      where.brand = { slug: { in: brand } }
    if (minPrice)   where.price = { ...where.price, gte: minPrice }
    if (maxPrice)   where.price = { ...where.price, lte: maxPrice }
    if (featured)   where.isFeatured = true
    if (isNew)      where.isNew = true
    if (inStock)    where.variants = { some: { stockQuantity: { gt: 0 } } }

    const orderBy: any = {
      popular:    { orderCount: 'desc' },
      newest:     { createdAt: 'desc' },
      price_asc:  { price: 'asc' },
      price_desc: { price: 'desc' },
      rating:     { ratingAvg: 'desc' },
    }[sort] ?? { orderCount: 'desc' }

    const [items, total] = await Promise.all([
      this.fastify.db.product.findMany({
        where, orderBy, skip, take: limit,
        include: { category: true, brand: true, variants: { select: { id: true, attributes: true, price: true, stockQuantity: true } } },
      }),
      this.fastify.db.product.count({ where }),
    ])

    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findBySlug(slug: string) {
    return this.fastify.db.product.findUnique({
      where: { slug },
      include: {
        category: true, brand: true,
        variants: { orderBy: { sortOrder: 'asc' } },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    })
  }

  async findFeatured(limit = 12)     { return this.fastify.db.product.findMany({ where: { isActive: true, isFeatured: true }, take: limit, include: { brand: true } }) }
  async findNew(limit = 12)          { return this.fastify.db.product.findMany({ where: { isActive: true, isNew: true }, take: limit, orderBy: { publishedAt: 'desc' } }) }
  async findBestsellers(limit = 12)  { return this.fastify.db.product.findMany({ where: { isActive: true, isBestseller: true }, take: limit, orderBy: { orderCount: 'desc' } }) }

  async findRelated(slug: string, limit = 8) {
    const product = await this.fastify.db.product.findUnique({ where: { slug }, select: { categoryId: true, relatedIds: true } })
    if (!product) return []
    return this.fastify.db.product.findMany({
      where: { isActive: true, id: { in: product.relatedIds as string[] }, NOT: { slug } },
      take: limit,
    })
  }

  async findAccessories(slug: string, limit = 8) {
    const product = await this.fastify.db.product.findUnique({ where: { slug }, select: { accessoryIds: true } })
    if (!product) return []
    return this.fastify.db.product.findMany({
      where: { isActive: true, id: { in: product.accessoryIds as string[] } },
      take: limit,
    })
  }

  async findForCompare(ids: string[]) {
    return this.fastify.db.product.findMany({
      where: { id: { in: ids } },
      include: { category: true, brand: true, variants: true },
    })
  }

  async findReviews(slug: string, page = 1, sort = 'newest') {
    const product = await this.fastify.db.product.findUnique({ where: { slug }, select: { id: true } })
    if (!product) return { items: [], total: 0 }
    const orderBy: any = sort === 'newest' ? { createdAt: 'desc' } : sort === 'rating_high' ? { rating: 'desc' } : { helpfulCount: 'desc' }
    const [items, total] = await Promise.all([
      this.fastify.db.review.findMany({ where: { productId: product.id, status: 'approved' }, orderBy, skip: (page - 1) * 10, take: 10 }),
      this.fastify.db.review.count({ where: { productId: product.id, status: 'approved' } }),
    ])
    return { items, total }
  }

  async createReview(slug: string, userId: string, data: any) {
    const product = await this.fastify.db.product.findUnique({ where: { slug }, select: { id: true } })
    if (!product) throw new Error('Product not found')
    return this.fastify.db.review.create({ data: { productId: product.id, userId, ...data, status: 'pending' } })
  }

  async recordView(productId: string, ip: string) {
    await this.fastify.db.product.update({ where: { id: productId }, data: { viewCount: { increment: 1 } } })
    await this.fastify.db.analyticsEvent.create({ data: { eventType: 'view', entityType: 'product', entityId: productId, ipAddress: ip } }).catch(() => {})
  }

  async create(data: any) {
    const { variants, ...productData } = data
    return this.fastify.db.product.create({
      data: {
        ...productData,
        variants: variants ? { create: variants.map((v: any) => ({ sku: v.sku, attributes: v.attributes, price: v.price, stockQuantity: v.stock ?? 0 })) } : undefined,
      },
    })
  }

  async update(id: string, data: any) {
    return this.fastify.db.product.update({ where: { id }, data })
  }

  async softDelete(id: string) {
    return this.fastify.db.product.update({ where: { id }, data: { isActive: false } })
  }

  async addVariant(productId: string, data: any) {
    return this.fastify.db.productVariant.create({ data: { productId, ...data } })
  }

  async updateVariant(id: string, data: any) {
    return this.fastify.db.productVariant.update({ where: { id }, data })
  }

  async publish(id: string) {
    return this.fastify.db.product.update({ where: { id }, data: { isActive: true, publishedAt: new Date() } })
  }

  async bulkAction(ids: string[], action: string, value: any) {
    const update: any = { activate: { isActive: true }, deactivate: { isActive: false }, set_featured: { isFeatured: true }, remove_featured: { isFeatured: false } }[action]
    if (action === 'delete') return this.fastify.db.product.updateMany({ where: { id: { in: ids } }, data: { isActive: false } })
    return this.fastify.db.product.updateMany({ where: { id: { in: ids } }, data: update })
  }
}
