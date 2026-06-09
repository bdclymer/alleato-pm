"use client";

import * as React from "react";

import { format } from "date-fns";
import { Upload } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/misc/dropzone";
import { UnifiedTablePage } from "@/components/tables/unified";
import type { TableColumn } from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import {
  Modal as Dialog,
  ModalContent as DialogContent,
  ModalDescription as DialogDescription,
  ModalFooter as DialogFooter,
  ModalHeader as DialogHeader,
  ModalTitle as DialogTitle,
} from "@/components/ui/unified-modal";
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
  getDocumentViewUrl,
  renderDocumentCard,
  renderDocumentList,
  renderDocumentRowActions,
} from "@/features/documents/documents-table-config";
import type { DocumentFilterState } from "@/features/documents/documents-table-definition";
import { useServerTableDefinition } from "@/features/tables/server-table";
import type { ServerTableDefinition } from "@/features/tables/server-table";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { apiFetch } from "@/lib/api-client";
import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";

const MAX_FILE_SIZE = 50 * 1000 * 1000;

interface SimpleProject {
  id: number;
  name: string | null;
}

type ViewPreference = "external-first" | "internal-first";

export interface DocumentsTablePageProps {
  definition: ServerTableDefinition<PipelineDoc, DocumentFilterState>;
  title: string;
  description: string;
  uploadEnabled?: boolean;
  inlineEditingEnabled?: boolean;
  projectAssignmentEnabled?: boolean;
  deleteEnabled?: boolean;
  exportFilePrefix?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyFilteredDescription?: string;
  openPreference?: ViewPreference;
  pageArea?: string;
  tableColumns?: TableColumn<PipelineDoc>[];
  renderCard?: (item: PipelineDoc, onView: (item: PipelineDoc) => void) => React.ReactElement;
  renderList?: (item: PipelineDoc, onView: (item: PipelineDoc) => void) => React.ReactElement;
}

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
    const projectId =
      selectedProjectId && selectedProjectId !== "__none__"
        ? Number(selectedProjectId)
        : null;
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
              <SelectItem value="__none__">No project</SelectItem>
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

function getInternalDocumentHref(doc: PipelineDoc): string | null {
  if (doc.type === "teams_dm_conversation" && !doc.project_id) {
    return `/teams-conversations/${encodeURIComponent(doc.id)}`;
  }
  if (!doc.project_id) return null;
  return `/${doc.project_id}/intelligence/sources/${encodeURIComponent(doc.id)}`;
}

