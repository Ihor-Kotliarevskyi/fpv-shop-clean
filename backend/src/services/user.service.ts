import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import axios from 'axios'

export class UserService {
  constructor(private readonly fastify: FastifyInstance) {}

  async getProfile(userId: string) {
    return this.fastify.db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true, role: true, newsletter: true, smsNotify: true, birthDate: true, gender: true, createdAt: true },
    })
  }

  async updateProfile(userId: string, data: any) {
    return this.fastify.db.user.update({ where: { id: userId }, data })
  }

  async changePassword(userId: string, data: any) {
    const user = await this.fastify.db.user.findUnique({ where: { id: userId } })
    if (!user?.passwordHash) throw new Error('No password set')
    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash)
    if (!valid) throw new Error('Поточний пароль невірний')
    await this.fastify.db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(data.newPassword, 12) } })
  }

  async uploadAvatar(userId: string, file: any) {
    // Upload to storage and return URL
    return `/avatars/${userId}.jpg`
  }

  async getAddresses(userId: string) {
    return this.fastify.db.userAddress.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] })
  }

  async addAddress(userId: string, data: any) {
    if (data.isDefault) {
      await this.fastify.db.userAddress.updateMany({ where: { userId }, data: { isDefault: false } })
    }
    return this.fastify.db.userAddress.create({ data: { userId, ...data } })
  }

  async updateAddress(userId: string, id: string, data: any) {
    return this.fastify.db.userAddress.update({ where: { id, userId }, data })
  }

  async deleteAddress(userId: string, id: string) {
    return this.fastify.db.userAddress.delete({ where: { id, userId } })
  }

  async getOrders(userId: string, filters: any) {
    const { page = 1, limit = 20 } = filters
    const [items, total] = await Promise.all([
      this.fastify.db.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { items: true } }),
      this.fastify.db.order.count({ where: { userId } }),
    ])
    return { items, total, page }
  }

  async getWishlist(userId: string) {
    const wishlist = await this.fastify.db.wishlist.findFirst({ where: { userId }, include: { items: { include: { product: { include: { brand: true } } } } } })
    return wishlist ?? { items: [] }
  }

  async addToWishlist(userId: string, data: any) {
    let wishlist = await this.fastify.db.wishlist.findFirst({ where: { userId } })
    if (!wishlist) wishlist = await this.fastify.db.wishlist.create({ data: { userId, shareToken: require('crypto').randomBytes(16).toString('hex') } })
    return this.fastify.db.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: data.productId } },
      create: { wishlistId: wishlist.id, productId: data.productId, variantId: data.variantId },
      update: {},
    })
  }

  async removeFromWishlist(userId: string, productId: string) {
    const wishlist = await this.fastify.db.wishlist.findFirst({ where: { userId } })
    if (!wishlist) return
    await this.fastify.db.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } })
  }

  async getSharedWishlist(token: string) {
    return this.fastify.db.wishlist.findFirst({ where: { shareToken: token }, include: { items: { include: { product: true } } } })
  }

  async getLoyalty(userId: string) {
    return { points: 0, tier: 'standard' }
  }

  async searchNpCities(q: string) {
    const { data } = await axios.post('https://api.novaposhta.ua/v2.0/json/', {
      apiKey: this.fastify.config.NOVA_POSHTA_API_KEY,
      modelName: 'Address', calledMethod: 'getCities',
      methodProperties: { FindByString: q, Limit: 10 },
    })
    return (data.data ?? []).map((c: any) => ({ ref: c.Ref, name: c.Description, region: c.RegionsDescription }))
  }

  async getNpBranches(cityRef: string) {
    const { data } = await axios.post('https://api.novaposhta.ua/v2.0/json/', {
      apiKey: this.fastify.config.NOVA_POSHTA_API_KEY,
      modelName: 'Address', calledMethod: 'getWarehouses',
      methodProperties: { CityRef: cityRef, TypeOfWarehouseRef: '841339c7-591a-42e2-8233-7a0a00f0ed6f' },
    })
    return (data.data ?? []).map((b: any) => ({ ref: b.Ref, number: b.Number, description: b.Description }))
  }

  async getNpLockers(cityRef: string) {
    const { data } = await axios.post('https://api.novaposhta.ua/v2.0/json/', {
      apiKey: this.fastify.config.NOVA_POSHTA_API_KEY,
      modelName: 'Address', calledMethod: 'getWarehouses',
      methodProperties: { CityRef: cityRef, TypeOfWarehouseRef: 'f9316480-5f2d-425d-bc2c-ac7cd29decf0' },
    })
    return (data.data ?? []).map((l: any) => ({ ref: l.Ref, number: l.Number, description: l.Description }))
  }
}
