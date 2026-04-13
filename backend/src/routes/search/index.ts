import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: { querystring: z.object({ q: z.string().min(1), limit: z.coerce.number().default(10) }) },
  }, async (req, reply) => {
    const { q, limit } = req.query as any
    // Try Algolia first, fallback to PostgreSQL FTS
    try {
      const { algoliasearch } = await import('algoliasearch')
      const client = algoliasearch(fastify.config.ALGOLIA_APP_ID, fastify.config.ALGOLIA_API_KEY)
      const index = client.initIndex(fastify.config.ALGOLIA_INDEX)
      const { hits } = await index.search(q, { hitsPerPage: limit })
      return reply.send({ items: hits, source: 'algolia' })
    } catch {
      // Fallback to PostgreSQL FTS
      const items = await fastify.db.$queryRaw`
        SELECT id, name, slug, price, thumbnail_url, rating_avg
        FROM products
        WHERE is_active = true
          AND search_vector @@ plainto_tsquery('ukrainian', ${q})
        ORDER BY ts_rank(search_vector, plainto_tsquery('ukrainian', ${q})) DESC
        LIMIT ${limit}`
      return reply.send({ items, source: 'postgres' })
    }
  })

  fastify.get('/suggestions', {
    schema: { querystring: z.object({ q: z.string().min(2) }) },
  }, async (req, reply) => {
    const { q } = req.query as any
    const items = await fastify.db.product.findMany({
      where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
      take: 5, select: { id: true, name: true, slug: true, thumbnailUrl: true, price: true },
    })
    return reply.send({ items })
  })
}
