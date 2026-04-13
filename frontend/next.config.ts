import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Дозволені домени для next/image
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'cdn.fpvshop.ua' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Internationalisation
  i18n: {
    locales: ['uk', 'en'],
    defaultLocale: 'uk',
  },

  // Redirects
  async redirects() {
    return [
      { source: '/catalog', destination: '/catalog/all', permanent: false },
    ]
  },

  // Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },

  // Env variables для клієнта
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fpvshop.ua',
    NEXT_PUBLIC_ALGOLIA_APP_ID: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? '',
    NEXT_PUBLIC_ALGOLIA_INDEX: process.env.NEXT_PUBLIC_ALGOLIA_INDEX ?? 'fpv_products',
  },

  // Experimental
  experimental: {
    optimizeCss: true,
  },
}

export default nextConfig
