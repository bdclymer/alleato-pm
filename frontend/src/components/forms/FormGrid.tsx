"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFormDensity, type FormDensity } from "@/components/forms/Form";

interface FormGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 12 | 2;
  gap?: FormDensity;
}

export function FormGrid({
  children,
  className,
  columns = 12,
  gap,
}: FormGridProps) {
  const formDensity = useFormDensity();
  const resolvedGap = gap ?? formDensity;
  const gapClass = resolvedGap === "compact" ? "gap-4" : "gap-6";
  const colsClass =
    columns === 12 ? "grid-cols-12" : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={cn("grid", colsClass, gapClass, className)}>
      {children}
    </div>
  );
}
