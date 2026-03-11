import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Panel component for grouping related content.
 * A simpler alternative to Card when you don't need header/footer structure.
 *
 * @example
 * <Panel>
 *   <Text weight="semibold">Settings</Text>
 *   <Text tone="muted">Configure your preferences</Text>
 * </Panel>
 *
 * @example With variant
 * <Panel variant="bordered">
 *   <Stack gap="md">
 *     <Heading level={3}>Project Details</Heading>
 *     <Text>Content goes here</Text>
 *   </Stack>
 * </Panel>
 */
const variantMap = {
  default: "bg-card border border-border",
  bordered: "bg-background border-2 border-border",
  elevated: "bg-card border border-border shadow-md",
  plain: "bg-card",
  ghost: "bg-transparent",
} as const;

const paddingMap = { none: "", sm: "p-4", md: "p-6", lg: "p-8" } as const;

export interface PanelProps {
  /** Visual style variant */
  variant?: keyof typeof variantMap;
  /** Internal padding */
  padding?: keyof typeof paddingMap;
  /** Render as a different element */
  as?: "div" | "section" | "article" | "aside";
  /** Additional CSS classes */
  className?: string;
  /** Child elements */
  children: React.ReactNode;
}

export function Panel({
  variant = "default",
  padding = "md",
  as: Component = "div",
  className,
  children,
}: PanelProps) {
  return (
    <Component
      className={cn(
        "rounded-lg",
        variantMap[variant],
        paddingMap[padding],
        className,
      )}
    >
      {children}
    </Component>
  );
}
