"use client";

import { CheckSquare } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = "No tasks yet",
  description = "Create your first epic to get started",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CheckSquare className="h-12 w-12 text-neutral-200 mb-4" />
      <p className="text-sm font-medium text-neutral-500 mb-1">{title}</p>
      <p className="text-xs text-neutral-400">{description}</p>
    </div>
  );
}
