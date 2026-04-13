import type { FastifyInstance } from 'fastify'

export class AdminService {
  constructor(private readonly fastify: FastifyInstance) {}

  async getRecentOrders(limit = 10) {
    return this.fastify.db.order.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
  }

  async getProducts(filters: any) {
    const { q, category, status = 'all', stock = 'all', page = 1, limit = 50, sort = 'updatedAt', order = 'desc' } = filters
    const where: any = {}
    if (status === 'active') where.isActive = true
    if (status === 'inactive') where.isActive = false
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { skuBase: { contains: q, mode: 'insensitive' } }]
    if (category) where.category = { slug: category }
    const [items, total] = await Promise.all([
      this.fastify.db.product.findMany({ where, orderBy: { [sort]: order }, skip: (page - 1) * limit, take: limit, include: { category: true, brand: true, _count: { select: { variants: true } } } }),
      this.fastify.db.product.count({ where }),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
  }

  async importProducts(file: any) { return { imported: 0, errors: [] } }
  async exportProducts() { return 'id,name,price,sku\n' }

  async getCustomers(filters: any) {
    const { q, page = 1, limit = 50 } = filters
    const where: any = { role: 'customer' }
    if (q) where.OR = [{ email: { contains: q } }, { firstName: { contains: q, mode: 'insensitive' } }]
    const [items, total] = await Promise.all([
      this.fastify.db.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: { id: true, email: true, firstName: true, lastName: true, createdAt: true, isActive: true, role: true } }),
      this.fastify.db.user.count({ where }),
    ])
    return { items, total }
  }

  async getCustomer(id: string) {
    return this.fastify.db.user.findUnique({ where: { id }, include: { orders: { orderBy: { createdAt: 'desc' }, take: 10 } } })
  }

  async updateCustomer(id: string, data: any) {
    return this.fastify.db.user.update({ where: { id }, data })
  }

  async getPromotions() { return this.fastify.db.promotion.findMany({ orderBy: { createdAt: 'desc' } }) }

  async createPromotion(data: any) {
    return this.fastify.db.promotion.create({ data: { ...data, slug: data.slug ?? data.name.toLowerCase().replace(/\s+/g, '-') } })
  }

  async generatePromoCodes(data: any) {
    const codes = Array.from({ length: data.count }, (_, i) => ({
      code: `${data.prefix}-${Date.now()}-${i}`,
      promotionId: data.promotionId, discountType: data.discountType,
      discountValue: data.discountValue, usageLimit: data.usageLimit,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    }))
    await this.fastify.db.promoCode.createMany({ data: codes })
    return codes.map(c => c.code)
  }

  async getReviews(filters: any) {
    const { status = 'pending', page = 1, limit = 50 } = filters
    const where: any = status !== 'all' ? { status } : {}
    const [items, total] = await Promise.all([
      this.fastify.db.review.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { product: { select: { name: true, slug: true } }, user: { select: { firstName: true, lastName: true, email: true } } } }),
      this.fastify.db.review.count({ where }),
    ])
    return { items, total }
  }

  async moderateReview(id: string, data: any, adminId: string) {
    return this.fastify.db.review.update({
      where: { id },
      data: { status: data.status, adminReply: data.adminReply, adminReplyAt: data.adminReply ? new Date() : undefined, moderatedBy: adminId, moderatedAt: new Date() },
    })
  }

  async getBanners() { return this.fastify.db.banner.findMany({ orderBy: { sortOrder: 'asc' } }) }
  async createBanner(data: any) { return this.fastify.db.banner.create({ data }) }
  async updateBanner(id: string, data: any) { return this.fastify.db.banner.update({ where: { id }, data }) }
  async deleteBanner(id: string) { return this.fastify.db.banner.delete({ where: { id } }) }

  async getPages() { return this.fastify.db.page.findMany() }
  async upsertPage(slug: string, data: any) {
    return this.fastify.db.page.upsert({ where: { slug }, create: { slug, ...data }, update: data })
  }

  async getSettings() {
    const rows = await this.fastify.db.setting.findMany()
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  }

  async updateSettings(data: Record<string, any>) {
    for (const [key, value] of Object.entries(data)) {
      await this.fastify.db.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
    }
    return this.getSettings()
  }

  async createCategory(data: any) { return this.fastify.db.category.create({ data }) }
  async updateCategory(id: string, data: any) { return this.fastify.db.category.update({ where: { id }, data }) }
  async createBrand(data: any) { return this.fastify.db.brand.create({ data }) }

  async syncNpOrderStatuses() { return { synced: 0 } }
  async getMedia(filters: any) { return { items: [] } }
  async deleteMedia(id: string) {}
}
