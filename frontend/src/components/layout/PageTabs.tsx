"use client";

import React, { type ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  href: string;
  count?: number;
  isActive?: boolean;
  testId?: string;
  countTestId?: string;
}

interface PageTabsProps {
  tabs: Tab[];
  className?: string;
  variant?: "default" | "inline";
  /** When provided, called instead of router.push — enables local-state tab switching */
  onTabClick?: (href: string) => void;
}

/**
 * PageTabs - Site-standard tab navigation with border-bottom style
 * Matches PageHeader alignment: px-4 sm:px-6 lg:px-8
 */
export function PageTabs({
  tabs,
  className,
  variant = "default",
  onTabClick,
}: PageTabsProps): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Find the active tab based on pathname
  const searchString = searchParams.toString();
  const currentPath = searchString ? `${pathname}?${searchString}` : pathname;
  const hasExactHrefMatch = tabs.some((tab) => tab.href === currentPath);
  const wrapperClasses =
    variant === "inline"
      ? "relative flex min-w-0 w-full items-center"
      : "px-1";
  const navClasses =
    variant === "inline"
      ? "-mb-px flex-1 min-w-0 flex overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide"
      : "-mb-px flex overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide";
  const buttonClasses =
    variant === "inline"
      ? "group relative inline-flex min-h-11 snap-start items-center gap-2 whitespace-nowrap px-3 py-2 text-sm transition-colors"
      : "group relative inline-flex min-h-11 snap-start items-center gap-2 whitespace-nowrap px-3 py-3 text-sm transition-colors";
  const spacingClasses = variant === "inline" ? "mb-2 md:mb-3" : "mb-4 md:mb-6";

  return (
    <div className={cn(wrapperClasses, spacingClasses, className, "border-0")}>
      {variant === "inline" && (
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-[calc(100%-0.25rem)] w-4 bg-gradient-to-l from-background to-transparent md:hidden" />
      )}
      <nav className={navClasses} aria-label="Tabs">
        <div
          className={cn(
            "flex snap-x snap-mandatory md:space-x-6",
            "min-w-max space-x-2",
          )}
        >
          {tabs.map((tab, index) => {
            const isActive =
              tab.isActive ??
              (hasExactHrefMatch
                ? tab.href === currentPath
                : pathname === tab.href);
            const displayCount =
              tab.count !== undefined && tab.count > 99 ? "99+" : tab.count;
            const countText = displayCount !== undefined ? String(displayCount) : "";
            const isSingleDigitCount = /^\d$/.test(countText);

            return (
              <React.Fragment key={tab.href}>
                {/* eslint-disable-next-line design-system/no-design-violations -- custom tab primitive */}
                <button
                  type="button"
                  onClick={() =>
                    onTabClick ? onTabClick(tab.href) : router.push(tab.href)
                  }
                  aria-label={tab.label}
                  data-testid={tab.testId}
                  className={cn(
                    buttonClasses,
                    isActive
                      ? "text-primary font-medium"
                      : "text-foreground/70 font-medium hover:text-foreground/90",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "inline-flex h-5 items-center justify-center rounded-full text-[10px] font-semibold leading-none",
                        isSingleDigitCount ? "w-5" : "min-w-5 px-1.5",
                        displayCount === "99+" && "text-[9px]",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-foreground",
                      )}
                      data-testid={tab.countTestId}
                    >
                      {displayCount}
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-colors",
                      isActive ? "bg-primary" : "bg-transparent",
                    )}
                  />
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
