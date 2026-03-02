import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function CompanyListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-[250px]" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-[120px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
