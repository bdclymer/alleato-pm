"use client";

import * as React from "react";
import { SlidersHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export type GroupBy = "epic" | "status" | "assignee";
export type StatusFilter = "all" | "active" | "completed";

interface ViewOptionsProps {
  groupBy: GroupBy;
  onGroupByChange: (groupBy: GroupBy) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
}

export function ViewOptions({
  groupBy,
  onGroupByChange,
  statusFilter,
  onStatusFilterChange,
}: ViewOptionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 text-neutral-600 hover:text-neutral-900"
        >
          <SlidersHorizontal />
          <span className="text-sm font-medium">View</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-semibold text-neutral-500">
          Group by
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onGroupByChange("epic")}
          className="text-sm"
        >
          {groupBy === "epic" && <Check className="h-4 w-4 mr-2" />}
          {groupBy !== "epic" && <span className="w-4 mr-2" />}
          Epic
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onGroupByChange("status")}
          className="text-sm"
        >
          {groupBy === "status" && <Check className="h-4 w-4 mr-2" />}
          {groupBy !== "status" && <span className="w-4 mr-2" />}
          Status
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onGroupByChange("assignee")}
          className="text-sm"
        >
          {groupBy === "assignee" && <Check className="h-4 w-4 mr-2" />}
          {groupBy !== "assignee" && <span className="w-4 mr-2" />}
          Assignee
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-semibold text-neutral-500">
          Show
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onStatusFilterChange("all")}
          className="text-sm"
        >
          {statusFilter === "all" && <Check className="h-4 w-4 mr-2" />}
          {statusFilter !== "all" && <span className="w-4 mr-2" />}
          All tasks
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onStatusFilterChange("active")}
          className="text-sm"
        >
          {statusFilter === "active" && <Check className="h-4 w-4 mr-2" />}
          {statusFilter !== "active" && <span className="w-4 mr-2" />}
          Active only
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onStatusFilterChange("completed")}
          className="text-sm"
        >
          {statusFilter === "completed" && <Check className="h-4 w-4 mr-2" />}
          {statusFilter !== "completed" && <span className="w-4 mr-2" />}
          Completed only
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
