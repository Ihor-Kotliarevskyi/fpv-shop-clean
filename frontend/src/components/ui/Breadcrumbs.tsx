import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
interface Item { label: string; href?: string }
interface Props { items: Item[] }
export function Breadcrumbs({ items }: Props) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
      <Link href="/" className="hover:text-foreground transition-colors">Головна</Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0"/>
          {item.href ? <Link href={item.href} className="hover:text-foreground transition-colors">{item.label}</Link> : <span className="text-foreground">{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}
