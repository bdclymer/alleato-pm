"use client";

import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  LayoutGrid,
  Table2,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TableCountIndicator } from "./table-primitives";

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
  totalItems: number;
  filteredItems: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  enabledViews?: ViewMode[];
  filters?: FilterConfig[];
  activeFilters: Record<string, FilterValue>;
  onFilterChange: (filters: Record<string, FilterValue>) => void;
  onClearFilters: () => void;
  columns?: ColumnConfig[];
  visibleColumns: string[];
  onColumnVisibilityChange: (columns: string[]) => void;
  onExport?: () => void;
  onBulkDelete?: () => void;
  mobilePanelActions?: ReactNode;
  enableSearch?: boolean;
  enableViews?: boolean;
  enableFilters?: boolean;
  enableColumnToggle?: boolean;
  enableExport?: boolean;
  enableBulkDelete?: boolean;
  className?: string;
}

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

  useEffect(() => {
    if (value) setIsExpanded(true);
  }, [value]);

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
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => {
              if (!value) setIsExpanded(false);
            }}
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

function ViewSwitcher({
  currentView,
  onViewChange,
  enabledViews = ["table", "card", "list"],
}: {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  enabledViews?: ViewMode[];
}): ReactElement {
  const views: { mode: ViewMode; icon: ReactNode; label: string }[] = [
    { mode: "table", icon: <Table2 className="h-3.5 w-3.5" />, label: "Table" },
    { mode: "card", icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Grid" },
    { mode: "list", icon: <List className="h-3.5 w-3.5" />, label: "List" },
  ];

  return (
    <Tabs value={currentView} onValueChange={(value) => onViewChange(value as ViewMode)}>
      <TabsList className="h-8 bg-muted/40 border border-border/60">
        {views
          .filter((view) => enabledViews.includes(view.mode))
          .map((view) => (
            <TabsTrigger key={view.mode} value={view.mode} className="h-6 gap-1.5 px-2.5">
              {view.icon}
              <span className="hidden text-[12px] sm:inline">{view.label}</span>
            </TabsTrigger>
          ))}
      </TabsList>
    </Tabs>
  );
}

function FilterFields({
  filters,
  activeFilters,
  onFilterChange,
}: {
  filters: FilterConfig[];
  activeFilters: Record<string, FilterValue>;
  onFilterChange: (filters: Record<string, FilterValue>) => void;
}): ReactElement {
  const selectFilters = filters.filter((filter) => filter.type === "select" && filter.options);
  const inputFilters = filters.filter((filter) => filter.type === "date" || filter.type === "number");

  return (
    <div className="space-y-3">
      {selectFilters.map((filter) => {
        const currentValue =
          typeof activeFilters[filter.id] === "string"
            ? (activeFilters[filter.id] as string)
            : "";

        return (
          <div key={filter.id} className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{filter.label}</span>
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
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}

      {selectFilters.length > 0 && inputFilters.length > 0 && <div className="h-px bg-border" />}

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
            onChange={(event) =>
              onFilterChange({
                ...activeFilters,
                [filter.id]: event.target.value || undefined,
              })
            }
          />
        </div>
      ))}
    </div>
  );
}

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
    (value) => value !== undefined && value !== "" && value !== null,
  ).length;

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 shrink-0">
                <Filter className="h-4 w-4" />
                <TableCountIndicator count={activeCount} className="absolute -right-1 -top-1 bg-secondary text-secondary-foreground" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Filter</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Filters</p>
          <FilterFields
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={onFilterChange}
          />
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
    .filter((column) => column.defaultVisible !== false || column.alwaysVisible)
    .map((column) => column.id);

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <Columns3 className="h-4 w-4" />
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
          .filter((column) => !column.alwaysVisible)
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={visibleColumns.includes(column.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onColumnVisibilityChange([...visibleColumns, column.id]);
                } else {
                  onColumnVisibilityChange(visibleColumns.filter((existing) => existing !== column.id));
                }
              }}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onColumnVisibilityChange(columns.map((column) => column.id))}>
          Show all
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            onColumnVisibilityChange(
              Array.from(
                new Set(
                  defaultColumns.concat(
                    columns.filter((column) => column.alwaysVisible).map((column) => column.id),
                  ),
                ),
              ),
            )
          }
        >
          Reset to defaults
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
  mobilePanelActions,
  enableSearch = true,
  enableViews = true,
  enableFilters = true,
  enableColumnToggle = true,
  enableExport = true,
  enableBulkDelete = true,
  className,
}: TableToolbarProps): ReactElement {
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const apply = (): void => setIsMobile(mediaQuery.matches);

    apply();
    mediaQuery.addEventListener("change", apply);
    return () => mediaQuery.removeEventListener("change", apply);
  }, []);

  const hasRightActions =
    (enableFilters && filters.length > 0) ||
    (enableColumnToggle && columns.length > 0) ||
    (enableExport && Boolean(onExport)) ||
    (enableBulkDelete && Boolean(onBulkDelete));

  const activeFilterCount = Object.values(activeFilters).filter(
    (value) => value !== undefined && value !== "" && value !== null,
  ).length;

  if (isMobile) {
    return (
      <div className={cn("py-2", className)}>
        <div className="flex items-center gap-2">
          {enableSearch && (
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-8 pr-8 text-sm"
              />
              {searchValue ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-9"
                  onClick={() => onSearchChange("")}
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </Button>
              ) : null}
            </div>
          )}

          <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="relative h-9 w-9 shrink-0 p-0"
                aria-label="Open table controls"
              >
                <Filter className="h-4 w-4" />
                <TableCountIndicator count={activeFilterCount} className="absolute -right-1 -top-1" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] p-0 sm:w-[360px]">
              <SheetHeader className="border-b px-4 py-4">
                <SheetTitle>Table Controls</SheetTitle>
              </SheetHeader>
              <div className="max-h-[calc(100vh-88px)] space-y-5 overflow-y-auto px-4 py-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search</p>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchValue}
                      onChange={(event) => onSearchChange(event.target.value)}
                      placeholder={searchPlaceholder}
                      className="h-9 pl-8 pr-8 text-sm"
                    />
                    {searchValue ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-9 w-9"
                        onClick={() => onSearchChange("")}
                        aria-label="Clear search"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                {enableViews && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">View</p>
                    <ViewSwitcher
                      currentView={currentView}
                      onViewChange={onViewChange}
                      enabledViews={enabledViews}
                    />
                  </div>
                )}

                {enableFilters && filters.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</p>
                      {activeFilterCount > 0 ? (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearFilters}>
                          Clear
                        </Button>
                      ) : null}
                    </div>
                    <FilterFields
                      filters={filters}
                      activeFilters={activeFilters}
                      onFilterChange={onFilterChange}
                    />
                  </div>
                )}

                {enableColumnToggle && columns.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Columns</p>
                    <div className="space-y-2 rounded-md border p-3">
                      {columns
                        .filter((column) => !column.alwaysVisible)
                        .map((column) => (
                          <label key={column.id} className="flex items-center gap-2 text-sm text-foreground">
                            <Checkbox
                              checked={visibleColumns.includes(column.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  onColumnVisibilityChange([...visibleColumns, column.id]);
                                } else {
                                  onColumnVisibilityChange(
                                    visibleColumns.filter((existing) => existing !== column.id),
                                  );
                                }
                              }}
                            />
                            <span>{column.label}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                {(enableExport && onExport) || mobilePanelActions || (enableBulkDelete && onBulkDelete) ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</p>
                    <div className="space-y-2">
                      {mobilePanelActions}
                      {enableExport && onExport ? (
                        <Button variant="outline" size="sm" className="w-full justify-start" onClick={onExport}>
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      ) : null}
                      {enableBulkDelete && onBulkDelete ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full justify-start"
                          disabled={selectedCount === 0}
                          onClick={onBulkDelete}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete selected
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  {filteredItems === totalItems
                    ? `${totalItems} items`
                    : `${filteredItems} of ${totalItems} items`}
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("py-2", className)}>
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {enableViews && (
          <div className="shrink-0">
            <ViewSwitcher
              currentView={currentView}
              onViewChange={onViewChange}
              enabledViews={enabledViews}
            />
          </div>
        )}

        {enableViews && <div className="mx-0.5 h-4 w-px shrink-0 bg-border/60" />}

        <div className="flex items-center gap-1 shrink-0">
          {enableSearch && (
            <ExpandableSearch
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          )}

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
                    className="h-8 w-8 shrink-0"
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
                    className="h-8 w-8 shrink-0"
                    disabled={selectedCount === 0}
                    onClick={onBulkDelete}
                  >
                    <Trash2
                      className={cn(
                        "h-4 w-4",
                        selectedCount > 0 && "text-destructive",
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
        </div>

        {hasRightActions && <div className="mx-0.5 h-4 w-px shrink-0 bg-border/60" />}

        <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-muted/60 px-2 text-[11px] font-medium text-muted-foreground">
          {filteredItems === totalItems
            ? `${totalItems} items`
            : `${filteredItems} of ${totalItems}`}
        </span>
      </div>
    </div>
  );
}
