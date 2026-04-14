"use client";

import * as React from "react";
import { useState, useCallback, useRef } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FileUp, Layers, Upload, X } from "lucide-react";
import { toast } from "sonner";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DrawingUploadDialog } from "@/components/drawings/DrawingUploadDialog";
import { useDrawings, useDeleteDrawing, usePublishDrawing, useObsoleteDrawing, useUpdateDrawing } from "@/hooks/use-drawings";
import type { DrawingLogTableRow } from "@/types/drawings.types";
import { DRAWING_DISCIPLINES } from "@/types/drawings.types";
import {
  buildDrawingTableColumns,
  buildDrawingRowActions,
  drawingColumns,
  drawingDefaultVisibleColumns,
  drawingFilters,
  renderDrawingCard,
  renderDrawingList,
} from "@/features/drawings/drawings-table-config";

type DrawingFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: DrawingFilterState = {
  discipline: undefined,
  drawingType: undefined,
  status: undefined,
};

export default function ProjectDrawingsPage() {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [showUnpublished, setShowUnpublished] = useState(false);
  const [showObsolete, setShowObsolete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const dragCounter = useRef(0);

  const projectId = params.projectId ?? "";

  const deleteDrawing = useDeleteDrawing(projectId);
  const publishDrawing = usePublishDrawing(projectId);
  const obsoleteDrawing = useObsoleteDrawing(projectId);
  const updateDrawing = useUpdateDrawing(projectId);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<DrawingLogTableRow | null>(null);

  // Bulk edit state
  const [bulkDisciplineSearch, setBulkDisciplineSearch] = useState("");
  const [customDisciplines, setCustomDisciplines] = useState<string[]>([]);

  const initialFilters: DrawingFilterState = {
    discipline: searchParams.get("discipline") ?? undefined,
    drawingType: searchParams.get("drawingType") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "drawings",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "card",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "drawingNumber",
      sortDirection: "asc",
      visibleColumns: drawingDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const activeFilters = tableState.activeFilters as DrawingFilterState;

  const { data: drawingsData, isLoading } = useDrawings(projectId, {
    page: tableState.page,
    page_size: tableState.perPage,
    include_unpublished: showUnpublished,
    include_obsolete: showObsolete,
  });

  const drawings: DrawingLogTableRow[] = React.useMemo(
    () => drawingsData?.drawings ?? [],
    [drawingsData],
  );

  // Computed disciplines (standard + from data + custom)
  const allDisciplines = React.useMemo(() => {
    const fromData = new Set(drawings.map((d) => d.discipline).filter(Boolean) as string[]);
    const merged = new Set([...DRAWING_DISCIPLINES, ...customDisciplines, ...fromData]);
    return Array.from(merged).sort();
  }, [drawings, customDisciplines]);

  const handleBulkApply = async (field: "discipline" | "drawing_date", value: string) => {
    if (!value || tableState.selectedIds.length === 0) return;
    const count = tableState.selectedIds.length;
    try {
      await Promise.all(
        tableState.selectedIds.map((id) =>
          updateDrawing.mutateAsync({
            drawingId: id,
            data: field === "discipline" ? { discipline: value } : {},
          })
        )
      );
      toast.success(`Updated ${count} drawing${count === 1 ? "" : "s"}`);
      tableState.setSelectedIds([]);
    } catch {
      toast.error("Failed to update some drawings");
    }
  };

  const filteredItems = React.useMemo(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    const disciplineFilter =
      typeof activeFilters.discipline === "string" ? activeFilters.discipline : "";
    const typeFilter =
      typeof activeFilters.drawingType === "string" ? activeFilters.drawingType : "";
    const statusFilter =
      typeof activeFilters.status === "string" ? activeFilters.status : "";
    return drawings.filter((row) => {
      if (disciplineFilter && row.discipline !== disciplineFilter) return false;
      if (typeFilter && row.drawingType !== typeFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (!search) return true;
      return (
        row.drawingNumber.toLowerCase().includes(search) ||
        row.title.toLowerCase().includes(search) ||
        (row.discipline ?? "").toLowerCase().includes(search) ||
        (row.fileName ?? "").toLowerCase().includes(search)
      );
    });
  }, [activeFilters, drawings, tableState.debouncedSearch]);

  const tableColumns = React.useMemo(() => buildDrawingTableColumns(), []);

  const tabs = [
    {
      label: "Current Drawings",
      href: `/${projectId}/drawings`,
      count: filteredItems.length,
      isActive: true,
    },
    {
      label: "Drawing Sets",
      href: `/${projectId}/drawings/sets`,
      isActive: false,
    },
    {
      label: "All Sets & Revisions",
      href: `/${projectId}/drawings/revisions-report`,
      isActive: false,
    },
    {
      label: "Recycle Bin",
      href: `/${projectId}/drawings/recycle-bin`,
      isActive: false,
    },
  ];

  const handleFilterChange = (nextFilters: DrawingFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      discipline:
        typeof nextFilters.discipline === "string" ? nextFilters.discipline : null,
      drawingType:
        typeof nextFilters.drawingType === "string" ? nextFilters.drawingType : null,
      status:
        typeof nextFilters.status === "string" ? nextFilters.status : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    tableState.setSelectedIds(checked ? filteredItems.map((item) => item.id) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    tableState.setSelectedIds(
      checked
        ? [...tableState.selectedIds, id]
        : tableState.selectedIds.filter((s) => s !== id),
    );
  };

  const handleBulkDownload = () => {
    const count = tableState.selectedIds.length;
    if (count === 0) return;
    toast.info(`Downloading ${count} drawing${count === 1 ? "" : "s"}…`);
    // TODO: wire to a bulk-download API when available
  };

  const handleDeleteDrawing = (item: DrawingLogTableRow) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteDrawing.mutate(deleteTarget.id, {
      onSettled: () => setDeleteTarget(null),
    });
  };

  // ─── Drag-and-drop handlers ──────────────────────────────────────────────
  const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/tiff"];

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (f) => ACCEPTED_TYPES.includes(f.type) || f.name.match(/\.(pdf|png|jpe?g|tiff?)$/i),
    );
    if (files.length > 0) {
      setDroppedFiles(files);
      setUploadOpen(true);
    }
  }, []);

  // Clear dropped files when dialog closes
  const handleUploadOpenChange = useCallback((open: boolean) => {
    setUploadOpen(open);
    if (!open) {
      setDroppedFiles([]);
    }
  }, []);

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.discipline) ||
    Boolean(activeFilters.drawingType) ||
    Boolean(activeFilters.status);

  const selectedCount = tableState.selectedIds.length;

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Dropbox-style drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-200 animate-in fade-in">
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary bg-primary/5 px-16 py-12 shadow-sm transition-transform duration-200 scale-100">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="size-8 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground">
              Drop drawings to upload
            </p>
            <p className="text-sm text-muted-foreground">
              PDF, PNG, JPG, or TIFF files
            </p>
          </div>
        </div>
      )}

    <UnifiedTablePage
      header={{
        title: "Drawings",
        description: "Manage construction drawings with revision tracking",
        actions: (
          <>
            {selectedCount > 0 && (
              <>
                <span className="text-xs text-muted-foreground">{selectedCount} selected</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Layers className="h-3.5 w-3.5" />
                      Discipline
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="end">
                    <Label className="text-xs text-muted-foreground mb-2 block">Set discipline</Label>
                    <Input
                      value={bulkDisciplineSearch}
                      onChange={(e) => setBulkDisciplineSearch(e.target.value)}
                      placeholder="Search or create…"
                      className="h-8 text-xs mb-2"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {allDisciplines
                        .filter((d) => d.toLowerCase().includes(bulkDisciplineSearch.toLowerCase()))
                        .map((d) => (
                          <button
                            key={d}
                            type="button"
                            className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted truncate"
                            onClick={() => {
                              handleBulkApply("discipline", d);
                              setBulkDisciplineSearch("");
                            }}
                          >
                            {d}
                          </button>
                        ))}
                      {bulkDisciplineSearch.trim() &&
                        !allDisciplines.some((d) => d.toLowerCase() === bulkDisciplineSearch.trim().toLowerCase()) && (
                          <button
                            type="button"
                            className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted text-primary font-medium"
                            onClick={() => {
                              const newDisc = bulkDisciplineSearch.trim();
                              setCustomDisciplines((prev) => [...prev, newDisc]);
                              handleBulkApply("discipline", newDisc);
                              setBulkDisciplineSearch("");
                            }}
                          >
                            + Create &ldquo;{bulkDisciplineSearch.trim()}&rdquo;
                          </button>
                        )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="sm" variant="outline" onClick={handleBulkDownload}>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => tableState.setSelectedIds([])}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {selectedCount === 0 && (
              <>
                <Button
                  size="sm"
                  variant={showUnpublished ? "secondary" : "outline"}
                  onClick={() => setShowUnpublished((p) => !p)}
                >
                  {showUnpublished ? "Hide Unpublished" : "Show Unpublished"}
                </Button>
                <Button
                  size="sm"
                  variant={showObsolete ? "secondary" : "outline"}
                  onClick={() => setShowObsolete((p) => !p)}
                >
                  {showObsolete ? "Hide Obsolete" : "Show Obsolete"}
                </Button>
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  <FileUp className="h-4 w-4" />
                  Upload
                </Button>
              </>
            )}
            <DrawingUploadDialog
              projectId={projectId}
              open={uploadOpen}
              onOpenChange={handleUploadOpenChange}
              initialFiles={droppedFiles.length > 0 ? droppedFiles : undefined}
            />
          </>
        ),
      }}
      tabs={tabs}
      toolbar={{
        totalItems: drawings.length,
        filteredItems: filteredItems.length,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search drawings...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "card", "list"],
        filters: drawingFilters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: drawingColumns,
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
        onRowClick: (item) =>
          router.push(`/${projectId}/drawings/viewer/${item.id}`),
        rowActions: buildDrawingRowActions({
          onPublish: (drawingId, publish) => publishDrawing.mutate({ drawingId, publish }),
          onObsolete: (drawingId, obsolete) => obsoleteDrawing.mutate({ drawingId, obsolete }),
          onDelete: handleDeleteDrawing,
        }),
      }}
      selection={{
        selectedIds: tableState.selectedIds,
        onSelectAll: handleSelectAll,
        onSelectRow: handleSelectRow,
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
      layout={{
        cardGridClassName: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3",
      }}
      views={{
        card: (item) =>
          renderDrawingCard(
            item,
            (r) => router.push(`/${projectId}/drawings/viewer/${r.id}`),
            handleDeleteDrawing,
            {
              selected: tableState.selectedIds.includes(item.id),
              onSelect: handleSelectRow,
            },
          ),
        cardGroupBy: (item) => item.discipline || "Ungrouped",
        list: (item) =>
          renderDrawingList(
            item,
            (r) => router.push(`/${projectId}/drawings/viewer/${r.id}`),
            handleDeleteDrawing,
          ),
      }}
      emptyState={{
        title: "No drawings found",
        description: "Drag and drop files here, or click Upload to get started.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
        action: (
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <FileUp className="h-4 w-4" />
            Upload your first drawing
          </Button>
        ),
      }}
      features={{
        enableExport: true,
        enableBulkDelete: false,
        enableRowSelection: true,
        enableRowActions: true,
      }}
    />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete drawing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;
              {deleteTarget?.drawingNumber
                ? `${deleteTarget.drawingNumber} — ${deleteTarget.title || "Untitled"}`
                : deleteTarget?.title || "this drawing"}
              &rdquo;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDrawing.isPending}
            >
              {deleteDrawing.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
