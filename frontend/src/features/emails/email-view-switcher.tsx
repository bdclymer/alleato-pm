"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmailViewMode = "mail" | "table" | "list";

const VIEWS: { id: EmailViewMode; label: string }[] = [
  { id: "mail", label: "Mail" },
  { id: "table", label: "Table" },
  { id: "list", label: "List" },
];

/**
 * Mail / Table / List tab switcher matching the site-standard PageTabs style.
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
    <nav aria-label="Email view" className={cn("flex items-center", className)}>
      {VIEWS.map((view) => {
        const active = value === view.id;
        return (
          <Button
            key={view.id}
            type="button"
            variant="ghost"
            onClick={() => onChange(view.id)}
            aria-pressed={active}
            className={cn(
              "relative rounded-none px-3 py-3 text-sm font-medium hover:bg-transparent",
              active
                ? "text-primary"
                : "text-foreground/70 hover:text-foreground/90",
            )}
          >
            {view.label}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-colors",
                active ? "bg-primary" : "bg-transparent",
              )}
            />
          </Button>
        );
      })}
    </nav>
  );
}
