"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Minus, MessageSquare, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type TableColumn,
} from "@/components/tables/unified";
import { BOARD_STATUS_LABELS, type BoardStatus } from "@/lib/admin-feedback/constants";
import { cn } from "@/lib/utils";
import type { BoardItem } from "./use-product-board";
import type { BoardItemMeta } from "./use-board-item";

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<BoardStatus, string> = {
  submitted: "bg-muted text-muted-foreground",
  planned: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  shipped: "bg-status-success/10 text-status-success",
};

const STATUS_ORDER: Record<BoardStatus, number> = {
  submitted: 0,
  planned: 1,
  in_progress: 2,
  shipped: 3,
};

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const SEVERITY_ICONS: Record<string, ReactElement> = {
  high: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
  medium: <Zap className="h-3.5 w-3.5 text-yellow-500" />,
  low: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

function AssigneeAvatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : email[0].toUpperCase();
  return (
    <div
      className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground"
      title={name ?? email}
    >
      {initials}
    </div>
  );
}

// ─── Column config ────────────────────────────────────────────────────────────

const columnConfigs = [
  { id: "title",         label: "Title",    alwaysVisible: true },
  { id: "board_status",  label: "Status",   defaultVisible: true },
  { id: "severity",      label: "Priority", defaultVisible: true },
  { id: "assignee",      label: "Assignee", defaultVisible: true },
  { id: "due_date",      label: "Due Date", defaultVisible: true },
  { id: "comment_count", label: "Comments", defaultVisible: true },
  { id: "created_at",    label: "Created",  defaultVisible: true },
];

const defaultVisibleColumns = columnConfigs
  .filter((c) => c.defaultVisible !== false || c.alwaysVisible)
  .map((c) => c.id);

// ─── Component ────────────────────────────────────────────────────────────────

interface BoardUnifiedTableProps {
  items: BoardItem[];
  isLoading: boolean;
  error: Error | null;
}

