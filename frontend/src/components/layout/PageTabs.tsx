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
      ? "flex min-w-0 w-full items-center"
      : "px-4 sm:px-6 lg:px-8";
  const navClasses =
    variant === "inline"
      ? "-mb-px flex overflow-x-auto scrollbar-hide"
      : "-mb-px flex overflow-x-auto scrollbar-hide border-b border-border";
  const buttonClasses =
    variant === "inline"
      ? "group inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-2 py-2 text-sm transition-colors"
      : "group inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-2 py-3 text-sm transition-colors";

  return (
    <div className={cn(wrapperClasses, "mb-4 md:mb-6", className)}>
      <nav className={navClasses} aria-label="Tabs">
        <div className="flex min-w-max space-x-4 md:space-x-6">
          {tabs.map((tab) => {
            const isActive =
              tab.isActive ??
              (hasExactHrefMatch
                ? tab.href === currentPath
                : pathname === tab.href);

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
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-foreground/60 font-medium hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-foreground",
                      )}
                      data-testid={tab.countTestId}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
