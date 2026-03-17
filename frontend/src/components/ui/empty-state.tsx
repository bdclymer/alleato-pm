import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * EmptyState — minimal, Superhuman-inspired zero-state.
 *
 * No borders, no cards, no boxes. Just centered text with generous
 * whitespace. Follows the design principle: "Borders create visual
 * noise. Every border must earn its place."
 *
 * @example
 * <EmptyState
 *   title="No items found"
 *   description="Create your first item to get started."
 *   action={<Button variant="outline" size="sm">Create item</Button>}
 * />
 */

export interface EmptyStateProps {
  /** Icon to display (usually from lucide-react) */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action button/link */
  action?: React.ReactNode;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Visual variant — all render borderless now */
  variant?: "default" | "executive" | "table" | "compact";
  /** @deprecated — no longer used (kept for API compat) */
  iconWithBackground?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const paddingMap = {
  sm: "py-10",
  md: "py-16",
  lg: "py-24",
} as const;

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
  variant = "default",
  className,
}: EmptyStateProps) {
  const effectiveSize = variant === "compact" ? "sm" : size;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        paddingMap[effectiveSize],
        className,
      )}
    >
      {icon && (
        <div className="mb-3 text-muted-foreground/40 [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>
      )}

      <p className="text-sm font-medium text-muted-foreground">
        {title}
      </p>

      {description && (
        <p className="mt-1 text-sm text-muted-foreground/60 max-w-md">
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
