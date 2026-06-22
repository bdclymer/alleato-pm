"use client";

import * as React from "react";
import { List, Mail, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmailViewMode = "mail" | "table" | "list";

const VIEWS: { id: EmailViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "mail", label: "Mail", icon: <Mail className="h-3.5 w-3.5" /> },
  { id: "table", label: "Table", icon: <Table2 className="h-3.5 w-3.5" /> },
  { id: "list", label: "List", icon: <List className="h-3.5 w-3.5" /> },
];

/**
 * Mail / Table / List segmented control for the emails surface.
 * "Mail" is the reading-pane workspace; Table/List defer to the shared
 * UnifiedTablePage views. Kept presentational — the parent owns the URL state.
 */
export function EmailViewSwitcher({
  value,
  onChange,
  className,
}: {
  value: EmailViewMode;
  onChange: (value: EmailViewMode) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Email view"
      className={cn(
        "inline-flex items-center rounded-full border border-border/60 bg-muted/40 p-0.5",
        className,
      )}
    >
      {VIEWS.map((view) => {
        const active = value === view.id;
        return (
          <Button
            key={view.id}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={active}
            onClick={() => onChange(view.id)}
            className={cn(
              "h-7 gap-1.5 rounded-full px-2.5 text-xs shadow-none",
              active
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:bg-transparent hover:text-foreground",
            )}
          >
            {view.icon}
            <span className="hidden sm:inline">{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
