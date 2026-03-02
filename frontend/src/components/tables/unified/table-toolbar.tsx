"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  LayoutList,
  LayoutGrid,
  List,
  Filter,
  Columns3,
  Download,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// Types
export type ViewMode = "table" | "card" | "list";

export interface FilterConfig {
  id: string;
  label: string;
  type: "select" | "multiSelect" | "dateRange" | "text" | "boolean";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ColumnConfig {
  id: string;
  label: string;
  defaultVisible?: boolean;
  alwaysVisible?: boolean;
}

type FilterValue = string | string[] | number | boolean | null | undefined;

export interface TableToolbarProps {
  // Data counts
  totalItems: number;
  filteredItems: number;
  selectedCount: number;

  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // Views
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  enabledViews?: ViewMode[];

  // Filters
  filters?: FilterConfig[];
  activeFilters: Record<string, FilterValue>;
  onFilterChange: (filters: Record<string, FilterValue>) => void;
  onClearFilters: () => void;

  // Columns
  columns?: ColumnConfig[];
  visibleColumns: string[];
  onColumnVisibilityChange: (columns: string[]) => void;

  // Actions
  onExport?: () => void;
  onBulkDelete?: () => void;

  // Feature flags
  enableSearch?: boolean;
  enableViews?: boolean;
  enableFilters?: boolean;
  enableColumnToggle?: boolean;
  enableExport?: boolean;
  enableBulkDelete?: boolean;

  className?: string;
}

// Search component with expand animation
function ExpandableSearch({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}): ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Keep expanded if there's a value
  useEffect(() => {
    if (value) {
      setIsExpanded(true);
    }
  }, [value]);

  const handleBlur = () => {
    if (!value) {
      setIsExpanded(false);
    }
  };

