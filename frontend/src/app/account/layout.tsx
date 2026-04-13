'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { User, ListOrdered, Heart, MapPin, GitCompare, Bell } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/account', label: 'Профіль', icon: User, exact: true },
  { href: '/account/orders', label: 'Замовлення', icon: ListOrdered },
  { href: '/account/wishlist', label: 'Обране', icon: Heart },
  { href: '/account/addresses', label: 'Адреси', icon: MapPin },
  { href: '/account/compare', label: 'Порівняння', icon: GitCompare },
  { href: '/account/notifications', label: 'Сповіщення', icon: Bell },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isInitialized && !user) router.push('/auth/login?redirect=/account')
  }, [isInitialized, user, router])
  if (!isInitialized || !user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-6">
        <aside className="w-56 flex-shrink-0 hidden md:block">
          <div className="bg-card border border-border rounded-lg p-4 mb-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" alt="avatar" /> : <span className="font-display font-bold text-primary text-xl">{user.firstName?.[0]}{user.lastName?.[0]}</span>}
            </div>
            <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <nav className="space-y-0.5">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href)
              return (
                <Link key={href} href={href} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors', active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')}>
                  <Icon className="w-4 h-4 flex-shrink-0" /> {label}
                </Link>
              )
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
