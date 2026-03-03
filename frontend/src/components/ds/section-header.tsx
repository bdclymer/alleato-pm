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
    <div className={cn("mb-4 flex items-center justify-between", className)}>
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-sm text-muted-foreground/60">{count}</span>
        )}
      </div>
      {action &&
        (action.onClick ? (
          <button
            onClick={action.onClick}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {action.label}
          </button>
        ) : (
          <a
            href={action.href}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {action.label}
          </a>
        ))}
    </div>
  );
}
