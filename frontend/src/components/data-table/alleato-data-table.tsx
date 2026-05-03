"use client";

import * as React from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  flexRender,
  type Header,
  type Row,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronsLeftRight,
  Download,
  GripVertical,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/ds/empty-state";
import { PageShell, PageTabs } from "@/components/layout";
import {
  ColumnToggle,
  ExpandableSearch,
  FilterMenu,
  ViewSwitcher,
  type ColumnConfig,
  type FilterConfig,
  type ViewMode,
} from "@/components/tables/unified/table-toolbar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getColumnPinningStyle } from "@/lib/data-table";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export type TableView = "table" | "grid" | "list";
export type TableDensity = "compact" | "default" | "relaxed";

export interface AleatoDataTableFeatures {
  search?: boolean;
  filters?: boolean;
  viewToggle?: boolean;
  export?: boolean;
  columnVisibility?: boolean;
  columnReorder?: boolean;
  columnPinning?: boolean;
  columnResize?: boolean;
  bulkSelect?: boolean;
  bulkDelete?: boolean;
  density?: boolean;
  totalRow?: boolean;
  rowCount?: boolean;
  pagination?: boolean;
  keyboardNav?: boolean;
}

export interface AleatoDataTableProps<TData> {
  table: TanstackTable<TData>;
  isLoading?: boolean;
  storageKey?: string;
  tabs?: Array<{
    label: string;
    href: string;
    count?: number;
    isActive?: boolean;
    testId?: string;
    countTestId?: string;
  }>;

  title?: string;
  description?: string;
  actions?: React.ReactNode;

  features?: AleatoDataTableFeatures;

  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  views?: {
    grid?: (row: Row<TData>) => React.ReactNode;
    list?: (row: Row<TData>) => React.ReactNode;
  };

  expandedContent?: (row: Row<TData>) => React.ReactNode;

  onBulkDelete?: (ids: string[]) => Promise<void>;
  isBulkDeleting?: boolean;

  onExport?: () => void;

  emptyState?: React.ReactNode;
  className?: string;
}

// ── Feature defaults ─────────────────────────────────────────────────────────

function resolveFeatures(f: AleatoDataTableFeatures = {}): Required<AleatoDataTableFeatures> {
  return {
    search: f.search ?? true,
    filters: f.filters ?? true,
    viewToggle: f.viewToggle ?? true,
    export: f.export ?? true,
    columnVisibility: f.columnVisibility ?? true,
    columnReorder: f.columnReorder ?? true,
    columnPinning: f.columnPinning ?? true,
    columnResize: f.columnResize ?? true,
    bulkSelect: f.bulkSelect ?? true,
    bulkDelete: f.bulkDelete ?? true,
    density: f.density ?? true,
    totalRow: f.totalRow ?? true,
    rowCount: f.rowCount ?? true,
    pagination: f.pagination ?? true,
    keyboardNav: f.keyboardNav ?? true,
  };
}

// ── localStorage helper ───────────────────────────────────────────────────────

