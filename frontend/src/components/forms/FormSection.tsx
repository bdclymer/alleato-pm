"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFormDensity, type FormDensity } from "@/components/forms/Form";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  showHeader?: boolean;
  density?: FormDensity;
  className?: string;
  headerActions?: React.ReactNode;
}

export function FormSection({
  title,
  description,
  children,
  showHeader = true,
  density,
  className,
  headerActions,
}: FormSectionProps) {
  const formDensity = useFormDensity();
  const resolvedDensity = density ?? formDensity;

  const rootGap =
    resolvedDensity === "compact"
      ? "space-y-4"
      : resolvedDensity === "default"
        ? "space-y-6"
        : "space-y-8";
  const headerPad =
    resolvedDensity === "compact"
      ? "pb-3"
      : resolvedDensity === "default"
        ? "pb-4"
        : "pb-5";

  return (
    <section className={cn(rootGap, className)}>
      {showHeader && (
        <header className={cn("border-b", headerPad)}>
          <div className="flex items-start justify-between gap-8">
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              {description && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {headerActions ? (
              <div className="shrink-0">{headerActions}</div>
            ) : null}
          </div>
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}
