import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance { db: PrismaClient }
}

export const dbPlugin = fp(async (fastify: FastifyInstance) => {
  const prisma = new PrismaClient({
    log: fastify.config?.isDev ? ['query','error'] : ['error'],
  })
  await prisma.$connect()
  fastify.decorate('db', prisma)
  fastify.addHook('onClose', async () => { await prisma.$disconnect() })
})
