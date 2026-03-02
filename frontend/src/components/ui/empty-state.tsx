import * as React from "react";
import { cn } from "@/lib/utils";
import { Stack } from "./stack";
import { Heading } from "./heading";
import { Text } from "./text";

/**
 * EmptyState component for consistent empty/zero state displays.
 * Replaces inline empty state divs.
 *
 * @example
 * <EmptyState
 *   icon={<Building2 className="h-12 w-12" />}
 *   title="No companies found"
 *   description="Create your first company to get started"
 *   action={<Button>Add Company</Button>}
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
  /** Visual variant */
  variant?: "default" | "executive" | "table" | "compact";
  /** Show icon with background circle (for table variant) */
  iconWithBackground?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeMap = {
  sm: {
    container: "p-6",
    iconSize: "h-8 w-8",
    titleLevel: 5,
    descSize: "sm",
  },
  md: {
    container: "p-8",
    iconSize: "h-12 w-12",
    titleLevel: 4,
    descSize: "base",
  },
  lg: {
    container: "p-12",
    iconSize: "h-16 w-16",
    titleLevel: 3,
    descSize: "lg",
  },
} as const;

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
  variant = "default",
  iconWithBackground = false,
  className,
}: EmptyStateProps) {
  const config = sizeMap[size];

  // Adjust size for compact variant
  const effectiveConfig = variant === "compact" ? sizeMap.sm : config;

  // Apply variant styles
  const variantStyles = {
    default: "rounded-lg border bg-card",
    executive: "bg-neutral-50 border border-neutral-200",
    table: "rounded-lg border bg-card",
    compact: "rounded-lg border bg-card",
  };

  // Icon wrapper styles
  const iconWrapperStyles =
    iconWithBackground || variant === "table"
      ? "rounded-full bg-muted p-4"
      : "";

  return (
    <div
      className={cn(
        "text-center",
        variantStyles[variant],
        effectiveConfig.container,
        className,
      )}
    >
      <Stack gap="md" align="center">
        {icon && (
          <div
            className={cn(
              variant === "executive"
                ? "text-neutral-400"
                : "text-muted-foreground",
              effectiveConfig.iconSize,
              iconWrapperStyles,
            )}
          >
            {icon}
          </div>
        )}

        <Stack gap="sm" align="center">
          {variant === "executive" ? (
            <h3 className="text-lg font-medium text-neutral-900">{title}</h3>
          ) : (
            <Heading level={effectiveConfig.titleLevel as 3 | 4 | 5}>
              {title}
            </Heading>
          )}

          {description &&
            (variant === "executive" ? (
              <p className="text-sm text-neutral-600 max-w-sm mx-auto">
                {description}
              </p>
            ) : (
              <Text
                size={effectiveConfig.descSize as "sm" | "base" | "lg"}
                tone="muted"
              >
                {description}
              </Text>
            ))}
        </Stack>

        {action && <div className="mt-2">{action}</div>}
      </Stack>
    </div>
  );
}
