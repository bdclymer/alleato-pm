import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Link component for consistent clickable text styling.
 * Replaces raw anchor tags and clickable divs.
 *
 * @example
 * <Link onClick={handleClick}>View details</Link>
 * <Link variant="muted" size="sm">Secondary link</Link>
 */

const variantMap = {
  primary: "text-primary hover:text-primary/80",
  muted: "text-muted-foreground hover:text-foreground",
  destructive: "text-destructive hover:text-destructive/80",
} as const;

const sizeMap = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
} as const;

const weightMap = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
} as const;

export interface LinkProps {
  /** Visual variant */
  variant?: keyof typeof variantMap;
  /** Size of text */
  size?: keyof typeof sizeMap;
  /** Font weight */
  weight?: keyof typeof weightMap;
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;
  /** Additional CSS classes */
  className?: string;
  /** Link content */
  children: React.ReactNode;
}

export function Link({
  variant = "primary",
  size = "base",
  weight = "medium",
  onClick,
  className,
  children,
}: LinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-colors",
        variantMap[variant],
        sizeMap[size],
        weightMap[weight],
        className,
      )}
    >
      {children}
    </button>
  );
}
