import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  NODE_ENV:          z.enum(['development', 'production', 'test']).default('development'),
  PORT:              z.coerce.number().default(4000),
  LOG_LEVEL:         z.enum(['trace','debug','info','warn','error']).default('info'),

  // Database
  DATABASE_URL:      z.string(),

  // Redis
  REDIS_URL:         z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET:        z.string().min(32),
  JWT_REFRESH_SECRET:z.string().min(32),

  // CORS
  ALLOWED_ORIGINS:   z.string().default('http://localhost:3000'),

  // File storage (Supabase Storage / S3-compatible)
  STORAGE_URL:       z.string(),
  STORAGE_BUCKET:    z.string().default('fpv-shop'),
  STORAGE_KEY:       z.string(),
  STORAGE_SECRET:    z.string(),

  // Payments
  WAYFORPAY_MERCHANT_ACCOUNT: z.string(),
  WAYFORPAY_MERCHANT_KEY:     z.string(),
  WAYFORPAY_DOMAIN:           z.string().default('fpvshop.ua'),

  LIQPAY_PUBLIC_KEY:  z.string().optional(),
  LIQPAY_PRIVATE_KEY: z.string().optional(),

  // Nova Poshta
  NOVA_POSHTA_API_KEY: z.string(),
  NOVA_POSHTA_SENDER_REF: z.string(),

  // Email (SMTP)
  SMTP_HOST:     z.string().default('smtp.gmail.com'),
  SMTP_PORT:     z.coerce.number().default(587),
  SMTP_USER:     z.string(),
  SMTP_PASS:     z.string(),
  EMAIL_FROM:    z.string().default('FPV Shop <noreply@fpvshop.ua>'),

  // Algolia Search
  ALGOLIA_APP_ID:    z.string(),
  ALGOLIA_API_KEY:   z.string(),
  ALGOLIA_INDEX:     z.string().default('fpv_products'),

  // ПРРО (Checkbox)
  CHECKBOX_API_KEY:  z.string().optional(),
  CHECKBOX_CASHIER_PIN: z.string().optional(),

  // Frontend URL (for emails, redirects)
  FRONTEND_URL:  z.string().default('https://fpvshop.ua'),

  // Admin panel
  ADMIN_URL:     z.string().default('https://admin.fpvshop.ua'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = {
  ...parsed.data,
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',
}

export type Config = typeof config
