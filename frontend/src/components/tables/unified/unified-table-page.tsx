"use client";

import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header-unified";
import { PageContainer, type PageContainerProps } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { EmptyState } from "@/components/ds";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { SimplePagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TableToolbar, type ColumnConfig, type FilterConfig, type ViewMode } from "./table-toolbar";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, EyeOff, Inbox, MoreHorizontal, PanelRightClose, PanelRightOpen, Pin, PinOff, Trash2, X } from "lucide-react";
import { MobileCardList } from "./mobile-card-list";

const INTERACTIVE_ROW_TARGET_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "[role='button']",
  "[role='menuitem']",
  "[contenteditable='true']",
  "[data-row-interactive='true']",
].join(", ");

function isInteractiveRowTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(target.closest(INTERACTIVE_ROW_TARGET_SELECTOR));
}

// Compare string arrays by value to prevent redundant state updates that can trigger render loops.
function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

interface TabItem {
  label: string;
  href: string;
  count?: number;
  isActive?: boolean;
  testId?: string;
  countTestId?: string;
}

export interface TableColumn<T> extends ColumnConfig {
  render: (item: T) => ReactNode;
  csvValue?: (item: T) => string;
  sortable?: boolean;
  sortValue?: (item: T) => string | number | null | undefined;
  editable?: boolean;
  editValue?: (item: T) => string;
  onEdit?: (item: T, value: string) => void | Promise<void>;
  /** Preferred column width in pixels. Applied as default when the user has not manually resized. */
  width?: number;
  /** Custom editor widget (e.g. dropdown select). Receives current value, onChange, onCommit, and onCancel. */
  renderEditor?: (props: {
    item: T;
    value: string;
    onChange: (value: string) => void;
    onCommit: () => void;
    onCancel: () => void;
  }) => ReactNode;
}

export type SortDirection = "asc" | "desc";

export interface UnifiedTableFeatures {
  enableSearch?: boolean;
  enableViews?: boolean;
  enableFilters?: boolean;
  enableColumnToggle?: boolean;
  enableExport?: boolean;
  enableBulkDelete?: boolean;
  enableRowSelection?: boolean;
  enableRowActions?: boolean;
  enableColumnReorder?: boolean;
  enableRowReorder?: boolean;
  enableColumnPinning?: boolean;
  enableVirtualization?: boolean;
  enableInlineEditing?: boolean;
}

export interface UnifiedTablePageProps<T> {
  header: {
    title: string;
    description?: string;
    actions?: ReactNode;
    variant?: "default" | "compact";
  };
  tabs?: TabItem[];
  toolbar: {
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
    activeFilters?: Record<string, string | number | boolean | string[] | null | undefined>;
    onFilterChange?: (filters: Record<string, string | number | boolean | string[] | null | undefined>) => void;
    onClearFilters?: () => void;
    columns?: ColumnConfig[];
    visibleColumns?: string[];
    onColumnVisibilityChange?: (columns: string[]) => void;
    onExport?: () => void;
    onBulkDelete?: () => void;
    mobilePanelActions?: ReactNode;
    /** Extra action buttons rendered in the toolbar icon row (e.g. ERP sync) */
    customActions?: ReactNode;
  };
  data: {
    items: T[];
    isLoading: boolean;
    isFetching?: boolean;
    error?: Error | null;
  };
  table: {
    columns: TableColumn<T>[];
    defaultPinnedLeftColumns?: string[];
    defaultPinnedRightColumns?: string[];
    rowActions?: (item: T) => ReactNode;
    /** Called when user clicks Delete in the default row-actions menu. When provided without custom rowActions, renders a default "⋯" dropdown with Delete. */
    onDelete?: (item: T) => void;
    getRowId: (item: T) => string;
    onRowClick?: (item: T) => void;
    activeRowId?: string | null;
    onTableKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>, visibleItems: T[]) => void;
    autoFocusOnLoad?: boolean;
    stickyHeader?: boolean;
    onRowOrderChange?: (orderedRowIds: string[]) => void;
    /** Density preset. "compact" applies tighter padding and smaller text. */
    density?: "default" | "compact";
    /** Render an expandable sub-row below a table row. Return null to skip. */
    renderExpandedRow?: (
      item: T,
      colSpan: number,
      context?: { columns: Array<{ id: string; width?: number }>; hasSelection: boolean; hasActions: boolean },
    ) => ReactNode | null;
  };
  sorting?: {
    sortBy: string | null;
    sortDirection: SortDirection;
    onSortChange: (sortBy: string, direction: SortDirection) => void;
  };
  selection?: {
    selectedIds: string[];
    onSelectAll: (checked: boolean) => void;
    onSelectRow: (id: string, checked: boolean) => void;
  };
  views?: {
    card?: (item: T) => ReactElement;
    list?: (item: T) => ReactElement;
    /** Group card items by a key. Returns the group label string (or "Ungrouped"). */
    cardGroupBy?: (item: T) => string;
  };
  emptyState: {
    title: string;
    description: string;
    filteredDescription: string;
    isFiltered: boolean;
    icon?: ReactNode;
    action?: ReactNode;
  };
  pagination?: {
    page: number;
    totalPages: number;
    perPage: number;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: string) => void;
    clientSide?: boolean;
  };
  footerTotals?: {
    /** Label shown in the first visible column (default: "Totals") */
    label?: string;
    /** Map of column ID → rendered value for the footer row */
    values: Record<string, ReactNode>;
  };
  topContent?: ReactNode;
  sidePanel?: {
    content: ReactNode;
    widthClassName?: string;
    columnClassName?: string;
    /** Initial width in px (default: 560 = 35rem) */
    defaultWidth?: number;
    /** Minimum drag width in px (default: 480) */
    minWidth?: number;
    /** Maximum drag width in px (default: 960) */
    maxWidth?: number;
    /** Show collapse toggle (default: true) */
    collapsible?: boolean;
    /** Show drag handle for resizing (default: true) */
    resizable?: boolean;
    /** Keep panel sticky to viewport on desktop (default: false) */
    sticky?: boolean;
    /** localStorage key suffix for persisting width/collapsed state */
    storageKey?: string;
  };
  layout?: {
    fullBleedTable?: boolean;
    removeTableFrame?: boolean;
    plainFooterTotals?: boolean;
    headerAlignment?: "left" | "center";
    toolbarInlineWithHeader?: boolean;
    maxWidth?: PageContainerProps["maxWidth"];
    containerClassName?: string;
    /** Override the card-view grid className (default: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4) */
    cardGridClassName?: string;
    /** Remove PageContainer horizontal/vertical padding (default: true) */
    containerPadding?: boolean;
  };
  features?: UnifiedTableFeatures;
  columnGroups?: Array<{ label: string; columnIds: string[] }>;
}

