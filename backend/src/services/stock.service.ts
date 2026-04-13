import type { FastifyInstance } from 'fastify'

export class StockService {
  constructor(private readonly fastify: FastifyInstance) {}

  async getStockSummary() {
    const [total, low, out] = await Promise.all([
      this.fastify.db.productVariant.count({ where: { isActive: true } }),
      this.fastify.db.productVariant.count({ where: { isActive: true, stockQuantity: { lte: 3, gt: 0 } } }),
      this.fastify.db.productVariant.count({ where: { isActive: true, stockQuantity: 0 } }),
    ])
    return { total, low, out }
  }

  async getLowStockItems() {
    return this.fastify.db.productVariant.findMany({
      where: { isActive: true, stockQuantity: { lte: 3 } },
      include: { product: { select: { name: true, slug: true, thumbnailUrl: true } } },
      orderBy: { stockQuantity: 'asc' }, take: 20,
    })
  }

  async adjustStock(variantId: string, data: any, userId: string) {
    const variant = await this.fastify.db.productVariant.findUnique({ where: { id: variantId } })
    if (!variant) throw new Error('Variant not found')
    const newQty = variant.stockQuantity + data.quantity
    if (newQty < 0) throw new Error('Кількість не може бути від\'ємною')
    await this.fastify.db.productVariant.update({ where: { id: variantId }, data: { stockQuantity: newQty } })
    await this.fastify.db.stockMovement.create({
      data: { variantId, type: data.type, quantity: data.quantity, qtyBefore: variant.stockQuantity, qtyAfter: newQty, note: data.note, createdBy: userId },
    })
    return { variantId, stockQuantity: newQty }
  }

  async getPurchaseOrders() {
    return this.fastify.db.purchaseOrder.findMany({ orderBy: { createdAt: 'desc' }, include: { supplier: true, items: { include: { variant: { include: { product: true } } } } } })
  }

  async createPurchaseOrder(data: any, userId: string) {
    return this.fastify.db.purchaseOrder.create({
      data: {
        supplierId: data.supplierId, notes: data.notes, createdBy: userId,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
        totalAmount: data.items.reduce((s: number, i: any) => s + i.quantity * i.unitCost, 0),
        items: { create: data.items },
      },
    })
  }

  async receivePurchaseOrder(id: string, data: any, userId: string) {
    // Update received quantities and adjust stock
    const po = await this.fastify.db.purchaseOrder.findUnique({ where: { id }, include: { items: true } })
    if (!po) throw new Error('PO not found')
    for (const item of po.items) {
      await this.adjustStock(item.variantId, { quantity: item.quantity, type: 'purchase', note: `PO ${id}` }, userId)
    }
    return this.fastify.db.purchaseOrder.update({ where: { id }, data: { status: 'received', receivedDate: new Date() } })
  }
}
