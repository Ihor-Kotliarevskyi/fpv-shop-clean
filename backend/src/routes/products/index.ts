import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ProductService } from '../services/product.service'
import { requireAuth, requireAdmin } from '../middleware/auth'

const ProductFilterSchema = z.object({
  q:          z.string().optional(),
  category:   z.string().optional(),
  brand:      z.string().optional().transform(v => v?.split(',')),
  minPrice:   z.coerce.number().optional(),
  maxPrice:   z.coerce.number().optional(),
  inStock:    z.coerce.boolean().optional(),
  rating:     z.coerce.number().min(1).max(5).optional(),
  tags:       z.string().optional().transform(v => v?.split(',')),
  // FPV специфічні фільтри через specs
  cellCount:  z.string().optional(),  // 3S,4S,6S
  frameSize:  z.string().optional(),  // 3inch,5inch
  kv:         z.string().optional(),  // діапазон KV мотора
  power:      z.string().optional(),  // потужність VTX
  // Сортування
  sort:       z.enum(['price_asc','price_desc','rating','newest','popular']).default('popular'),
  page:       z.coerce.number().min(1).default(1),
  limit:      z.coerce.number().min(1).max(100).default(24),
  featured:   z.coerce.boolean().optional(),
  isNew:      z.coerce.boolean().optional(),
  isBestseller: z.coerce.boolean().optional(),
})

const ProductCreateSchema = z.object({
  categoryId:   z.string().uuid(),
  brandId:      z.string().uuid().optional(),
  name:         z.string().min(3).max(300),
  nameUa:       z.string().optional(),
  skuBase:      z.string().optional(),
  shortDesc:    z.string().max(500).optional(),
  description:  z.string().optional(),
  features:     z.array(z.string()).default([]),
  inBox:        z.array(z.string()).default([]),
  compatibility: z.array(z.string()).default([]),
  price:        z.number().positive(),
  comparePrice: z.number().positive().optional(),
  costPrice:    z.number().positive().optional(),
  thumbnailUrl: z.string().url().optional(),
  images:       z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    sortOrder: z.number().default(0),
  })).default([]),
  videoUrl:     z.string().url().optional(),
  specs:        z.record(z.unknown()).default({}),
  tags:         z.array(z.string()).default([]),
  metaTitle:    z.string().max(255).optional(),
  metaDesc:     z.string().max(500).optional(),
  isActive:     z.boolean().default(false),
  variants:     z.array(z.object({
    sku:        z.string(),
    attributes: z.record(z.string()),
    price:      z.number().positive().optional(),
    stock:      z.number().int().min(0).default(0),
    weightG:    z.number().optional(),
    imageUrl:   z.string().url().optional(),
  })).optional(),
})

