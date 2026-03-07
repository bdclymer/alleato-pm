"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, Edit, MoreHorizontal, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
  type FilterConfig,
  type ColumnConfig,
  type TableColumn,
} from "@/components/tables/unified";
import {
  usePunchItems,
  useCreatePunchItem,
  useUpdatePunchItem,
  useDeletePunchItem,
  useRestorePunchItem,
} from "@/hooks/use-punch-items";
import {
  PunchItemFormDialog,
  type PunchItemFormValues,
} from "@/components/domain/punch-items/punch-item-form-dialog";
import {
  PunchItemStatusBadge,
  PunchItemPriorityBadge,
} from "@/components/domain/punch-items/punch-item-status-badge";
import type { Database } from "@/types/database.types";

type PunchItemRow = Database["public"]["Tables"]["punch_items"]["Row"];
type PunchFilterState = Record<string, FilterValue>;

interface PunchListClientProps {
  projectId: number;
}

const punchColumns: ColumnConfig[] = [
  { id: "number", label: "#", alwaysVisible: true },
  { id: "title", label: "Title", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "priority", label: "Priority", defaultVisible: true },
  { id: "assignee_company", label: "Assignee", defaultVisible: true },
  { id: "location", label: "Location", defaultVisible: true },
  { id: "trade", label: "Trade", defaultVisible: true },
  { id: "due_date", label: "Due Date", defaultVisible: true },
];

const punchDefaultVisibleColumns = punchColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

const punchFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "work_required", label: "Work Required" },
      { value: "initiated", label: "Initiated" },
      { value: "closed", label: "Closed" },
    ],
  },
  {
    id: "priority",
    label: "Priority",
    type: "select",
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
  },
];

