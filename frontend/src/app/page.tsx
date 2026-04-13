import type { Metadata } from 'next'
import { HeroBanner } from '@/components/home/HeroBanner'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { FeaturedProducts } from '@/components/home/FeaturedProducts'
import { ActivePromotion } from '@/components/home/ActivePromotion'
import { NewArrivals } from '@/components/home/NewArrivals'
import { Bestsellers } from '@/components/home/Bestsellers'
import { BrandStrip } from '@/components/home/BrandStrip'
import { WhyUs } from '@/components/home/WhyUs'
import { BlogPreview } from '@/components/home/BlogPreview'

export const metadata: Metadata = {
  title: 'FPV DRONE SHOP — Дрони та комплектуючі для FPV в Україні',
  description: 'Найбільший вибір FPV дронів, рам, моторів, ESC, LiPo, окулярів та пультів. Доставка Новою Поштою по Україні.',
}

export default function HomePage() {
  return (
    <>
      {/* ── Hero ────────────────────────────────────── */}
      <HeroBanner />

      <div className="container mx-auto px-4 space-y-16 py-12">

        {/* ── Категорії ───────────────────────────── */}
        <section>
          <div className="section-header">
            <h2 className="text-2xl font-display font-bold">Категорії</h2>
          </div>
          <CategoryGrid />
        </section>

        {/* ── Активна акція ───────────────────────── */}
        <ActivePromotion />

        {/* ── Рекомендовані ───────────────────────── */}
        <section>
          <div className="section-header">
            <h2 className="text-2xl font-display font-bold">Топ підбірка</h2>
            <a href="/catalog?featured=true" className="ml-auto text-sm text-primary hover:underline">
              Всі товари →
            </a>
          </div>
          <FeaturedProducts />
        </section>

        {/* ── Хіти продажів ───────────────────────── */}
        <section>
          <div className="section-header">
            <h2 className="text-2xl font-display font-bold">Хіти продажів</h2>
            <a href="/catalog?bestseller=true" className="ml-auto text-sm text-primary hover:underline">
              Переглянути всі →
            </a>
          </div>
          <Bestsellers />
        </section>

        {/* ── Нові надходження ────────────────────── */}
        <section>
          <div className="section-header">
            <h2 className="text-2xl font-display font-bold">Нові надходження</h2>
            <span className="ml-2 px-2 py-0.5 text-xs bg-neon-green/10 text-neon-green border border-neon-green/30 rounded">
              NEW
            </span>
            <a href="/catalog?new=true" className="ml-auto text-sm text-primary hover:underline">
              Всі новинки →
            </a>
          </div>
          <NewArrivals />
        </section>

        {/* ── Чому ми ─────────────────────────────── */}
        <WhyUs />

        {/* ── Бренди ──────────────────────────────── */}
        <BrandStrip />

        {/* ── Блог / Статті ───────────────────────── */}
        <section>
          <div className="section-header">
            <h2 className="text-2xl font-display font-bold">Гайди та новини</h2>
            <a href="/blog" className="ml-auto text-sm text-primary hover:underline">
              Всі статті →
            </a>
          </div>
          <BlogPreview />
        </section>

      </div>
    </>
  )
}
