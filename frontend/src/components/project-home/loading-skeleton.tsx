export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-8 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-neutral-100 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-neutral-100 rounded animate-pulse" />
        </div>

        {/* Epic Skeletons */}
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              {/* Epic Header */}
              <div className="flex items-center gap-2 h-10">
                <div className="h-3 w-3 bg-neutral-100 rounded animate-pulse" />
                <div className="h-5 w-48 bg-neutral-100 rounded animate-pulse" />
                <div className="h-4 w-12 bg-neutral-100 rounded animate-pulse" />
              </div>

              {/* Task Skeletons */}
              {[1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  className="flex items-center gap-4 h-9 px-4 border-b border-neutral-100"
                >
                  <div className="h-4 w-4 bg-neutral-100 rounded animate-pulse" />
                  <div className="h-1.5 w-1.5 bg-neutral-100 rounded-full animate-pulse" />
                  <div className="h-4 flex-1 bg-neutral-100 rounded animate-pulse max-w-xs" />
                  <div className="h-4 w-20 bg-neutral-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
