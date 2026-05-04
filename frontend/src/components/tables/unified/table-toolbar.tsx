"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import {
  ArrowUpDown,
  CalendarIcon,
  Columns3,
  Download,
  Eye,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
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
import {
  Modal as Dialog,
  ModalContent as DialogContent,
  ModalHeader as DialogHeader,
  ModalTitle as DialogTitle,
} from "@/components/ui/unified-modal";
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
type SortDirection = "asc" | "desc";

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
  sortOptions?: ColumnConfig[];
  sortBy?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (sortBy: string, direction: SortDirection) => void;
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

export function ExpandableSearch({
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

export function ViewSwitcher({
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

  const filteredViews = views.filter((view) => enabledViews.includes(view.mode));
  if (filteredViews.length <= 1) return <></>;

  return (
    <Tabs value={currentView} onValueChange={(value) => onViewChange(value as ViewMode)}>
      <TabsList className="h-10 bg-primary/10 border-0 sm:h-8">
        {filteredViews.map((view) => (
            <TabsTrigger
              key={view.mode}
              value={view.mode}
              className="h-8 min-w-10 gap-1.5 px-2.5 sm:h-6 sm:min-w-0"
            >
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
            className="flex items-center justify-between gap-3 px-2 py-1.5"
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
            className="flex items-center justify-between gap-3 px-2 py-1.5"
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
          className="flex items-center justify-between gap-3 px-2 py-1.5"
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

export function FilterMenu({
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

function MobileSettingsRow({
  icon,
  label,
  value,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <Button
      variant="ghost"
      className={cn(
        "h-auto min-h-12 w-full justify-start gap-3 rounded-none border-b border-border/70 px-4 py-3 text-left font-normal last:border-b-0",
        "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-base text-foreground">{label}</span>
      {value ? <span className="shrink-0 text-base text-muted-foreground">{value}</span> : null}
      {onClick ? <span className="text-xl leading-none text-muted-foreground/70">›</span> : null}
    </Button>
  );
}

function getViewLabel(view: ViewMode): string {
  if (view === "card") return "Grid";
  if (view === "list") return "List";
  return "Table";
}

function getFirstActiveFilterLabel(
  filters: FilterConfig[],
  activeFilters: Record<string, FilterValue>,
): string | undefined {
  const active = filters.find((filter) => {
    const value = activeFilters[filter.id];
    return value !== undefined && value !== "" && value !== null;
  });

  if (!active) return undefined;

  const value = activeFilters[active.id];
  if (typeof value === "string" && active.options) {
    return active.options.find((option) => option.value === value)?.label ?? active.label;
  }

  return active.label;
}

export function ColumnToggle({
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
              onSelect={(e) => e.preventDefault()}
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
  sortOptions = [],
  sortBy,
  sortDirection = "asc",
  onSortChange,
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileColumnsOpen, setMobileColumnsOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const apply = (): void => setIsMobile(mediaQuery.matches);

    apply();
    mediaQuery.addEventListener("change", apply);
    return () => mediaQuery.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    mobileSearchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  const activeFilterCount = Object.values(activeFilters).filter(
    (value) => value !== undefined && value !== "" && value !== null,
  ).length;
  const visibleColumnCount = columns.filter((column) => visibleColumns.includes(column.id)).length;
  const firstActiveFilterLabel = getFirstActiveFilterLabel(filters, activeFilters);
  const activeSortLabel = sortOptions.find((option) => option.id === sortBy)?.label;

  if (isMobile) {
    return (
      <div className={cn("py-2", className)}>
        <div className="flex w-full items-center justify-end gap-3">
          <div className="flex shrink-0 items-center gap-1.5">
            <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-11 w-11 shrink-0 p-0"
                  aria-label="Open table settings"
                >
                  <MoreVertical className="h-5 w-5" />
                  <TableCountIndicator count={activeFilterCount} className="absolute -right-1 -top-1" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-none gap-0 bg-muted p-0">
                <SheetHeader className="px-4 pb-5 pt-2 text-center">
                  <SheetTitle className="text-lg">Settings</SheetTitle>
                </SheetHeader>
                <div className="max-h-[calc(90dvh-72px)] space-y-4 overflow-y-auto px-4 pb-6">
                  <div className="overflow-hidden rounded-2xl bg-background">
                    <MobileSettingsRow
                      icon={<Table2 className="h-5 w-5" />}
                      label="Active"
                      value={
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground text-[11px] font-semibold text-background">
                          i
                        </span>
                      }
                    />
                  </div>

                  <div className="overflow-hidden rounded-2xl bg-background">
                    {feat.views && (
                      <MobileSettingsRow
                        icon={<Table2 className="h-5 w-5" />}
                        label="Layout"
                        value={getViewLabel(currentView)}
                        onClick={() => {
                          const currentIndex = enabledViews.indexOf(currentView);
                          const nextView = enabledViews[(currentIndex + 1) % enabledViews.length] ?? "table";
                          onViewChange(nextView);
                        }}
                      />
                    )}
                    {feat.columnToggle && columns.length > 0 && (
                      <MobileSettingsRow
                        icon={<Eye className="h-5 w-5" />}
                        label="Property visibility"
                        value={visibleColumnCount}
                        onClick={() => {
                          setMobilePanelOpen(false);
                          window.setTimeout(() => setMobileColumnsOpen(true), 160);
                        }}
                      />
                    )}
                    {feat.filters && filters.length > 0 && (
                      <MobileSettingsRow
                        icon={<Filter className="h-5 w-5" />}
                        label="Filter"
                        value={firstActiveFilterLabel ?? (activeFilterCount > 0 ? `${activeFilterCount}` : "None")}
                        onClick={() => {
                          setMobilePanelOpen(false);
                          window.setTimeout(() => setMobileFilterOpen(true), 160);
                        }}
                      />
                    )}
                    <MobileSettingsRow
                      icon={<ArrowUpDown className="h-5 w-5" />}
                      label="Sort"
                      value={activeSortLabel ?? "Default"}
                      onClick={
                        onSortChange && sortOptions.length > 0
                          ? () => {
                              setMobilePanelOpen(false);
                              window.setTimeout(() => setMobileSortOpen(true), 160);
                            }
                          : undefined
                      }
                      disabled={!onSortChange || sortOptions.length === 0}
                    />
                    <MobileSettingsRow
                      icon={<Columns3 className="h-5 w-5" />}
                      label="Group"
                      disabled
                    />
                  </div>

                  {feat.search && (
                    <div className="overflow-hidden rounded-2xl bg-background">
                      <MobileSettingsRow
                        icon={<Search className="h-5 w-5" />}
                        label="Search"
                        value={searchValue ? "Active" : undefined}
                        onClick={() => {
                          setMobilePanelOpen(false);
                          window.setTimeout(() => setMobileSearchOpen(true), 160);
                        }}
                      />
                    </div>
                  )}

                  {(feat.export && onExport) || mobilePanelActions || (feat.bulkDelete && onBulkDelete) ? (
                    <div className="overflow-hidden rounded-2xl bg-background">
                      {mobilePanelActions}
                      {feat.export && onExport ? (
                        <MobileSettingsRow
                          icon={<Download className="h-5 w-5" />}
                          label="Export"
                          onClick={onExport}
                        />
                      ) : null}
                      {feat.bulkDelete && onBulkDelete ? (
                        <MobileSettingsRow
                          icon={<Trash2 className="h-5 w-5" />}
                          label="Delete selected"
                          value={selectedCount > 0 ? selectedCount : undefined}
                          onClick={selectedCount > 0 ? onBulkDelete : undefined}
                          disabled={selectedCount === 0}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  <p className="px-1 text-xs text-muted-foreground">
                    {filteredItems === totalItems
                      ? `${totalItems} items`
                      : `${filteredItems} of ${totalItems} items`}
                  </p>
                </div>
              </SheetContent>
            </Sheet>

            <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
              <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Search</DialogTitle>
                </DialogHeader>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={mobileSearchInputRef}
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
              </DialogContent>
            </Dialog>

            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetContent side="right" className="w-full max-w-none gap-0 p-0">
                <SheetHeader className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <SheetTitle>Filter</SheetTitle>
                    {activeFilterCount > 0 ? (
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClearFilters}>
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </SheetHeader>
                <div className="max-h-[calc(90dvh-76px)] overflow-y-auto px-4 py-4">
                  <FilterFields
                    filters={filters}
                    activeFilters={activeFilters}
                    onFilterChange={onFilterChange}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={mobileColumnsOpen} onOpenChange={setMobileColumnsOpen}>
              <SheetContent side="right" className="w-full max-w-none gap-0 p-0">
                <SheetHeader className="px-4 py-4">
                  <SheetTitle>Property visibility</SheetTitle>
                </SheetHeader>
                <div className="max-h-[calc(90dvh-76px)] overflow-y-auto px-4 py-4">
                  <div className="overflow-hidden rounded-2xl border bg-background">
                    {columns
                      .filter((column) => !column.alwaysVisible)
                      .map((column) => (
                        <label
                          key={column.id}
                          htmlFor={`mobile-col-toggle-${column.id}`}
                          className="flex min-h-12 items-center gap-3 border-b border-border/70 px-4 py-3 last:border-b-0"
                        >
                          <Checkbox
                            id={`mobile-col-toggle-${column.id}`}
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
                          <span className="text-base text-foreground">{column.label}</span>
                        </label>
                      ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={mobileSortOpen} onOpenChange={setMobileSortOpen}>
              <SheetContent side="right" className="w-full max-w-none gap-0 p-0">
                <SheetHeader className="px-4 py-4">
                  <SheetTitle>Sort</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 px-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="mobile-table-sort-column">
                      Field
                    </label>
                    <Select
                      value={sortBy ?? undefined}
                      onValueChange={(nextSortBy) => {
                        if (!onSortChange) return;
                        onSortChange(nextSortBy, sortDirection);
                      }}
                    >
                      <SelectTrigger id="mobile-table-sort-column" className="h-10 w-full">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Direction</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={sortDirection === "asc" ? "default" : "outline"}
                        onClick={() => {
                          if (!onSortChange || !sortBy) return;
                          onSortChange(sortBy, "asc");
                        }}
                      >
                        Ascending
                      </Button>
                      <Button
                        variant={sortDirection === "desc" ? "default" : "outline"}
                        onClick={() => {
                          if (!onSortChange || !sortBy) return;
                          onSortChange(sortBy, "desc");
                        }}
                      >
                        Descending
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
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

      </div>
    </div>
  );
}
