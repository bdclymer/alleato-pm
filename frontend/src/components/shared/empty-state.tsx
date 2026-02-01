// This component is deprecated - use empty-state from ui folder instead
// Keeping for backwards compatibility during migration

import React from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { EmptyState as UnifiedEmptyState } from "@/components/ui/empty-state";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: "default" | "compact";
}

/**
 * @deprecated Use EmptyState from @/components/ui/empty-state
 * This is a compatibility wrapper that will be removed in the future
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  return (
    <UnifiedEmptyState
      variant={variant}
      size={variant === "compact" ? "sm" : "md"}
      icon={Icon && <Icon />}
      title={title || message} // Use message as title if no title provided
      description={title ? message : undefined} // Use message as description if title exists
      action={
        actionLabel &&
        onAction && (
          <Button
            onClick={onAction}
            variant="default"
            size={variant === "compact" ? "sm" : "default"}
            className="bg-primary hover:bg-primary/90"
          >
            {actionLabel}
          </Button>
        )
      }
      className={className}
    />
  );
}
