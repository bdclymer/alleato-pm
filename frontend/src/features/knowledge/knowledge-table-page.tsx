"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import {
  useKnowledgeArticles,
  useDeleteKnowledgeArticle,
  type KnowledgeArticle,
} from "@/hooks/use-company-knowledge";
import {
  knowledgeColumns,
  knowledgeDefaultVisibleColumns,
  knowledgeFilters,
  buildKnowledgeTableColumns,
} from "./knowledge-table-config";
import { KnowledgeFormDialog } from "./knowledge-form-dialog";
import { KnowledgeDetailPanel } from "./knowledge-detail-panel";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KnowledgeTablePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Table state
  const tableState = useUnifiedTableState({
    entityKey: "knowledge",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "updated_at",
      sortDirection: "desc",
      visibleColumns: knowledgeDefaultVisibleColumns,
      filters: {},
    },
  });

  // Data fetching
  const { data: articles = [], isLoading } = useKnowledgeArticles({
    category: (tableState.activeFilters.category as string) ?? undefined,
    search: tableState.debouncedSearch || undefined,
    origin: (tableState.activeFilters.origin as string) ?? undefined,
  });

  // Mutations
  const deleteMutation = useDeleteKnowledgeArticle();

  // UI state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingArticle, setEditingArticle] = React.useState<
    KnowledgeArticle | undefined
  >(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<
    KnowledgeArticle | null
  >(null);
  const [selectedArticle, setSelectedArticle] = React.useState<
    KnowledgeArticle | null
  >(null);

  // Auto-select first row when data loads and nothing is selected
  React.useEffect(() => {
    if (!selectedArticle && articles.length > 0) {
      setSelectedArticle(articles[0]);
    }
  }, [articles, selectedArticle]);

  // Sorting
  const sortedArticles = React.useMemo(() => {
    if (!tableState.sortBy) return articles;
    return [...articles].sort((a, b) => {
      const key = tableState.sortBy as keyof KnowledgeArticle;
      const aVal = a[key] ?? "";
      const bVal = b[key] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return tableState.sortDirection === "desc" ? -cmp : cmp;
    });
  }, [articles, tableState.sortBy, tableState.sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedArticles.length / tableState.perPage);
  const pagedArticles = sortedArticles.slice(
    (tableState.page - 1) * tableState.perPage,
    tableState.page * tableState.perPage,
  );

  // Table columns
  const tableColumns = React.useMemo(
    () =>
      buildKnowledgeTableColumns({
        onEdit: (item) => {
          setEditingArticle(item);
          setFormOpen(true);
        },
        onDelete: (item) => setDeleteTarget(item),
      }),
    [],
  );

  // Handlers
  function handleCreate() {
    setEditingArticle(undefined);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    if (selectedArticle?.id === deleteTarget.id) {
      setSelectedArticle(null);
    }
  }

  function handleRowClick(item: KnowledgeArticle) {
    setSelectedArticle(
      selectedArticle?.id === item.id ? null : item,
    );
  }

  function handleFilterChange(
    filters: Record<string, FilterValue>,
  ) {
    tableState.setActiveFilters(filters);
    tableState.setPage(1);
  }

  function handleExport() {
    const headers = ["Title", "Category", "Tags", "Source", "Content", "Created", "Updated"];
    const rows = sortedArticles.map((a) => [
      a.title,
      a.category,
      (a.tags ?? []).join("; "),
      a.source ?? "",
      a.content.replace(/\n/g, " "),
      new Date(a.created_at).toLocaleDateString(),
      new Date(a.updated_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "knowledge-base-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Active filters for toolbar
  const activeFilters: Record<string, FilterValue> = {};
  if (tableState.activeFilters.category) activeFilters.category = tableState.activeFilters.category;
  if (tableState.activeFilters.origin) activeFilters.origin = tableState.activeFilters.origin;

  const isFiltered =
    !!tableState.debouncedSearch || Object.keys(activeFilters).length > 0;

  return (
    <>
      <UnifiedTablePage<KnowledgeArticle>
        header={{
          title: "Knowledge Base",
          description: "Your team's second brain — capture insights, lessons, and expertise",
          actions: (
            <Button onClick={handleCreate} size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Entry
            </Button>
          ),
        }}
        layout={{
          toolbarInlineWithHeader: true,
        }}
        toolbar={{
          totalItems: articles.length,
          filteredItems: sortedArticles.length,
          selectedCount: 0,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search knowledge base…",
          currentView: tableState.currentView,
          onViewChange: tableState.setCurrentView,
          filters: knowledgeFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => {
            tableState.setActiveFilters({});
            tableState.setPage(1);
          },
          columns: knowledgeColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onExport: handleExport,
        }}
        data={{
          items: pagedArticles,
          isLoading,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          onRowClick: handleRowClick,
          activeRowId: selectedArticle?.id ?? null,
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: (sortBy, direction) => {
            tableState.setSortBy(sortBy);
            tableState.setSortDirection(direction);
          },
        }}
        pagination={{
          page: tableState.page,
          totalPages,
          perPage: tableState.perPage,
          onPageChange: tableState.setPage,
          onPerPageChange: (v) => {
            tableState.setPerPage(parseInt(v));
            tableState.setPage(1);
          },
          clientSide: true,
        }}
        sidePanel={{
          content: selectedArticle ? (
            <KnowledgeDetailPanel
              article={selectedArticle}
              onEdit={() => {
                setEditingArticle(selectedArticle);
                setFormOpen(true);
              }}
              onClose={() => setSelectedArticle(null)}
            />
          ) : null,
        }}
        emptyState={{
          title: "No knowledge entries yet",
          description:
            "Start building your team's second brain by adding insights from meetings, client conversations, and lessons learned.",
          filteredDescription: "No entries match your current filters.",
          isFiltered,
          action: (
            <Button onClick={handleCreate} size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add First Entry
            </Button>
          ),
        }}
        features={{
          enableSearch: true,
          enableFilters: true,
          enableColumnToggle: true,
          enableExport: true,
        }}
      />

      {/* Create/Edit Dialog */}
      <KnowledgeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingArticle(undefined);
        }}
        article={editingArticle}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete knowledge entry?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be removed from the
              knowledge base. This action can be undone by an admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
