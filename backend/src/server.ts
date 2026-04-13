import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { config } from './config'
import { dbPlugin } from './plugins/db'
import { redisPlugin } from './plugins/redis'
import { authPlugin } from './plugins/auth'
import { productsRoutes } from './routes/products'
import { ordersRoutes } from './routes/orders'
import { cartRoutes } from './routes/cart'
import { usersRoutes } from './routes/users'
import { adminRoutes } from './routes/admin'
import { paymentsRoutes } from './routes/payments'
import { searchRoutes } from './routes/search'
import { reviewsRoutes } from './routes/reviews'
import { promotionsRoutes } from './routes/promotions'
import { uploadRoutes } from './routes/upload'
import { webhooksRoutes } from './routes/webhooks'

const app = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport: config.isDev ? { target: 'pino-pretty' } : undefined,
  },
  trustProxy: true,
})

async function buildApp() {
  // ── Security ──────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  await app.register(cors, {
    origin: config.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    skipOnError: false,
    keyGenerator: (req) => req.ip,
  })

  // ── Auth ──────────────────────────────────────────────────
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: '15m' },
  })

  // ── Plugins ───────────────────────────────────────────────
  await app.register(dbPlugin)
  await app.register(redisPlugin)
  await app.register(authPlugin)

  // ── Swagger (Dev only) ────────────────────────────────────
  if (config.isDev) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'FPV Drone Shop API',
          description: 'REST API для FPV інтернет-магазину',
          version: '1.0.0',
        },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
    })
    await app.register(swaggerUi, { routePrefix: '/docs' })
  }

  // ── Routes ────────────────────────────────────────────────
  await app.register(productsRoutes,   { prefix: '/api/v1/products' })
  await app.register(ordersRoutes,     { prefix: '/api/v1/orders' })
  await app.register(cartRoutes,       { prefix: '/api/v1/cart' })
  await app.register(usersRoutes,      { prefix: '/api/v1/users' })
  await app.register(adminRoutes,      { prefix: '/api/v1/admin' })
  await app.register(paymentsRoutes,   { prefix: '/api/v1/payments' })
  await app.register(searchRoutes,     { prefix: '/api/v1/search' })
  await app.register(reviewsRoutes,    { prefix: '/api/v1/reviews' })
  await app.register(promotionsRoutes, { prefix: '/api/v1/promotions' })
  await app.register(uploadRoutes,     { prefix: '/api/v1/upload' })
  await app.register(webhooksRoutes,   { prefix: '/api/v1/webhooks' })

  // ── Health ────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  }))

  return app
}

async function start() {
  const server = await buildApp()
  try {
    await server.listen({ port: config.PORT, host: '0.0.0.0' })
    server.log.info(`FPV Shop API running on port ${config.PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()

export { buildApp }