export function UnifiedTablePage<T>({
  header,
  tabs,
  toolbar,
  data,
  table,
  sorting,
  selection,
  views,
  emptyState,
  pagination,
  footerTotals,
  topContent,
  sidePanel,
  layout,
  features,
  columnGroups,
}: UnifiedTablePageProps<T>): ReactElement {
  const resolvedFeatures: Required<UnifiedTableFeatures> = {
    enableSearch: features?.enableSearch ?? true,
    enableViews: features?.enableViews ?? true,
    enableFilters: features?.enableFilters ?? true,
    enableColumnToggle: features?.enableColumnToggle ?? true,
    enableExport: features?.enableExport ?? true,
    enableBulkDelete: features?.enableBulkDelete ?? true,
    enableRowSelection: features?.enableRowSelection ?? true,
    enableRowActions: features?.enableRowActions ?? true,
    enableColumnReorder: features?.enableColumnReorder ?? true,
    enableRowReorder: features?.enableRowReorder ?? true,
    enableColumnPinning: features?.enableColumnPinning ?? true,
    enableVirtualization: features?.enableVirtualization ?? false,
    enableInlineEditing: features?.enableInlineEditing ?? false,
  };
  const selectedIds = selection?.selectedIds ?? [];
  const hasSelectionApi = Boolean(selection);
  const handleSelectAll = selection?.onSelectAll ?? (() => undefined);
  const handleSelectRow = selection?.onSelectRow ?? (() => undefined);
  const hasRowSelection = resolvedFeatures.enableRowSelection && hasSelectionApi;
  const hasRowActions = resolvedFeatures.enableRowActions && Boolean(table.rowActions || table.onDelete);

  // Built-in delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<T | null>(null);

  const handleDeleteIntent = React.useCallback((item: T) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = React.useCallback(() => {
    if (itemToDelete && table.onDelete) {
      table.onDelete(itemToDelete);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  }, [itemToDelete, table]);

  const canRenderCardView =
    resolvedFeatures.enableViews && toolbar.currentView === "card" && Boolean(views?.card);
  const canRenderListView =
    resolvedFeatures.enableViews && toolbar.currentView === "list" && Boolean(views?.list);
  const shouldRenderTableView =
    toolbar.currentView === "table" || (!canRenderCardView && !canRenderListView);
  const isFullBleedTable = layout?.fullBleedTable ?? false;
  const removeTableFrame = layout?.removeTableFrame ?? false;
  const plainFooterTotals = layout?.plainFooterTotals ?? false;
  const headerAlignment = layout?.headerAlignment ?? "left";
  const toolbarInlineWithHeader = layout?.toolbarInlineWithHeader ?? false;
  const containerMaxWidth = layout?.maxWidth ?? "full";
  const containerClassName = layout?.containerClassName;
  const containerPadding = layout?.containerPadding !== false;
  const toolbarColumns: ColumnConfig[] = React.useMemo(
    () =>
      toolbar.columns ??
      table.columns.map((column) => ({
        id: column.id,
        label: column.label,
        defaultVisible: column.defaultVisible,
        alwaysVisible: column.alwaysVisible,
      })),
    [table.columns, toolbar.columns],
  );
  // Always include alwaysVisible columns even if stale localStorage omits them
  const rawVisibleColumns = toolbar.visibleColumns ?? toolbarColumns.map((column) => column.id);
  const visibleColumns = React.useMemo(() => {
    const alwaysVisibleIds = toolbarColumns.filter((c) => c.alwaysVisible).map((c) => c.id);
    const missing = alwaysVisibleIds.filter((id) => !rawVisibleColumns.includes(id));
    return missing.length > 0 ? [...missing, ...rawVisibleColumns] : rawVisibleColumns;
  }, [rawVisibleColumns, toolbarColumns]);
  const activeFilters = toolbar.activeFilters ?? {};
  const handleFilterChange =
    toolbar.onFilterChange ??
    (() => {
      // no-op by default so pages without filters don't need wiring
    });
  const handleClearFilters =
    toolbar.onClearFilters ??
    (() => {
      // no-op by default so pages without filters don't need wiring
    });
  const handleColumnVisibilityChange =
    toolbar.onColumnVisibilityChange ??
    (() => {
      // no-op by default so pages without column picker don't need wiring
    });
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>(visibleColumns);
  const [columnPinning, setColumnPinning] = React.useState<{ left: string[]; right: string[] }>(() => ({
    left: table.defaultPinnedLeftColumns ?? [],
    right: table.defaultPinnedRightColumns ?? [],
  }));
  const [draggedColumnId, setDraggedColumnId] = React.useState<string | null>(null);
  const [rowOrderIds, setRowOrderIds] = React.useState<string[]>([]);
  const [draggedRowId, setDraggedRowId] = React.useState<string | null>(null);
  const [editingCell, setEditingCell] = React.useState<{ rowId: string; columnId: string } | null>(null);
  const [editingValue, setEditingValue] = React.useState("");
  const [inlineEdits, setInlineEdits] = React.useState<Record<string, string>>({});
  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const rowRefs = React.useRef<Record<string, HTMLTableRowElement | null>>({});
  const resizeStateRef = React.useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [isResizingColumn, setIsResizingColumn] = React.useState(false);
  const hasUserManagedColumnOrderRef = React.useRef(false);
  const selectionColumnWidth = isFullBleedTable ? 72 : 44;

  // ── Side panel collapse & resize state ───────────────────────────────
  const panelStorageKey = sidePanel?.storageKey ?? "unified-table-side-panel";
  const panelDefaultWidth = sidePanel?.defaultWidth ?? 560;
  const panelMinWidth = sidePanel?.minWidth ?? 480;
  const panelMaxWidth = sidePanel?.maxWidth ?? 960;
  const panelCollapsible = sidePanel?.collapsible !== false;
  const panelResizable = sidePanel?.resizable !== false;
  const panelSticky = sidePanel?.sticky === true;

  const [panelCollapsed, setPanelCollapsed] = React.useState(false);
  const [panelWidth, setPanelWidth] = React.useState(panelDefaultWidth);
  const [panelMounted, setPanelMounted] = React.useState(false);
  const [isResizingPanel, setIsResizingPanel] = React.useState(false);
  const [panelToggleLeft, setPanelToggleLeft] = React.useState<number | null>(null);
  const panelResizeRef = React.useRef<{ startX: number; startWidth: number } | null>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  React.useEffect(() => {
    if (!sidePanel) return;
    try {
      const stored = localStorage.getItem(`alleato-panel-${panelStorageKey}`);
      if (stored) {
        const parsed = JSON.parse(stored) as { collapsed?: boolean; width?: number };
        if (typeof parsed.collapsed === "boolean") setPanelCollapsed(parsed.collapsed);
        if (typeof parsed.width === "number") {
          const clampedWidth = Math.max(panelMinWidth, Math.min(panelMaxWidth, parsed.width));
          setPanelWidth(clampedWidth);
        }
      }
    } catch { /* ignore */ }
    setPanelMounted(true);
  }, [panelMaxWidth, panelMinWidth, panelStorageKey, sidePanel]);

  const persistPanel = React.useCallback(
    (collapsed: boolean, width: number) => {
      try {
        localStorage.setItem(
          `alleato-panel-${panelStorageKey}`,
          JSON.stringify({ collapsed, width }),
        );
      } catch { /* ignore */ }
    },
    [panelStorageKey],
  );

  const togglePanelCollapsed = React.useCallback(() => {
    setPanelCollapsed((prev) => {
      const next = !prev;
      persistPanel(next, panelWidth);
      return next;
    });
  }, [panelWidth, persistPanel]);

  const updatePanelTogglePosition = React.useCallback(() => {
    if (!sidePanel || !panelMounted) {
      setPanelToggleLeft(null);
      return;
    }
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    const dividerX = panelCollapsed ? gridRect.right : gridRect.right - panelWidth;
    // Button width is 20px (w-5); offset by half width so its center sits on the divider.
    setPanelToggleLeft(dividerX - 10);
  }, [panelCollapsed, panelMounted, panelWidth, sidePanel]);

  // Panel resize drag handlers (mirrors column resize pattern)
  const handlePanelResizeStart = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      panelResizeRef.current = { startX: event.clientX, startWidth: panelWidth };
      setIsResizingPanel(true);
      document.body.style.cursor = "col-resize";
    },
    [panelWidth],
  );

  React.useEffect(() => {
    if (!isResizingPanel) return;

    const handleMouseMove = (event: MouseEvent) => {
      const state = panelResizeRef.current;
      if (!state) return;
      // Dragging left = wider panel (handle is on left edge)
      const delta = state.startX - event.clientX;
      const maxAllowed = Math.min(panelMaxWidth, window.innerWidth * 0.75);
      const next = Math.max(panelMinWidth, Math.min(maxAllowed, state.startWidth + delta));
      setPanelWidth(next);
    };

    const handleMouseUp = () => {
      panelResizeRef.current = null;
      setIsResizingPanel(false);
      document.body.style.cursor = "";
      // Persist final width
      setPanelWidth((w) => {
        persistPanel(panelCollapsed, w);
        return w;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };
  }, [isResizingPanel, panelCollapsed, panelMaxWidth, panelMinWidth, persistPanel]);

  React.useEffect(() => {
    updatePanelTogglePosition();
  }, [updatePanelTogglePosition]);

  React.useEffect(() => {
    if (!sidePanel || !panelMounted) return;

    const syncTogglePosition = () => {
      updatePanelTogglePosition();
    };

    window.addEventListener("resize", syncTogglePosition);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && gridRef.current) {
      observer = new ResizeObserver(syncTogglePosition);
      observer.observe(gridRef.current);
    }

    return () => {
      window.removeEventListener("resize", syncTogglePosition);
      observer?.disconnect();
    };
  }, [panelMounted, sidePanel, updatePanelTogglePosition]);

  const sortedItems = React.useMemo(() => {
    if (!sorting?.sortBy) return data.items;
    const column = table.columns.find((col) => col.id === sorting.sortBy);
    const getSortValue = column?.sortValue;
    if (!getSortValue) return data.items;

    const sorted = [...data.items].sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);

      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return sorting.sortDirection === "asc" ? -1 : 1;
      if (valueB == null) return sorting.sortDirection === "asc" ? 1 : -1;

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sorting.sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }

      const comparison = String(valueA).localeCompare(String(valueB));
      return sorting.sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [data.items, sorting?.sortBy, sorting?.sortDirection, table.columns]);

  React.useEffect(() => {
    if (!hasUserManagedColumnOrderRef.current) {
      setColumnOrder((prev) => (areStringArraysEqual(prev, visibleColumns) ? prev : visibleColumns));
      return;
    }

    setColumnOrder((prev) => {
      const nextVisible = new Set(visibleColumns);
      const preserved = prev.filter((id) => nextVisible.has(id));
      const additions = visibleColumns.filter((id) => !preserved.includes(id));
      const nextOrder = [...preserved, ...additions];
      return areStringArraysEqual(prev, nextOrder) ? prev : nextOrder;
    });
  }, [visibleColumns]);

  const defaultPinnedLeftSignature = React.useMemo(
    () => (table.defaultPinnedLeftColumns ?? []).join("|"),
    [table.defaultPinnedLeftColumns],
  );
  const defaultPinnedRightSignature = React.useMemo(
    () => (table.defaultPinnedRightColumns ?? []).join("|"),
    [table.defaultPinnedRightColumns],
  );

  React.useEffect(() => {
    const nextLeft = table.defaultPinnedLeftColumns ?? [];
    const nextRight = table.defaultPinnedRightColumns ?? [];
    setColumnPinning((prev) => {
      const prevLeft = prev.left.join("|");
      const prevRight = prev.right.join("|");
      if (prevLeft === defaultPinnedLeftSignature && prevRight === defaultPinnedRightSignature) {
        return prev;
      }
      return { left: nextLeft, right: nextRight };
    });
  }, [
    defaultPinnedLeftSignature,
    defaultPinnedRightSignature,
    table.defaultPinnedLeftColumns,
    table.defaultPinnedRightColumns,
  ]);

  const rowOrderedItems = React.useMemo(() => {
    const isManualRowOrderEnabled = resolvedFeatures.enableRowReorder && !sorting?.sortBy;
    if (!isManualRowOrderEnabled) return sortedItems;
    if (rowOrderIds.length === 0) return sortedItems;

    const byId = new Map(sortedItems.map((item) => [table.getRowId(item), item]));
    const ordered = rowOrderIds.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
    const orderedIds = new Set(ordered.map((item) => table.getRowId(item)));
    const remaining = sortedItems.filter((item) => !orderedIds.has(table.getRowId(item)));
    return [...ordered, ...remaining];
  }, [resolvedFeatures.enableRowReorder, rowOrderIds, sortedItems, sorting?.sortBy, table]);

  React.useEffect(() => {
    if (!resolvedFeatures.enableRowReorder || sorting?.sortBy) {
      setRowOrderIds((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const nextIds = rowOrderedItems.map((item) => table.getRowId(item));
    setRowOrderIds((prev) => {
      if (prev.length === 0) {
        return areStringArraysEqual(prev, nextIds) ? prev : nextIds;
      }
      const seen = new Set(nextIds);
      const preserved = prev.filter((id) => seen.has(id));
      const additions = nextIds.filter((id) => !preserved.includes(id));
      const nextOrder = [...preserved, ...additions];
      return areStringArraysEqual(prev, nextOrder) ? prev : nextOrder;
    });
  }, [resolvedFeatures.enableRowReorder, rowOrderedItems, sorting?.sortBy, table]);

  const paginatedItems = React.useMemo(() => {
    if (!pagination?.clientSide) return rowOrderedItems;
    const start = (pagination.page - 1) * pagination.perPage;
    const end = start + pagination.perPage;
    return rowOrderedItems.slice(start, end);
  }, [pagination?.clientSide, pagination?.page, pagination?.perPage, rowOrderedItems]);

  const allSelected =
    rowOrderedItems.length > 0 &&
    rowOrderedItems.every((item) => selectedIds.includes(table.getRowId(item)));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const showEmptyState = !data.isLoading && !data.error && rowOrderedItems.length === 0;
  const showTable = !data.isLoading && !data.error && rowOrderedItems.length > 0;

  const handleSortClick = (columnId: string) => {
    if (!sorting) return;
    const nextDirection =
      sorting.sortBy === columnId && sorting.sortDirection === "asc" ? "desc" : "asc";
    sorting.onSortChange(columnId, nextDirection);
  };

  const renderSortIcon = (columnId: string) => {
    if (!sorting || sorting.sortBy !== columnId) {
      return <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground/0 group-hover/th:text-muted-foreground transition-colors" />;
    }

    return sorting.sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );
  };

  const hideColumn = React.useCallback(
    (columnId: string) => {
      if (visibleColumns.length <= 1) return;
      handleColumnVisibilityChange(visibleColumns.filter((existingId) => existingId !== columnId));
    },
    [handleColumnVisibilityChange, visibleColumns],
  );

  const orderedVisibleColumns = React.useMemo(() => {
    const visibleSet = new Set(visibleColumns);
    const fromOrder = columnOrder.filter((id) => visibleSet.has(id));
    const missing = visibleColumns.filter((id) => !fromOrder.includes(id));
    const merged = [...fromOrder, ...missing];
    const leftPinned = columnPinning.left.filter((id) => merged.includes(id));
    const rightPinned = columnPinning.right.filter((id) => merged.includes(id));
    const unpinned = merged.filter((id) => !leftPinned.includes(id) && !rightPinned.includes(id));
    return [...leftPinned, ...unpinned, ...rightPinned]
      .map((id) => table.columns.find((column) => column.id === id))
      .filter((column): column is TableColumn<T> => Boolean(column));
  }, [columnOrder, columnPinning.left, columnPinning.right, table.columns, visibleColumns]);

  const leftPinnedOffsets = React.useMemo(() => {
    let offset = hasRowSelection ? selectionColumnWidth : 0;
    const result: Record<string, number> = {};
    for (const column of orderedVisibleColumns) {
      if (!columnPinning.left.includes(column.id)) continue;
      result[column.id] = offset;
      offset += columnWidths[column.id] ?? column.width ?? 180;
    }
    return result;
  }, [columnPinning.left, columnWidths, hasRowSelection, orderedVisibleColumns, selectionColumnWidth]);

  const rightPinnedOffsets = React.useMemo(() => {
    let offset = hasRowActions ? 50 : 0;
    const result: Record<string, number> = {};
    for (let index = orderedVisibleColumns.length - 1; index >= 0; index -= 1) {
      const column = orderedVisibleColumns[index];
      if (!columnPinning.right.includes(column.id)) continue;
      result[column.id] = offset;
      offset += columnWidths[column.id] ?? column.width ?? 180;
    }
    return result;
  }, [columnPinning.right, columnWidths, hasRowActions, orderedVisibleColumns]);

  const pinColumn = React.useCallback((columnId: string) => {
    setColumnPinning((prev) => {
      if (prev.left.includes(columnId)) {
        return {
          left: prev.left.filter((id) => id !== columnId),
          right: prev.right.filter((id) => id !== columnId),
        };
      }
      return {
        left: [...prev.left.filter((id) => id !== columnId), columnId],
        right: prev.right.filter((id) => id !== columnId),
      };
    });
  }, []);

  const handleColumnDrop = React.useCallback(
    (targetColumnId: string) => {
      if (!draggedColumnId || draggedColumnId === targetColumnId) return;
      const currentOrder = orderedVisibleColumns.map((column) => column.id);
      const oldIndex = currentOrder.indexOf(draggedColumnId);
      const newIndex = currentOrder.indexOf(targetColumnId);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = [...currentOrder];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      hasUserManagedColumnOrderRef.current = true;
      setColumnOrder(reordered);
      handleColumnVisibilityChange(reordered);
    },
    [draggedColumnId, handleColumnVisibilityChange, orderedVisibleColumns],
  );

  const handleRowDrop = React.useCallback(
    (targetRowId: string) => {
      if (!draggedRowId || draggedRowId === targetRowId) return;
      const currentOrder = rowOrderedItems.map((item) => table.getRowId(item));
      const oldIndex = currentOrder.indexOf(draggedRowId);
      const newIndex = currentOrder.indexOf(targetRowId);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = [...currentOrder];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      setRowOrderIds(reordered);
      table.onRowOrderChange?.(reordered);
    },
    [draggedRowId, rowOrderedItems, table],
  );

  const getPinnedStyle = React.useCallback(
    (columnId: string): React.CSSProperties | undefined => {
      if (!resolvedFeatures.enableColumnPinning) return undefined;
      if (columnPinning.left.includes(columnId)) {
        return {
          position: "sticky",
          left: leftPinnedOffsets[columnId] ?? 0,
          zIndex: 2,
          background: "hsl(var(--background))",
        };
      }
      if (columnPinning.right.includes(columnId)) {
        return {
          position: "sticky",
          right: rightPinnedOffsets[columnId] ?? 0,
          zIndex: 2,
          background: "hsl(var(--background))",
        };
      }
      return undefined;
    },
    [
      columnPinning.left,
      columnPinning.right,
      leftPinnedOffsets,
      resolvedFeatures.enableColumnPinning,
      rightPinnedOffsets,
    ],
  );

  const commitInlineEdit = React.useCallback(
    async (item: T, column: TableColumn<T>, rowId: string, value: string) => {
      const cellKey = `${rowId}::${column.id}`;
      const nextValue = value.trim();
      const currentValue = inlineEdits[cellKey] ?? column.editValue?.(item) ?? "";

      if (nextValue === currentValue) {
        setEditingCell(null);
        setEditingValue("");
        return;
      }

      try {
        if (column.onEdit) {
          await column.onEdit(item, nextValue);
        }
        setInlineEdits((prev) => ({ ...prev, [cellKey]: nextValue }));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update cell value",
        );
      } finally {
        setEditingCell(null);
        setEditingValue("");
      }
    },
    [inlineEdits],
  );

  const rowVirtualizer = useVirtualizer({
    count: paginatedItems.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => 52,
    overscan: 8,
    enabled: resolvedFeatures.enableVirtualization,
  });

  const activateRow = React.useCallback(
    (item: T) => {
      tableScrollRef.current?.focus();
      table.onRowClick?.(item);
      const rowId = table.getRowId(item);
      rowRefs.current[rowId]?.scrollIntoView({ block: "nearest" });
    },
    [table],
  );

  React.useEffect(() => {
    if (!table.autoFocusOnLoad) return;
    if (!showTable || !shouldRenderTableView) return;

    const raf = window.requestAnimationFrame(() => {
      tableScrollRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [showTable, shouldRenderTableView, table.autoFocusOnLoad]);

  const handleTableKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    table.onTableKeyDown?.(event, paginatedItems);
    if (event.defaultPrevented || paginatedItems.length === 0) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Tab") return;
    if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) {
      return;
    }

    event.preventDefault();
    const currentIndex = table.activeRowId
      ? paginatedItems.findIndex((item) => table.getRowId(item) === table.activeRowId)
      : -1;
    const step = event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey) ? -1 : 1;
    const fallbackStart = step > 0 ? 0 : paginatedItems.length - 1;
    const nextIndex =
      currentIndex < 0
        ? fallbackStart
        : Math.min(Math.max(currentIndex + step, 0), paginatedItems.length - 1);
    const nextItem = paginatedItems[nextIndex];
    if (!nextItem) return;
    activateRow(nextItem);
  };

  const handleColumnResizeStart = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>, columnId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const headerCell = event.currentTarget.closest("th");
      if (!(headerCell instanceof HTMLElement)) return;

      resizeStateRef.current = {
        columnId,
        startX: event.clientX,
        startWidth: headerCell.getBoundingClientRect().width,
      };
      setIsResizingColumn(true);
    },
    [],
  );

  React.useEffect(() => {
    if (!isResizingColumn) return;

    const handleMouseMove = (event: MouseEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const deltaX = event.clientX - resizeState.startX;
      const nextWidth = Math.max(120, resizeState.startWidth + deltaX);
      setColumnWidths((prev) => ({
        ...prev,
        [resizeState.columnId]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      resizeStateRef.current = null;
      setIsResizingColumn(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingColumn]);

  const tableToolbar = (
    <TableToolbar
      className={cn("w-full lg:w-auto", toolbarInlineWithHeader && "py-0")}
      totalItems={toolbar.totalItems}
      filteredItems={toolbar.filteredItems}
      selectedCount={toolbar.selectedCount}
      searchValue={toolbar.searchValue}
      onSearchChange={toolbar.onSearchChange}
      searchPlaceholder={toolbar.searchPlaceholder}
      currentView={toolbar.currentView}
      onViewChange={toolbar.onViewChange}
      enabledViews={toolbar.enabledViews}
      filters={toolbar.filters}
      activeFilters={activeFilters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      columns={toolbarColumns}
      visibleColumns={visibleColumns}
      onColumnVisibilityChange={handleColumnVisibilityChange}
      onExport={toolbar.onExport}
      onBulkDelete={toolbar.onBulkDelete}
      mobilePanelActions={toolbar.mobilePanelActions}
      customActions={toolbar.customActions}
      enableSearch={resolvedFeatures.enableSearch}
      enableViews={resolvedFeatures.enableViews}
      enableFilters={resolvedFeatures.enableFilters}
      enableColumnToggle={resolvedFeatures.enableColumnToggle}
      enableExport={resolvedFeatures.enableExport}
      enableBulkDelete={resolvedFeatures.enableBulkDelete && hasRowSelection}
    />
  );

  const isCompactDensity = table.density === "compact";

  const headerContent = (
    <PageHeader
      title={header.title}
      description={isCompactDensity ? undefined : header.description}
      variant={header.variant}
      className={cn("px-0 sm:px-0 lg:px-0", isCompactDensity && "[&>div]:pt-2 [&>div]:pb-2")}
      actions={
        toolbarInlineWithHeader ? (
          <div className="flex items-center gap-2">
            {header.actions}
            {tableToolbar}
          </div>
        ) : (
          header.actions
        )
      }
    />
  );

  // Split content into "above table" (header, tabs, toolbar) and "table area" so
  // the side panel grid can align its top with the table, not the page header.
  const aboveTableContent = (
    <>
      {header.title ? headerContent : null}
      {(tabs || !toolbarInlineWithHeader) && (
        <div className={cn("flex flex-col gap-2 lg:flex-row lg:items-end", isCompactDensity ? "pb-1 pt-0" : cn("pb-3", containerPadding ? "pt-1 sm:pt-2" : "pt-0"), tabs ? "lg:justify-between" : "lg:justify-end")}>
          {tabs && <PageTabs tabs={tabs} variant="inline" className="lg:flex-1" />}
          {!toolbarInlineWithHeader ? tableToolbar : null}
        </div>
      )}
    </>
  );

  const tableAreaContent = (
    <>
      {data.isLoading && (
        <div className="mt-4 space-y-2 py-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {data.error && (
        <div className="mt-4 text-center py-12">
          <p className="text-destructive">{data.error.message}</p>
        </div>
      )}

      {topContent && !data.isLoading && !data.error && <div className="mt-4 space-y-4">{topContent}</div>}

      {showEmptyState && (
        <div className="mt-4">
          <EmptyState
            icon={<Inbox />}
            title={emptyState.title}
            description={
              emptyState.isFiltered
                ? emptyState.filteredDescription
                : emptyState.description
            }
          />
          {!emptyState.isFiltered && emptyState.action && (
            <div className="flex justify-center mt-3">{emptyState.action}</div>
          )}
        </div>
      )}

      {/* Mobile card view */}
      {showTable && shouldRenderTableView && (
        <MobileCardList
          items={paginatedItems}
          columns={orderedVisibleColumns}
          getRowId={table.getRowId}
          activeRowId={table.activeRowId}
          onRowClick={table.onRowClick ? activateRow : undefined}
          isFetching={data.isFetching}
          rowActions={table.rowActions}
          onDelete={table.onDelete ? handleDeleteIntent : undefined}
          hasRowActions={hasRowActions}
        />
      )}

      {/* Desktop table view */}
      {showTable && shouldRenderTableView && (
        <div className={cn("hidden sm:block", data.isFetching && "opacity-70")}>
          <div
            className={cn(
              "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/70",
              removeTableFrame ? "border-0 rounded-none" : "",
              sidePanel
                ? removeTableFrame
                  ? "mx-0 pl-0"
                  : "mx-0 pl-0"
                : isFullBleedTable
                  ? "-mx-4 sm:-mx-6 lg:-mx-8 lg:pl-2"
                  : "mx-0",
            )}
            tabIndex={0}
            onKeyDown={handleTableKeyDown}
            onClick={() => tableScrollRef.current?.focus()}
            ref={tableScrollRef}
            style={resolvedFeatures.enableVirtualization ? { maxHeight: 640, overflowY: "auto" } : undefined}
          >
            <Table className={cn(table.density === "compact" && "[&_thead_tr]:h-9 [&_th]:py-1.5 [&_th]:px-3 [&_td]:py-1.5 [&_td]:px-3 [&_td]:text-xs")}>
              <TableHeader className={cn((table.stickyHeader !== false) && "sticky top-0 z-20 bg-card")}>
                {columnGroups && columnGroups.length > 0 && (
                  <TableRow className="border-b-0">
                    {hasRowSelection && (
                      <TableHead
                        style={{ width: selectionColumnWidth, minWidth: selectionColumnWidth, maxWidth: selectionColumnWidth }}
                        className=""
                      />
                    )}
                    {columnGroups.map((group, index) => {
                      const visibleCount = group.columnIds.filter((id) =>
                        orderedVisibleColumns.some((col) => col.id === id),
                      ).length;
                      if (visibleCount === 0) return null;
                      return (
                        <TableHead
                          key={`group-${group.label}-${group.columnIds.join("-")}`}
                          colSpan={visibleCount}
                          className={cn(
                            "text-left text-[11px] font-medium text-muted-foreground py-0 px-2 leading-tight border-b border-border/70 normal-case",
                            index > 0 && "border-l",
                          )}
                        >
                          {group.label}
                        </TableHead>
                      );
                    })}
                    {hasRowActions && (
                      <TableHead className={cn("w-[56px] pl-2", sidePanel ? "pr-4" : "pr-2")} />
                    )}
                  </TableRow>
                )}
                <TableRow className="border-border/80">
                  {hasRowSelection && (
                    <TableHead
                      className={cn(
                        isFullBleedTable ? "pl-8 pr-2" : "px-2",
                      )}
                      style={{
                        width: selectionColumnWidth,
                        minWidth: selectionColumnWidth,
                        maxWidth: selectionColumnWidth,
                        paddingLeft: isFullBleedTable ? "32px" : undefined,
                        position: "sticky",
                        left: 0,
                        zIndex: 3,
                      }}
                    >
                      <div
                        className={cn(
                          "flex items-center",
                          isFullBleedTable ? "justify-start pl-4" : "justify-center",
                        )}
                      >
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                          aria-label="Select all rows"
                        />
                      </div>
                    </TableHead>
                  )}
                  {orderedVisibleColumns.map((column) => {
                      const isSortable = column.sortable !== false && Boolean(sorting);
                      const isHideable = !column.alwaysVisible;
                      const width = columnWidths[column.id] ?? column.width;
                      const isPinnedLeft = columnPinning.left.includes(column.id);
                      const pinnedStyle = getPinnedStyle(column.id);
                      const headerPinnedStyle = pinnedStyle ?? undefined;
                      const columnStyle =
                        width || headerPinnedStyle
                          ? ({ width, minWidth: columnWidths[column.id] ?? undefined, maxWidth: column.width && !columnWidths[column.id] ? column.width : undefined, ...headerPinnedStyle } as React.CSSProperties)
                          : undefined;
                      const hasContextActions =
                        isSortable || isHideable || resolvedFeatures.enableColumnPinning;
                      return (
                          <TableHead
                            key={column.id}
                            className={cn(
                              "relative align-middle",
                              headerAlignment === "left" ? "text-left" : "text-center",
                              isSortable && "cursor-pointer select-none group/th",
                            )}
                          aria-sort={
                            isSortable
                              ? sorting?.sortBy === column.id
                                ? sorting.sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                              : undefined
                          }
                          style={columnStyle}
                          draggable={resolvedFeatures.enableColumnReorder}
                          onDragStart={() => setDraggedColumnId(column.id)}
                          onDragOver={(event) => {
                            if (!resolvedFeatures.enableColumnReorder) return;
                            event.preventDefault();
                          }}
                          onDrop={() => {
                            if (!resolvedFeatures.enableColumnReorder) return;
                            handleColumnDrop(column.id);
                            setDraggedColumnId(null);
                          }}
                          onDragEnd={() => setDraggedColumnId(null)}
                          onClick={() => {
                            if (isSortable) {
                              handleSortClick(column.id);
                            }
                          }}
                          onContextMenu={(e) => {
                            if (!isHideable) return;
                            e.preventDefault();
                            const btn = e.currentTarget.querySelector<HTMLButtonElement>("button[type='button']");
                            btn?.click();
                          }}
                        >
                          {hasContextActions ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className={cn(
                                    "h-auto gap-1.5 p-0 font-medium uppercase tracking-wide",
                                    "text-xs",
                                    "text-muted-foreground",
                                    headerAlignment === "left" ? "justify-start" : "justify-center",
                                  )}
                                  onContextMenu={(event) => {
                                    event.preventDefault();
                                    event.currentTarget.click();
                                  }}
                                >
                                  <span>{column.label}</span>
                                  {isSortable && renderSortIcon(column.id)}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {isSortable && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        sorting?.onSortChange(column.id, "asc");
                                      }}
                                    >
                                      <ArrowUp className="mr-2 h-3.5 w-3.5" />
                                      Sort ascending
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        sorting?.onSortChange(column.id, "desc");
                                      }}
                                    >
                                      <ArrowDown className="mr-2 h-3.5 w-3.5" />
                                      Sort descending
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {resolvedFeatures.enableColumnPinning && (
                                  <>
                                    {isSortable && <DropdownMenuSeparator />}
                                    <DropdownMenuItem
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        pinColumn(column.id);
                                      }}
                                    >
                                      {columnPinning.left.includes(column.id) ? (
                                        <>
                                          <PinOff className="mr-2 h-3.5 w-3.5" />
                                          Unpin column
                                        </>
                                      ) : (
                                        <>
                                          <Pin className="mr-2 h-3.5 w-3.5" />
                                          Pin column
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {isHideable && (
                                  <>
                                    {(isSortable || resolvedFeatures.enableColumnPinning) && (
                                      <DropdownMenuSeparator />
                                    )}
                                    <DropdownMenuItem
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        hideColumn(column.id);
                                      }}
                                    >
                                      <EyeOff className="mr-2 h-3.5 w-3.5" />
                                      Hide column
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <div
                              className={cn(
                                "flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                                headerAlignment === "left" ? "justify-start" : "justify-center",
                              )}
                            >
                              <span>{column.label}</span>
                            </div>
                          )}
                          <div
                            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none hover:bg-border active:bg-primary/40 transition-colors"
                            onMouseDown={(event) => handleColumnResizeStart(event, column.id)}
                            aria-hidden="true"
                          />
                        </TableHead>
                      );
                    })}
                  {hasRowActions && (
                    <TableHead className={cn("w-[56px] pl-2", sidePanel ? "pr-4" : "pr-2")} />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody
                style={
                  resolvedFeatures.enableVirtualization
                    ? ({
                        position: "relative",
                        height: `${rowVirtualizer.getTotalSize()}px`,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                {(resolvedFeatures.enableVirtualization
                  ? rowVirtualizer.getVirtualItems().map((virtualRow) => ({
                      item: paginatedItems[virtualRow.index],
                      key: table.getRowId(paginatedItems[virtualRow.index]!),
                      style: {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                        height: `${virtualRow.size}px`,
                      } as React.CSSProperties,
                    }))
                  : paginatedItems.map((item) => ({
                      item,
                      key: table.getRowId(item),
                      style: undefined,
                    }))).map(({ item, key, style }) => (
                  <React.Fragment key={key}>
                  <TableRow
                    ref={(element) => {
                      rowRefs.current[key] = element;
                    }}
                    className={cn(
                      "group/row cursor-pointer transition-colors duration-150",
                      "hover:bg-muted",
                      table.activeRowId === table.getRowId(item) && "bg-muted",
                      selectedIds.includes(table.getRowId(item)) && "bg-muted/50",
                    )}
                    style={style}
                    draggable={
                      resolvedFeatures.enableRowReorder &&
                      !sorting?.sortBy &&
                      !resolvedFeatures.enableVirtualization
                    }
                    onDragStart={() => setDraggedRowId(table.getRowId(item))}
                    onDragOver={(event) => {
                      if (!(resolvedFeatures.enableRowReorder && !sorting?.sortBy)) return;
                      event.preventDefault();
                    }}
                    onDrop={() => {
                      if (!(resolvedFeatures.enableRowReorder && !sorting?.sortBy)) return;
                      handleRowDrop(table.getRowId(item));
                      setDraggedRowId(null);
                    }}
                    onDragEnd={() => setDraggedRowId(null)}
                    onClick={(event) => {
                      if (isInteractiveRowTarget(event.target)) {
                        return;
                      }
                      activateRow(item);
                    }}
                    tabIndex={table.onRowClick ? 0 : undefined}
                    onKeyDown={table.onRowClick ? (event) => {
                      if (isInteractiveRowTarget(event.target)) {
                        return;
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        activateRow(item);
                      }
                    } : undefined}
                  >
                    {hasRowSelection && (
                      <TableCell
                        className={cn(
                          isFullBleedTable ? "pl-8 pr-2" : "px-2",
                        )}
                        style={{
                          width: selectionColumnWidth,
                          minWidth: selectionColumnWidth,
                          maxWidth: selectionColumnWidth,
                          paddingLeft: isFullBleedTable ? "32px" : undefined,
                          position: "sticky",
                          left: 0,
                          zIndex: 2,
                          background: "hsl(var(--background))",
                        }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div
                          className={cn(
                            "flex items-center",
                            isFullBleedTable ? "justify-start pl-4" : "justify-center",
                          )}
                        >
                          <Checkbox
                            checked={selectedIds.includes(table.getRowId(item))}
                            onCheckedChange={(checked) =>
                              handleSelectRow(table.getRowId(item), Boolean(checked))
                            }
                            aria-label="Select row"
                          />
                        </div>
                      </TableCell>
                    )}
                    {orderedVisibleColumns.map((column) => (
                        <TableCell
                          key={column.id}
                          style={
                            columnWidths[column.id] || column.width || getPinnedStyle(column.id)
                              ? ({
                                  width: columnWidths[column.id] ?? column.width,
                                  minWidth: columnWidths[column.id] ?? undefined,
                                  maxWidth: column.width && !columnWidths[column.id] ? column.width : undefined,
                                  ...getPinnedStyle(column.id),
                                } as React.CSSProperties)
                              : undefined
                          }
                          onClick={(event) => {
                            if (!resolvedFeatures.enableInlineEditing) return;
                            if (!column.editable || !column.editValue) return;
                            event.stopPropagation();
                            const rowId = table.getRowId(item);
                            const cellKey = `${rowId}::${column.id}`;
                            setEditingCell({ rowId, columnId: column.id });
                            setEditingValue(inlineEdits[cellKey] ?? column.editValue(item));
                          }}
                          className={cn(
                            resolvedFeatures.enableInlineEditing && column.editable && column.editValue
                              ? "cursor-text hover:bg-muted/60 transition-colors"
                              : "",
                          )}
                        >
                          {editingCell?.rowId === table.getRowId(item) &&
                          editingCell.columnId === column.id &&
                          resolvedFeatures.enableInlineEditing &&
                          column.editable &&
                          column.editValue ? (
                            column.renderEditor ? (
                              column.renderEditor({
                                item,
                                value: editingValue,
                                onChange: setEditingValue,
                                onCommit: () =>
                                  void commitInlineEdit(
                                    item,
                                    column,
                                    table.getRowId(item),
                                    editingValue,
                                  ),
                                onCancel: () => {
                                  setEditingCell(null);
                                  setEditingValue("");
                                },
                              })
                            ) : (
                            <input
                              className="h-7 w-full rounded border border-border bg-background px-2 text-sm -my-0.5"
                              value={editingValue}
                              autoFocus
                              onChange={(event) => setEditingValue(event.target.value)}
                              onClick={(event) => event.stopPropagation()}
                              onBlur={() =>
                                commitInlineEdit(
                                  item,
                                  column,
                                  table.getRowId(item),
                                  editingValue,
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void commitInlineEdit(
                                    item,
                                    column,
                                    table.getRowId(item),
                                    editingValue,
                                  );
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  setEditingCell(null);
                                  setEditingValue("");
                                }
                                if (event.key === "Tab") {
                                  void commitInlineEdit(
                                    item,
                                    column,
                                    table.getRowId(item),
                                    editingValue,
                                  );
                                }
                              }}
                            />
                            )
                          ) : (
                            column.render(item)
                          )}
                        </TableCell>
                      ))}
                    {hasRowActions && (
                      <TableCell
                        className={cn("pl-2", sidePanel ? "pr-4" : "pr-2")}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {table.rowActions ? table.rowActions(item) : table.onDelete ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteIntent(item)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    )}
                  </TableRow>
                  {!resolvedFeatures.enableVirtualization &&
                    table.renderExpandedRow?.(
                      item,
                      orderedVisibleColumns.length + (hasRowSelection ? 1 : 0) + (hasRowActions ? 1 : 0),
                      {
                        columns: orderedVisibleColumns.map((c) => ({ id: c.id, width: columnWidths[c.id] ?? c.width })),
                        hasSelection: hasRowSelection,
                        hasActions: hasRowActions,
                      },
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
              {footerTotals && (
                <TableFooter>
                  <TableRow className={cn("font-medium", "bg-transparent")}>
                    {hasRowSelection && <TableCell />}
                    {orderedVisibleColumns.map((column, index) => {
                        const width = columnWidths[column.id];
                        const columnStyle = width
                          ? ({ width, minWidth: width, ...getPinnedStyle(column.id) } as React.CSSProperties)
                          : undefined;
                        const value = footerTotals.values[column.id];
                        if (index === 0 && !value) {
                          return (
                            <TableCell key={column.id} className="font-semibold" style={columnStyle}>
                              {footerTotals.label ?? "Totals"}
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={column.id} className="font-semibold" style={columnStyle}>
                            {value ?? null}
                          </TableCell>
                        );
                      })}
                    {hasRowActions && <TableCell />}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </div>
      )}

      {showTable && canRenderCardView && (() => {
        const CardView = views?.card;
        const groupFn = views?.cardGroupBy;
        const gridCls = cn("grid", layout?.cardGridClassName ?? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4");

        if (groupFn) {
          const groups = new Map<string, T[]>();
          for (const item of rowOrderedItems) {
            const key = groupFn(item);
            const arr = groups.get(key);
            if (arr) arr.push(item); else groups.set(key, [item]);
          }
          return (
            <div className="mt-4 space-y-6">
              {Array.from(groups.entries()).map(([label, items]) => (
                <div key={label}>
                  {/* eslint-disable-next-line design-system/no-raw-heading */}
                  <h3 className="text-sm font-semibold text-foreground mb-3 px-0.5">{label}</h3>
                  <div className={gridCls}>
                    {items.map((item) => (
                      <React.Fragment key={table.getRowId(item)}>
                        {CardView ? CardView(item) : null}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        return (
          <div className={cn("mt-4", gridCls)}>
            {rowOrderedItems.map((item) => (
              <React.Fragment key={table.getRowId(item)}>
                {CardView ? CardView(item) : null}
              </React.Fragment>
            ))}
          </div>
        );
      })()}

      {showTable && canRenderListView && (
        <div className="mt-4 space-y-1">
          {rowOrderedItems.map((item) => {
            const ListView = views?.list;
            return (
              <React.Fragment key={table.getRowId(item)}>
                {ListView ? ListView(item) : null}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-4 items-center justify-between pt-6 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select value={String(pagination.perPage)} onValueChange={pagination.onPerPageChange}>
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue placeholder={String(pagination.perPage)} />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100, 150].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SimplePagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </>
  );

  // For non-sidePanel pages, combine header + table into one block
  const leftPaneContent = (
    <>
      {aboveTableContent}
      <div>
        {tableAreaContent}
      </div>
    </>
  );

  return (
    <>
      <PageContainer
        maxWidth={containerMaxWidth}
        padding={containerPadding}
        className={cn(
          "pb-12",
          sidePanel && "pt-0 pr-0 sm:pr-0 lg:pr-0 overflow-x-visible",
          containerClassName,
        )}
      >
        {sidePanel ? (
          <>
            <div className={cn(containerPadding && "pr-4 sm:pr-6 lg:pr-8")}>
              {aboveTableContent}
            </div>
            <div
              ref={gridRef}
              className={cn(
                "relative grid grid-cols-1",
                isFullBleedTable &&
                  (sidePanel
                    ? "-ml-4 sm:-ml-6 lg:-ml-8"
                    : "-mx-4 sm:-mx-6 lg:-mx-8"),
                !panelMounted && "lg:grid-cols-[minmax(0,1fr)_35rem]",
                !panelMounted && sidePanel.columnClassName,
              )}
              style={
                panelMounted
                  ? {
                      gridTemplateColumns: panelCollapsed
                        ? "minmax(0, 1fr)"
                        : `minmax(0, 1fr) ${panelWidth}px`,
                      transition: isResizingPanel
                        ? "none"
                        : "grid-template-columns 200ms ease-in-out",
                    }
                  : undefined
              }
            >
              <div className="min-w-0">{tableAreaContent}</div>

              {/* Side panel with resize handle */}
              <aside
                className={cn(
                  "hidden lg:flex lg:flex-col bg-muted border-b border-l border-border/50 relative",
                  panelSticky
                    ? "lg:sticky lg:top-12 lg:max-h-[calc(100dvh-3rem)]"
                    : "lg:relative lg:max-h-none",
                  panelCollapsed ? "lg:!hidden" : "lg:overflow-y-auto",
                  sidePanel.widthClassName,
                )}
              >
                {panelResizable && (
                  <div
                    className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize select-none z-10 hover:bg-primary/20 active:bg-primary/30 transition-colors"
                    onMouseDown={handlePanelResizeStart}
                    aria-hidden="true"
                  />
                )}
                <div className="flex-1 flex flex-col min-h-0 px-4">
                  {sidePanel.content}
                </div>
              </aside>

              {/* Collapse/expand toggle button */}
              {panelCollapsible && panelMounted && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={togglePanelCollapsed}
                  className={cn(
                    "hidden lg:flex",
                    "fixed z-20 top-1/2 -translate-y-1/2",
                    "h-10 w-5",
                    "text-muted-foreground",
                    "transition-colors",
                    "opacity-0 hover:opacity-100 focus-visible:opacity-100",
                  )}
                  style={{
                    left: panelToggleLeft ?? undefined,
                    right: panelToggleLeft == null ? (panelCollapsed ? -2 : panelWidth - 10) : undefined,
                    transition: isResizingPanel
                      ? "none"
                      : panelToggleLeft == null
                        ? "right 200ms ease-in-out"
                        : "left 200ms ease-in-out",
                  }}
                  aria-label={panelCollapsed ? "Expand panel" : "Collapse panel"}
                >
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-background shadow-sm">
                    {panelCollapsed ? (
                      <PanelRightOpen className="h-3 w-3" />
                    ) : (
                      <PanelRightClose className="h-3 w-3" />
                    )}
                  </span>
                </Button>
              )}
            </div>
          </>
        ) : (
          leftPaneContent
        )}
      </PageContainer>

      {/* Mobile side panel overlay */}
      {sidePanel && table.activeRowId && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background sm:hidden">
          <div className="flex items-center justify-between border-b border-border px-4 h-12">
            <span className="text-sm font-medium">Details</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.onRowClick?.(null as unknown as T)}
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sidePanel.content}
          </div>
        </div>
      )}

      {table.onDelete && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this item? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
