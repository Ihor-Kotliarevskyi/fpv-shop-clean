import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'

export class OrderService {
  constructor(private readonly fastify: FastifyInstance) {}

  async create(data: any, userId: string | null, ip: string, userAgent: string | undefined) {
    // Validate stock and calculate totals
    const items = await Promise.all(data.items.map(async (item: any) => {
      const variant = await this.fastify.db.productVariant.findUnique({
        where: { id: item.variantId }, include: { product: true },
      })
      if (!variant) throw new Error(`Variant ${item.variantId} not found`)
      const available = variant.stockQuantity - variant.reservedQty
      if (available < item.quantity) throw new Error(`Недостатньо "${variant.product.name}" на складі`)
      return { variant, quantity: item.quantity, unitPrice: Number(variant.price ?? variant.product.price) }
    }))

    const subtotal = items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0)
    let discountAmount = 0
    // Apply promo if any...
    const shippingAmount = subtotal >= 2000 ? 0 : 79
    const total = subtotal - discountAmount + shippingAmount

    const order = await this.fastify.db.order.create({
      data: {
        userId: userId ?? undefined,
        guestEmail: !userId ? data.recipientEmail : undefined,
        status: 'pending', paymentStatus: 'pending',
        paymentMethod: data.paymentMethod,
        subtotal, discountAmount, shippingAmount, total,
        promoCode: data.promoCode,
        deliveryMethod: data.deliveryMethod,
        npCity: data.npCity, npCityRef: data.npCityRef,
        npBranch: data.npBranch, npBranchRef: data.npBranchRef,
        deliveryAddress: data.deliveryAddress,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        recipientEmail: data.recipientEmail,
        customerNotes: data.customerNotes,
        ipAddress: ip, userAgent,
        items: {
          create: items.map((i: any) => ({
            productId: i.variant.productId, variantId: i.variant.id,
            productName: i.variant.product.name, productSku: i.variant.sku,
            productImage: i.variant.product.thumbnailUrl,
            variantAttrs: i.variant.attributes,
            unitPrice: i.unitPrice, quantity: i.quantity,
            subtotal: i.unitPrice * i.quantity,
          })),
        },
      },
      include: { items: true },
    })

    // Reserve stock
    for (const item of items) {
      await this.fastify.db.productVariant.update({
        where: { id: item.variant.id },
        data: { reservedQty: { increment: item.quantity } },
      })
    }

    // Generate payment URL
    let paymentUrl: string | null = null
    if (data.paymentMethod === 'wayforpay') {
      paymentUrl = await this.createWayForPayInvoice(order)
    }

    return { ...order, paymentUrl }
  }

  async findById(id: string, userId?: string | null) {
    const where: any = { id }
    if (userId) where.userId = userId
    return this.fastify.db.order.findFirst({ where, include: { items: true, statusHistory: { orderBy: { createdAt: 'desc' } } } })
  }

  async findAll(filters: any) {
    const { status, from, to, search, page = 1, limit = 50 } = filters
    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) }
    if (to)   where.createdAt = { ...where.createdAt, lte: new Date(to) }
    if (search) where.OR = [{ orderNumber: { contains: search } }, { recipientName: { contains: search, mode: 'insensitive' } }]

    const [items, total] = await Promise.all([
      this.fastify.db.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.fastify.db.order.count({ where }),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
  }

  async updateStatus(id: string, data: any, adminId: string) {
    const order = await this.fastify.db.order.update({
      where: { id },
      data: { status: data.status, npTtn: data.npTtn, [`${data.status}At`]: new Date() },
    })
    await this.fastify.db.orderStatusHistory.create({
      data: { orderId: id, status: data.status, comment: data.comment, createdBy: adminId },
    })
    return order
  }

  async cancel(id: string, userId: string, reason?: string) {
    const order = await this.fastify.db.order.findFirst({ where: { id, userId } })
    if (!order) throw new Error('Order not found')
    if (!['pending','confirmed'].includes(order.status)) throw new Error('Замовлення не можна скасувати')
    return this.fastify.db.order.update({ where: { id }, data: { status: 'cancelled', cancelReason: reason, cancelledAt: new Date() } })
  }

  async requestRefund(id: string, userId: string, data: any) {
    return this.fastify.db.order.update({
      where: { id, userId }, data: { status: 'refund_requested', refundReason: data.reason, refundRequestedAt: new Date() },
    })
  }

  async getTracking(orderNumber: string) {
    return this.fastify.db.order.findFirst({
      where: { orderNumber },
      select: { orderNumber: true, status: true, npTtn: true, npStatus: true, statusHistory: { orderBy: { createdAt: 'desc' } } },
    })
  }

  async getStats() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const [ordersToday, revenueToday, ordersTotal] = await Promise.all([
      this.fastify.db.order.count({ where: { createdAt: { gte: today } } }),
      this.fastify.db.order.aggregate({ where: { createdAt: { gte: today }, paymentStatus: 'paid' }, _sum: { total: true } }),
      this.fastify.db.order.count(),
    ])
    return { ordersToday, revenueToday: revenueToday._sum.total ?? 0, ordersTotal }
  }

  async generateInvoice(id: string, userId: string) {
    // Placeholder — generate PDF via puppeteer or PDFKit
    return Buffer.from('PDF placeholder')
  }

  async createNpShipment(id: string, data: any) {
    // Nova Poshta API call to create TTN
    return { ttn: '20450000000000', status: 'created' }
  }

  async syncNpOrderStatuses() {
    const shipped = await this.fastify.db.order.findMany({
      where: { status: 'shipped', npTtn: { not: null } }, select: { id: true, npTtn: true },
    })
    return { synced: shipped.length }
  }

  private async createWayForPayInvoice(order: any) {
    // WayForPay invoice creation
    return `https://secure.wayforpay.com/pay?invoice=${order.id}`
  }
}
