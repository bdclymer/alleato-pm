"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout";
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
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
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
import { KnowledgeUploadDialog } from "./knowledge-upload-dialog";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KnowledgeTablePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const isAdmin = profile?.isAdmin === true;

  // Table state
  const tableState = useUnifiedTableState({
    entityKey: "knowledge",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "updated_at",
      sortDirection: "desc",
      visibleColumns: knowledgeDefaultVisibleColumns,
      filters: {},
    },
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const migrationKey = "knowledge:visibleColumns:add-governance-2026-04-29";
    if (window.localStorage.getItem(migrationKey) === "1") return;

    tableState.setVisibleColumns((prev) => {
      const nextColumns = ["content", "approval_status", "visibility", "ai_searchable"];
      const missingColumns = nextColumns.filter((column) => !prev.includes(column));
      if (missingColumns.length === 0) return prev;
      const titleIndex = prev.indexOf("title");
      if (titleIndex === -1) {
        return ["title", ...missingColumns, ...prev];
      }
      return [
        ...prev.slice(0, titleIndex + 1),
        ...missingColumns,
        ...prev.slice(titleIndex + 1),
      ];
    });

    window.localStorage.setItem(migrationKey, "1");
  }, [tableState]);

  // Data fetching
  const { data: articles = [], isLoading } = useKnowledgeArticles({
    category: (tableState.activeFilters.category as string) ?? undefined,
    search: tableState.debouncedSearch || undefined,
    origin: (tableState.activeFilters.origin as string) ?? undefined,
    approvalStatus: (tableState.activeFilters.approvalStatus as string) ?? undefined,
    visibility: (tableState.activeFilters.visibility as string) ?? undefined,
    manage: true,
  });

  // Mutations
  const deleteMutation = useDeleteKnowledgeArticle();

  // UI state
  const [formOpen, setFormOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [editingArticle, setEditingArticle] = React.useState<
    KnowledgeArticle | undefined
  >(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<
    KnowledgeArticle | null
  >(null);

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
  }

  function handleFilterChange(
    filters: Record<string, FilterValue>,
  ) {
    tableState.setActiveFilters(filters);
    tableState.setPage(1);
  }

  function handleExport() {
    const headers = ["Title", "Content", "Category", "Approval", "Visibility", "AI Searchable", "Tags", "Source", "Created", "Updated"];
    const rows = sortedArticles.map((a) => [
      a.title,
      a.content.replace(/\n/g, " "),
      a.category,
      a.approval_status,
      a.visibility,
      a.ai_searchable ? "yes" : "no",
      (a.tags ?? []).join("; "),
      a.source ?? "",
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
  if (tableState.activeFilters.approvalStatus) activeFilters.approvalStatus = tableState.activeFilters.approvalStatus;
  if (tableState.activeFilters.visibility) activeFilters.visibility = tableState.activeFilters.visibility;

  const isFiltered =
    !!tableState.debouncedSearch || Object.keys(activeFilters).length > 0;

  if (isLoadingProfile) {
    return (
      <PageShell
        variant="content"
        title="Manage Knowledge Sources"
        description="Checking your access before loading source management."
      >
        <div className="h-24 animate-pulse rounded-lg bg-muted/30" />
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell
        variant="content"
        title="Manage Knowledge Sources"
        description="Company knowledge source management is limited to admins."
      >
        <div className="space-y-2">
          <p className="text-sm text-foreground">You can still browse approved knowledge from the Knowledge Base.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/knowledge">Open Knowledge Base</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <>
      <UnifiedTablePage<KnowledgeArticle>
        header={{
          title: "Manage Knowledge Sources",
          description: "Admin source manager for company knowledge entries, imports, and AI-searchable content.",
          actions: (
            <div className="flex items-center gap-2">
              <Button onClick={() => setUploadOpen(true)} size="sm" variant="outline">
                <Upload />
                Upload Source
              </Button>
              <Button onClick={handleCreate} size="sm">
                <Plus />
                Add Entry
              </Button>
            </div>
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
          enabledViews: ["table"],
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
        emptyState={{
          title: "No knowledge entries yet",
          description:
            "Start building the company knowledge base by adding approved sources, lessons learned, and operating guidance.",
          filteredDescription: "No entries match your current filters.",
          isFiltered,
          action: (
            <Button onClick={handleCreate} size="sm">
              <Plus />
              Add First Source
            </Button>
          ),
        }}
        features={{
          enableSearch: true,
          enableFilters: true,
          enableColumnToggle: true,
          enableExport: true,
          enableViews: false,
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
      <KnowledgeUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
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
