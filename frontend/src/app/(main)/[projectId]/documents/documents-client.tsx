"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
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
  useUpdateDocumentInline,
  type ProjectDocument,
} from "@/hooks/use-documents";
import {
  buildDocumentTableColumns,
  inferProjectDocumentFormat,
  projectDocumentColumns,
  projectDocumentDefaultVisibleColumns,
  projectDocumentFilters,
  renderDocumentCard,
  renderDocumentList,
  renderDocumentRowActions,
} from "@/features/documents/project-documents-table-config";
import { DocumentUploadDialog } from "@/features/documents/document-upload-dialog";
import { DocumentEditDialog } from "@/features/documents/document-edit-dialog";

// =============================================================================
// Types
// =============================================================================

type FilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: FilterState = {
  status: undefined,
  folder: undefined,
  category: undefined,
  format: undefined,
  uploaded_by: undefined,
  created_at_from: undefined,
  created_at_to: undefined,
};

const FORMAT_FILTER_OPTIONS = [
  { value: "PDF", label: "PDF" },
  { value: "Document", label: "Document" },
  { value: "Spreadsheet", label: "Spreadsheet" },
  { value: "Image", label: "Image" },
  { value: "Video", label: "Video" },
  { value: "Code", label: "Code" },
  { value: "File", label: "File" },
];

