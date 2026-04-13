'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
interface Props { total: number; limit: number; page: number }
export function Pagination({ total, limit, page }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const pages = Math.ceil(total / limit)
  if (pages <= 1) return null
  const go = (p: number) => {
    const q = new URLSearchParams(params.toString()); q.set('page', String(p)); router.push(`?${q}`)
  }
  return (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => go(page - 1)} disabled={page <= 1} className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4"/></button>
      {Array.from({ length: Math.min(5, pages) }, (_, i) => {
        const p = Math.max(1, Math.min(pages - 4, page - 2)) + i
        return <button key={p} onClick={() => go(p)} className={cn('w-9 h-9 rounded-lg text-sm transition-colors', p === page ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-secondary')}>{p}</button>
      })}
      <button onClick={() => go(page + 1)} disabled={page >= pages} className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4"/></button>
    </div>
  )
}
