import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  children: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  children,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{children}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface SubsectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SubsectionHeader({
  children,
  className,
}: SubsectionHeaderProps) {
  return (
    <h3 className={cn("text-base font-medium text-foreground mb-4", className)}>
      {children}
    </h3>
  );
}
