import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

export class AuthService {
  constructor(private readonly fastify: FastifyInstance) {}

  async register(data: any) {
    const exists = await this.fastify.db.user.findUnique({ where: { email: data.email } })
    if (exists) throw new Error('Email вже зареєстровано')
    const passwordHash = await bcrypt.hash(data.password, 12)
    const user = await this.fastify.db.user.create({
      data: { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName, phone: data.phone, newsletter: data.newsletter ?? false },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })
    const tokens = this.generateTokens(user)
    await this.saveRefreshToken(user.id, tokens.refreshToken)
    return { user, ...tokens }
  }

  async login(email: string, password: string) {
    const user = await this.fastify.db.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) throw new Error('Невірний email або пароль')
    if (!user.isActive) throw new Error('Акаунт заблоковано')
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new Error('Невірний email або пароль')
    await this.fastify.db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const safeUser = { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }
    const tokens = this.generateTokens(safeUser)
    await this.saveRefreshToken(user.id, tokens.refreshToken)
    return { user: safeUser, ...tokens }
  }

  async refreshTokens(refreshToken: string) {
    const session = await this.fastify.db.userSession.findFirst({ where: { refreshToken, expiresAt: { gt: new Date() } } })
    if (!session) throw new Error('Invalid refresh token')
    const user = await this.fastify.db.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true, firstName: true, lastName: true, role: true } })
    if (!user) throw new Error('User not found')
    await this.fastify.db.userSession.delete({ where: { id: session.id } })
    const tokens = this.generateTokens(user)
    await this.saveRefreshToken(user.id, tokens.refreshToken)
    return { user, ...tokens }
  }

  async logout(userId: string, data: any) {
    if (data?.refreshToken) {
      await this.fastify.db.userSession.deleteMany({ where: { userId, refreshToken: data.refreshToken } })
    }
  }

  async sendPasswordReset(email: string) {
    const user = await this.fastify.db.user.findUnique({ where: { email } })
    if (!user) return // silent fail
    const token = nanoid(32)
    await this.fastify.db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
    })
    // TODO: send email with reset link
  }

  async resetPassword(token: string, password: string) {
    const record = await this.fastify.db.passwordResetToken.findFirst({ where: { token, expiresAt: { gt: new Date() }, usedAt: null } })
    if (!record) throw new Error('Token is invalid or expired')
    const passwordHash = await bcrypt.hash(password, 12)
    await this.fastify.db.user.update({ where: { id: record.userId }, data: { passwordHash } })
    await this.fastify.db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  }

  async verifyEmail(token: string) {
    // implement email verification
  }

  private generateTokens(user: any) {
    const accessToken = this.fastify.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '15m' })
    const refreshToken = nanoid(64)
    return { accessToken, refreshToken }
  }

  private async saveRefreshToken(userId: string, token: string) {
    await this.fastify.db.userSession.create({
      data: { userId, refreshToken: token, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
    })
  }
}