export function DocumentsTablePage({
  definition,
  title,
  description,
  uploadEnabled = true,
  inlineEditingEnabled = true,
  projectAssignmentEnabled = true,
  deleteEnabled = true,
  exportFilePrefix = "documents",
  emptyTitle = "No documents found",
  emptyDescription = "Upload your first document to start building your RAG library.",
  emptyFilteredDescription = "Try adjusting your search or filters.",
  openPreference = "external-first",
  pageArea,
  tableColumns: customTableColumns,
  renderCard: customRenderCard,
  renderList: customRenderList,
}: DocumentsTablePageProps) {
  const router = useRouter();
  const pathname = usePathname()!;
  const searchParams = useSearchParams()!;
  const area = pageArea ?? `${definition.entityKey}-table`;

  const [projects, setProjects] = React.useState<SimpleProject[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [assignDoc, setAssignDoc] = React.useState<PipelineDoc | null>(null);
  const lastErrorMessageRef = React.useRef<string | null>(null);

  const projectNames = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const p of projects) {
      if (p.name) map.set(p.id, p.name);
    }
    return map;
  }, [projects]);

  const {
    tableState,
    items: documents,
    totalItems: totalDocuments,
    totalPages,
    isLoading,
    error,
    activeFilters,
    isFiltered,
    refresh,
    handleViewChange,
    handleFilterChange,
    handleClearFilters,
    handleSortChange,
    handlePageChange,
    handlePerPageChange,
  } = useServerTableDefinition<PipelineDoc, DocumentFilterState>({
    definition,
    searchParams,
    pathname,
    router,
  });

  React.useEffect(() => {
    if (!error) return;
    if (lastErrorMessageRef.current === error.message) return;
    lastErrorMessageRef.current = error.message;
    reportNonCriticalFailure({
      area,
      operation: "load-documents-page",
      error,
      userVisibleFallback: `${title} could not be loaded.`,
    });
    toast.error(error.message);
  }, [area, error, title]);

  const fetchProjects = React.useCallback(async () => {
    if (!projectAssignmentEnabled) return;
    try {
      const result = await apiFetch<
        { data?: SimpleProject[]; projects?: SimpleProject[] } | SimpleProject[]
      >("/api/projects?fields=id,name", { cache: "no-store" });
      const list = Array.isArray(result)
        ? result
        : (result.data ?? result.projects ?? []);
      setProjects(list as SimpleProject[]);
    } catch (error) {
      reportNonCriticalFailure({
        area,
        operation: "load-project-options",
        error,
        userVisibleFallback: "Project assignment options could not be loaded.",
      });
    }
  }, [area, projectAssignmentEnabled]);

  React.useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleAssignProject = React.useCallback(
    async (docId: string, projectId: number | null) => {
      try {
        await apiFetch(`/api/documents/${docId}/assign-project`, {
          method: "PATCH",
          body: JSON.stringify({ project_id: projectId }),
        });
        toast.success(
          projectId ? "Document assigned to project" : "Project assignment removed",
        );
        await refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to assign project";
        toast.error(message);
      }
    },
    [refresh],
  );

  const handleEditField = React.useCallback(
    async (docId: string, field: string, value: string) => {
      try {
        const parsedValue =
          field === "project_id"
            ? value && value !== "__none__"
              ? Number(value)
              : null
            : value || null;

        await apiFetch(`/api/documents/${docId}/assign-project`, {
          method: "PATCH",
          body: JSON.stringify({ [field]: parsedValue }),
        });
        await refresh();
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
    [refresh],
  );

  const defaultTableColumns = React.useMemo(
    () =>
      buildDocumentTableColumns({
        projectNames,
        projects,
        onEditField: inlineEditingEnabled ? handleEditField : undefined,
        getTitleHref: (doc) => getInternalDocumentHref(doc) ?? getDocumentViewUrl(doc),
        isTitleExternal: (doc) => !getInternalDocumentHref(doc) && Boolean(getDocumentViewUrl(doc)),
      }),
    [projectNames, projects, inlineEditingEnabled, handleEditField],
  );
  const tableColumns = customTableColumns ?? defaultTableColumns;

  const handleDeleteDocument = React.useCallback(
    async (doc: PipelineDoc) => {
      try {
        await apiFetch(`/api/documents/${doc.id}`, { method: "DELETE" });
        toast.success("Document deleted");
        await refresh();
      } catch {
        toast.error("Failed to delete document");
      }
    },
    [refresh],
  );

  const handleView = React.useCallback((doc: PipelineDoc) => {
    const internalHref = getInternalDocumentHref(doc);
    const externalHref = getDocumentViewUrl(doc);

    if (openPreference === "internal-first" && internalHref) {
      router.push(internalHref);
      return;
    }

    if (externalHref) {
      window.open(externalHref, "_blank", "noopener,noreferrer");
      return;
    }

    if (internalHref) {
      router.push(internalHref);
      return;
    }

    toast.info(`Document: ${doc.title || doc.id}`);
  }, [openPreference, router]);

  const handleExport = React.useCallback(() => {
    const headers = [
      "Title",
      "Type",
      "Category",
      "Source",
      "Pipeline Stage",
      "Created",
    ];
    const rows = documents.map((d) => [
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
    a.download = `${exportFilePrefix}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [documents, exportFilePrefix]);

  return (
    <>
      {uploadEnabled ? (
        <UploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onUploadComplete={() => {
            void refresh({ page: tableState.page });
          }}
        />
      ) : null}
      {projectAssignmentEnabled ? (
        <AssignProjectDialog
          open={assignDoc !== null}
          onOpenChange={(open) => {
            if (!open) setAssignDoc(null);
          }}
          document={assignDoc}
          projects={projects}
          onAssign={handleAssignProject}
        />
      ) : null}
      <UnifiedTablePage
        header={{
          title,
          description,
          actions: uploadEnabled ? (
            <Button
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
              className="gap-2"
            >
              <Upload />
              Upload
            </Button>
          ) : undefined,
        }}
        toolbar={{
          totalItems: totalDocuments,
          filteredItems: totalDocuments,
          selectedCount: 0,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: definition.searchPlaceholder,
          currentView: tableState.currentView,
          onViewChange: handleViewChange,
          enabledViews: definition.allowedViews,
          filters: definition.filters,
          activeFilters,
          onFilterChange: (filters) =>
            handleFilterChange(filters as DocumentFilterState),
          onClearFilters: handleClearFilters,
          columns: definition.columns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          savedViewsScope: definition.entityKey,
          savedViewsDefaults: {
            visibleColumns: definition.defaultVisibleColumns,
            columnOrder: definition.columns.map((column) => column.id),
            columnWidths: {},
            sortBy: definition.defaultSortBy,
            sortDirection: definition.defaultSortDirection,
            filters: definition.defaultFilters,
          },
          onExport: handleExport,
        }}
        data={{
          items: documents,
          isLoading,
          isFetching: false,
          error,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          rowActions: (item) =>
            renderDocumentRowActions(
              item,
              handleView,
              projectAssignmentEnabled ? (doc) => setAssignDoc(doc) : undefined,
              deleteEnabled ? handleDeleteDocument : undefined,
            ),
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: handleSortChange,
        }}
        views={{
          card: (item) => (customRenderCard ?? renderDocumentCard)(item, handleView),
          list: (item) => (customRenderList ?? renderDocumentList)(item, handleView),
        }}
        emptyState={{
          title: emptyTitle,
          description: emptyDescription,
          filteredDescription: emptyFilteredDescription,
          isFiltered,
          action: uploadEnabled ? (
            <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
              Upload document
            </Button>
          ) : undefined,
        }}
        features={{
          enableInlineEditing: inlineEditingEnabled,
        }}
        pagination={{
          page: tableState.page,
          totalPages,
          perPage: tableState.perPage,
          onPageChange: handlePageChange,
          onPerPageChange: handlePerPageChange,
        }}
      />
    </>
  );
}
