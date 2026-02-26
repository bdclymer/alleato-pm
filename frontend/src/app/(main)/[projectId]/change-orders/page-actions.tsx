"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/domain/change-orders/ExportDropdown";
import {
  ReportsDropdown,
  type ReportFilter,
} from "@/components/domain/change-orders/ReportsDropdown";
import { ReviewerSettingsDialog } from "./reviewer-settings-dialog";

interface PageActionsProps {
  projectId: string;
}

export function PageActions({ projectId }: PageActionsProps) {
  const router = useRouter();

  const handleApplyFilter = (filter: ReportFilter) => {
    const today = new Date().toISOString().split("T")[0];

    switch (filter.type) {
      case "unexecuted":
        // Filter: approved but not executed
        router.push(
          `/${projectId}/change-orders?status=approved&report=unexecuted`,
        );
        break;

      case "overdue":
        // Filter: due_date < today and status not approved/executed
        router.push(
          `/${projectId}/change-orders?dueDateTo=${today}&report=overdue`,
        );
        break;

      case "clear":
        // Clear all filters
        router.push(`/${projectId}/change-orders`);
        break;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <ReviewerSettingsDialog projectId={projectId} />
      <ReportsDropdown onApplyFilter={handleApplyFilter} />
      <ExportDropdown projectId={projectId} />
      <Button asChild size="sm" data-testid="change-orders-create-button">
        <Link href={`/${projectId}/change-orders/new`}>Create Change Order</Link>
      </Button>
    </div>
  );
}
