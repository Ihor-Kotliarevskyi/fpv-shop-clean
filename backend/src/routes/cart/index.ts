import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { optionalAuth } from '../../middleware/auth'
import { CartService } from '../../services/cart.service'

export async function cartRoutes(fastify: FastifyInstance) {
  const svc = new CartService(fastify)
  fastify.addHook('preHandler', optionalAuth)

  // ── GET /cart ─────────────────────────────────────────────
  fastify.get('/', async (req, reply) => {
    const cart = await svc.getOrCreate(req.user?.id, req.session?.id)
    return reply.send(cart)
  })

  // ── POST /cart/items ──────────────────────────────────────
  fastify.post('/items', {
    schema: {
      body: z.object({
        variantId: z.string().uuid(),
        quantity:  z.number().int().min(1).max(99).default(1),
      }),
    },
  }, async (req, reply) => {
    const { variantId, quantity } = req.body as any
    const cart = await svc.addItem(req.user?.id, req.session?.id, variantId, quantity)
    return reply.send(cart)
  })

  // ── PATCH /cart/items/:variantId ──────────────────────────
  fastify.patch<{ Params: { variantId: string } }>('/items/:variantId', {
    schema: {
      body: z.object({ quantity: z.number().int().min(0).max(99) }),
    },
  }, async (req, reply) => {
    const cart = await svc.updateItem(
      req.user?.id, req.session?.id,
      req.params.variantId, (req.body as any).quantity
    )
    return reply.send(cart)
  })

  // ── DELETE /cart/items/:variantId ─────────────────────────
  fastify.delete<{ Params: { variantId: string } }>('/items/:variantId', async (req, reply) => {
    const cart = await svc.removeItem(req.user?.id, req.session?.id, req.params.variantId)
    return reply.send(cart)
  })

  // ── DELETE /cart ──────────────────────────────────────────
  fastify.delete('/', async (req, reply) => {
    await svc.clear(req.user?.id, req.session?.id)
    return reply.code(204).send()
  })

  // ── POST /cart/promo-code ─────────────────────────────────
  fastify.post('/promo-code', {
    schema: {
      body: z.object({ code: z.string().min(3).max(50) }),
    },
  }, async (req, reply) => {
    const result = await svc.applyPromoCode(
      req.user?.id, req.session?.id, (req.body as any).code
    )
    return reply.send(result)
  })

  // ── DELETE /cart/promo-code ───────────────────────────────
  fastify.delete('/promo-code', async (req, reply) => {
    const cart = await svc.removePromoCode(req.user?.id, req.session?.id)
    return reply.send(cart)
  })

  // ── POST /cart/merge — злиття гостя з авторизованим ──────
  fastify.post('/merge', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Unauthorized' })
    const { sessionId } = req.body as any
    const cart = await svc.mergeGuestCart(req.user.id, sessionId)
    return reply.send(cart)
  })

  // ── GET /cart/count ───────────────────────────────────────
  fastify.get('/count', async (req, reply) => {
    const count = await svc.getItemCount(req.user?.id, req.session?.id)
    return reply.send({ count })
  })
}
