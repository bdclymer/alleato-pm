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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type PipelineDoc,
  buildDocumentTableColumns,
  documentColumns,
  documentDefaultVisibleColumns,
  documentFilters,
  getDocumentViewUrl,
  renderDocumentCard,
  renderDocumentList,
  renderDocumentRowActions,
} from "@/features/documents/documents-table-config";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";

type DocumentFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: DocumentFilterState = {
  source: undefined,
  type: undefined,
  category: undefined,
};

const MAX_FILE_SIZE = 50 * 1000 * 1000; // 50 MB

interface SimpleProject {
  id: number;
  name: string | null;
}

// ---------------------------------------------------------------------------
// Upload Dialog
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Assign Project Dialog
// ---------------------------------------------------------------------------

function AssignProjectDialog({
  open,
  onOpenChange,
  document: doc,
  projects,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: PipelineDoc | null;
  projects: SimpleProject[];
  onAssign: (docId: string, projectId: number | null) => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");

  React.useEffect(() => {
    if (doc?.project_id) {
      setSelectedProjectId(String(doc.project_id));
    } else {
      setSelectedProjectId("");
    }
  }, [doc]);

  const handleSave = () => {
    if (!doc) return;
    const projectId = selectedProjectId ? Number(selectedProjectId) : null;
    onAssign(doc.id, projectId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Project</DialogTitle>
          <DialogDescription>
            {doc?.title || "Untitled Document"}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name || `Project #${p.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DocumentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [documents, setDocuments] = React.useState<PipelineDoc[]>([]);
  const [projects, setProjects] = React.useState<SimpleProject[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [assignDoc, setAssignDoc] = React.useState<PipelineDoc | null>(null);

  const projectNames = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const p of projects) {
      if (p.name) map.set(p.id, p.name);
    }
    return map;
  }, [projects]);

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

  // ── Fetch documents ────────────────────────────────────────────
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

  // ── Fetch projects (for assignment) ────────────────────────────
  const fetchProjects = React.useCallback(async () => {
    try {
      const resp = await fetch("/api/projects?fields=id,name", {
        cache: "no-store",
      });
      if (!resp.ok) return;
      const result = await resp.json();
      setProjects(
        (result.data || result.projects || result || []) as SimpleProject[],
      );
    } catch {
      // Non-critical — assignment will still work with IDs
    }
  }, []);

  React.useEffect(() => {
    void refreshDocuments();
    void fetchProjects();
  }, [refreshDocuments, fetchProjects]);

  // ── Assign document to project ─────────────────────────────────
  const handleAssignProject = React.useCallback(
    async (docId: string, projectId: number | null) => {
      try {
        const resp = await fetch(`/api/documents/${docId}/assign-project`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId }),
        });
        if (!resp.ok) {
          const result = await resp.json();
          throw new Error(result?.error || "Failed to assign project");
        }
        toast.success(
          projectId ? "Document assigned to project" : "Project assignment removed",
        );
        void refreshDocuments();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to assign project";
        toast.error(message);
      }
    },
    [refreshDocuments],
  );

  // ── Inline edit handler ──────────────────────────────────────
  const handleEditField = React.useCallback(
    async (docId: string, field: string, value: string) => {
      try {
        // project_id must be sent as number or null
        const parsedValue =
          field === "project_id"
            ? value ? Number(value) : null
            : value || null;

        const resp = await fetch(`/api/documents/${docId}/assign-project`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: parsedValue }),
        });
        if (!resp.ok) {
          const result = await resp.json();
          throw new Error(result?.error || "Failed to update");
        }
        // Optimistically update local state
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId ? { ...d, [field]: parsedValue } : d,
          ),
        );
        if (field === "project_id") {
          toast.success(
            parsedValue ? "Project assigned" : "Project removed",
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update";
        toast.error(message);
      }
    },
    [],
  );

  const tableColumns = React.useMemo(
    () =>
      buildDocumentTableColumns({
        projectNames,
        projects,
        onEditField: handleEditField,
      }),
    [projectNames, projects, handleEditField],
  );

  // ── Client-side filtering ──────────────────────────────────────
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
    const categoryFilter =
      typeof activeFilters.category === "string"
        ? activeFilters.category.toLowerCase()
        : "";

    return documents.filter((doc) => {
      // Exclude meeting and interview documents
      const docType = (doc.type ?? "").toLowerCase();
      if (docType === "meeting" || docType === "interview") {
        return false;
      }
      if (sourceFilter && (doc.source ?? "").toLowerCase() !== sourceFilter) {
        return false;
      }
      if (typeFilter && (doc.type ?? "").toLowerCase() !== typeFilter) {
        return false;
      }
      if (
        categoryFilter &&
        (doc.category ?? "").toLowerCase() !== categoryFilter
      ) {
        return false;
      }
      if (!searchTerm) return true;

      return (
        (doc.title ?? "").toLowerCase().includes(searchTerm) ||
        (doc.source ?? "").toLowerCase().includes(searchTerm) ||
        (doc.type ?? "").toLowerCase().includes(searchTerm) ||
        (doc.category ?? "").toLowerCase().includes(searchTerm)
      );
    });
  }, [
    activeFilters.source,
    activeFilters.type,
    activeFilters.category,
    documents,
    tableState.debouncedSearch,
  ]);

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
    const viewUrl = getDocumentViewUrl(doc);
    if (viewUrl) {
      window.open(viewUrl, "_blank", "noopener,noreferrer");
    } else {
      toast.info(`Document: ${doc.title || doc.id}`);
    }
  };

  const handleExport = () => {
    const headers = [
      "Title",
      "Type",
      "Category",
      "Source",
      "Pipeline Stage",
      "Created",
    ];
    const rows = filteredDocuments.map((d) => [
      d.title || "",
      d.type || "",
      d.category || "",
      d.source || "",
      d.pipeline_stage || "",
      d.created_at ? format(new Date(d.created_at), "yyyy-MM-dd") : "",
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
      <AssignProjectDialog
        open={assignDoc !== null}
        onOpenChange={(open) => {
          if (!open) setAssignDoc(null);
        }}
        document={assignDoc}
        projects={projects}
        onAssign={handleAssignProject}
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
          rowActions: (item) =>
            renderDocumentRowActions(item, handleView, (doc) =>
              setAssignDoc(doc),
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
          enableInlineEditing: true,
        }}
      />
    </>
  );
}