function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = React.useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = React.useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {}
    },
    [key],
  );

  return [value, set];
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportToCSV<TData>(table: TanstackTable<TData>, filename: string): void {
  const cols = table
    .getVisibleLeafColumns()
    .filter((c) => c.id !== "select" && c.id !== "actions");

  const header = cols.map((c) => c.columnDef.meta?.label ?? c.id).join(",");

  const rows = table.getFilteredRowModel().rows.map((row) =>
    cols
      .map((col) => {
        const val = row.getValue(col.id);
        if (val == null) return "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str}"`
          : str;
      })
      .join(","),
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Density control (only toolbar element not in table-toolbar.tsx) ───────────

const DENSITY_LABELS: Record<TableDensity, string> = {
  compact: "Compact",
  default: "Default",
  relaxed: "Relaxed",
};

const DENSITY_ROW_CLASS: Record<TableDensity, string> = {
  compact: "[&_td]:py-1 [&_th]:py-1",
  default: "",
  relaxed: "[&_td]:py-4 [&_th]:py-4",
};

function DensityMenu({
  density,
  onChange,
}: {
  density: TableDensity;
  onChange: (d: TableDensity) => void;
}) {
  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Row density"
              >
                <ChevronsLeftRight className="h-4 w-4 rotate-90" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Row density</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuLabel>Row height</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(["compact", "default", "relaxed"] as TableDensity[]).map((d) => (
          <DropdownMenuItem
            key={d}
            onClick={() => onChange(d)}
            className={cn("text-sm", d === density && "font-medium text-primary")}
          >
            {DENSITY_LABELS[d]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Bulk action bar ───────────────────────────────────────────────────────────

function BulkActionBar<TData>({
  table,
  onBulkDelete,
  isDeleting,
}: {
  table: TanstackTable<TData>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  isDeleting?: boolean;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const selected = table.getFilteredSelectedRowModel().rows;

  React.useEffect(() => {
    if (selected.length === 0) setConfirming(false);
  }, [selected.length]);

  if (selected.length === 0) return null;

  const handleDelete = async () => {
    if (!onBulkDelete) return;
    await onBulkDelete(selected.map((r) => r.id));
    setConfirming(false);
    table.resetRowSelection();
  };

  return (
    <div className="flex items-center justify-between rounded-md bg-muted/60 px-4 py-2 text-sm">
      <span className="text-muted-foreground">
        {selected.length} row{selected.length !== 1 ? "s" : ""} selected
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => { setConfirming(false); table.resetRowSelection(); }}
        >
          Deselect all
        </Button>
        {onBulkDelete && !confirming && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete {selected.length}
          </Button>
        )}
        {onBulkDelete && confirming && (
          <>
            <span className="text-xs text-muted-foreground">
              Delete {selected.length} row{selected.length !== 1 ? "s" : ""}?
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setConfirming(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              Confirm
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Draggable column header ───────────────────────────────────────────────────

function DraggableColumnHeader<TData>({
  header,
  table: _table,
  enablePin,
  enableResize,
  enableReorder,
}: {
  header: Header<TData, unknown>;
  table: TanstackTable<TData>;
  enablePin: boolean;
  enableResize: boolean;
  enableReorder: boolean;
}) {
  const column = header.column;
  const sorted = column.getIsSorted();
  const isPinned = column.getIsPinned();

  const { attributes, isDragging, listeners, setNodeRef, transform } = useSortable({
    id: header.column.id,
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : undefined,
    width: header.getSize(),
    position: "relative",
    zIndex: isDragging ? 1 : isPinned ? 1 : 0,
    ...getColumnPinningStyle({ column }),
  };

  const handleSort = () => {
    if (!column.getCanSort()) return;
    column.toggleSorting(sorted === "asc");
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      colSpan={header.colSpan}
      className={cn(
        "group/header select-none",
        isPinned && "bg-card",
      )}
    >
      <div className="flex items-center gap-1">
        {/* Drag handle */}
        {enableReorder && header.column.id !== "select" && header.column.id !== "actions" && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab opacity-0 group-hover/header:opacity-40 hover:!opacity-100 transition-opacity shrink-0"
            title="Drag to reorder column"
          >
            <GripVertical className="h-3 w-3" />
          </span>
        )}

        {/* Header content + sort */}
        {header.isPlaceholder ? null : column.getCanSort() ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSort}
            className="h-auto flex-1 justify-start gap-1 overflow-hidden px-0 py-0 font-medium"
          >
            <span className="truncate">
              {flexRender(header.column.columnDef.header, header.getContext())}
            </span>
            <span className="shrink-0">
              {sorted === "asc" ? (
                <ArrowUp className="h-3 w-3 text-primary" />
              ) : sorted === "desc" ? (
                <ArrowDown className="h-3 w-3 text-primary" />
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/header:opacity-40" />
              )}
            </span>
          </Button>
        ) : (
          <span className="flex flex-1 items-center overflow-hidden">
            {flexRender(header.column.columnDef.header, header.getContext())}
          </span>
        )}

        {/* Pin indicator + pin menu */}
        {enablePin && header.column.id !== "select" && header.column.id !== "actions" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className={cn(
                  "shrink-0 transition-opacity",
                  isPinned
                    ? "opacity-60 hover:opacity-100"
                    : "opacity-0 group-hover/header:opacity-40 hover:!opacity-100",
                )}
                aria-label="Column options"
              >
                <Pin className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuItem
                onClick={() => column.pin("left")}
                disabled={isPinned === "left"}
              >
                <Pin className="mr-2 h-3 w-3 rotate-45" />
                Pin left
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => column.pin("right")}
                disabled={isPinned === "right"}
              >
                <Pin className="mr-2 h-3 w-3 -rotate-45" />
                Pin right
              </DropdownMenuItem>
              {isPinned && (
                <DropdownMenuItem onClick={() => column.pin(false)}>
                  <PinOff className="mr-2 h-3 w-3" />
                  Unpin
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Resize handle */}
      {enableResize && header.column.getCanResize() && (
        <div
          aria-hidden="true"
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onDoubleClick={() => column.resetSize()}
          className={cn(
            "absolute top-0 right-0 h-full w-1 cursor-col-resize select-none touch-none z-10",
            "opacity-0 group-hover/header:opacity-100",
            header.column.getIsResizing()
              ? "bg-primary opacity-100"
              : "hover:bg-border",
          )}
        />
      )}
    </TableHead>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AleatoDataTable<TData>({
  table,
  isLoading,
  storageKey = "table",
  tabs,
  title,
  description,
  actions,
  features: featuresProp,
  searchValue = "",
  onSearchChange,
  searchPlaceholder,
  views,
  expandedContent,
  onBulkDelete,
  isBulkDeleting,
  onExport,
  emptyState,
  className,
}: AleatoDataTableProps<TData>) {
  const f = resolveFeatures(featuresProp);

  // ── State ─────────────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = React.useState<TableView>("table");
  const [density, setDensity] = useLocalStorage<TableDensity>(
    `alleato-${storageKey}-density`,
    "default",
  );

  // Column order (for drag-and-drop)
  const columnIds = React.useMemo(
    () => table.getAllLeafColumns().map((c) => c.id),
    [table],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const currentOrder = table.getState().columnOrder.length
        ? table.getState().columnOrder
        : columnIds;
      const oldIdx = currentOrder.indexOf(active.id as string);
      const newIdx = currentOrder.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return;
      const next = arrayMove(currentOrder, oldIdx, newIdx);
      table.setColumnOrder(next);
      try {
        localStorage.setItem(`alleato-${storageKey}-col-order`, JSON.stringify(next));
      } catch {}
    },
    [table, columnIds, storageKey],
  );

  // Default column visibility (for ColumnToggle reset)
  const defaultVisibility = React.useMemo(() => {
    const vis: Record<string, boolean> = {};
    const initialVis = table.options.initialState?.columnVisibility ?? {};
    table.getAllColumns().forEach((col) => {
      vis[col.id] = initialVis[col.id] !== false && col.columnDef.enableHiding !== false;
    });
    return vis;
  }, [table]);

  // Keyboard navigation
  const [focusedRowIdx, setFocusedRowIdx] = React.useState<number>(-1);
  const tbodyRef = React.useRef<HTMLTableSectionElement>(null);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!f.keyboardNav) return;
      const rows = table.getRowModel().rows;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedRowIdx((i) => Math.min(i + 1, rows.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedRowIdx((i) => Math.max(i - 1, 0));
      }
    },
    [f.keyboardNav, table],
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const hasGridView = Boolean(views?.grid);
  const hasListView = Boolean(views?.list);
  const showViewToggle = f.viewToggle && (hasGridView || hasListView);
  const totalRows = table.getFilteredRowModel().rows.length;
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  const handleExport = () => {
    if (onExport) onExport();
    else exportToCSV(table, title?.toLowerCase().replace(/\s+/g, "-") ?? "export");
  };

  const resolvedEmptyState = emptyState ?? (
    <EmptyState
      title="No results"
      description="Try adjusting your filters or search."
      className="py-12"
    />
  );

  // ── Toolbar — adapters from TanStack state → shared toolbar component props ──

  // FilterMenu adapter: TanStack columnFilters → FilterConfig / activeFilters
  const filterConfigs = React.useMemo<FilterConfig[]>(
    () =>
      table
        .getAllColumns()
        .filter((c) => c.getCanFilter() && c.columnDef.meta?.variant)
        .map((c) => ({
          id: c.id,
          label: c.columnDef.meta?.label ?? c.id,
          type: (
            c.columnDef.meta?.variant === "select" ||
            c.columnDef.meta?.variant === "multiSelect"
              ? "select"
              : c.columnDef.meta?.variant === "dateRange"
                ? "date"
                : (c.columnDef.meta?.variant ?? "text")
          ) as FilterConfig["type"],
          options: c.columnDef.meta?.options,
        })),
    [table],
  );

  const activeFilters = React.useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const filter of table.getState().columnFilters) {
      if (typeof filter.value === "string") out[filter.id] = filter.value;
    }
    return out;
  }, [table]);  

  const handleFilterChange = React.useCallback(
    (next: Record<string, unknown>) => {
      for (const col of table.getAllColumns()) {
        if (!col.getCanFilter()) continue;
        const val = next[col.id];
        col.setFilterValue(val === undefined || val === "" ? undefined : val);
      }
    },
    [table],
  );

  // ColumnToggle adapter: TanStack columns → ColumnConfig / visibleColumns
  const columnConfigs = React.useMemo<ColumnConfig[]>(
    () =>
      table
        .getAllColumns()
        .filter((c) => c.getCanHide())
        .map((c) => ({
          id: c.id,
          label: c.columnDef.meta?.label ?? c.id,
          defaultVisible: defaultVisibility ? (defaultVisibility[c.id] !== false) : true,
        })),
    [table, defaultVisibility],
  );

  const visibleColumnIds = React.useMemo<string[]>(
    () =>
      table
        .getAllColumns()
        .filter((c) => c.getCanHide() && c.getIsVisible())
        .map((c) => c.id),
    [table],  
  );

  const handleColumnVisibilityChange = React.useCallback(
    (ids: string[]) => {
      const next: Record<string, boolean> = {};
      for (const col of table.getAllColumns().filter((c) => c.getCanHide())) {
        next[col.id] = ids.includes(col.id);
      }
      table.setColumnVisibility(next);
    },
    [table],
  );

  const rowCountLabel = f.rowCount ? (
    <span className="whitespace-nowrap text-xs text-muted-foreground">
      {selectedCount > 0
        ? `${selectedCount} of ${totalRows} selected`
        : `${totalRows} row${totalRows !== 1 ? "s" : ""}`}
    </span>
  ) : null;

  const enabledViews: ViewMode[] = [
    "table",
    ...(hasGridView ? (["grid"] as ViewMode[]) : []),
    ...(hasListView ? (["list"] as ViewMode[]) : []),
  ];

  // ── Toolbar icons (shared components + density) ───────────────────────────
  const toolbarIcons = (
    <div className="flex items-center gap-0.5">
      {f.search && onSearchChange && (
        <ExpandableSearch
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
      )}
      {f.filters && filterConfigs.length > 0 && (
        <FilterMenu
          filters={filterConfigs}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={() => table.resetColumnFilters()}
        />
      )}
      {f.density && <DensityMenu density={density} onChange={setDensity} />}
      {f.columnVisibility && columnConfigs.length > 0 && (
        <ColumnToggle
          columns={columnConfigs}
          visibleColumns={visibleColumnIds}
          onColumnVisibilityChange={handleColumnVisibilityChange}
        />
      )}
      {f.export && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleExport}
                aria-label="Export CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  const toolbarViewSwitcher = showViewToggle ? (
    <>
      <ViewSwitcher
        currentView={currentView as ViewMode}
        onViewChange={(v) => setCurrentView(v as TableView)}
        enabledViews={enabledViews}
      />
      <div className="mx-0.5 h-4 w-px bg-border/60" />
    </>
  ) : null;

  // ── Toolbar layout ─────────────────────────────────────────────────────────
  const toolbar = tabs ? (
    <div className="py-2">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-4">
        <PageTabs
          tabs={tabs}
          variant="inline"
          className="-mr-1 mb-0 w-[calc(100vw-0.25rem)] min-w-0 sm:mr-0 sm:w-full md:flex-1"
        />
        <div className="flex min-w-0 items-center justify-between gap-2 md:w-auto md:shrink-0 md:justify-end">
          {toolbarViewSwitcher}
          {toolbarIcons}
          {rowCountLabel ? <div className="md:ml-2">{rowCountLabel}</div> : null}
        </div>
      </div>
    </div>
  ) : (
    <div className="py-2">
      <div className="flex items-center gap-2">
        {toolbarViewSwitcher}
        <div className="ml-auto flex items-center gap-2">
          {toolbarIcons}
          {rowCountLabel}
        </div>
      </div>
    </div>
  );

  // ── Current header column IDs for DnD ─────────────────────────────────────
  const headerColumnIds = React.useMemo(
    () => table.getHeaderGroups()[0]?.headers.map((h) => h.column.id) ?? [],
    [table],  
  );

  // ── Table view ────────────────────────────────────────────────────────────
  const hasFooter =
    f.totalRow && table.getVisibleLeafColumns().some((c) => c.columnDef.footer);

  const tableContent = (
    <div className={cn("overflow-x-auto [scrollbar-width:thin]", DENSITY_ROW_CLASS[density])}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
      >
        <Table style={{ minWidth: "max-content" }}>
          <TableHeader className="sticky top-0 z-20 bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                <SortableContext
                  items={headerColumnIds}
                  strategy={horizontalListSortingStrategy}
                >
                  {headerGroup.headers.map((header) => (
                    <DraggableColumnHeader
                      key={header.id}
                      header={header}
                      table={table}
                      enablePin={f.columnPinning}
                      enableResize={f.columnResize}
                      enableReorder={f.columnReorder}
                    />
                  ))}
                </SortableContext>
              </TableRow>
            ))}
          </TableHeader>

          <TableBody ref={tbodyRef} onKeyDown={handleKeyDown} tabIndex={-1}>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
                <TableRow key={i}>
                  {table.getVisibleLeafColumns().map((col) => (
                    <TableCell key={col.id} style={{ width: col.getSize() }}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row, idx) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    tabIndex={f.keyboardNav ? 0 : undefined}
                    data-focused={focusedRowIdx === idx || undefined}
                    onFocus={() => setFocusedRowIdx(idx)}
                    className={cn(
                      f.keyboardNav && "focus:outline-none focus:bg-muted/60",
                      focusedRowIdx === idx && "bg-muted/40",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                          ...getColumnPinningStyle({ column: cell.column }),
                        }}
                        className={cn(cell.column.getIsPinned() && "bg-card")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && expandedContent && (
                    <TableRow>
                      <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                        {expandedContent(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {resolvedEmptyState}
                </TableCell>
              </TableRow>
            )}
          </TableBody>

          {hasFooter && (
            <TableFooter>
              {table.getFooterGroups().map((fg) => (
                <TableRow key={fg.id}>
                  {fg.headers.map((h) => (
                    <TableHead key={h.id} style={{ width: h.getSize() }}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.footer, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableFooter>
          )}
        </Table>
      </DndContext>
    </div>
  );

  // ── Content ───────────────────────────────────────────────────────────────
  const content = (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {toolbar}

      {f.bulkDelete && (
        <BulkActionBar table={table} onBulkDelete={onBulkDelete} isDeleting={isBulkDeleting} />
      )}

      {currentView === "table" && tableContent}

      {currentView === "grid" && views?.grid && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {table.getRowModel().rows.map((row) => (
            <div key={row.id}>{views.grid?.(row)}</div>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <div className="col-span-full">{resolvedEmptyState}</div>
          )}
        </div>
      )}

      {currentView === "list" && views?.list && (
        <div className="flex flex-col">
          {table.getRowModel().rows.map((row) => (
            <div key={row.id}>{views.list?.(row)}</div>
          ))}
          {table.getRowModel().rows.length === 0 && resolvedEmptyState}
        </div>
      )}

      {f.pagination && <DataTablePagination table={table} />}
    </div>
  );

  if (title ?? description ?? actions) {
    return (
      <PageShell variant="table" title={title ?? ""} description={description} actions={actions}>
        {content}
      </PageShell>
    );
  }

  return content;
}
