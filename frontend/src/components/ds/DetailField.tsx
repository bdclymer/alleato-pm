import * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// DetailField — a single label + value pair for read-only detail views
// ---------------------------------------------------------------------------

interface DetailFieldProps {
  label: string;
  value?: React.ReactNode;
  /** Show a dash when value is empty/null/undefined */
  emptyPlaceholder?: string;
  className?: string;
}

export function DetailField({ label, value, emptyPlaceholder = "—", className }: DetailFieldProps) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">
        {isEmpty ? <span className="text-muted-foreground/50">{emptyPlaceholder}</span> : value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailFieldGrid — responsive grid layout for DetailField groups
// ---------------------------------------------------------------------------

interface DetailFieldGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}

const colClass: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function DetailFieldGrid({ children, cols = 3, className }: DetailFieldGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-8 gap-y-5", colClass[cols], className)}>
      {children}
    </div>
  );
}
