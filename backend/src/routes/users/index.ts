import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth, optionalAuth } from '../../middleware/auth'
import { UserService } from '../../services/user.service'
import { AuthService } from '../../services/auth.service'

export async function usersRoutes(fastify: FastifyInstance) {
  const svc = new UserService(fastify)
  const auth = new AuthService(fastify)

  // ══════════════════════════════════════════════════════════
  // AUTH
  // ══════════════════════════════════════════════════════════

  fastify.post('/register', {
    schema: {
      body: z.object({
        email:     z.string().email(),
        password:  z.string().min(8),
        firstName: z.string().min(2).max(100),
        lastName:  z.string().min(2).max(100),
        phone:     z.string().regex(/^\+380\d{9}$/).optional(),
        newsletter: z.boolean().default(false),
      }),
    },
  }, async (req, reply) => {
    const result = await auth.register(req.body as any)
    return reply.code(201).send(result)
  })

  fastify.post('/login', {
    schema: {
      body: z.object({
        email:    z.string().email(),
        password: z.string(),
      }),
    },
  }, async (req, reply) => {
    const result = await auth.login((req.body as any).email, (req.body as any).password)
    return reply.send(result)
  })

  fastify.post('/refresh', {
    schema: {
      body: z.object({ refreshToken: z.string() }),
    },
  }, async (req, reply) => {
    const result = await auth.refreshTokens((req.body as any).refreshToken)
    return reply.send(result)
  })

  fastify.post('/logout', { preHandler: requireAuth }, async (req, reply) => {
    await auth.logout(req.user.id, req.body as any)
    return reply.code(204).send()
  })

  fastify.post('/forgot-password', {
    schema: { body: z.object({ email: z.string().email() }) },
  }, async (req, reply) => {
    await auth.sendPasswordReset((req.body as any).email)
    return reply.send({ message: 'Якщо email зареєстровано — відправимо лист' })
  })

  fastify.post('/reset-password', {
    schema: {
      body: z.object({
        token:    z.string(),
        password: z.string().min(8),
      }),
    },
  }, async (req, reply) => {
    await auth.resetPassword((req.body as any).token, (req.body as any).password)
    return reply.send({ message: 'Пароль змінено' })
  })

  fastify.get('/verify-email/:token', async (req: any, reply) => {
    await auth.verifyEmail(req.params.token)
    return reply.redirect(302, `${fastify.config.FRONTEND_URL}/account?verified=1`)
  })

  // ══════════════════════════════════════════════════════════
  // ПРОФІЛЬ
  // ══════════════════════════════════════════════════════════

  fastify.get('/me', { preHandler: requireAuth }, async (req, reply) => {
    const user = await svc.getProfile(req.user.id)
    return reply.send(user)
  })

  fastify.patch('/me', {
    preHandler: requireAuth,
    schema: {
      body: z.object({
        firstName:  z.string().min(2).max(100).optional(),
        lastName:   z.string().min(2).max(100).optional(),
        phone:      z.string().regex(/^\+380\d{9}$/).optional(),
        birthDate:  z.string().optional(),
        gender:     z.string().optional(),
        newsletter: z.boolean().optional(),
        smsNotify:  z.boolean().optional(),
        locale:     z.enum(['uk','en']).optional(),
      }),
    },
  }, async (req, reply) => {
    const user = await svc.updateProfile(req.user.id, req.body as any)
    return reply.send(user)
  })

  fastify.post('/me/change-password', {
    preHandler: requireAuth,
    schema: {
      body: z.object({
        currentPassword: z.string(),
        newPassword:     z.string().min(8),
      }),
    },
  }, async (req, reply) => {
    await svc.changePassword(req.user.id, req.body as any)
    return reply.send({ message: 'Пароль змінено' })
  })

  fastify.post('/me/avatar', { preHandler: requireAuth }, async (req, reply) => {
    const file = await req.file()
    if (!file) return reply.code(400).send({ error: 'Файл не завантажено' })
    const url = await svc.uploadAvatar(req.user.id, file)
    return reply.send({ avatarUrl: url })
  })

  // ══════════════════════════════════════════════════════════
  // АДРЕСИ
  // ══════════════════════════════════════════════════════════

  fastify.get('/me/addresses', { preHandler: requireAuth }, async (req, reply) => {
    const addresses = await svc.getAddresses(req.user.id)
    return reply.send({ items: addresses })
  })

  fastify.post('/me/addresses', {
    preHandler: requireAuth,
    schema: {
      body: z.object({
        label:       z.string().max(50).optional(),
        firstName:   z.string().min(2),
        lastName:    z.string().min(2),
        phone:       z.string(),
        city:        z.string(),
        cityRef:     z.string().optional(),
        npBranch:    z.string().optional(),
        npBranchRef: z.string().optional(),
        addressLine: z.string().optional(),
        region:      z.string().optional(),
        isDefault:   z.boolean().default(false),
      }),
    },
  }, async (req, reply) => {
    const address = await svc.addAddress(req.user.id, req.body as any)
    return reply.code(201).send(address)
  })

  fastify.patch<{ Params: { id: string } }>('/me/addresses/:id', {
    preHandler: requireAuth,
  }, async (req, reply) => {
    const address = await svc.updateAddress(req.user.id, req.params.id, req.body as any)
    return reply.send(address)
  })

  fastify.delete<{ Params: { id: string } }>('/me/addresses/:id', {
    preHandler: requireAuth,
  }, async (req, reply) => {
    await svc.deleteAddress(req.user.id, req.params.id)
    return reply.code(204).send()
  })

  // ══════════════════════════════════════════════════════════
  // ЗАМОВЛЕННЯ КОРИСТУВАЧА
  // ══════════════════════════════════════════════════════════

  fastify.get('/me/orders', {
    preHandler: requireAuth,
    schema: {
      querystring: z.object({
        page:  z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
      }),
    },
  }, async (req, reply) => {
    const orders = await svc.getOrders(req.user.id, req.query as any)
    return reply.send(orders)
  })

  // ══════════════════════════════════════════════════════════
  // WISHLIST
  // ══════════════════════════════════════════════════════════

  fastify.get('/me/wishlist', { preHandler: requireAuth }, async (req, reply) => {
    const wishlist = await svc.getWishlist(req.user.id)
    return reply.send(wishlist)
  })

  fastify.post('/me/wishlist', {
    preHandler: requireAuth,
    schema: {
      body: z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      }),
    },
  }, async (req, reply) => {
    const item = await svc.addToWishlist(req.user.id, req.body as any)
    return reply.code(201).send(item)
  })

  fastify.delete<{ Params: { productId: string } }>('/me/wishlist/:productId', {
    preHandler: requireAuth,
  }, async (req, reply) => {
    await svc.removeFromWishlist(req.user.id, req.params.productId)
    return reply.code(204).send()
  })

  // ── Публічний wishlist за share_token ─────────────────────
  fastify.get<{ Params: { token: string } }>('/wishlist/shared/:token', async (req, reply) => {
    const wishlist = await svc.getSharedWishlist(req.params.token)
    return reply.send(wishlist)
  })

  // ══════════════════════════════════════════════════════════
  // БОНУСИ / ЛОЯЛЬНІСТЬ (розширення на майбутнє)
  // ══════════════════════════════════════════════════════════

  fastify.get('/me/loyalty', { preHandler: requireAuth }, async (req, reply) => {
    const loyalty = await svc.getLoyalty(req.user.id)
    return reply.send(loyalty)
  })

  // ══════════════════════════════════════════════════════════
  // NOVA POSHTA (автодоповнення)
  // ══════════════════════════════════════════════════════════

  fastify.get('/np/cities', {
    schema: {
      querystring: z.object({ q: z.string().min(2) }),
    },
  }, async (req, reply) => {
    const cities = await svc.searchNpCities((req.query as any).q)
    return reply.send({ items: cities })
  })

  fastify.get('/np/branches', {
    schema: {
      querystring: z.object({ cityRef: z.string() }),
    },
  }, async (req, reply) => {
    const branches = await svc.getNpBranches((req.query as any).cityRef)
    return reply.send({ items: branches })
  })

  fastify.get('/np/lockers', {
    schema: {
      querystring: z.object({ cityRef: z.string() }),
    },
  }, async (req, reply) => {
    const lockers = await svc.getNpLockers((req.query as any).cityRef)
    return reply.send({ items: lockers })
  })
}
