"use client";

import type { ReactElement } from "react";
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
      ? "flex items-center"
      : "px-4 sm:px-6 lg:px-8";
  const navClasses =
    variant === "inline"
      ? "-mb-px flex overflow-x-auto"
      : "-mb-px flex overflow-x-auto border-b border-border";
  const buttonClasses =
    variant === "inline"
      ? "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-0.5 pb-2.5 pt-1.5 text-sm transition-colors"
      : "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1.5 pb-3 pt-3 text-sm transition-colors";

  return (
    <div className={cn(wrapperClasses, className)}>
      <nav className={navClasses} aria-label="Tabs">
        <div className="flex min-w-max space-x-4 md:space-x-6">
          {tabs.map((tab) => {
            const isActive =
              tab.isActive ??
              (hasExactHrefMatch
                ? tab.href === currentPath
                : pathname === tab.href);

            return (
              <>
                {/* eslint-disable-next-line design-system/no-design-violations -- custom tab primitive */}
                <button
                  key={tab.href}
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
              </>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
