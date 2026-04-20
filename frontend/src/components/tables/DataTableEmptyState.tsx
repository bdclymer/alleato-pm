// This component is deprecated - use EmptyState from @/components/ds
// Keeping for backwards compatibility during migration

"use client";

import * as React from "react";
import { FileX2 } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";

interface DataTableEmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * @deprecated Use EmptyState from @/components/ds
 * This is a compatibility wrapper that will be removed in the future
 */
export function DataTableEmptyState({
  icon: Icon = FileX2,
  title,
  description,
  action,
  className,
}: DataTableEmptyStateProps) {
  return (
    <EmptyState
      icon={<Icon />}
      title={title}
      description={description ?? ""}
      action={action ? <Button size="sm" onClick={action.onClick}>{action.label}</Button> : undefined}
      className={className}
    />
  );
}
