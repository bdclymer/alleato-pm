import * as React from "react";
import { cn } from "@/lib/utils";
import { useFormLayout } from "./FormField";

interface FormGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 12;
  className?: string;
}

export function FormGrid({
  children,
  columns = 1,
  className,
}: FormGridProps) {
  const layout = useFormLayout();
  const effectiveColumns = layout === "horizontal" ? 1 : columns;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6",
        effectiveColumns === 2 && "md:grid-cols-2",
        effectiveColumns === 3 && "md:grid-cols-2 xl:grid-cols-3",
        effectiveColumns === 12 && "md:grid-cols-12",
        className,
      )}
    >
      {children}
    </div>
  );
}
