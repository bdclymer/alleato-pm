"use client";

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
}

/**
 * PageTabs - Site-standard tab navigation with border-bottom style
 * Matches PageHeader alignment: px-4 sm:px-6 lg:px-8
 */
export function PageTabs({ tabs, className }: PageTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Find the active tab based on pathname
  const searchString = searchParams.toString();
  const currentPath = searchString ? `${pathname}?${searchString}` : pathname;
  const hasExactHrefMatch = tabs.some((tab) => tab.href === currentPath);

  return (
    <div className={cn("px-4 sm:px-6 lg:px-8", className)}>
      <nav
        className="-mb-px flex overflow-x-auto border-b border-border"
        aria-label="Tabs"
      >
        <div className="flex min-w-max space-x-6 md:space-x-8">
          {tabs.map((tab) => {
            const isActive =
              tab.isActive ??
              (hasExactHrefMatch
                ? tab.href === currentPath
                : pathname === tab.href);

            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => router.push(tab.href)}
                aria-label={tab.label}
                data-testid={tab.testId}
                className={cn(
                  "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      isActive
                        ? "bg-brand/10 text-brand"
                        : "bg-muted text-foreground",
                    )}
                    data-testid={tab.countTestId}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
