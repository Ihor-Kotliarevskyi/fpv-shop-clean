interface Props { qty: number }
export function StockBadge({ qty }: Props) {
  if (qty === 0) return <span className="inline-flex items-center gap-1.5 text-sm text-destructive"><span className="w-2 h-2 rounded-full bg-destructive"/>Немає в наявності</span>
  if (qty <= 3) return <span className="inline-flex items-center gap-1.5 text-sm text-yellow-500"><span className="w-2 h-2 rounded-full bg-yellow-500"/>Мало: {qty} шт.</span>
  return <span className="inline-flex items-center gap-1.5 text-sm text-neon-green"><span className="w-2 h-2 rounded-full bg-neon-green"/>В наявності</span>
}
