import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props { value: number; size?: 'xs' | 'sm' | 'md'; showEmpty?: boolean }

export function RatingStars({ value, size = 'sm', showEmpty = true }: Props) {
  const s = size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn(s, i < Math.floor(value) ? 'fill-primary text-primary' : i < value ? 'fill-primary/50 text-primary/50' : 'fill-muted text-muted-foreground')} />
      ))}
    </div>
  )
}