export function BoardUnifiedTable({ items, isLoading, error }: BoardUnifiedTableProps) {
  const pathname = usePathname()!;
  const router = useRouter();
  const searchParams = (useSearchParams() ?? new URLSearchParams()) as NonNullable<ReturnType<typeof useSearchParams>>;

  const tableState = useUnifiedTableState({
    entityKey: "product-board-table",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "board_status",
      sortDirection: "asc",
      visibleColumns: defaultVisibleColumns,
      filters: {},
    },
  });

  // ─── Client-side search + filter ──────────────────────────────────────────

  const filtered = React.useMemo(() => {
    const q = tableState.debouncedSearch.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.comment?.toLowerCase().includes(q),
    );
  }, [items, tableState.debouncedSearch]);

  // ─── Columns ──────────────────────────────────────────────────────────────

  const tableColumns: TableColumn<BoardItem>[] = React.useMemo(
    () => [
      {
        id: "title",
        label: "Title",
        alwaysVisible: true,
        render: (item) => (
          <span className="font-medium line-clamp-2 leading-snug">{item.title}</span>
        ),
        sortable: true,
        sortValue: (item) => item.title,
      },
      {
        id: "board_status",
        label: "Status",
        defaultVisible: true,
        render: (item) => (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
              STATUS_COLORS[item.board_status],
            )}
          >
            {BOARD_STATUS_LABELS[item.board_status]}
          </span>
        ),
        sortable: true,
        sortValue: (item) => STATUS_ORDER[item.board_status],
      },
      {
        id: "severity",
        label: "Priority",
        defaultVisible: true,
        render: (item) =>
          item.severity ? (SEVERITY_ICONS[item.severity] ?? null) : null,
        sortable: true,
        sortValue: (item) => SEVERITY_ORDER[item.severity ?? "low"] ?? 2,
      },
      {
        id: "assignee",
        label: "Assignee",
        defaultVisible: true,
        render: (item) =>
          item.assignee ? (
            <AssigneeAvatar
              name={item.assignee.full_name}
              email={item.assignee.email}
            />
          ) : null,
        sortable: true,
        sortValue: (item) => item.assignee?.full_name ?? item.assignee?.email ?? "",
      },
      {
        id: "due_date",
        label: "Due Date",
        defaultVisible: true,
        render: (item) => {
          const meta = (item.metadata as BoardItemMeta | null) ?? {};
          return meta.due_date ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(meta.due_date), { addSuffix: true })}
            </span>
          ) : null;
        },
        sortable: true,
        sortValue: (item) => {
          const meta = (item.metadata as BoardItemMeta | null) ?? {};
          return meta.due_date ?? "";
        },
      },
      {
        id: "comment_count",
        label: "Comments",
        defaultVisible: true,
        render: (item) =>
          item.comment_count > 0 ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              {item.comment_count}
            </span>
          ) : null,
        sortable: true,
        sortValue: (item) => item.comment_count,
      },
      {
        id: "created_at",
        label: "Created",
        defaultVisible: true,
        render: (item) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        ),
        sortable: true,
        sortValue: (item) => item.created_at,
      },
    ],
    [],
  );

  // ─── Sort ─────────────────────────────────────────────────────────────────

  const sortedItems = React.useMemo(() => {
    if (!tableState.sortBy) return filtered;
    const col = tableColumns.find((c) => c.id === tableState.sortBy);
    const getSortValue = col?.sortValue;
    if (!getSortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const va = getSortValue(a);
      const vb = getSortValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return tableState.sortDirection === "asc" ? -1 : 1;
      if (vb == null) return tableState.sortDirection === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number")
        return tableState.sortDirection === "asc" ? va - vb : vb - va;
      return tableState.sortDirection === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filtered, tableColumns, tableState.sortBy, tableState.sortDirection]);

  const isFiltered = Boolean(tableState.searchInput);
  const totalItems = sortedItems.length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <UnifiedTablePage
      header={{ title: "" }}
      toolbar={{
        totalItems,
        filteredItems: totalItems,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search items...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        filters: [],
        activeFilters: tableState.activeFilters,
        onFilterChange: tableState.setActiveFilters,
        onClearFilters: () => tableState.setActiveFilters({}),
        columns: columnConfigs,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: sortedItems,
        isLoading,
        isFetching: false,
        error: error ?? undefined,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.id,
      }}
      sorting={{
        sortBy: tableState.sortBy,
        sortDirection: tableState.sortDirection,
        onSortChange: (sortBy, direction) => {
          tableState.setSortBy(sortBy);
          tableState.setSortDirection(direction);
          tableState.setSearchParams({ sort: sortBy, sort_dir: direction, page: "1" });
          tableState.setPage(1);
        },
      }}
      selection={{
        selectedIds: tableState.selectedIds,
        onSelectAll: (checked) => {
          tableState.setSelectedIds(checked ? sortedItems.map((i) => i.id) : []);
        },
        onSelectRow: (id, checked) => {
          tableState.setSelectedIds((prev) =>
            checked ? [...prev, String(id)] : prev.filter((x) => x !== String(id)),
          );
        },
      }}
      emptyState={{
        title: "No feature requests yet",
        description: "Submit ideas via the feedback button — they'll appear here automatically.",
        filteredDescription: "Try adjusting your search.",
        isFiltered,
      }}
      pagination={{
        page: tableState.page,
        totalPages: Math.max(1, Math.ceil(totalItems / tableState.perPage)),
        perPage: tableState.perPage,
        onPageChange: (nextPage) => {
          tableState.setPage(nextPage);
          tableState.setSearchParams({ page: String(nextPage) });
        },
        onPerPageChange: (nextPerPage) => {
          const parsed = Number(nextPerPage);
          if (!Number.isFinite(parsed) || parsed <= 0) return;
          tableState.setPerPage(parsed);
          tableState.setSearchParams({ per_page: String(parsed), page: "1" });
          tableState.setPage(1);
        },
      }}
    />
  );
}
