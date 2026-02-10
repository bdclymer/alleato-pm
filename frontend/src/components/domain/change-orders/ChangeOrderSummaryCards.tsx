"use client";

import * as React from "react";
import {
  SummaryCardGrid,
  formatCurrencyValue,
  formatNumberValue,
} from "@/components/ui/summary-card-grid";
import {
  DollarSign,
  FileText,
  Paperclip,
  Package,
  CircleDot,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractChangeOrderWithRelations } from "@/types/contract-change-orders";

/**
 * Props interface for ChangeOrderSummaryCards
 */
interface ChangeOrderSummaryCardsProps {
  changeOrder: ContractChangeOrderWithRelations;
  isLoading?: boolean;
}

/**
 * ChangeOrderSummaryCards - Header summary cards for Change Order Detail Page
 *
 * Displays key metrics for a change order in a horizontal responsive grid.
 * Shows: Total Amount, Status, Line Items Count, Attachments Count, and Package info.
 *
 * @example
 * ```tsx
 * <ChangeOrderSummaryCards
 *   changeOrder={changeOrderData}
 *   isLoading={false}
 * />
 * ```
 */
export function ChangeOrderSummaryCards({
  changeOrder,
  isLoading = false,
}: ChangeOrderSummaryCardsProps) {
  if (isLoading) {
    return <ChangeOrderSummaryCardsSkeleton />;
  }

  const lineItemsCount = changeOrder.line_items?.length ?? 0;
  const attachmentsCount = changeOrder.attachments?.length ?? 0;
  const status = changeOrder.status ?? "draft";
  const statusDisplay =
    status.charAt(0).toUpperCase() + status.slice(1);

  // Build the cards array
  const cards = [
    {
      id: "total-amount",
      label: "Total Amount",
      value: formatCurrencyValue(changeOrder.amount),
      icon: <DollarSign className="h-5 w-5" />,
      subtitle: "Change order value",
    },
    {
      id: "status",
      label: "Status",
      value: statusDisplay,
      icon: <CircleDot className="h-5 w-5" />,
      subtitle: "Current status",
    },
    {
      id: "line-items",
      label: "Line Items",
      value: formatNumberValue(lineItemsCount),
      icon: <FileText className="h-5 w-5" />,
      subtitle:
        lineItemsCount === 1 ? "1 line item" : `${lineItemsCount} line items`,
    },
    {
      id: "attachments",
      label: "Attachments",
      value: formatNumberValue(attachmentsCount),
      icon: <Paperclip className="h-5 w-5" />,
      subtitle:
        attachmentsCount === 1
          ? "1 file attached"
          : `${attachmentsCount} files attached`,
    },
  ];

  // Add package card if package info exists (future enhancement)
  // This is for when the extended fields are added to the schema
  const packageId = (changeOrder as any).package_id;
  if (packageId) {
    cards.push({
      id: "package",
      label: "Package",
      value: packageId,
      icon: <Package className="h-5 w-5" />,
      subtitle: "Assigned package",
    });
  }

  return <SummaryCardGrid cards={cards} columns={4} size="md" />;
}

/**
 * Loading skeleton for ChangeOrderSummaryCards
 */
function ChangeOrderSummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