export async function productsRoutes(fastify: FastifyInstance) {
  const svc = new ProductService(fastify)

  // ── GET /products ─────────────────────────────────────────
  fastify.get('/', {
    schema: {
      description: 'Каталог товарів із фільтрацією та пагінацією',
      tags: ['Products'],
      querystring: ProductFilterSchema,
    },
  }, async (req, reply) => {
    const filters = ProductFilterSchema.parse(req.query)
    const result = await svc.findAll(filters)
    return reply.send(result)
  })

  // ── GET /products/featured ────────────────────────────────
  fastify.get('/featured', async (req, reply) => {
    const products = await svc.findFeatured(12)
    return reply.send({ items: products })
  })

  // ── GET /products/new-arrivals ────────────────────────────
  fastify.get('/new-arrivals', async (req, reply) => {
    const products = await svc.findNew(12)
    return reply.send({ items: products })
  })

  // ── GET /products/bestsellers ─────────────────────────────
  fastify.get('/bestsellers', async (req, reply) => {
    const products = await svc.findBestsellers(12)
    return reply.send({ items: products })
  })

  // ── GET /products/:slug ───────────────────────────────────
  fastify.get<{ Params: { slug: string } }>('/:slug', async (req, reply) => {
    const product = await svc.findBySlug(req.params.slug)
    if (!product) return reply.code(404).send({ error: 'Товар не знайдено' })

    // Записуємо перегляд
    await svc.recordView(product.id, req.ip)

    return reply.send(product)
  })

  // ── GET /products/:slug/related ───────────────────────────
  fastify.get<{ Params: { slug: string } }>('/:slug/related', async (req, reply) => {
    const related = await svc.findRelated(req.params.slug, 8)
    return reply.send({ items: related })
  })

  // ── GET /products/:slug/accessories ──────────────────────
  fastify.get<{ Params: { slug: string } }>('/:slug/accessories', async (req, reply) => {
    const accessories = await svc.findAccessories(req.params.slug, 8)
    return reply.send({ items: accessories })
  })

  // ── GET /products/:slug/reviews ───────────────────────────
  fastify.get<{ Params: { slug: string }; Querystring: { page?: number; sort?: string } }>(
    '/:slug/reviews',
    async (req, reply) => {
      const { page = 1, sort = 'newest' } = req.query
      const reviews = await svc.findReviews(req.params.slug, page, sort)
      return reply.send(reviews)
    }
  )

  // ── POST /products/:slug/review ───────────────────────────
  fastify.post<{ Params: { slug: string } }>('/:slug/review', {
    preHandler: requireAuth,
    schema: {
      body: z.object({
        rating:   z.number().int().min(1).max(5),
        title:    z.string().max(200).optional(),
        body:     z.string().min(10).max(3000),
        pros:     z.array(z.string()).optional(),
        cons:     z.array(z.string()).optional(),
        photos:   z.array(z.string().url()).optional(),
      }),
    },
  }, async (req, reply) => {
    const review = await svc.createReview(req.params.slug, req.user.id, req.body as any)
    return reply.code(201).send(review)
  })

  // ── GET /products/compare?ids=a,b,c ──────────────────────
  fastify.get<{ Querystring: { ids: string } }>('/compare', async (req, reply) => {
    const ids = req.query.ids?.split(',').slice(0, 4)
    if (!ids?.length) return reply.code(400).send({ error: 'ids обов\'язковий параметр' })
    const products = await svc.findForCompare(ids)
    return reply.send({ items: products })
  })

  // ────────────────────────────────────────────────────────
  // ADMIN ROUTES
  // ────────────────────────────────────────────────────────

  // ── POST /products (admin) ────────────────────────────────
  fastify.post('/', {
    preHandler: requireAdmin,
    schema: { body: ProductCreateSchema },
  }, async (req, reply) => {
    const product = await svc.create(ProductCreateSchema.parse(req.body))
    return reply.code(201).send(product)
  })

  // ── PATCH /products/:id (admin) ───────────────────────────
  fastify.patch<{ Params: { id: string } }>('/:id', {
    preHandler: requireAdmin,
  }, async (req, reply) => {
    const product = await svc.update(req.params.id, req.body as any)
    return reply.send(product)
  })

  // ── DELETE /products/:id (admin) ─────────────────────────
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: requireAdmin,
  }, async (req, reply) => {
    await svc.softDelete(req.params.id)
    return reply.code(204).send()
  })

  // ── POST /products/:id/variants (admin) ───────────────────
  fastify.post<{ Params: { id: string } }>('/:id/variants', {
    preHandler: requireAdmin,
  }, async (req, reply) => {
    const variant = await svc.addVariant(req.params.id, req.body as any)
    return reply.code(201).send(variant)
  })

  // ── PATCH /products/:id/variants/:variantId (admin) ───────
  fastify.patch<{ Params: { id: string; variantId: string } }>(
    '/:id/variants/:variantId', {
      preHandler: requireAdmin,
    }, async (req, reply) => {
      const variant = await svc.updateVariant(req.params.variantId, req.body as any)
      return reply.send(variant)
    }
  )

  // ── POST /products/:id/publish (admin) ────────────────────
  fastify.post<{ Params: { id: string } }>('/:id/publish', {
    preHandler: requireAdmin,
  }, async (req, reply) => {
    const product = await svc.publish(req.params.id)
    return reply.send(product)
  })

  // ── POST /products/bulk (admin) ───────────────────────────
  fastify.post('/bulk', {
    preHandler: requireAdmin,
    schema: {
      description: 'Масове оновлення (активація, знижки, теги)',
      body: z.object({
        ids:    z.array(z.string().uuid()),
        action: z.enum(['activate','deactivate','set_featured','remove_featured','delete']),
        value:  z.unknown().optional(),
      }),
    },
  }, async (req, reply) => {
    const { ids, action, value } = req.body as any
    const result = await svc.bulkAction(ids, action, value)
    return reply.send(result)
  })
}
