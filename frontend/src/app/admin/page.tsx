'use client'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, ShoppingCart, Users, Package, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-supabase'],
    queryFn: async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [ordersRes, usersRes, lowStockRes, topRes] = await Promise.all([
        supabase.from('orders').select('id,total,order_number,recipient_name,created_at', { count: 'exact' }).gte('created_at', todayStart.toISOString()).order('created_at', { ascending: false }).limit(5),
        supabase.from('users').select('id', { count: 'exact' }).gte('created_at', todayStart.toISOString()),
        supabase.from('product_variants').select('id,sku,stock_quantity,products(name)').lte('stock_quantity', 3).order('stock_quantity', { ascending: true }).limit(8),
        supabase.from('products').select('id,name,order_count').order('order_count', { ascending: false }).limit(5),
      ])

      const revenueToday = (ordersRes.data ?? []).reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0)

      return {
        summary: {
          revenueToday,
          ordersToday: ordersRes.count ?? 0,
          newCustomersToday: usersRes.count ?? 0,
          lowStockCount: lowStockRes.data?.length ?? 0,
          revenueTodayChange: null,
          ordersTodayChange: null,
        },
        recentOrders: ordersRes.data ?? [],
        lowStock: lowStockRes.data ?? [],
        topProducts: topRes.data ?? [],
      }
    },
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-secondary rounded-lg" />)}</div>
    </div>
  )

  const { summary, recentOrders, lowStock } = data ?? {}

  type KpiCard = {
    label: string
    value: string | number
    change?: number | null
    icon: any
    color: string
  }

  const kpis: KpiCard[] = [
    { label: 'Revenue today', value: formatPrice(summary?.revenueToday ?? 0), change: summary?.revenueTodayChange, icon: TrendingUp, color: 'text-neon-green' },
    { label: 'Orders today', value: summary?.ordersToday ?? 0, change: summary?.ordersTodayChange, icon: ShoppingCart, color: 'text-primary' },
    { label: 'New customers', value: summary?.newCustomersToday ?? 0, icon: Users, color: 'text-neon-cyan' },
    { label: 'Low stock', value: summary?.lowStockCount ?? 0, icon: Package, color: 'text-yellow-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(card => (
          <div key={card.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2"><p className="text-xs text-muted-foreground">{card.label}</p><card.icon className={cn('w-4 h-4', card.color)} /></div>
            <p className="text-2xl font-display font-bold">{card.value}</p>
            {card.change != null && <p className={cn('text-xs mt-1', card.change >= 0 ? 'text-neon-green' : 'text-destructive')}>{card.change >= 0 ? '↑' : '↓'} {Math.abs(card.change)}% vs yesterday</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Recent orders</h3><Link href="/admin/orders" className="text-xs text-primary hover:underline flex items-center gap-1">All <ArrowRight className="w-3 h-3" /></Link></div>
          <div className="space-y-2">
            {recentOrders?.map((order: any) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors">
                <div><p className="text-sm font-medium">{order.order_number}</p><p className="text-xs text-muted-foreground">{order.recipient_name}</p></div>
                <p className="text-sm font-semibold">{formatPrice(order.total)}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" />Low stock</h3><Link href="/admin/stock" className="text-xs text-primary hover:underline flex items-center gap-1">Stock <ArrowRight className="w-3 h-3" /></Link></div>
          <div className="space-y-2">
            {lowStock?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                <div><p className="text-sm font-medium">{item.products?.name}</p><p className="text-xs text-muted-foreground font-mono">{item.sku}</p></div>
                <span className={cn('text-xs font-bold px-2 py-1 rounded', item.stock_quantity === 0 ? 'bg-destructive/10 text-destructive' : 'bg-yellow-500/10 text-yellow-500')}>{item.stock_quantity} pcs</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
