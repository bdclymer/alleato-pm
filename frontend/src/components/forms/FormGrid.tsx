import * as React from "react";
import { cn } from "@/lib/utils";

interface FormGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function FormGrid({
  children,
  columns = 2,
  className,
}: FormGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6",
        columns === 2 && "md:grid-cols-2",
        columns === 3 && "md:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}