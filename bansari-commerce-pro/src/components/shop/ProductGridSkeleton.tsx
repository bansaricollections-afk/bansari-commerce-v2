export default function ProductGridSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3 xl:grid-cols-4"
      aria-label="Loading products"
      aria-busy="true"
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i}>
          {/* Image skeleton */}
          <div className="aspect-[3/4] w-full animate-pulse bg-slate-100" />
          {/* Meta skeleton */}
          <div className="mt-3 space-y-2">
            <div className="h-2.5 w-1/2 animate-pulse rounded-sm bg-slate-100" />
            <div className="h-3.5 w-3/4 animate-pulse rounded-sm bg-slate-100" />
            <div className="h-2.5 w-1/3 animate-pulse rounded-sm bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
