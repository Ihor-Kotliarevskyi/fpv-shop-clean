'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatPrice, formatDate } from '@/lib/utils'
import Link from 'next/link'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Очікує',    cls: 'status-pending'    },
  paid:       { label: 'Оплачено', cls: 'status-paid'       },
  processing: { label: 'В роботі', cls: 'status-processing' },
  shipped:    { label: 'Відправлено', cls: 'status-shipped'  },
  delivered:  { label: 'Доставлено', cls: 'status-delivered' },
  cancelled:  { label: 'Скасовано', cls: 'status-cancelled'  },
}

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/users/me/orders').then(r => r.data),
  })

  if (isLoading) return <div className="animate-pulse space-y-3">{Array.from({length:5}).map((_,i) => <div key={i} className="h-20 bg-secondary rounded-lg"/>)}</div>

  return (
    <div>
      <h1 className="text-xl font-display font-bold mb-6">Мої замовлення</h1>
      {data?.items?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Замовлень ще немає</div>
      ) : (
        <div className="space-y-3">
          {data?.items?.map((order: any) => {
            const s = STATUS_MAP[order.status] ?? { label: order.status, cls: '' }
            return (
              <Link key={order.id} href={`/account/orders/${order.id}`} className="block bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.createdAt)} · {order.items?.length} товар(ів)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(order.total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border ${s.cls}`}>{s.label}</span>
                  </div>
                </div>
                {order.npTtn && <p className="text-xs text-muted-foreground mt-2">ТТН: {order.npTtn}</p>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
