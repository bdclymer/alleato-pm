import { cn } from "@/lib/utils";
import type { ContractTab } from "../types";

interface PrimeContractTabsProps {
  activeTab: ContractTab;
  setActiveTab: (tab: ContractTab) => void;
  changeOrdersCount: number;
  paymentApplicationsCount: number;
  paymentsCount: number;
}

export function PrimeContractTabs({
  activeTab,
  setActiveTab,
  changeOrdersCount,
  paymentApplicationsCount,
  paymentsCount,
}: PrimeContractTabsProps) {
  return (
    <div className="px-6 lg:px-8 mb-[var(--card-gap)]">
      <nav className="-mb-px flex overflow-x-auto border-b border-border" aria-label="Contract tabs">
        <div className="flex min-w-max space-x-6 md:space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={cn(
              "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-4 pt-4 text-sm font-medium transition-colors",
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
            aria-current={activeTab === "overview" ? "page" : undefined}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("change-orders")}
            className={cn(
              "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-4 pt-4 text-sm font-medium transition-colors",
              activeTab === "change-orders"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
            aria-current={activeTab === "change-orders" ? "page" : undefined}
          >
            <span>Change Orders</span>
            {changeOrdersCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  activeTab === "change-orders"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-foreground",
                )}
              >
                {changeOrdersCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("invoices")}
            className={cn(
              "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-4 pt-4 text-sm font-medium transition-colors",
              activeTab === "invoices"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
            aria-current={activeTab === "invoices" ? "page" : undefined}
          >
            <span>Invoices</span>
            {paymentApplicationsCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  activeTab === "invoices"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-foreground",
                )}
              >
                {paymentApplicationsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={cn(
              "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-4 pt-4 text-sm font-medium transition-colors",
              activeTab === "payments"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
            aria-current={activeTab === "payments" ? "page" : undefined}
          >
            <span>Payments Received</span>
            {paymentsCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  activeTab === "payments"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-foreground",
                )}
              >
                {paymentsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("emails")}
            className={cn(
              "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-4 pt-4 text-sm font-medium transition-colors",
              activeTab === "emails"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
            aria-current={activeTab === "emails" ? "page" : undefined}
          >
            Emails
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-4 pt-4 text-sm font-medium transition-colors",
              activeTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
            aria-current={activeTab === "history" ? "page" : undefined}
          >
            Change History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("financial-markup")}
            className={cn(
              "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-4 pt-4 text-sm font-medium transition-colors",
              activeTab === "financial-markup"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
            aria-current={activeTab === "financial-markup" ? "page" : undefined}
          >
            Financial Markup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("advanced-settings")}
            className={cn(
              "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-4 pt-4 text-sm font-medium transition-colors",
              activeTab === "advanced-settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
            aria-current={activeTab === "advanced-settings" ? "page" : undefined}
          >
            Advanced Settings
          </button>
        </div>
      </nav>
    </div>
  );
}
