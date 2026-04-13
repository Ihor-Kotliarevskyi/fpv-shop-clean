import type { FastifyInstance } from 'fastify'

export class AnalyticsService {
  constructor(private readonly fastify: FastifyInstance) {}

  async getDashboardSummary() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)

    const [ordersToday, ordersYesterday, revenue, customers, lowStock] = await Promise.all([
      this.fastify.db.order.count({ where: { createdAt: { gte: today } } }),
      this.fastify.db.order.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.fastify.db.order.aggregate({ where: { createdAt: { gte: today }, paymentStatus: 'paid' }, _sum: { total: true } }),
      this.fastify.db.user.count({ where: { createdAt: { gte: today } } }),
      this.fastify.db.productVariant.count({ where: { stockQuantity: { lte: 3 }, isActive: true } }),
    ])

    const revToday = Number(revenue._sum.total ?? 0)
    const orderChange = ordersYesterday > 0 ? Math.round((ordersToday - ordersYesterday) / ordersYesterday * 100) : 0

    return {
      revenueToday: revToday, revenueTodayChange: 0,
      ordersToday, ordersTodayChange: orderChange,
      newCustomersToday: customers, newCustomersChange: 0,
      totalStockItems: 0, lowStockCount: lowStock,
    }
  }

  async getSalesData(filters: any) {
    const { from, to, groupBy = 'day' } = filters
    // Raw query for grouped sales
    const data = await this.fastify.db.$queryRaw`
      SELECT DATE_TRUNC(${groupBy}, created_at) as period,
             COUNT(*) as orders, SUM(total) as revenue
      FROM orders
      WHERE created_at BETWEEN ${new Date(from)} AND ${new Date(to)}
        AND status NOT IN ('cancelled','refunded')
      GROUP BY period ORDER BY period ASC`
    return data
  }

  async getTopProducts(limit = 5) {
    return this.fastify.db.product.findMany({
      where: { isActive: true, orderCount: { gt: 0 } },
      orderBy: { orderCount: 'desc' }, take: limit,
      select: { id: true, name: true, thumbnailUrl: true, orderCount: true, price: true },
    })
  }

  async getProductsAnalytics() { return {} }
  async getCustomersAnalytics() { return {} }
}
