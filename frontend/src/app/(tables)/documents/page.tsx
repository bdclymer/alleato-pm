"use client";

import * as React from "react";

import { format } from "date-fns";
import { Upload } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/dropzone";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type PipelineDoc,
  buildDocumentTableColumns,
  documentColumns,
  documentDefaultVisibleColumns,
  documentFilters,
  renderDocumentCard,
  renderDocumentList,
  renderDocumentRowActions,
} from "@/features/documents/documents-table-config";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";

type DocumentFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: DocumentFilterState = {
  source: undefined,
  type: undefined,
};

const MAX_FILE_SIZE = 50 * 1000 * 1000; // 50 MB

function UploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}) {
  const uploadProps = useSupabaseUpload({
    bucketName: "documents",
    path: "uploads",
    maxFiles: 10,
    maxFileSize: MAX_FILE_SIZE,
  });

  const prevIsSuccess = React.useRef(false);

  React.useEffect(() => {
    if (uploadProps.isSuccess && !prevIsSuccess.current) {
      prevIsSuccess.current = true;
      toast.success("Documents uploaded successfully.");
      const timeout = setTimeout(() => {
        onOpenChange(false);
        onUploadComplete();
      }, 1500);
      return () => clearTimeout(timeout);
    }
    if (!uploadProps.isSuccess) {
      prevIsSuccess.current = false;
    }
  }, [uploadProps.isSuccess, onOpenChange, onUploadComplete]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Drag and drop files or click to browse. All file types accepted.
          </DialogDescription>
        </DialogHeader>
        <Dropzone {...uploadProps}>
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [documents, setDocuments] = React.useState<PipelineDoc[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);

  const tableState = useUnifiedTableState({
    entityKey: "documents",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "created_at",
      sortDirection: "desc",
      visibleColumns: documentDefaultVisibleColumns,
      filters: EMPTY_FILTERS,
    },
  });

  const { activeFilters } = tableState;

  const refreshDocuments = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await fetch("/api/documents/status", { cache: "no-store" });
      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result?.error || "Failed to load documents");
      }
      setDocuments((result.documents || []) as PipelineDoc[]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load documents";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  const tableColumns = React.useMemo(
    () => buildDocumentTableColumns(),
    [],
  );

  const filteredDocuments = React.useMemo(() => {
    const searchTerm = tableState.debouncedSearch.trim().toLowerCase();
    const sourceFilter =
      typeof activeFilters.source === "string"
        ? activeFilters.source.toLowerCase()
        : "";
    const typeFilter =
      typeof activeFilters.type === "string"
        ? activeFilters.type.toLowerCase()
        : "";

    return documents.filter((doc) => {
      if (sourceFilter && (doc.source ?? "").toLowerCase() !== sourceFilter) {
        return false;
      }
      if (typeFilter && (doc.type ?? "").toLowerCase() !== typeFilter) {
        return false;
      }
      if (!searchTerm) return true;

      return (
        (doc.title ?? "").toLowerCase().includes(searchTerm) ||
        (doc.source ?? "").toLowerCase().includes(searchTerm) ||
        (doc.type ?? "").toLowerCase().includes(searchTerm) ||
        (doc.id ?? "").toLowerCase().includes(searchTerm)
      );
    });
  }, [activeFilters.source, activeFilters.type, documents, tableState.debouncedSearch]);

  const totalItems = documents.length;
  const filteredItems = filteredDocuments.length;
  const isFiltered =
    tableState.debouncedSearch.trim().length > 0 ||
    Object.values(activeFilters).some((v) => v !== undefined);

  const handleFilterChange = (filters: DocumentFilterState) => {
    tableState.setActiveFilters(filters);
    tableState.setPage(1);
  };

  const handleView = (doc: PipelineDoc) => {
    toast.info(`Document: ${doc.title || doc.id}`);
  };

  const handleExport = () => {
    const headers = ["Title", "Type", "Source", "Pipeline Stage", "Created"];
    const rows = filteredDocuments.map((d) => [
      d.title || "",
      d.type || "",
      d.source || "",
      d.pipeline_stage || "",
      d.created_at
        ? format(new Date(d.created_at), "yyyy-MM-dd")
        : "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documents-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={refreshDocuments}
      />
      <UnifiedTablePage
        header={{
          title: "Documents",
          description: "RAG document library and ingestion status",
          actions: (
            <Button
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          ),
        }}
        toolbar={{
          totalItems,
          filteredItems,
          selectedCount: 0,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search documents...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          enabledViews: ["table", "card", "list"],
          filters: documentFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: documentColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onExport: handleExport,
        }}
        data={{
          items: filteredDocuments,
          isLoading,
          isFetching: false,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          onRowClick: handleView,
          rowActions: (item) => renderDocumentRowActions(item, handleView),
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
            });
          },
        }}
        views={{
          card: (item) => renderDocumentCard(item, handleView),
          list: (item) => renderDocumentList(item, handleView),
        }}
        emptyState={{
          title: "No documents found",
          description:
            "Upload your first document to start building your RAG library.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered,
          action: (
            <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
              Upload document
            </Button>
          ),
        }}
        features={{
          enableExport: true,
          enableBulkDelete: false,
          enableRowSelection: false,
        }}
      />
    </>
  );
}
