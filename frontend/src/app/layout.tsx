import type { Metadata } from 'next'
import { Orbitron, Space_Grotesk } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { CartProvider } from '@/components/providers/CartProvider'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import '@/styles/globals.css'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans' })
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-display', weight: ['400','700','900'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://fpvshop.ua'),
  title: { default: 'FPV DRONE SHOP — Дрони та комплектуючі', template: '%s | FPV DRONE SHOP' },
  description: 'FPV дрони для спорту та freestyle. Рами, мотори, ESC, LiPo, окуляри. Доставка по Україні.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" suppressHydrationWarning className={`${spaceGrotesk.variable} ${orbitron.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            <AuthProvider>
              <CartProvider>
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
                <Toaster position="bottom-right" richColors />
              </CartProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
