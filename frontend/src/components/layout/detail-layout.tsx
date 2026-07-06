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
  /** Optional full-width content rendered below the main/sidebar row. */
  footer?: React.ReactNode;
  /**
   * When true, the sidebar only renders inside the desktop two-column grid.
   * Use this when mobile/tablet should place the same information elsewhere in
   * the main content flow instead of stacking an inspector below the content.
   */
  sidebarDesktopOnly?: boolean;
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
export function DetailLayout({
  children,
  sidebar,
  footer,
  sidebarDesktopOnly = false,
  className,
}: DetailLayoutProps) {
  if (!sidebar && !footer) {
    return <div className={cn("min-w-0", className)}>{children}</div>;
  }

  return (
    <div className={cn("space-y-8 md:space-y-10", className)}>
      {sidebar ? (
        <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] xl:gap-10">
          <div className="min-w-0 space-y-10">{children}</div>
          {sidebarDesktopOnly ? (
            <aside className="hidden min-w-0 space-y-8 xl:block">{sidebar}</aside>
          ) : (
            <aside className="min-w-0 space-y-8">{sidebar}</aside>
          )}
        </div>
      ) : (
        <div className="min-w-0">{children}</div>
      )}

      {footer ? <div className="min-w-0">{footer}</div> : null}
    </div>
  );
}