  return (
    <div className="relative flex items-center">
      {!isExpanded ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsExpanded(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className="relative flex items-center animate-in slide-in-from-left-2 duration-200">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="h-8 w-[200px] pl-8 pr-8 text-sm"
          />
          {value && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 h-8 w-8"
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// View switcher component
function ViewSwitcher({
  currentView,
  onViewChange,
  enabledViews = ["table", "card", "list"],
}: {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  enabledViews?: ViewMode[];
}): ReactElement {
  const views: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: "table", icon: <LayoutList className="h-4 w-4" />, label: "Table view" },
    { mode: "card", icon: <LayoutGrid className="h-4 w-4" />, label: "Card view" },
    { mode: "list", icon: <List className="h-4 w-4" />, label: "List view" },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center rounded-md border bg-muted/30 p-0.5">
        {views
          .filter((v) => enabledViews.includes(v.mode))
          .map((view) => (
            <Tooltip key={view.mode}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 rounded-sm",
                    currentView === view.mode && "bg-background shadow-sm"
                  )}
                  onClick={() => onViewChange(view.mode)}
                >
                  {view.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{view.label}</TooltipContent>
            </Tooltip>
          ))}
      </div>
    </TooltipProvider>
  );
}

// Filter panel component
function FilterMenu({
  filters,
  activeFilters,
  onFilterChange,
  onClearFilters,
}: {
  filters: FilterConfig[];
  activeFilters: Record<string, FilterValue>;
  onFilterChange: (filters: Record<string, FilterValue>) => void;
  onClearFilters: () => void;
}): ReactElement {
  const activeCount = Object.values(activeFilters).filter(
    (v) => v !== undefined && v !== "" && v !== null
  ).length;

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm">Filter</span>
                {activeCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-[20px] px-1.5 text-[11px]"
                  >
                    {activeCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Filter</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {filters.map((filter) => {
          if (filter.type === "select" && filter.options) {
            const currentValue =
              typeof activeFilters[filter.id] === "string"
                ? (activeFilters[filter.id] as string)
                : "";
            return (
              <DropdownMenuSub key={filter.id}>
                <DropdownMenuSubTrigger>
                  <span>{filter.label}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={currentValue}
                    onValueChange={(nextValue) =>
                      onFilterChange({
                        ...activeFilters,
                        [filter.id]: nextValue || undefined,
                      })
                    }
                  >
                    <DropdownMenuRadioItem value="">
                      All {filter.label}
                    </DropdownMenuRadioItem>
                    {filter.options.map((opt) => (
                      <DropdownMenuRadioItem
                        key={opt.value}
                        value={opt.value}
                      >
                        {opt.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          }

          return (
            <DropdownMenuItem key={filter.id} disabled>
              {filter.label}
            </DropdownMenuItem>
          );
        })}
        {activeCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearFilters}>
              Clear filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Column visibility dropdown
function ColumnToggle({
  columns,
  visibleColumns,
  onColumnVisibilityChange,
}: {
  columns: ColumnConfig[];
  visibleColumns: string[];
  onColumnVisibilityChange: (columns: string[]) => void;
}): ReactElement {
  const defaultColumns = columns
    .filter((col) => col.defaultVisible !== false || col.alwaysVisible)
    .map((col) => col.id);

  const handleReset = () => {
    onColumnVisibilityChange(
      Array.from(new Set(defaultColumns.concat(
        columns.filter((col) => col.alwaysVisible).map((col) => col.id),
      )))
    );
  };

  const handleShowAll = () => {
    onColumnVisibilityChange(columns.map((col) => col.id));
  };

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <Columns3 className="h-4 w-4" />
                <span className="text-sm">Display</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Display options</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns
          .filter((col) => !col.alwaysVisible)
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={visibleColumns.includes(column.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onColumnVisibilityChange([...visibleColumns, column.id]);
                } else {
                  onColumnVisibilityChange(
                    visibleColumns.filter((c) => c !== column.id)
                  );
                }
              }}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleShowAll}>Show all</DropdownMenuItem>
        <DropdownMenuItem onClick={handleReset}>Reset to defaults</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Main toolbar component
export function TableToolbar({
  totalItems,
  filteredItems,
  selectedCount,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  currentView,
  onViewChange,
  enabledViews = ["table", "card", "list"],
  filters = [],
  activeFilters,
  onFilterChange,
  onClearFilters,
  columns = [],
  visibleColumns,
  onColumnVisibilityChange,
  onExport,
  onBulkDelete,
  enableSearch = true,
  enableViews = true,
  enableFilters = true,
  enableColumnToggle = true,
  enableExport = true,
  enableBulkDelete = true,
  className,
}: TableToolbarProps): ReactElement {
  const hasRightActions =
    (enableFilters && filters.length > 0) ||
    (enableColumnToggle && columns.length > 0) ||
    (enableExport && Boolean(onExport)) ||
    (enableBulkDelete && Boolean(onBulkDelete));

  return (
    <div className={cn("flex items-center justify-between gap-4 py-2", className)}>
      {/* Left side: Search + Views */}
      <div className="flex items-center gap-4">
        {enableSearch && (
          <ExpandableSearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        )}

        {enableViews && (
          <ViewSwitcher
            currentView={currentView}
            onViewChange={onViewChange}
            enabledViews={enabledViews}
          />
        )}
      </div>

      {/* Right side: Actions + Count */}
      <div className="flex items-center gap-2">
        {enableFilters && filters.length > 0 && (
          <FilterMenu
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
          />
        )}

        {enableColumnToggle && columns.length > 0 && (
          <ColumnToggle
            columns={columns}
            visibleColumns={visibleColumns}
            onColumnVisibilityChange={onColumnVisibilityChange}
          />
        )}

        {enableExport && onExport && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onExport}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {enableBulkDelete && onBulkDelete && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={selectedCount === 0}
                  onClick={onBulkDelete}
                >
                  <Trash2
                    className={cn(
                      "h-4 w-4",
                      selectedCount > 0 && "text-destructive"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {selectedCount > 0
                  ? `Delete ${selectedCount} selected`
                  : "Delete selected"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {hasRightActions && <div className="h-4 w-px bg-border mx-1" />}

        {/* Item count */}
        <span className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground whitespace-nowrap">
          {filteredItems === totalItems
            ? `${totalItems} items`
            : `${filteredItems} of ${totalItems}`}
        </span>
      </div>
    </div>
  );
}
