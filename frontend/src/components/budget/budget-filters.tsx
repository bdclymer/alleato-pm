"use client";

import * as React from "react";
import { ChevronDown, Maximize2, Minimize2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { BudgetSnapshot, BudgetGroup } from "@/types/budget";

export type QuickFilterType =
  | "over-budget"
  | "under-budget"
  | "no-activity"
  | "all";

interface BudgetFiltersProps {
  snapshots: BudgetSnapshot[];
  groups: BudgetGroup[];
  selectedSnapshot: string;
  selectedGroup: string;
  onSnapshotChange: (snapshotId: string) => void;
  onGroupChange: (groupId: string) => void;
  onAnalyzeVariance?: () => void;
  onToggleFullscreen?: () => void;
  onQuickFilterChange?: (filter: QuickFilterType) => void;
  activeQuickFilter?: QuickFilterType;
  isFullscreen?: boolean;
}

export function BudgetFilters({
  snapshots,
  groups,
  selectedSnapshot,
  selectedGroup,
  onSnapshotChange,
  onGroupChange,
  onAnalyzeVariance,
  onToggleFullscreen,
  onQuickFilterChange,
  activeQuickFilter = "all",
  isFullscreen = false,
}: BudgetFiltersProps) {
  const selectedSnapshotName =
    snapshots.find((s) => s.id === selectedSnapshot)?.name || "Select Snapshot";
  const selectedGroupName =
    groups.find((g) => g.id === selectedGroup)?.name || "Select Group";

  const quickFilterLabels = {
    all: "All Items",
    "over-budget": "Over Budget",
    "under-budget": "Under Budget",
    "no-activity": "No Activity",
  };

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-end justify-between py-4 gap-4">
      {/* Left side - Filter controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 overflow-x-auto">
        <div className="flex flex-wrap sm:flex-nowrap gap-4">
          {/* Snapshot Selector */}
          <div className="flex flex-col gap-1 min-w-[100px]">
            <span className="text-xs text-muted-foreground">Snapshot</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 w-full sm:min-w-[110px] justify-between text-sm"
                  aria-label="Snapshot"
                >
                  <span className="truncate">{selectedSnapshotName}</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-2 text-muted-foreground flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                {snapshots.map((snapshot) => (
                  <DropdownMenuItem
                    key={snapshot.id}
                    onClick={() => onSnapshotChange(snapshot.id)}
                    className={
                      selectedSnapshot === snapshot.id ? "bg-accent" : ""
                    }
                  >
                    {snapshot.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Group Selector */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="text-xs text-muted-foreground">Group</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 w-full sm:min-w-[130px] justify-between text-sm"
                  aria-label="Group"
                >
                  <span className="truncate">{selectedGroupName}</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-2 text-muted-foreground flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                {groups.map((group) => (
                  <DropdownMenuItem
                    key={group.id}
                    onClick={() => onGroupChange(group.id)}
                    className={selectedGroup === group.id ? "bg-accent" : ""}
                  >
                    {group.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap sm:flex-nowrap gap-4 sm:border-l sm:pl-4 sm:ml-2">
          {/* Quick Filters */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={activeQuickFilter !== "all" ? "default" : "outline"}
                  className="h-8 w-full sm:min-w-[130px] justify-between text-sm"
                  aria-label="Quick Filter"
                >
                  <Filter className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                  <span className="truncate">{quickFilterLabels[activeQuickFilter]}</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-2 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                <DropdownMenuItem
                  onClick={() => onQuickFilterChange?.("all")}
                  className={activeQuickFilter === "all" ? "bg-accent" : ""}
                >
                  All Items
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onQuickFilterChange?.("over-budget")}
                  className={
                    activeQuickFilter === "over-budget" ? "bg-accent" : ""
                  }
                >
                  <span className="text-destructive mr-2">●</span>
                  Over Budget
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickFilterChange?.("under-budget")}
                  className={
                    activeQuickFilter === "under-budget" ? "bg-accent" : ""
                  }
                >
                  <span className="text-success mr-2">●</span>
                  Under Budget
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickFilterChange?.("no-activity")}
                  className={
                    activeQuickFilter === "no-activity" ? "bg-accent" : ""
                  }
                >
                  <span className="text-muted-foreground mr-2">●</span>
                  No Activity
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-end gap-2 justify-end">
        <Button
          variant="outline"
          className="h-8 text-sm hidden sm:flex"
          onClick={onAnalyzeVariance}
        >
          Analyze Variance
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
