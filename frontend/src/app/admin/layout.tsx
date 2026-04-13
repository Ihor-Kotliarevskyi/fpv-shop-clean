'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag,
  Star, FileText, Image, Settings, BarChart2, Warehouse,
  Truck, Gift, Megaphone, ChevronDown, Menu, X, Bell,
  TrendingUp, AlertTriangle, LogOut, ExternalLink
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

const SECTIONS = [
  {
    label: 'Головна',
    items: [
      { icon: LayoutDashboard, label: 'Дашборд',   href: '/admin' },
      { icon: BarChart2,       label: 'Аналітика', href: '/admin/analytics' },
    ],
  },
  {
    label: 'Каталог',
    items: [
      { icon: Package,    label: 'Товари',    href: '/admin/products' },
      { icon: Tag,        label: 'Категорії', href: '/admin/categories' },
      { icon: TrendingUp, label: 'Бренди',    href: '/admin/brands' },
    ],
  },
  {
    label: 'Продажі',
    items: [
      { icon: ShoppingCart, label: 'Замовлення',     href: '/admin/orders' },
      { icon: Users,        label: 'Клієнти',        href: '/admin/customers' },
      { icon: Gift,         label: 'Акції / Знижки', href: '/admin/promotions' },
    ],
  },
  {
    label: 'Склад',
    items: [
      { icon: Warehouse, label: 'Залишки',         href: '/admin/stock' },
      { icon: Truck,     label: 'Закупки',          href: '/admin/purchase-orders' },
    ],
  },
  {
    label: 'Контент',
    items: [
      { icon: Star,      label: 'Відгуки',   href: '/admin/reviews' },
      { icon: Image,     label: 'Банери',    href: '/admin/banners' },
      { icon: FileText,  label: 'Сторінки',  href: '/admin/pages' },
      { icon: Megaphone, label: 'Блог',      href: '/admin/blog' },
    ],
  },
  {
    label: 'Система',
    items: [
      { icon: Settings, label: 'Налаштування', href: '/admin/settings' },
    ],
  },
]

interface Props { children: React.ReactNode }

export default function AdminLayout({ children }: Props) {
  const pathname = usePathname()
  const { user, logout, isInitialized } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebar, setMobileSidebar] = useState(false)

  if (!isInitialized || !user) return null

  const Sidebar = ({ mobile = false }) => (
    <aside className={cn(
      'flex flex-col bg-card border-r border-border h-screen overflow-y-auto no-scrollbar',
      mobile ? 'w-64' : sidebarOpen ? 'w-64' : 'w-16',
      'transition-all duration-300'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-border h-16 flex-shrink-0">
        <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center flex-shrink-0">
          <span className="font-display font-black text-primary-foreground text-xs">FPV</span>
        </div>
        {(mobile || sidebarOpen) && (
          <div>
            <p className="font-display font-bold text-sm">FPV SHOP</p>
            <p className="text-xs text-muted-foreground">Адмінпанель</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {SECTIONS.map(section => (
          <div key={section.label}>
            {(mobile || sidebarOpen) && (
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider px-2 mb-1">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const isActive = pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileSidebar(false)}
                    className={cn(
                      'admin-nav-item',
                      isActive && 'active',
                      !mobile && !sidebarOpen && 'justify-center px-2'
                    )}
                    title={!sidebarOpen && !mobile ? item.label : undefined}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {(mobile || sidebarOpen) && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: user info */}
      <div className="p-3 border-t border-border space-y-1 flex-shrink-0">
        <Link
          href="/"
          target="_blank"
          className={cn('admin-nav-item', !mobile && !sidebarOpen && 'justify-center px-2')}
        >
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          {(mobile || sidebarOpen) && <span>Магазин</span>}
        </Link>
        <button
          onClick={logout}
          className={cn('admin-nav-item w-full text-destructive hover:text-destructive hover:bg-destructive/10',
            !mobile && !sidebarOpen && 'justify-center px-2'
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(mobile || sidebarOpen) && <span>Вийти</span>}
        </button>
        {(mobile || sidebarOpen) && user && (
          <div className="px-2 py-2 text-xs text-muted-foreground border-t border-border mt-1 pt-2">
            <p className="font-medium text-foreground truncate">{user.firstName} {user.lastName}</p>
            <p className="truncate">{user.email}</p>
            <p className="text-primary capitalize">{user.role}</p>
          </div>
        )}
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebar(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 z-50 lg:hidden"
            >
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Admin topbar */}
        <header className="h-16 border-b border-border bg-card flex items-center gap-4 px-4 flex-shrink-0">
          {/* Sidebar toggle */}
          <button
            onClick={() => sidebarOpen ? setSidebarOpen(false) : setSidebarOpen(true)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileSidebar(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Page title — filled by children via context or portal */}
          <div id="admin-page-title" className="flex-1" />

          {/* Alerts */}
          <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
