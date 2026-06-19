"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export interface InspectorRailProps {
  /** Inspector sections rendered in a vertical rail. */
  children: React.ReactNode;
  className?: string;
}

export function InspectorRail({ children, className }: InspectorRailProps) {
  return (
    <aside className={cn("min-w-0 space-y-2", className)}>{children}</aside>
  );
}

export interface InspectorSectionProps {
  title: string;
  children: React.ReactNode;
  /** Optional action rendered on the right side of the section header. */
  actions?: React.ReactNode;
  /** Initial open state for uncontrolled sections. */
  defaultOpen?: boolean;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
}

export function InspectorSection({
  title,
  children,
  actions,
  defaultOpen = true,
  open,
  onOpenChange,
  className,
  contentClassName,
}: InspectorSectionProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        "group rounded-md border border-border/60 bg-background",
        className,
      )}
    >
      <div className="flex min-h-10 items-center gap-2 px-3">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-medium text-foreground outline-none transition-colors hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
          <span className="truncate">{title}</span>
        </CollapsibleTrigger>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <CollapsibleContent
        className={cn("border-t border-border/60 px-3 py-2", contentClassName)}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export interface PropertyListProps {
  children: React.ReactNode;
  className?: string;
}

export function PropertyList({ children, className }: PropertyListProps) {
  return (
    <dl className={cn("divide-y divide-border/60", className)}>{children}</dl>
  );
}

export interface PropertyRowProps {
  label: string;
  children?: React.ReactNode;
  /** Optional icon that adds meaning to the property, not decoration. */
  icon?: React.ReactNode;
  /** Optional trailing control for the property. */
  action?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export function PropertyRow({
  label,
  children,
  icon,
  action,
  className,
  valueClassName,
}: PropertyRowProps) {
  const isEmpty =
    children === null || children === undefined || children === "";

  return (
    <div
      className={cn(
        "grid min-w-0 gap-2 py-2 sm:grid-cols-[6.5rem_minmax(0,1fr)]",
        className,
      )}
    >
      <dt className="flex min-w-0 items-center gap-1.5 pt-1 text-xs text-muted-foreground">
        {icon ? (
          <span className="shrink-0 text-muted-foreground">{icon}</span>
        ) : null}
        <span className="truncate">{label}</span>
      </dt>
      <dd
        className={cn(
          "flex min-w-0 items-start justify-between gap-2 text-sm text-foreground",
          valueClassName,
        )}
      >
        <div className="min-w-0 flex-1 break-words">
          {isEmpty ? (
            <span className="text-muted-foreground/50">-</span>
          ) : (
            children
          )}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </dd>
    </div>
  );
}
