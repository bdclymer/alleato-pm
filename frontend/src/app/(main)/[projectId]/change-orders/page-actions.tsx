"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/domain/change-orders/ExportDropdown";
import {
  ReportsDropdown,
  type ReportFilter,
} from "@/components/domain/change-orders/ReportsDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <>
      <div className="hidden items-center gap-2 sm:flex">
        <ReviewerSettingsDialog projectId={projectId} />
        <ReportsDropdown onApplyFilter={handleApplyFilter} />
        <ExportDropdown projectId={projectId} />
        <Button asChild size="sm" data-testid="change-orders-create-button">
          <Link href={`/${projectId}/change-orders/new`}>Create Change Order</Link>
        </Button>
      </div>

      <div className="flex items-center gap-2 sm:hidden">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-9 w-9 rounded-full border-brand p-0 text-brand hover:bg-brand/10"
          aria-label="Create change order"
        >
          <Link href={`/${projectId}/change-orders/new`}>
            <Plus className="h-4 w-4" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleApplyFilter({ type: "unexecuted" })}>
              Unexecuted report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleApplyFilter({ type: "overdue" })}>
              Overdue report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleApplyFilter({ type: "clear" })}>
              Clear report filters
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
