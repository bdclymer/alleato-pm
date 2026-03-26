"use client";

import { Maximize2, Minimize2, SlidersHorizontal, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
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
                variant="outline"
                size="sm"
                aria-label="View options"
                title="View options"
                className="h-9 gap-2 px-3"
              >
                <SlidersHorizontal />
                <span className="hidden text-sm sm:inline">View</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <DropdownMenuContent align="end" className="w-96 p-0">
            <div className="px-4 pt-4 pb-3">
              <p className="text-base font-semibold text-foreground">View options</p>
              <p className="mt-1 text-xs text-muted-foreground">{filterSummary}</p>
            </div>
            <DropdownMenuSeparator />
            <div className="space-y-5 px-4 py-4">
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Snapshot
                  </h3>
                  <span className="truncate text-xs text-muted-foreground">{selectedSnapshotName}</span>
                </div>
                <div className="grid gap-1.5">
                  {snapshots.map((snapshot) => {
                    const isActive = selectedSnapshot === snapshot.id;
                    return (
                      <button
                        key={snapshot.id}
                        type="button"
                        onClick={() => onSnapshotChange(snapshot.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border hover:border-primary/20 hover:bg-accent/40"
                        )}
                      >
                        <span>{snapshot.name}</span>
                        {isActive ? <span className="text-xs font-medium text-primary">Selected</span> : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Grouping
                  </h3>
                  <span className="truncate text-xs text-muted-foreground">{selectedGroupName}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {groups.map((group) => {
                    const isActive = selectedGroup === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => onGroupChange(group.id)}
                        className={cn(
                          "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border hover:border-primary/20 hover:bg-accent/40"
                        )}
                      >
                        {group.name}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Filters
                  </h3>
                  <span className="truncate text-xs text-muted-foreground">
                    {quickFilterLabels[activeQuickFilter]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: "all", label: "All Items", dotClassName: "bg-muted-foreground" },
                      { id: "over-budget", label: "Over Budget", dotClassName: "bg-destructive" },
                      { id: "under-budget", label: "Under Budget", dotClassName: "bg-success" },
                      { id: "no-activity", label: "No Activity", dotClassName: "bg-muted-foreground/60" },
                    ] as const
                  ).map((filter) => {
                    const isActive = activeQuickFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => onQuickFilterChange?.(filter.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border hover:border-primary/20 hover:bg-accent/40"
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full", filter.dotClassName)} />
                        <span>{filter.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
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
            <Sigma />
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
