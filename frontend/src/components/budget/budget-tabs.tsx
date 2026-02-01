"use client";

import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
}

interface BudgetTabsProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

const tabs: Tab[] = [
  { id: "budget", label: "Budget" },
  { id: "budget-details", label: "Budget Details" },
  { id: "cost-codes", label: "Cost Codes" },
  { id: "forecasting", label: "Forecasting" },
  { id: "snapshots", label: "Project Status Snapshots" },
  { id: "change-history", label: "Change History" },
  { id: "settings", label: "Settings" },
];

/**
 * BudgetTabs - Matches site-standard tab styling with border-bottom
 * Aligned with PageHeader: px-4 sm:px-6 lg:px-8
 */
export function BudgetTabs({
  activeTab = "budget",
  onTabChange,
}: BudgetTabsProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <nav className="-mb-px flex overflow-x-auto border-b border-border" aria-label="Budget tabs">
        <div className="flex min-w-max space-x-6 md:space-x-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
