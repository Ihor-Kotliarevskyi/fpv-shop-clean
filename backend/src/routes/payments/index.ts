import type { FastifyInstance } from 'fastify'
import crypto from 'crypto'

export async function paymentsRoutes(fastify: FastifyInstance) {
  // WayForPay webhook
  fastify.post('/wayforpay', async (req, reply) => {
    const body = req.body as any
    // Verify HMAC signature
    const signString = [body.merchantAccount, body.orderReference, body.amount, body.currency,
      body.authCode, body.cardPan, body.transactionStatus, body.reasonCode].join(';')
    const expectedSig = crypto.createHmac('md5', fastify.config.WAYFORPAY_MERCHANT_KEY).update(signString).digest('hex')
    if (expectedSig !== body.merchantSignature) {
      return reply.code(400).send({ error: 'Invalid signature' })
    }
    if (body.transactionStatus === 'Approved') {
      await fastify.db.order.updateMany({
        where: { id: body.orderReference },
        data: { paymentStatus: 'paid', paymentId: body.transactionId, paidAt: new Date() },
      })
    }
    return reply.send({ orderReference: body.orderReference, status: 'accept', time: Math.floor(Date.now() / 1000), signature: '' })
  })

  // LiqPay webhook
  fastify.post('/liqpay', async (req, reply) => {
    const body = req.body as any
    const data = Buffer.from(body.data, 'base64').toString('utf8')
    const parsed = JSON.parse(data)
    if (parsed.status === 'success' || parsed.status === 'sandbox') {
      await fastify.db.order.updateMany({
        where: { id: parsed.order_id },
        data: { paymentStatus: 'paid', paymentId: parsed.payment_id, paidAt: new Date() },
      })
    }
    return reply.send('ok')
  })
}
