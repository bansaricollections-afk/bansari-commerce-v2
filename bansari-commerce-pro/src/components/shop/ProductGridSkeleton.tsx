export default function ProductGridSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-label="Loading products"
      aria-busy="true"
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i}>
          {/* Image skeleton — 3:4 aspect */}
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100">
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          </div>
          {/* Meta skeleton */}
          <div className="mt-3.5 space-y-2">
            <div className="h-2 w-16 overflow-hidden rounded-sm bg-slate-100">
              <div className="h-full w-full -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
            <div className="h-3.5 w-3/4 overflow-hidden rounded-sm bg-slate-100">
              <div className="h-full w-full -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
            <div className="h-2.5 w-1/2 overflow-hidden rounded-sm bg-slate-100">
              <div className="h-full w-full -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
            <div className="h-2 w-1/3 overflow-hidden rounded-sm bg-slate-100">
              <div className="h-full w-full -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
