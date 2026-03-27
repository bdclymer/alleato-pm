"use client";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  count?: number;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function SectionHeader({
  title,
  count,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {count !== undefined && (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {action &&
        (action.onClick ? (
          {/* eslint-disable-next-line design-system/no-design-violations -- minimal inline link-style action */}
          <button
            onClick={action.onClick}
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {action.label}
          </button>
        ) : (
          <a
            href={action.href}
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {action.label}
          </a>
        ))}
    </div>
  );
}
