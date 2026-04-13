'use client'
import { useQuery } from '@tanstack/react-query'
import { formatPrice, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth.store'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'status-pending' },
  paid: { label: 'Paid', cls: 'status-paid' },
  processing: { label: 'Processing', cls: 'status-processing' },
  shipped: { label: 'Shipped', cls: 'status-shipped' },
  delivered: { label: 'Delivered', cls: 'status-delivered' },
  cancelled: { label: 'Cancelled', cls: 'status-cancelled' },
}

export default function OrdersPage() {
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,status,total,np_ttn,created_at,order_items(id)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        items: (data ?? []).map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          status: o.status,
          total: Number(o.total ?? 0),
          npTtn: o.np_ttn,
          createdAt: o.created_at,
          items: o.order_items ?? [],
        })),
      }
    },
  })

  if (isLoading) {
    return <div className="animate-pulse space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-secondary rounded-lg" />)}</div>
  }

  return (
    <div>
      <h1 className="text-xl font-display font-bold mb-6">My Orders</h1>
      {data?.items?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No orders yet</div>
      ) : (
        <div className="space-y-3">
          {data?.items?.map((order: any) => {
            const s = STATUS_MAP[order.status] ?? { label: order.status, cls: '' }
            return (
              <Link key={order.id} href={`/account/orders/${order.id}`} className="block bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.createdAt)} · {order.items?.length} item(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(order.total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border ${s.cls}`}>{s.label}</span>
                  </div>
                </div>
                {order.npTtn && <p className="text-xs text-muted-foreground mt-2">TTN: {order.npTtn}</p>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
