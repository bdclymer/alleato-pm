import * as React from "react";
import { cn } from "@/lib/utils";

export interface DetailLayoutProps {
  /** Main column content — always rendered. */
  children: React.ReactNode;
  /**
   * Optional right sidebar. When omitted the layout renders single-column
   * (children fill the full width). When provided the layout switches to
   * a two-column responsive grid at the xl breakpoint.
   */
  sidebar?: React.ReactNode;
  className?: string;
}

/**
 * Two-column responsive layout for detail pages.
 *
 * Below xl: single column, main then sidebar stacked.
 * At xl+: main column (flex-1) beside a fixed-width sidebar (300px–380px).
 *
 * Use inside <ContentSectionStack> as the direct child of a tab's content area.
 * Do NOT hand-roll `grid-cols-1 xl:grid-cols-[...]` — use this component instead.
 */
export function DetailLayout({ children, sidebar, className }: DetailLayoutProps) {
  if (!sidebar) {
    return <div className={cn("min-w-0", className)}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]",
        className,
      )}
    >
      <div className="min-w-0 space-y-10">{children}</div>
      <aside className="min-w-0 space-y-8">{sidebar}</aside>
    </div>
  );
}
