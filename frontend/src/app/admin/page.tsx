'use client'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, ShoppingCart, Users, Package, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatPrice, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i) => <div key={i} className="h-28 bg-secondary rounded-lg"/>)}</div>
    </div>
  )

  const { summary, recentOrders, lowStock, topProducts } = data ?? {}

  const kpis = [
    { label: 'Дохід сьогодні', value: formatPrice(summary?.revenueToday ?? 0), change: summary?.revenueTodayChange, icon: TrendingUp, color: 'text-neon-green' },
    { label: 'Замовлень', value: summary?.ordersToday ?? 0, change: summary?.ordersTodayChange, icon: ShoppingCart, color: 'text-primary' },
    { label: 'Нових клієнтів', value: summary?.newCustomersToday ?? 0, icon: Users, color: 'text-neon-cyan' },
    { label: 'Мало залишку', value: summary?.lowStockCount ?? 0, icon: Package, color: 'text-yellow-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold">Дашборд</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(card => (
          <div key={card.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2"><p className="text-xs text-muted-foreground">{card.label}</p><card.icon className={cn('w-4 h-4', card.color)} /></div>
            <p className="text-2xl font-display font-bold">{card.value}</p>
            {card.change != null && <p className={cn('text-xs mt-1', card.change >= 0 ? 'text-neon-green' : 'text-destructive')}>{card.change >= 0 ? '↑' : '↓'} {Math.abs(card.change)}% vs вчора</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Останні замовлення</h3><Link href="/admin/orders" className="text-xs text-primary hover:underline flex items-center gap-1">Всі <ArrowRight className="w-3 h-3"/></Link></div>
          <div className="space-y-2">
            {recentOrders?.map((order: any) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors">
                <div><p className="text-sm font-medium">{order.orderNumber}</p><p className="text-xs text-muted-foreground">{order.recipientName}</p></div>
                <p className="text-sm font-semibold">{formatPrice(order.total)}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500"/>Мало залишку</h3><Link href="/admin/stock" className="text-xs text-primary hover:underline flex items-center gap-1">Склад <ArrowRight className="w-3 h-3"/></Link></div>
          <div className="space-y-2">
            {lowStock?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                <div><p className="text-sm font-medium">{item.product?.name}</p><p className="text-xs text-muted-foreground font-mono">{item.sku}</p></div>
                <span className={cn('text-xs font-bold px-2 py-1 rounded', item.stockQuantity === 0 ? 'bg-destructive/10 text-destructive' : 'bg-yellow-500/10 text-yellow-500')}>{item.stockQuantity} шт.</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
