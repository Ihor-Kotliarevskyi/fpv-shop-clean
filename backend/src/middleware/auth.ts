import type { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

export async function optionalAuth(req: FastifyRequest) {
  try { await req.jwtVerify() } catch {}
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
    const user = req.user as any
    if (!['admin','manager','super_admin'].includes(user?.role)) {
      reply.code(403).send({ error: 'Forbidden' })
    }
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

export async function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
    const user = req.user as any
    if (!['super_admin'].includes(user?.role)) {
      reply.code(403).send({ error: 'Forbidden — super_admin only' })
    }
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}
