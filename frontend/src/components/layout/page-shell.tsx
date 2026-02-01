"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* =============================================================================
   PAGE SHELL - Design System Foundation
   =============================================================================
   The PageShell is the single source of truth for page-level layout.
   ALL pages should use this component to ensure consistency.

   Features:
   - Consistent responsive padding across all breakpoints
   - Proper max-width constraints with auto-centering
   - Standardized spacing system
   - Mobile-first responsive design
   - Support for full-width and constrained layouts

   Usage:
   <PageShell>
     <PageShell.Header eyebrow="Client Name" title="Project Name" />
     <PageShell.Content>
       ... page content ...
     </PageShell.Content>
   </PageShell>
   ============================================================================= */

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** Use full width without max-width constraint */
  fullWidth?: boolean;
  /** Remove default padding (for custom layouts) */
  noPadding?: boolean;
}

interface PageHeaderProps {
  /** Small text above the title (client name, category, etc.) */
  eyebrow?: string;
  /** Main page title */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Actions to display on the right (buttons, dropdowns) */
  actions?: React.ReactNode;
  /** Additional className for the header */
  className?: string;
  /** Size variant */
  size?: "default" | "compact" | "hero";
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  /** Layout variant */
  layout?: "default" | "narrow" | "wide" | "full";
}

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Spacing variant */
  spacing?: "sm" | "md" | "lg" | "xl";
}

/* -----------------------------------------------------------------------------
   PageShell Root Component
   ----------------------------------------------------------------------------- */
function PageShellRoot({
  children,
  className,
  fullWidth = false,
  noPadding = false
}: PageShellProps) {
  return (
    <div
      className={cn(
        // Base layout
        "min-h-full w-full",
        // Responsive padding - mobile first
        !noPadding && [
          "px-4 py-4",           // Mobile: 16px padding
          "sm:px-6 sm:py-6",     // Small: 24px padding
          "md:px-8 md:py-8",     // Medium: 32px padding
          "lg:px-12 lg:py-10",   // Large: 48px/40px padding
          "xl:px-16",            // XL: 64px horizontal
        ],
        // Max width constraint
        !fullWidth && "max-w-[1600px] mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

/* -----------------------------------------------------------------------------
   PageHeader Component
   Provides consistent header styling across all pages
   ----------------------------------------------------------------------------- */
function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
  size = "default"
}: PageHeaderProps) {
  const sizeStyles = {
    compact: {
      wrapper: "mb-4 sm:mb-6",
      eyebrow: "mb-1",
      title: "text-xl sm:text-2xl",
      subtitle: "mt-1 text-sm",
    },
    default: {
      wrapper: "mb-6 sm:mb-8 md:mb-10",
      eyebrow: "mb-1.5 sm:mb-2",
      title: "text-2xl sm:text-3xl md:text-4xl",
      subtitle: "mt-2 text-sm sm:text-base",
    },
    hero: {
      wrapper: "mb-8 sm:mb-10 md:mb-12",
      eyebrow: "mb-2 sm:mb-3",
      title: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl",
      subtitle: "mt-3 text-base sm:text-lg",
    },
  };

  const styles = sizeStyles[size];

  return (
    <header className={cn(styles.wrapper, className)}>
      {/* Eyebrow - Small uppercase label */}
      {eyebrow && (
        <p className={cn(
          "text-2xs sm:text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-500",
          styles.eyebrow
        )}>
          {eyebrow}
        </p>
      )}

      {/* Title and Actions Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h1 className={cn(
            "font-light tracking-tight leading-[1.1]",
            styles.title
          )}>
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className={cn(
              "text-neutral-500 max-w-2xl",
              styles.subtitle
            )}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

/* -----------------------------------------------------------------------------
   PageContent Component
   Main content area with optional layout variants
   ----------------------------------------------------------------------------- */
function PageContent({ children, className, layout = "default" }: PageContentProps) {
  const layoutStyles = {
    default: "",
    narrow: "max-w-3xl",
    wide: "max-w-7xl",
    full: "max-w-none",
  };

  return (
    <div className={cn(layoutStyles[layout], className)}>
      {children}
    </div>
  );
}

/* -----------------------------------------------------------------------------
   PageSection Component
   Semantic section divider with consistent spacing
   ----------------------------------------------------------------------------- */
function PageSection({ children, className, spacing = "lg" }: PageSectionProps) {
  const spacingStyles = {
    sm: "mb-4 sm:mb-6",
    md: "mb-6 sm:mb-8",
    lg: "mb-8 sm:mb-10 md:mb-12",
    xl: "mb-12 sm:mb-16 md:mb-20",
  };

  return (
    <section className={cn(spacingStyles[spacing], className)}>
      {children}
    </section>
  );
}

/* -----------------------------------------------------------------------------
   PageGrid Component
   Responsive grid layouts for content
   ----------------------------------------------------------------------------- */
interface PageGridProps {
  children: React.ReactNode;
  className?: string;
  /** Number of columns at different breakpoints */
  cols?: 1 | 2 | 3 | 4;
  /** Gap size */
  gap?: "sm" | "md" | "lg";
}

function PageGrid({ children, className, cols = 2, gap = "md" }: PageGridProps) {
  const colStyles = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  const gapStyles = {
    sm: "gap-3 sm:gap-4",
    md: "gap-4 sm:gap-6",
    lg: "gap-6 sm:gap-8",
  };

  return (
    <div className={cn("grid", colStyles[cols], gapStyles[gap], className)}>
      {children}
    </div>
  );
}

/* -----------------------------------------------------------------------------
   PageDivider Component
   Visual separator between sections
   ----------------------------------------------------------------------------- */
interface PageDividerProps {
  className?: string;
  /** Spacing around the divider */
  spacing?: "sm" | "md" | "lg";
}

function PageDivider({ className, spacing = "md" }: PageDividerProps) {
  const spacingStyles = {
    sm: "my-4 sm:my-6",
    md: "my-6 sm:my-8",
    lg: "my-8 sm:my-12",
  };

  return (
    <hr className={cn(
      "border-0 border-t border-neutral-200",
      spacingStyles[spacing],
      className
    )} />
  );
}

/* -----------------------------------------------------------------------------
   Export as compound component
   ----------------------------------------------------------------------------- */
export const PageShell = Object.assign(PageShellRoot, {
  Header: PageHeader,
  Content: PageContent,
  Section: PageSection,
  Grid: PageGrid,
  Divider: PageDivider,
});

export type {
  PageShellProps,
  PageHeaderProps,
  PageContentProps,
  PageSectionProps,
  PageGridProps,
  PageDividerProps,
};
