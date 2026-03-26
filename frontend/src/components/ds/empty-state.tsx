"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="mb-3 text-muted-foreground/40 [&_svg]:size-8">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-0.5 max-w-xs text-[13px] text-muted-foreground">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} className="mt-3" size="sm" variant="outline">
          <Plus />
          {action.label}
        </Button>
      )}
    </div>
  );
}
