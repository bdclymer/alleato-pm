import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function DistributionGroupListSkeleton({
  count = 5,
}: {
  count?: number;
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
