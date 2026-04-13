import type { FastifyInstance } from 'fastify'

export class CartService {
  constructor(private readonly fastify: FastifyInstance) {}

  private async findCart(userId?: string | null, sessionId?: string | null) {
    if (userId) return this.fastify.db.cart.findFirst({ where: { userId }, include: { items: { include: { variant: { include: { product: true } } } } } })
    if (sessionId) return this.fastify.db.cart.findFirst({ where: { sessionId }, include: { items: { include: { variant: { include: { product: true } } } } } })
    return null
  }

  async getOrCreate(userId?: string | null, sessionId?: string | null) {
    let cart = await this.findCart(userId, sessionId)
    if (!cart) {
      cart = await this.fastify.db.cart.create({
        data: { userId: userId ?? undefined, sessionId: sessionId ?? undefined },
        include: { items: true },
      })
    }
    return this.formatCart(cart)
  }

  async addItem(userId: string | null | undefined, sessionId: string | null | undefined, variantId: string, quantity: number) {
    const cart = await this.getOrCreate(userId, sessionId)
    const variant = await this.fastify.db.productVariant.findUnique({ where: { id: variantId }, include: { product: true } })
    if (!variant) throw new Error('Variant not found')
    if (variant.stockQuantity < quantity) throw new Error('Недостатньо товару')

    const existing = await this.fastify.db.cartItem.findFirst({ where: { cartId: cart.id, variantId } })
    if (existing) {
      await this.fastify.db.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } })
    } else {
      await this.fastify.db.cartItem.create({ data: { cartId: cart.id, variantId, quantity, unitPrice: variant.price ?? variant.product.price } })
    }
    return this.getOrCreate(userId, sessionId)
  }

  async removeItem(userId: string | null | undefined, sessionId: string | null | undefined, variantId: string) {
    const cart = await this.findCart(userId, sessionId)
    if (!cart) return this.formatCart(null)
    await this.fastify.db.cartItem.deleteMany({ where: { cartId: cart.id, variantId } })
    return this.getOrCreate(userId, sessionId)
  }

  async updateItem(userId: string | null | undefined, sessionId: string | null | undefined, variantId: string, quantity: number) {
    if (quantity === 0) return this.removeItem(userId, sessionId, variantId)
    const cart = await this.findCart(userId, sessionId)
    if (!cart) return this.formatCart(null)
    await this.fastify.db.cartItem.updateMany({ where: { cartId: cart.id, variantId }, data: { quantity } })
    return this.getOrCreate(userId, sessionId)
  }

  async applyPromoCode(userId: string | null | undefined, sessionId: string | null | undefined, code: string) {
    const promo = await this.fastify.db.promoCode.findFirst({ where: { code, isActive: true } })
    if (!promo) throw new Error('Промокод не знайдено або недійсний')
    if (promo.expiresAt && promo.expiresAt < new Date()) throw new Error('Промокод прострочено')
    const cart = await this.findCart(userId, sessionId)
    if (cart) await this.fastify.db.cart.update({ where: { id: cart.id }, data: { promoCode: code } })
    return { promo: { code, discountType: promo.discountType, discountValue: promo.discountValue } }
  }

  async removePromoCode(userId: string | null | undefined, sessionId: string | null | undefined) {
    const cart = await this.findCart(userId, sessionId)
    if (cart) await this.fastify.db.cart.update({ where: { id: cart.id }, data: { promoCode: null } })
    return this.getOrCreate(userId, sessionId)
  }

  async clear(userId: string | null | undefined, sessionId: string | null | undefined) {
    const cart = await this.findCart(userId, sessionId)
    if (cart) await this.fastify.db.cartItem.deleteMany({ where: { cartId: cart.id } })
  }

  async getItemCount(userId: string | null | undefined, sessionId: string | null | undefined) {
    const cart = await this.findCart(userId, sessionId)
    if (!cart) return 0
    const r = await this.fastify.db.cartItem.aggregate({ where: { cartId: (cart as any).id }, _sum: { quantity: true } })
    return r._sum.quantity ?? 0
  }

  async mergeGuestCart(userId: string, sessionId: string) {
    const guestCart = await this.fastify.db.cart.findFirst({ where: { sessionId }, include: { items: true } })
    if (!guestCart || guestCart.items.length === 0) return
    const userCart = await this.getOrCreate(userId)
    for (const item of guestCart.items) {
      await this.addItem(userId, null, item.variantId, item.quantity).catch(() => {})
    }
    await this.fastify.db.cart.delete({ where: { id: guestCart.id } })
  }

  private formatCart(cart: any) {
    if (!cart) return { id: null, items: [], subtotal: 0, total: 0, itemCount: 0 }
    const items = (cart.items ?? []).map((i: any) => ({
      id: i.id, variantId: i.variantId,
      productName: i.variant?.product?.name, productSlug: i.variant?.product?.slug,
      productImage: i.variant?.product?.thumbnailUrl,
      variant: { id: i.variantId, sku: i.variant?.sku, attributes: i.variant?.attributes, stock: i.variant?.stockQuantity },
      unitPrice: Number(i.unitPrice), quantity: i.quantity, subtotal: Number(i.unitPrice) * i.quantity,
    }))
    const subtotal = items.reduce((s: number, i: any) => s + i.subtotal, 0)
    return { id: cart.id, items, subtotal, total: subtotal, itemCount: items.reduce((s: number, i: any) => s + i.quantity, 0) }
  }
}
