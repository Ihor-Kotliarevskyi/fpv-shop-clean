export function ProductCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden animate-shimmer">
      <div className="aspect-square bg-secondary" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-secondary rounded w-1/3" />
        <div className="h-4 bg-secondary rounded w-full" />
        <div className="h-4 bg-secondary rounded w-4/5" />
        <div className="h-5 bg-secondary rounded w-1/2 mt-2" />
      </div>
    </div>
  )
}
