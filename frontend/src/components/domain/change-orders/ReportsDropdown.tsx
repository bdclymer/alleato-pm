"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReportsDropdownProps {
  /** Callback to apply filters to the list view */
  onApplyFilter: (filter: ReportFilter) => void;
}

export type ReportFilter =
  | { type: "unexecuted" }
  | { type: "overdue" }
  | { type: "clear" };

export function ReportsDropdown({ onApplyFilter }: ReportsDropdownProps) {
  const handleUnexecutedReport = () => {
    // Filter: approved but not executed
    onApplyFilter({ type: "unexecuted" });
  };

  const handleOverdueReport = () => {
    // Filter: due_date < today and status not approved/executed
    onApplyFilter({ type: "overdue" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="reports-dropdown-trigger"
        >
          <FileText className="mr-2 h-4 w-4" />
          Reports
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleUnexecutedReport}
          data-testid="unexecuted-report"
        >
          Unexecuted Change Orders
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleOverdueReport}
          data-testid="overdue-report"
        >
          Overdue Change Orders
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
