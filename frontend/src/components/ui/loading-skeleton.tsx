import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn("p-6 space-y-4", className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-muted rounded animate-pulse" />
          <div className="h-9 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="bg-muted/50 p-4 border-b">
          <div className="flex gap-4">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 border-b last:border-b-0">
            <div className="flex gap-4 items-center">
              <div className="h-4 w-40 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between pt-4">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}