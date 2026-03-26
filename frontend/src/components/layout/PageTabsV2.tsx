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

interface PageTabsV2Props {
  tabs: Tab[];
  className?: string;
}

/**
 * PageTabsV2 - Alternative pill-style tabs (shadcn/ui pattern)
 * Use PageTabs (v1) as the site standard
 */
export function PageTabsV2({ tabs, className }: PageTabsV2Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Find the active tab based on pathname
  const searchString = searchParams.toString();
  const currentPath = searchString ? `${pathname}?${searchString}` : pathname;
  const hasExactHrefMatch = tabs.some((tab) => tab.href === currentPath);

  return (
    <div className={cn("px-4 sm:px-6 lg:px-8", className)}>
      <div className="inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted/50 p-[3px]">
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
                "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-4 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive
                  ? "bg-background text-foreground shadow-sm border-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    isActive
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted/50 text-muted-foreground",
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
    </div>
  );
}
