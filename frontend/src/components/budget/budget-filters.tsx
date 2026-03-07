"use client";

import { Maximize2, Minimize2, SlidersHorizontal, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

  const filterSummary = `${selectedSnapshotName} · ${selectedGroupName} · ${quickFilterLabels[activeQuickFilter]}`;

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="View options"
                title="View options"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>View options</DropdownMenuLabel>
            <DropdownMenuItem className="pointer-events-none text-xs text-muted-foreground">
              {filterSummary}
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Snapshot
                <span className="ml-auto truncate text-muted-foreground">{selectedSnapshotName}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
                {snapshots.map((snapshot) => (
                  <DropdownMenuItem
                    key={snapshot.id}
                    onClick={() => onSnapshotChange(snapshot.id)}
                    className={selectedSnapshot === snapshot.id ? "bg-accent" : ""}
                  >
                    {snapshot.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Grouping
                <span className="ml-auto truncate text-muted-foreground">{selectedGroupName}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {groups.map((group) => (
                  <DropdownMenuItem
                    key={group.id}
                    onClick={() => onGroupChange(group.id)}
                    className={selectedGroup === group.id ? "bg-accent" : ""}
                  >
                    {group.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Filters
                <span className="ml-auto truncate text-muted-foreground">
                  {quickFilterLabels[activeQuickFilter]}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuItem
                  onClick={() => onQuickFilterChange?.("all")}
                  className={activeQuickFilter === "all" ? "bg-accent" : ""}
                >
                  All Items
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onQuickFilterChange?.("over-budget")}
                  className={activeQuickFilter === "over-budget" ? "bg-accent" : ""}
                >
                  <span className="mr-2 text-destructive">●</span>
                  Over Budget
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickFilterChange?.("under-budget")}
                  className={activeQuickFilter === "under-budget" ? "bg-accent" : ""}
                >
                  <span className="mr-2 text-success">●</span>
                  Under Budget
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickFilterChange?.("no-activity")}
                  className={activeQuickFilter === "no-activity" ? "bg-accent" : ""}
                >
                  <span className="mr-2 text-muted-foreground">●</span>
                  No Activity
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Sort
                <span className="ml-auto text-muted-foreground">Coming soon</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuItem disabled>Budget code (A-Z)</DropdownMenuItem>
                <DropdownMenuItem disabled>Budget code (Z-A)</DropdownMenuItem>
                <DropdownMenuItem disabled>Largest variance first</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent>View options</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onAnalyzeVariance}
            aria-label="Analyze variance"
            title="Analyze variance"
          >
            <Sigma className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Analyze variance</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Exit full page view" : "Enter full page view"}
            title={isFullscreen ? "Exit full page view" : "Enter full page view"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isFullscreen ? "Exit full page view" : "Enter full page view"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
