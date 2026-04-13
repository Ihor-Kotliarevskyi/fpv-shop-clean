import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth'
import { AdminService } from '../../services/admin.service'
import { StockService } from '../../services/stock.service'
import { AnalyticsService } from '../../services/analytics.service'

export async function adminRoutes(fastify: FastifyInstance) {
  const admin = new AdminService(fastify)
  const stock = new StockService(fastify)
  const analytics = new AnalyticsService(fastify)

  fastify.addHook('preHandler', requireAdmin)

  // Dashboard
  fastify.get('/dashboard', async (req, reply) => {
    const [summary, recentOrders, lowStock, topProducts] = await Promise.all([
      analytics.getDashboardSummary(),
      admin.getRecentOrders(10),
      stock.getLowStockItems(),
      analytics.getTopProducts(5),
    ])
    return reply.send({ summary, recentOrders, lowStock, topProducts })
  })

  // Analytics
  fastify.get('/analytics/sales', async (req, reply) => {
    const data = await analytics.getSalesData(req.query as any)
    return reply.send(data)
  })

  // Products admin
  fastify.get('/products', async (req, reply) => {
    const result = await admin.getProducts(req.query as any)
    return reply.send(result)
  })

  fastify.post('/products/import', async (req, reply) => {
    const data = await req.file()
    const result = await admin.importProducts(data!)
    return reply.send(result)
  })

  fastify.get('/products/export', async (req, reply) => {
    const csv = await admin.exportProducts()
    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', 'attachment; filename="products.csv"')
    return reply.send(csv)
  })

  // Stock
  fastify.get('/stock', async (req, reply) => {
    return reply.send(await stock.getStockSummary())
  })

  fastify.get('/stock/low', async (req, reply) => {
    return reply.send({ items: await stock.getLowStockItems() })
  })

  fastify.post<{ Params: { variantId: string } }>('/stock/:variantId/adjust', async (req, reply) => {
    const result = await stock.adjustStock(req.params.variantId, req.body as any, req.user.id)
    return reply.send(result)
  })

  // Purchase orders
  fastify.get('/purchase-orders', async (req, reply) => {
    return reply.send(await stock.getPurchaseOrders())
  })

  fastify.post('/purchase-orders', async (req, reply) => {
    const po = await stock.createPurchaseOrder(req.body as any, req.user.id)
    return reply.code(201).send(po)
  })

  fastify.post<{ Params: { id: string } }>('/purchase-orders/:id/receive', async (req, reply) => {
    return reply.send(await stock.receivePurchaseOrder(req.params.id, req.body as any, req.user.id))
  })

  // Customers
  fastify.get('/customers', async (req, reply) => {
    return reply.send(await admin.getCustomers(req.query as any))
  })

  fastify.get<{ Params: { id: string } }>('/customers/:id', async (req, reply) => {
    return reply.send(await admin.getCustomer(req.params.id))
  })

  fastify.patch<{ Params: { id: string } }>('/customers/:id', {
    preHandler: requireSuperAdmin,
  }, async (req, reply) => {
    return reply.send(await admin.updateCustomer(req.params.id, req.body as any))
  })

  // Promotions
  fastify.get('/promotions', async (req, reply) => {
    return reply.send({ items: await admin.getPromotions() })
  })

  fastify.post('/promotions', async (req, reply) => {
    return reply.code(201).send(await admin.createPromotion(req.body as any))
  })

  fastify.post('/promo-codes/generate', async (req, reply) => {
    return reply.send({ codes: await admin.generatePromoCodes(req.body as any) })
  })

  // Reviews moderation
  fastify.get('/reviews', async (req, reply) => {
    return reply.send(await admin.getReviews(req.query as any))
  })

  fastify.patch<{ Params: { id: string } }>('/reviews/:id', async (req, reply) => {
    return reply.send(await admin.moderateReview(req.params.id, req.body as any, req.user.id))
  })

  // Content
  fastify.get('/banners', async (req, reply) => reply.send({ items: await admin.getBanners() }))
  fastify.post('/banners', async (req, reply) => reply.code(201).send(await admin.createBanner(req.body as any)))
  fastify.patch<{ Params: { id: string } }>('/banners/:id', async (req, reply) => reply.send(await admin.updateBanner(req.params.id, req.body as any)))
  fastify.delete<{ Params: { id: string } }>('/banners/:id', async (req, reply) => { await admin.deleteBanner(req.params.id); reply.code(204).send() })

  fastify.get('/pages', async (req, reply) => reply.send({ items: await admin.getPages() }))
  fastify.put<{ Params: { slug: string } }>('/pages/:slug', async (req, reply) => reply.send(await admin.upsertPage(req.params.slug, req.body as any)))

  // Settings
  fastify.get('/settings', async (req, reply) => reply.send(await admin.getSettings()))
  fastify.patch('/settings', { preHandler: requireSuperAdmin }, async (req, reply) => reply.send(await admin.updateSettings(req.body as any)))

  // Categories & Brands
  fastify.post('/categories', async (req, reply) => reply.code(201).send(await admin.createCategory(req.body as any)))
  fastify.patch<{ Params: { id: string } }>('/categories/:id', async (req, reply) => reply.send(await admin.updateCategory(req.params.id, req.body as any)))
  fastify.post('/brands', async (req, reply) => reply.code(201).send(await admin.createBrand(req.body as any)))

  // Nova Poshta sync
  fastify.get('/np/sync-status', async (req, reply) => reply.send(await admin.syncNpOrderStatuses()))

  // Media
  fastify.get('/media', async (req, reply) => reply.send(await admin.getMedia(req.query as any)))
  fastify.delete<{ Params: { id: string } }>('/media/:id', async (req, reply) => { await admin.deleteMedia(req.params.id); reply.code(204).send() })
}
