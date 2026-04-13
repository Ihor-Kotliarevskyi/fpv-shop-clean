import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest('user', null)
})
