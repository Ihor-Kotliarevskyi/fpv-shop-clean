import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { OrderService } from '../services/order.service'
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth'

const CreateOrderSchema = z.object({
  // Товари
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity:  z.number().int().positive(),
  })).min(1),

  // Отримувач
  recipientName:  z.string().min(2).max(200),
  recipientPhone: z.string().regex(/^\+380\d{9}$/),
  recipientEmail: z.string().email().optional(),

  // Доставка
  deliveryMethod: z.enum([
    'nova_poshta_branch', 'nova_poshta_address',
    'nova_poshta_locker', 'ukrposhta', 'pickup'
  ]),
  npCity:        z.string().optional(),
  npCityRef:     z.string().optional(),
  npBranch:      z.string().optional(),
  npBranchRef:   z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryRegion: z.string().optional(),

  // Оплата
  paymentMethod: z.enum(['wayforpay','liqpay','monobank','card','cod']),

  // Промокод
  promoCode: z.string().optional(),

  // Нотатки
  customerNotes: z.string().max(1000).optional(),

  // Збереження адреси в профіль
  saveAddress: z.boolean().default(false),
})

export async function ordersRoutes(fastify: FastifyInstance) {
  const svc = new OrderService(fastify)

  // ── POST /orders — Створити замовлення ────────────────────
  fastify.post('/', {
    preHandler: optionalAuth,
    schema: { body: CreateOrderSchema },
  }, async (req, reply) => {
    const data = CreateOrderSchema.parse(req.body)
    const userId = req.user?.id ?? null
    const order = await svc.create(data, userId, req.ip, req.headers['user-agent'])
    return reply.code(201).send({
      order,
      paymentUrl: order.paymentUrl,
    })
  })

  // ── GET /orders/:id — Отримати замовлення ─────────────────
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: optionalAuth,
  }, async (req, reply) => {
    const order = await svc.findById(req.params.id, req.user?.id)
    if (!order) return reply.code(404).send({ error: 'Замовлення не знайдено' })
    return reply.send(order)
  })

  // ── GET /orders/:number/track — Відстеження ───────────────
  fastify.get<{ Params: { number: string } }>('/:number/track', async (req, reply) => {
    const tracking = await svc.getTracking(req.params.number)
    return reply.send(tracking)
  })

  // ── POST /orders/:id/cancel — Скасувати ───────────────────
  fastify.post<{ Params: { id: string } }>('/:id/cancel', {
    preHandler: requireAuth,
    schema: {
      body: z.object({ reason: z.string().max(500).optional() }),
    },
  }, async (req, reply) => {
    const { reason } = req.body as any
    const order = await svc.cancel(req.params.id, req.user.id, reason)
    return reply.send(order)
  })

  // ── POST /orders/:id/refund-request — Запит на повернення ─
  fastify.post<{ Params: { id: string } }>('/:id/refund-request', {
    preHandler: requireAuth,
    schema: {
      body: z.object({
        reason: z.string().min(10).max(1000),
        items:  z.array(z.object({
          orderItemId: z.string().uuid(),
          quantity:    z.number().int().positive(),
        })).optional(),
      }),
    },
  }, async (req, reply) => {
    const result = await svc.requestRefund(req.params.id, req.user.id, req.body as any)
    return reply.send(result)
  })

  // ── GET /orders/:id/invoice — PDF накладна ────────────────
  fastify.get<{ Params: { id: string } }>('/:id/invoice', {
    preHandler: requireAuth,
  }, async (req, reply) => {
    const pdf = await svc.generateInvoice(req.params.id, req.user.id)
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="invoice-${req.params.id}.pdf"`)
    return reply.send(pdf)
  })

  // ────────────────────────────────────────────────────────
  // ADMIN ROUTES
  // ────────────────────────────────────────────────────────

  // ── GET /orders (admin) ───────────────────────────────────
  fastify.get('/', {
    preHandler: requireAdmin,
    schema: {
      querystring: z.object({
        status:    z.string().optional(),
        from:      z.string().optional(),
        to:        z.string().optional(),
        search:    z.string().optional(),
        page:      z.coerce.number().default(1),
        limit:     z.coerce.number().default(50),
      }),
    },
  }, async (req, reply) => {
    const result = await svc.findAll(req.query as any)
    return reply.send(result)
  })

  // ── PATCH /orders/:id/status (admin) ─────────────────────
  fastify.patch<{ Params: { id: string } }>('/:id/status', {
    preHandler: requireAdmin,
    schema: {
      body: z.object({
        status:  z.enum(['confirmed','processing','packed','shipped','delivered','cancelled','refunded']),
        comment: z.string().optional(),
        npTtn:   z.string().optional(),
      }),
    },
  }, async (req, reply) => {
    const order = await svc.updateStatus(
      req.params.id,
      req.body as any,
      req.user.id
    )
    return reply.send(order)
  })

  // ── POST /orders/:id/send-ttn (admin) — Відправка НП ─────
  fastify.post<{ Params: { id: string } }>('/:id/send-ttn', {
    preHandler: requireAdmin,
    schema: {
      body: z.object({
        weight:   z.number().positive(),
        seats:    z.number().int().positive().default(1),
        cost:     z.number().positive().optional(),
        payerType: z.enum(['Sender','Recipient']).default('Recipient'),
      }),
    },
  }, async (req, reply) => {
    const result = await svc.createNpShipment(req.params.id, req.body as any)
    return reply.send(result)
  })

  // ── GET /orders/stats (admin) — Статистика ────────────────
  fastify.get('/stats', {
    preHandler: requireAdmin,
  }, async (req, reply) => {
    const stats = await svc.getStats()
    return reply.send(stats)
  })
}