const EMPTY_FILTERS: PunchFilterState = {
  status: undefined,
  priority: undefined,
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function buildPunchColumns(): TableColumn<PunchItemRow>[] {
  return [
    {
      ...punchColumns[0],
      render: (item) => (
        <span className="font-medium text-primary">#{item.number}</span>
      ),
      sortValue: (item) => item.number,
    },
    {
      ...punchColumns[1],
      render: (item) => <span>{item.title}</span>,
      sortValue: (item) => item.title,
    },
    {
      ...punchColumns[2],
      render: (item) => <PunchItemStatusBadge status={item.status} />,
      sortValue: (item) => item.status,
    },
    {
      ...punchColumns[3],
      render: (item) => <PunchItemPriorityBadge priority={item.priority} />,
      sortValue: (item) => item.priority ?? "",
    },
    {
      ...punchColumns[4],
      render: (item) => <span>{item.assignee_company || "-"}</span>,
      sortValue: (item) => item.assignee_company ?? "",
    },
    {
      ...punchColumns[5],
      render: (item) => <span>{item.location || "-"}</span>,
      sortValue: (item) => item.location ?? "",
    },
    {
      ...punchColumns[6],
      render: (item) => <span>{item.trade || "-"}</span>,
      sortValue: (item) => item.trade ?? "",
    },
    {
      ...punchColumns[7],
      render: (item) => <span>{formatDate(item.due_date)}</span>,
      sortValue: (item) => (item.due_date ? new Date(item.due_date).getTime() : 0),
    },
  ];
}

export function PunchListClient({ projectId }: PunchListClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "items";
  const isRecycleBin = activeTab === "recycle-bin";

  const initialFilters: PunchFilterState = {
    status: searchParams.get("status") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "punch-list",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "number",
      sortDirection: "desc",
      visibleColumns: punchDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<PunchItemRow | null>(null);

  const createMutation = useCreatePunchItem(projectId);
  const updateMutation = useUpdatePunchItem(projectId);
  const deleteMutation = useDeletePunchItem(projectId);
  const restoreMutation = useRestorePunchItem(projectId);

  const { data: listData, isLoading } = usePunchItems(projectId, {
    is_deleted: isRecycleBin,
    status:
      typeof (tableState.activeFilters as PunchFilterState).status === "string"
        ? String((tableState.activeFilters as PunchFilterState).status)
        : undefined,
    priority:
      typeof (tableState.activeFilters as PunchFilterState).priority === "string"
        ? String((tableState.activeFilters as PunchFilterState).priority)
        : undefined,
  });

  const items: PunchItemRow[] = listData?.items ?? [];
  const activeFilters = tableState.activeFilters as PunchFilterState;

  const filteredItems = React.useMemo(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    if (!search) return items;

    return items.filter((item) => {
      return (
        String(item.number ?? "").toLowerCase().includes(search) ||
        (item.title ?? "").toLowerCase().includes(search) ||
        (item.assignee_company ?? "").toLowerCase().includes(search) ||
        (item.location ?? "").toLowerCase().includes(search) ||
        (item.trade ?? "").toLowerCase().includes(search)
      );
    });
  }, [items, tableState.debouncedSearch]);

  const tableColumns = React.useMemo(() => buildPunchColumns(), []);

  const tabs = [
    {
      label: "Items",
      href: `/${projectId}/punch-list`,
      count: !isRecycleBin ? filteredItems.length : undefined,
      isActive: !isRecycleBin,
    },
    {
      label: "Recycle Bin",
      href: `/${projectId}/punch-list?tab=recycle-bin`,
      count: isRecycleBin ? filteredItems.length : undefined,
      isActive: isRecycleBin,
    },
  ];

  const handleCreate = (data: PunchItemFormValues) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setFormOpen(false);
      },
    });
  };

  const handleEditSubmit = (data: PunchItemFormValues) => {
    if (!editingItem) return;
    updateMutation.mutate(
      { punchItemId: editingItem.id, data },
      {
        onSuccess: () => {
          setEditingItem(null);
        },
      },
    );
  };

  const handleDelete = (punchItemId: string) => {
    deleteMutation.mutate(punchItemId);
  };

  const handleRestore = async (punchItemId: string) => {
    try {
      await restoreMutation.mutateAsync(punchItemId);
    } catch {
      toast.error("Failed to restore punch item");
    }
  };

  const handleFilterChange = (nextFilters: PunchFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      priority: typeof nextFilters.priority === "string" ? nextFilters.priority : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.priority);

  const renderRowActions = (item: PunchItemRow): ReactElement => {
    if (isRecycleBin) {
      return (
        <Button variant="ghost" size="sm" onClick={() => handleRestore(item.id)}>
          <RotateCcw className="mr-1 h-4 w-4" />
          Restore
        </Button>
      );
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditingItem(item)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Punch List",
          description: "Track and manage punch list items",
          actions: (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Punch Item
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>CSV</DropdownMenuItem>
                  <DropdownMenuItem>PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        }}
        tabs={tabs}
        toolbar={{
          totalItems: items.length,
          filteredItems: filteredItems.length,
          selectedCount: 0,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: isRecycleBin ? "Search deleted punch items..." : "Search punch items...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          enabledViews: ["table", "card", "list"],
          filters: punchFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: punchColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
        }}
        data={{
          items: filteredItems,
          isLoading,
          isFetching: false,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          rowActions: renderRowActions,
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: (sortBy, direction) => {
            tableState.setSortBy(sortBy);
            tableState.setSortDirection(direction);
            tableState.setSearchParams({ sort: sortBy, sort_dir: direction });
          },
        }}
        views={{
          card: (item) => (
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Punch #{item.number}</p>
                  <h3 className="font-medium">{item.title || "Untitled Punch Item"}</h3>
                </div>
                <PunchItemStatusBadge status={item.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Assignee: {item.assignee_company || "-"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Due: {formatDate(item.due_date)}</p>
            </div>
          ),
          list: (item) => (
            <div className="flex items-center justify-between rounded-md px-4 py-2">
              <div>
                <p className="text-sm font-medium">#{item.number}</p>
                <p className="text-xs text-muted-foreground">{item.title || "Untitled Punch Item"}</p>
              </div>
              <PunchItemStatusBadge status={item.status} />
            </div>
          ),
        }}
        emptyState={{
          title: isRecycleBin ? "Recycle Bin is empty" : "No punch items found",
          description: isRecycleBin
            ? "Deleted punch items will appear here."
            : "Create your first punch item to get started.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered,
          action: isRecycleBin ? undefined : (
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first punch item
            </Button>
          ),
        }}
        features={{
          enableExport: false,
          enableBulkDelete: false,
          enableRowSelection: false,
        }}
      />
      <PunchItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        mode="create"
      />
      <PunchItemFormDialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        onSubmit={handleEditSubmit}
        defaultValues={editingItem ?? undefined}
        isLoading={updateMutation.isPending}
        mode="edit"
      />
    </>
  );
}
