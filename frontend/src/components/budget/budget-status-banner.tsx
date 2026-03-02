"use client";

import * as React from "react";
import { Info, X } from "lucide-react";
import { BudgetSyncStatus } from "@/types/budget";

interface BudgetStatusBannerProps {
  syncStatus: BudgetSyncStatus;
  onDismiss?: () => void;
}

export function BudgetStatusBanner({
  syncStatus,
  onDismiss,
}: BudgetStatusBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed || !syncStatus.isSynced) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-[hsl(var(--procore-info-bg))] text-[hsl(var(--procore-info-text))] px-4 py-4 flex items-center justify-between rounded-lg">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs">
          Budget is Synced with {syncStatus.erpSystem}
          {syncStatus.lastJobCostUpdate && (
            <>, last job cost update detected {syncStatus.lastJobCostUpdate}</>
          )}
          {syncStatus.lastDirectCostUpdate && (
            <>
              , last direct cost update detected{" "}
              {syncStatus.lastDirectCostUpdate}
            </>
          )}
          .
        </span>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="text-[hsl(var(--procore-info-text))] hover:opacity-70"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
