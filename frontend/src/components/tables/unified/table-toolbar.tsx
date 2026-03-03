"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  Columns3,
  Download,
  Trash2,
  X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

// Types
export type ViewMode = "table" | "card" | "list";

export interface FilterConfig {
  id: string;
  label: string;
  type: "select" | "multiSelect" | "dateRange" | "text" | "boolean" | "date" | "number";
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

// View switcher component — uses the same TabsList / TabsTrigger as the design system
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
    { mode: "table", icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Grid" },
    { mode: "list", icon: <List className="h-3.5 w-3.5" />, label: "List" },
  ];

  return (
    <Tabs value={currentView} onValueChange={(v) => onViewChange(v as ViewMode)}>
      <TabsList className="h-8">
        {views
          .filter((v) => enabledViews.includes(v.mode))
          .map((view) => (
            <TabsTrigger key={view.mode} value={view.mode} className="h-6 gap-1.5 px-2.5">
              {view.icon}
              <span className="text-[12px]">{view.label}</span>
            </TabsTrigger>
          ))}
      </TabsList>
    </Tabs>
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

  const selectFilters = filters.filter((f) => f.type === "select" && f.options);
  const inputFilters = filters.filter((f) => f.type === "date" || f.type === "number");

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
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
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Filter</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Filters</p>

          {selectFilters.map((filter) => {
            const currentValue =
              typeof activeFilters[filter.id] === "string"
                ? (activeFilters[filter.id] as string)
                : "";
            return (
              <div key={filter.id} className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {filter.label}
                </span>
                <Select
                  value={currentValue || "all"}
                  onValueChange={(nextValue) =>
                    onFilterChange({
                      ...activeFilters,
                      [filter.id]: nextValue === "all" ? undefined : nextValue,
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={`All ${filter.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {filter.label}</SelectItem>
                    {filter.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}

          {selectFilters.length > 0 && inputFilters.length > 0 && (
            <div className="h-px bg-border" />
          )}

          {inputFilters.map((filter) => (
            <div key={filter.id} className="space-y-1">
              <label htmlFor={`filter-${filter.id}`} className="text-xs font-medium text-muted-foreground">
                {filter.label}
              </label>
              <Input
                id={`filter-${filter.id}`}
                type={filter.type === "date" ? "date" : "number"}
                className="h-8 text-sm"
                min={filter.type === "number" ? "0" : undefined}
                step={filter.type === "number" ? "0.01" : undefined}
                placeholder={filter.placeholder}
                value={
                  typeof activeFilters[filter.id] === "string"
                    ? (activeFilters[filter.id] as string)
                    : ""
                }
                onChange={(e) =>
                  onFilterChange({
                    ...activeFilters,
                    [filter.id]: e.target.value || undefined,
                  })
                }
              />
            </div>
          ))}

          {activeCount > 0 && (
            <>
              <div className="h-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs"
                onClick={onClearFilters}
              >
                Clear filters
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
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
                <span className="text-sm">Columns</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Select which columns to display</TooltipContent>
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
                  <Download className="h-5 w-5" />
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
        <span className="inline-flex h-8 items-center px-2.5 text-xs text-muted-foreground whitespace-nowrap">
          {filteredItems === totalItems
            ? `${totalItems} items`
            : `${filteredItems} of ${totalItems}`}
        </span>
      </div>
    </div>
  );
}
