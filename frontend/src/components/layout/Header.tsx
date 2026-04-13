'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, Search, User, Heart, Menu, X,
  ChevronDown, Bell, LogOut, Settings, Package, ListOrdered
} from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import { SearchModal } from '@/components/ui/SearchModal'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  {
    label: 'Каталог',
    href: '/catalog',
    children: [
      { label: 'Готові дрони', href: '/catalog/ready-to-fly', icon: '🚁' },
      { label: 'Рами', href: '/catalog/frames', icon: '🔲' },
      { label: 'Польотні контролери', href: '/catalog/flight-controllers', icon: '🖥️' },
      { label: 'ESC', href: '/catalog/esc', icon: '⚡' },
      { label: 'Мотори', href: '/catalog/motors', icon: '🔄' },
      { label: 'Пропелери', href: '/catalog/propellers', icon: '🌀' },
      { label: 'Камери FPV', href: '/catalog/cameras', icon: '📷' },
      { label: 'Відеопередавачі (VTX)', href: '/catalog/vtx', icon: '📡' },
      { label: 'Приймачі', href: '/catalog/receivers', icon: '📶' },
      { label: 'Акумулятори LiPo', href: '/catalog/batteries', icon: '🔋' },
      { label: 'Зарядні пристрої', href: '/catalog/chargers', icon: '🔌' },
      { label: 'FPV Окуляри', href: '/catalog/goggles', icon: '🥽' },
      { label: 'Пульти', href: '/catalog/radios', icon: '🎮' },
      { label: 'Антени', href: '/catalog/antennas', icon: '📻' },
      { label: 'Аксесуари', href: '/catalog/accessories', icon: '🔧' },
    ],
  },
  { label: 'Акції', href: '/promotions' },
  { label: 'Новинки', href: '/catalog?new=true' },
  { label: 'Блог', href: '/blog' },
  { label: 'Контакти', href: '/contacts' },
]

export function Header() {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const itemCount = useCartStore(s => s.itemCount)
  const { user, logout } = useAuthStore()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setCatalogOpen(false)
  }, [pathname])

  // Keyboard shortcut: Cmd/Ctrl+K для пошуку
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-lg shadow-black/20'
          : 'bg-background border-b border-border/50'
      )}>
        {/* ── Top bar ──────────────────────────────── */}
        <div className="border-b border-border/30 bg-carbon text-xs text-muted-foreground">
          <div className="container mx-auto px-4 flex items-center justify-between h-8">
            <span>🇺🇦 Доставка по всій Україні · Нова Пошта</span>
            <div className="flex gap-4">
              <a href="tel:+380991234567" className="hover:text-primary transition-colors">
                +38 (099) 123-45-67
              </a>
              <a href="/pages/guarantee" className="hover:text-primary transition-colors hidden sm:inline">
                Гарантія та повернення
              </a>
            </div>
          </div>
        </div>

        {/* ── Main header ──────────────────────────── */}
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                <span className="font-display font-black text-primary-foreground text-xs">FPV</span>
              </div>
              <span className="font-display font-bold text-lg hidden sm:block">
                DRONE<span className="text-primary">SHOP</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 ml-4">
              {NAV_LINKS.map(link => (
                link.children ? (
                  <div key={link.label} className="relative group">
                    <button
                      className={cn(
                        'flex items-center gap-1 px-3 py-2 text-sm rounded-md transition-colors',
                        'hover:text-primary hover:bg-secondary',
                        pathname.startsWith('/catalog') ? 'text-primary' : 'text-foreground/80'
                      )}
                      onClick={() => setCatalogOpen(!catalogOpen)}
                    >
                      {link.label}
                      <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
                    </button>

                    {/* Mega menu */}
                    <div className="absolute top-full left-0 w-[640px] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                      <div className="mt-2 bg-card border border-border rounded-xl shadow-2xl p-4">
                        <div className="grid grid-cols-3 gap-1">
                          {link.children.map(child => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary hover:text-primary transition-colors"
                            >
                              <span className="text-base">{child.icon}</span>
                              <span>{child.label}</span>
                            </Link>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-border">
                          <Link
                            href="/catalog"
                            className="text-sm text-primary hover:underline font-medium"
                          >
                            Всі категорії →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={cn(
                      'px-3 py-2 text-sm rounded-md transition-colors',
                      'hover:text-primary hover:bg-secondary',
                      pathname === link.href ? 'text-primary' : 'text-foreground/80'
                    )}
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Actions */}
            <div className="flex items-center gap-1">

              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground bg-secondary rounded-lg transition-colors"
                aria-label="Пошук"
              >
                <Search className="w-4 h-4" />
                <span className="hidden md:inline">Пошук...</span>
                <kbd className="hidden md:inline text-xs bg-muted rounded px-1">⌘K</kbd>
              </button>

              {/* Wishlist */}
              <Link
                href="/account/wishlist"
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Обране"
              >
                <Heart className="w-5 h-5" />
              </Link>

              {/* Auth */}
              {user ? (
                <div className="relative group">
                  <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <User className="w-5 h-5" />
                  </button>
                  <div className="absolute top-full right-0 w-52 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                    <div className="mt-2 bg-card border border-border rounded-xl shadow-2xl py-2 overflow-hidden">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Link href="/account" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                        <User className="w-4 h-4" /> Кабінет
                      </Link>
                      <Link href="/account/orders" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                        <ListOrdered className="w-4 h-4" /> Замовлення
                      </Link>
                      <Link href="/account/wishlist" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                        <Heart className="w-4 h-4" /> Обране
                      </Link>
                      {(user.role === 'admin' || user.role === 'manager' || user.role === 'super_admin') && (
                        <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors text-primary">
                          <Settings className="w-4 h-4" /> Адмінпанель
                        </Link>
                      )}
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors text-destructive"
                      >
                        <LogOut className="w-4 h-4" /> Вийти
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Увійти"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}

              {/* Cart */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Кошик (${itemCount} товарів)`}
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center"
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </motion.span>
                )}
              </button>

              {/* Mobile menu */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Меню"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden border-t border-border overflow-hidden"
            >
              <nav className="container mx-auto px-4 py-4 space-y-1">
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Modals */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer  open={cartOpen}  onClose={() => setCartOpen(false)} />
    </>
  )
}
