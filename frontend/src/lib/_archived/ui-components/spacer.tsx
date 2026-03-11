import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Spacer component for explicit spacing between elements.
 * Use when Stack/Inline gap doesn't work (e.g., pushing items apart).
 *
 * @example
 * <div>
 *   <Text>Top content</Text>
 *   <Spacer size="xl" />
 *   <Text>Bottom content</Text>
 * </div>
 */

const verticalSizeMap = {
  xs: "h-1", // 4px
  sm: "h-2", // 8px
  md: "h-4", // 16px
  lg: "h-6", // 24px
  xl: "h-8", // 32px
  "2xl": "h-12", // 48px
} as const;

const horizontalSizeMap = {
  xs: "w-1", // 4px
  sm: "w-2", // 8px
  md: "w-4", // 16px
  lg: "w-6", // 24px
  xl: "w-8", // 32px
  "2xl": "w-12", // 48px
} as const;

export interface SpacerProps {
  /** Size of spacer */
  size?: keyof typeof verticalSizeMap;
  /** Direction of spacer */
  direction?: "vertical" | "horizontal";
  /** Additional CSS classes */
  className?: string;
}

export function Spacer({
  size = "md",
  direction = "vertical",
  className,
}: SpacerProps) {
  const sizeClass =
    direction === "vertical" ? verticalSizeMap[size] : horizontalSizeMap[size];

  return (
    <div className={cn("shrink-0", sizeClass, className)} aria-hidden="true" />
  );
}
