"use client";

import { memo } from "react";
import { Receipt } from "lucide-react";

import { EmptyState } from "@/components/ds/empty-state";

interface PaymentsIssuedTabProps {
  commitmentId: string;
}

export const PaymentsIssuedTab = memo(function PaymentsIssuedTab({
  commitmentId: _commitmentId,
}: PaymentsIssuedTabProps) {
  return (
    <EmptyState
      icon={<Receipt className="h-8 w-8" />}
      title="No payments recorded yet"
      description="Payments issued against this commitment will appear here once payment tracking is enabled for subcontracts and purchase orders."
    />
  );
});

PaymentsIssuedTab.displayName = "PaymentsIssuedTab";