function sortValueForDate(value: string | null | undefined): number {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

// =============================================================================
// Component
// =============================================================================

interface DocumentsClientProps {
  projectId: string;
}

export function DocumentsClient({
  projectId,
}: DocumentsClientProps): ReactElement {
  const router = useRouter();
  const pathname = usePathname()!;
  const searchParams = (useSearchParams() ??
    new URLSearchParams()) as NonNullable<ReturnType<typeof useSearchParams>>;
  const numericProjectId = Number(projectId);

  // Fetch documents
  const {
    data: documents = [],
    isLoading,
    error,
  } = useDocuments(numericProjectId);
  const deleteDocument = useDeleteDocument(numericProjectId);
  const updateDocumentInline = useUpdateDocumentInline(numericProjectId);

  // Dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [documentToEdit, setDocumentToEdit] =
    React.useState<ProjectDocument | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [documentToDelete, setDocumentToDelete] =
    React.useState<ProjectDocument | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  // Table state
  const initialFilters: FilterState = {
    status: searchParams.get("status") || undefined,
    folder: searchParams.get("folder") || undefined,
    category: searchParams.get("category") || undefined,
    format: searchParams.get("format") || undefined,
    uploaded_by: searchParams.get("uploaded_by") || undefined,
    created_at_from: searchParams.get("created_at_from") || undefined,
    created_at_to: searchParams.get("created_at_to") || undefined,
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
      visibleColumns: projectDocumentDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  // Initialize visible columns for older persisted table state.
  React.useEffect(() => {
    if (tableState.visibleColumns.length === 0) {
      tableState.setVisibleColumns(projectDocumentDefaultVisibleColumns);
    }
  }, [tableState.visibleColumns.length, tableState.setVisibleColumns]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const migrationKey =
      "project-documents:visibleColumns:format-category-2026-05-21";
    if (window.localStorage.getItem(migrationKey) === "1") return;

    const preferred = projectDocumentDefaultVisibleColumns;
    const preferredSet = new Set(preferred);
    const preservedExtras = tableState.visibleColumns.filter(
      (columnId) => columnId !== "file_name" && !preferredSet.has(columnId),
    );

    tableState.setVisibleColumns([...preferred, ...preservedExtras]);
    window.localStorage.setItem(migrationKey, "1");
  }, [tableState.setVisibleColumns, tableState.visibleColumns]);

  // Mobile: default to list view
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    if (tableState.currentView !== "table") return;

    tableState.setCurrentView("list");
    tableState.setSearchParams({ view: "list" });
  }, [
    tableState.currentView,
    tableState.setCurrentView,
    tableState.setSearchParams,
  ]);

  // ==========================================================================
  // Filtering
  // ==========================================================================

  const activeFilters = tableState.activeFilters as FilterState;
  const searchTerm = tableState.debouncedSearch.trim().toLowerCase();

  const documentFilters = React.useMemo(() => {
    const uploaderOptions = Array.from(
      new Set(
        documents
          .map((doc) => doc.uploaded_by?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    )
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }));

    return [
      ...projectDocumentFilters,
      {
        id: "format",
        label: "Format",
        type: "select" as const,
        options: FORMAT_FILTER_OPTIONS,
      },
      {
        id: "uploaded_by",
        label: "Uploaded By",
        type: "select" as const,
        options: uploaderOptions,
      },
    ];
  }, [documents]);

  const filteredDocuments = documents.filter((doc) => {
    if (activeFilters.status && doc.status !== activeFilters.status)
      return false;
    if (activeFilters.folder && doc.folder !== activeFilters.folder)
      return false;
    if (activeFilters.category && doc.category !== activeFilters.category)
      return false;
    if (
      activeFilters.format &&
      inferProjectDocumentFormat(doc).label !== activeFilters.format
    )
      return false;
    if (
      activeFilters.uploaded_by &&
      doc.uploaded_by !== activeFilters.uploaded_by
    )
      return false;
    if (activeFilters.created_at_from || activeFilters.created_at_to) {
      const createdAt = sortValueForDate(doc.created_at);
      const from =
        typeof activeFilters.created_at_from === "string"
          ? sortValueForDate(activeFilters.created_at_from)
          : 0;
      const to =
        typeof activeFilters.created_at_to === "string"
          ? new Date(`${activeFilters.created_at_to}T23:59:59.999`).getTime()
          : 0;

      if (createdAt === 0) return false;
      if (from > 0 && createdAt < from) return false;
      if (to > 0 && createdAt > to) return false;
    }

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

  const handleCategoryChange = React.useCallback(
    async (item: ProjectDocument, category: string | null) => {
      await updateDocumentInline.mutateAsync({
        documentId: String(item.id),
        data: { category },
      });
    },
    [updateDocumentInline.mutateAsync],
  );

  const tableColumns = React.useMemo(
    () =>
      buildDocumentTableColumns({
        onCategoryChange: handleCategoryChange,
      }),
    [handleCategoryChange],
  );

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
        return tableState.sortDirection === "asc"
          ? valueA - valueB
          : valueB - valueA;
      }

      const comparison = String(valueA).localeCompare(String(valueB));
      return tableState.sortDirection === "asc" ? comparison : -comparison;
    });
  }, [
    filteredDocuments,
    tableColumns,
    tableState.sortBy,
    tableState.sortDirection,
  ]);

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
  }, [
    tableState.page,
    tableState.setPage,
    tableState.setSearchParams,
    totalPages,
  ]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleFilterChange = (nextFilters: FilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status:
        typeof nextFilters.status === "string" ? nextFilters.status : null,
      folder:
        typeof nextFilters.folder === "string" ? nextFilters.folder : null,
      category:
        typeof nextFilters.category === "string" ? nextFilters.category : null,
      format:
        typeof nextFilters.format === "string" ? nextFilters.format : null,
      uploaded_by:
        typeof nextFilters.uploaded_by === "string"
          ? nextFilters.uploaded_by
          : null,
      created_at_from:
        typeof nextFilters.created_at_from === "string"
          ? nextFilters.created_at_from
          : null,
      created_at_to:
        typeof nextFilters.created_at_to === "string"
          ? nextFilters.created_at_to
          : null,
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

  const handleEdit = (item: ProjectDocument) => {
    setDocumentToEdit(item);
    setEditDialogOpen(true);
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
    } catch (error) {
      reportNonCriticalFailure({
        area: "project-documents",
        operation: "delete-document",
        error,
        userVisibleFallback:
          "Document deletion failed and the row remains visible.",
        metadata: { projectId, documentId: documentToDelete.id },
      });
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
      cols.map((col) => (col.csvValue ? col.csvValue(doc) : "")).join(","),
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
    Boolean(activeFilters.category) ||
    Boolean(activeFilters.format) ||
    Boolean(activeFilters.uploaded_by) ||
    Boolean(activeFilters.created_at_from) ||
    Boolean(activeFilters.created_at_to);

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
          filters: documentFilters,
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
        features={{
          enableInlineEditing: true,
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

      {/* Edit Dialog */}
      <DocumentEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        document={documentToEdit}
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
