"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import {
  useDocuments,
  useDeleteDocument,
  type ProjectDocument,
} from "@/hooks/use-documents";
import {
  buildDocumentTableColumns,
  projectDocumentColumns,
  projectDocumentDefaultVisibleColumns,
  projectDocumentFilters,
  renderDocumentCard,
  renderDocumentList,
  renderDocumentRowActions,
} from "@/features/documents/project-documents-table-config";
import { DocumentUploadDialog } from "@/features/documents/document-upload-dialog";

// =============================================================================
// Types
// =============================================================================

type FilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: FilterState = {
  status: undefined,
  folder: undefined,
  category: undefined,
};

// =============================================================================
// Component
// =============================================================================

interface DocumentsClientProps {
  projectId: string;
}

export function DocumentsClient({ projectId }: DocumentsClientProps): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = (useSearchParams() ?? new URLSearchParams()) as NonNullable<ReturnType<typeof useSearchParams>>;
  const numericProjectId = Number(projectId);

  // Fetch documents
  const { data: documents = [], isLoading, error } = useDocuments(numericProjectId);
  const deleteDocument = useDeleteDocument(numericProjectId);

  // Dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [documentToDelete, setDocumentToDelete] = React.useState<ProjectDocument | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  // Table state
  const initialFilters: FilterState = {
    status: searchParams.get("status") || undefined,
    folder: searchParams.get("folder") || undefined,
    category: searchParams.get("category") || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "project-documents",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "created_at",
      sortDirection: "desc",
      filters: initialFilters,
    },
  });

  // Initialize visible columns
  React.useEffect(() => {
    if (tableState.visibleColumns.length === 0) {
      tableState.setVisibleColumns(projectDocumentDefaultVisibleColumns);
    }
  }, [tableState.visibleColumns.length, tableState.setVisibleColumns]);

  // Mobile: default to list view
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    if (tableState.currentView !== "table") return;

    tableState.setCurrentView("list");
    tableState.setSearchParams({ view: "list" });
  }, [tableState.currentView, tableState.setCurrentView, tableState.setSearchParams]);

  // ==========================================================================
  // Filtering
  // ==========================================================================

  const activeFilters = tableState.activeFilters as FilterState;
  const searchTerm = tableState.debouncedSearch.trim().toLowerCase();

  const filteredDocuments = documents.filter((doc) => {
    if (activeFilters.status && doc.status !== activeFilters.status) return false;
    if (activeFilters.folder && doc.folder !== activeFilters.folder) return false;
    if (activeFilters.category && doc.category !== activeFilters.category) return false;

    if (!searchTerm) return true;

    const fields = [
      doc.title,
      doc.file_name,
      doc.folder ?? "",
      doc.category ?? "",
      doc.description ?? "",
      doc.uploaded_by ?? "",
    ];

    return fields.some((field) => field.toLowerCase().includes(searchTerm));
  });

  // ==========================================================================
  // Sorting
  // ==========================================================================

  const tableColumns = buildDocumentTableColumns();

  const sortedDocuments = React.useMemo(() => {
    if (!tableState.sortBy) return filteredDocuments;
    const sortColumn = tableColumns.find((col) => col.id === tableState.sortBy);
    const getSortValue = sortColumn?.sortValue;
    if (!getSortValue) return filteredDocuments;

    return [...filteredDocuments].sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);

      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return tableState.sortDirection === "asc" ? -1 : 1;
      if (valueB == null) return tableState.sortDirection === "asc" ? 1 : -1;

      if (typeof valueA === "number" && typeof valueB === "number") {
        return tableState.sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }

      const comparison = String(valueA).localeCompare(String(valueB));
      return tableState.sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredDocuments, tableColumns, tableState.sortBy, tableState.sortDirection]);

  // ==========================================================================
  // Pagination
  // ==========================================================================

  const totalItems = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / tableState.perPage));
  const pageStart = (tableState.page - 1) * tableState.perPage;
  const pageEnd = pageStart + tableState.perPage;
  const pagedDocuments = sortedDocuments.slice(pageStart, pageEnd);

  React.useEffect(() => {
    if (tableState.page > totalPages) {
      tableState.setPage(1);
      tableState.setSearchParams({ page: "1" });
    }
  }, [tableState.page, tableState.setPage, tableState.setSearchParams, totalPages]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleFilterChange = (nextFilters: FilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      folder: typeof nextFilters.folder === "string" ? nextFilters.folder : null,
      category: typeof nextFilters.category === "string" ? nextFilters.category : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleRowClick = (item: ProjectDocument) => {
    if (!item.storage_path && !item.file_url) {
      toast.error("This document does not have a file attached");
      return;
    }

    window.open(
      `/api/projects/${projectId}/documents/${item.id}/download`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleEdit = (_item: ProjectDocument) => {
    // Future: open edit dialog
    toast.info("Edit functionality coming soon");
  };

  const handleDeleteIntent = (item: ProjectDocument) => {
    setDocumentToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      await deleteDocument.mutateAsync(String(documentToDelete.id));
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch {
      // Error toast handled by the hook
    }
  };

  const handleBulkDeleteConfirm = async () => {
    const ids = tableState.selectedIds;
    if (ids.length === 0) return;

    setIsBulkDeleting(true);
    const errors: string[] = [];

    for (const id of ids) {
      try {
        await deleteDocument.mutateAsync(id);
      } catch {
        const doc = documents.find((d) => String(d.id) === id);
        errors.push(doc?.title ?? id);
      }
    }

    tableState.setSelectedIds([]);

    if (errors.length > 0) {
      toast.error(
        `${ids.length - errors.length} deleted, ${errors.length} failed`,
      );
    } else {
      toast.success(
        `${ids.length} document${ids.length === 1 ? "" : "s"} deleted`,
      );
    }

    setIsBulkDeleting(false);
    setBulkDeleteDialogOpen(false);
  };

  const handleExport = () => {
    if (filteredDocuments.length === 0) {
      toast.info("No documents to export");
      return;
    }

    const cols = tableColumns.filter((col) =>
      tableState.visibleColumns.includes(col.id),
    );
    const headers = cols.map((col) => col.label);
    const rows = filteredDocuments.map((doc) =>
      cols
        .map((col) => (col.csvValue ? col.csvValue(doc) : ""))
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-documents-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(pagedDocuments.map((d) => String(d.id)));
    } else {
      tableState.setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds((prev) => [...prev, id]);
    } else {
      tableState.setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.folder) ||
    Boolean(activeFilters.category);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Documents",
          actions: (
            <Button
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
              aria-label="Upload document"
            >
              <Plus />
              Upload
            </Button>
          ),
        }}
        toolbar={{
          totalItems,
          filteredItems: totalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search documents...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          filters: projectDocumentFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: projectDocumentColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onExport: handleExport,
          onBulkDelete:
            tableState.selectedIds.length > 0
              ? () => setBulkDeleteDialogOpen(true)
              : undefined,
        }}
        data={{
          items: pagedDocuments,
          isLoading,
          error: error ?? undefined,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => String(item.id),
          onRowClick: handleRowClick,
          rowActions: (item) =>
            renderDocumentRowActions(
              item,
              projectId,
              handleEdit,
              handleDeleteIntent,
            ),
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: (sortBy, direction) => {
            tableState.setSortBy(sortBy);
            tableState.setSortDirection(direction);
            tableState.setSearchParams({
              sort: sortBy,
              sort_dir: direction,
              page: "1",
            });
            tableState.setPage(1);
          },
        }}
        selection={{
          selectedIds: tableState.selectedIds,
          onSelectAll: handleSelectAll,
          onSelectRow: handleSelectRow,
        }}
        views={{
          card: (item) => renderDocumentCard(item, handleRowClick),
          list: (item) => renderDocumentList(item, handleRowClick),
        }}
        emptyState={{
          title: "No documents yet",
          description:
            "Upload your first document to start managing project files.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered,
          action: (
            <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
              Upload your first document
            </Button>
          ),
        }}
        pagination={{
          page: tableState.page,
          totalPages,
          perPage: tableState.perPage,
          onPageChange: (nextPage) => {
            tableState.setPage(nextPage);
            tableState.setSearchParams({ page: String(nextPage) });
          },
          onPerPageChange: (nextPerPage) => {
            const parsed = Number(nextPerPage);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            tableState.setPerPage(parsed);
            tableState.setSearchParams({
              per_page: String(parsed),
              page: "1",
            });
            tableState.setPage(1);
          },
        }}
      />

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={numericProjectId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{documentToDelete?.title}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDocument.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteDocument.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDocument.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {tableState.selectedIds.length} Document
              {tableState.selectedIds.length === 1 ? "" : "s"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{tableState.selectedIds.length}</strong> selected document
              {tableState.selectedIds.length === 1 ? "" : "s"}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting
                ? "Deleting..."
                : `Delete ${tableState.selectedIds.length} Document${tableState.selectedIds.length === 1 ? "" : "s"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
