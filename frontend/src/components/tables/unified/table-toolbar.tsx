"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import {
  CalendarIcon,
  Columns3,
  Download,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  Table2,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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

/**
 * Feature flags for TableToolbar. Pass a partial object to opt out of specific
 * capabilities — omitted flags default to `true`.
 *
 * Prefer this over the old flat `enableSearch`, `enableViews`, … boolean props.
 */
export interface TableToolbarFeatures {
  search?: boolean;
  views?: boolean;
  filters?: boolean;
  columnToggle?: boolean;
  export?: boolean;
  bulkDelete?: boolean;
}

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
  /** Extra action buttons rendered in the toolbar icon row (e.g. ERP sync) */
  customActions?: ReactNode;
  /** Feature flags. Omitted flags default to enabled. */
  features?: TableToolbarFeatures;
  /** @deprecated Use `features.search` instead */
  enableSearch?: boolean;
  /** @deprecated Use `features.views` instead */
  enableViews?: boolean;
  /** @deprecated Use `features.filters` instead */
  enableFilters?: boolean;
  /** @deprecated Use `features.columnToggle` instead */
  enableColumnToggle?: boolean;
  /** @deprecated Use `features.export` instead */
  enableExport?: boolean;
  /** @deprecated Use `features.bulkDelete` instead */
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
                aria-label="Search"
              >
                <Search />
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
            className="h-8 w-50 pl-8 pr-8 text-sm"
            aria-label="Search table"
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
              aria-label="Clear search"
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
      <TabsList className="h-8 bg-primary/10 border-0">
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
  const dateFilters = filters.filter((filter) => filter.type === "date");
  const inputFilters = filters.filter((filter) => filter.type === "number" || filter.type === "text");

  return (
    <div className="space-y-2">
      {selectFilters.map((filter) => {
        const currentValue =
          typeof activeFilters[filter.id] === "string"
            ? (activeFilters[filter.id] as string)
            : "";

        return (
          <div
            key={filter.id}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
          >
            <span className="text-sm text-foreground">{filter.label}</span>
            <Select
              value={currentValue || "all"}
              onValueChange={(nextValue) =>
                onFilterChange({
                  ...activeFilters,
                  [filter.id]: nextValue === "all" ? undefined : nextValue,
                })
              }
            >
              <SelectTrigger className="h-8 w-45 bg-background text-sm">
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

      {selectFilters.length > 0 && (dateFilters.length > 0 || inputFilters.length > 0) && <div className="h-px bg-border/70" />}

      {dateFilters.map((filter) => {
        const currentValue =
          typeof activeFilters[filter.id] === "string"
            ? (activeFilters[filter.id] as string)
            : "";
        const selectedDate = currentValue ? new Date(currentValue + "T00:00:00") : undefined;

        return (
          <div
            key={filter.id}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
          >
            <span className="text-sm text-foreground">{filter.label}</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 w-45 justify-start text-left text-sm font-normal",
                    !currentValue && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {selectedDate
                    ? selectedDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      onFilterChange({
                        ...activeFilters,
                        [filter.id]: `${yyyy}-${mm}-${dd}`,
                      });
                    } else {
                      onFilterChange({
                        ...activeFilters,
                        [filter.id]: undefined,
                      });
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      })}

      {(selectFilters.length > 0 || dateFilters.length > 0) && inputFilters.length > 0 && <div className="h-px bg-border/70" />}

      {inputFilters.map((filter) => (
        <div
          key={filter.id}
          className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
        >
          <label htmlFor={`filter-${filter.id}`} className="text-sm text-foreground">
            {filter.label}
          </label>
          <Input
            id={`filter-${filter.id}`}
            type={filter.type === "number" ? "number" : "text"}
            className="h-8 w-45 text-sm"
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
              <Button
                variant="ghost"
                size="sm"
                className="relative h-8 w-8 rounded-md p-0 text-muted-foreground hover:text-foreground"
                aria-label="Filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeCount > 0 ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-semibold text-foreground">
                    {activeCount}
                  </span>
                ) : null}
                <TableCountIndicator count={activeCount} className="absolute -right-1 -top-1 bg-secondary text-secondary-foreground sm:hidden" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Filter</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="start" className="w-85 p-0">
        <div className="space-y-0">
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">View settings</p>
            {activeCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={onClearFilters}
              >
                Clear
              </Button>
            ) : null}
          </div>
          <div className="p-2.5">
          <FilterFields
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={onFilterChange}
          />
          </div>
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
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Toggle columns">
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
  customActions,
  features,
  enableSearch,
  enableViews,
  enableFilters,
  enableColumnToggle,
  enableExport,
  enableBulkDelete,
  className,
}: TableToolbarProps): ReactElement {
  // Resolve feature flags: new `features` object takes precedence,
  // legacy flat props are honoured for backwards-compatibility, default is enabled.
  const feat = {
    search:        features?.search        ?? enableSearch        ?? true,
    views:         features?.views         ?? enableViews         ?? true,
    filters:       features?.filters       ?? enableFilters       ?? true,
    columnToggle:  features?.columnToggle  ?? enableColumnToggle  ?? true,
    export:        features?.export        ?? enableExport        ?? true,
    bulkDelete:    features?.bulkDelete    ?? enableBulkDelete    ?? true,
  };

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
    (feat.filters && filters.length > 0) ||
    (feat.columnToggle && columns.length > 0) ||
    (feat.export && Boolean(onExport)) ||
    (feat.bulkDelete && Boolean(onBulkDelete));

  const activeFilterCount = Object.values(activeFilters).filter(
    (value) => value !== undefined && value !== "" && value !== null,
  ).length;

  if (isMobile) {
    return (
      <div className={cn("py-2", className)}>
        <div className="flex items-center gap-2">
          {feat.search && (
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-8 pr-8 text-sm"
                aria-label="Search table"
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
                <SlidersHorizontal className="h-4 w-4" />
                <TableCountIndicator count={activeFilterCount} className="absolute -right-1 -top-1" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0 sm:w-90">
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
                      aria-label="Search table"
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

                {feat.views && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">View</p>
                    <ViewSwitcher
                      currentView={currentView}
                      onViewChange={onViewChange}
                      enabledViews={enabledViews}
                    />
                  </div>
                )}

                {feat.filters && filters.length > 0 && (
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

                {feat.columnToggle && columns.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Columns</p>
                    <div className="space-y-2 rounded-md border p-3">
                      {columns
                        .filter((column) => !column.alwaysVisible)
                        .map((column) => (
                          <label key={column.id} htmlFor={`col-toggle-${column.id}`} className="flex items-center gap-2 text-sm text-foreground">
                            <Checkbox
                              id={`col-toggle-${column.id}`}
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

                {(feat.export && onExport) || mobilePanelActions || (feat.bulkDelete && onBulkDelete) ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</p>
                    <div className="space-y-2">
                      {mobilePanelActions}
                      {feat.export && onExport ? (
                        <Button variant="outline" size="sm" className="w-full justify-start" onClick={onExport}>
                          <Download />
                          Export
                        </Button>
                      ) : null}
                      {feat.bulkDelete && onBulkDelete ? (
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
        {feat.views && (
          <div className="shrink-0">
            <ViewSwitcher
              currentView={currentView}
              onViewChange={onViewChange}
              enabledViews={enabledViews}
            />
          </div>
        )}

        {feat.views && <div className="mx-0.5 h-4 w-px shrink-0 bg-border/60" />}

        <div className="flex items-center gap-1 shrink-0">
          {feat.search && (
            <ExpandableSearch
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          )}

          {feat.filters && filters.length > 0 && (
            <FilterMenu
              filters={filters}
              activeFilters={activeFilters}
              onFilterChange={onFilterChange}
              onClearFilters={onClearFilters}
            />
          )}

          {feat.columnToggle && columns.length > 0 && (
            <ColumnToggle
              columns={columns}
              visibleColumns={visibleColumns}
              onColumnVisibilityChange={onColumnVisibilityChange}
            />
          )}

          {customActions}

          {feat.export && onExport && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={onExport}
                    aria-label="Export"
                  >
                    <Download />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {feat.bulkDelete && onBulkDelete && (
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
