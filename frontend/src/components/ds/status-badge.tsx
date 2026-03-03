"use client";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Status variant system — ONE place for all status-to-color mappings
// ---------------------------------------------------------------------------

export type StatusVariant = "success" | "warning" | "error" | "info" | "neutral";

const badgeStyles: Record<StatusVariant, string> = {
  success: "bg-green-50 text-green-600",
  warning: "bg-yellow-50 text-yellow-600",
  error: "bg-red-50 text-red-600",
  info: "bg-blue-50 text-blue-600",
  neutral: "bg-muted text-muted-foreground",
};

// ---------------------------------------------------------------------------
// Domain status → variant mapping
// Add every domain status here. This is THE source of truth.
// ---------------------------------------------------------------------------

const STATUS_TO_VARIANT: Record<string, StatusVariant> = {
  // Approval statuses
  approved: "success",
  active: "success",
  accepted: "success",
  completed: "success",
  closed: "success",
  paid: "success",
  synced: "success",

  // Warning statuses
  pending: "warning",
  "pending approval": "warning",
  "in progress": "warning",
  "in review": "warning",
  "revise and resubmit": "warning",
  submitted: "warning",
  open: "warning",
  partial: "warning",

  // Error statuses
  rejected: "error",
  overdue: "error",
  failed: "error",
  cancelled: "error",
  void: "error",
  deleted: "error",

  // Info statuses
  "not synced": "info",

  // Neutral statuses
  draft: "neutral",
  inactive: "neutral",
  archived: "neutral",
  unknown: "neutral",
  none: "neutral",
};

function resolveVariant(status: string): StatusVariant {
  return STATUS_TO_VARIANT[status.toLowerCase()] ?? "neutral";
}

// ---------------------------------------------------------------------------
// StatusBadge — Pass a raw status string, get the right colors automatically
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  /** The raw status string from your data (e.g. "Draft", "Approved", "Pending") */
  status: string;
  /** Override the automatic variant if needed */
  variant?: StatusVariant;
  className?: string;
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolved = variant ?? resolveVariant(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        badgeStyles[resolved],
        className
      )}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusDot — Minimal inline dot indicator for tables and compact views
// ---------------------------------------------------------------------------

const dotColors: Record<StatusVariant, string> = {
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  neutral: "bg-muted-foreground/40",
};

interface StatusDotProps {
  /** The raw status string from your data */
  status: string;
  /** Override the automatic variant if needed */
  variant?: StatusVariant;
  className?: string;
}

export function StatusDot({ status, variant, className }: StatusDotProps) {
  const resolved = variant ?? resolveVariant(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[resolved])} />
      <span className="text-muted-foreground">{status}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusText — Plain muted text for non-emphasized statuses (e.g. "Not synced")
// ---------------------------------------------------------------------------

interface StatusTextProps {
  status: string;
  className?: string;
}

export function StatusText({ status, className }: StatusTextProps) {
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {status}
    </span>
  );
}
