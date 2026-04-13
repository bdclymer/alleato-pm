"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Download, Eye, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  TableRowActionsMenu,
  UnifiedTablePage,
  useUnifiedTableState,
  type TableColumn,
  type FilterValue,
  type TableRowActionItem,
} from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ds";

import {
  SpecificationUploadDialog,
  SpecificationEditModal,
} from "@/components/specifications";
import { useSpecifications, useDeleteSpecification } from "@/hooks/use-specifications";
import { useSpecificationAreas } from "@/hooks/use-specification-areas";
import type { SpecificationWithRevision } from "@/types/specifications.types";

type StatusFilter = "active" | "archived" | "superseded";
type SpecFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: SpecFilterState = {
  status: undefined,
  area_id: undefined,
};

const DEFAULT_VISIBLE = [
  "section_number",
  "title",
  "status",
  "revision",
  "file_size",
  "updated_at",
  "areas",
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function SpecStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge variant="default">Active</Badge>;
    case "archived":
      return <Badge variant="secondary">Archived</Badge>;
    case "superseded":
      return <Badge variant="outline">Superseded</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function renderSpecCard(
  spec: SpecificationWithRevision,
  onView: (id: number) => void,
): ReactElement {
  return (
    <div
      className="cursor-pointer rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
      onClick={() => onView(spec.id)}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{spec.title}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {spec.section_number}
          </p>
        </div>
        <StatusBadge status={spec.status} />
      </div>
      {spec.description && (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
          {spec.description}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {spec.current_revision && (
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Rev {spec.current_revision.revision_number}
          </span>
        )}
        {spec.current_revision && (
          <span>{formatFileSize(spec.current_revision.file_size)}</span>
        )}
        {spec.area_count > 0 && (
          <span>
            {spec.area_count} area{spec.area_count !== 1 ? "s" : ""}
          </span>
        )}
        <span>
          {formatDistanceToNow(new Date(spec.updated_at || spec.created_at), {
            addSuffix: true,
          })}
        </span>
      </div>
    </div>
  );
}

function renderSpecList(
  spec: SpecificationWithRevision,
  onView: (id: number) => void,
): ReactElement {
  return (
    <div
      className="flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/50"
      onClick={() => onView(spec.id)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {spec.section_number}
          </span>
          <span className="truncate text-sm font-medium">{spec.title}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[
            spec.current_revision
              ? `Rev ${spec.current_revision.revision_number}`
              : null,
            spec.current_revision
              ? formatFileSize(spec.current_revision.file_size)
              : null,
            spec.area_count > 0
              ? `${spec.area_count} area${spec.area_count !== 1 ? "s" : ""}`
              : null,
            formatDistanceToNow(new Date(spec.updated_at || spec.created_at), {
              addSuffix: true,
            }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="ml-3 shrink-0">
        <StatusBadge status={spec.status} />
      </div>
    </div>
  );
}

export default function ProjectSpecificationsPage() {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId;

  const [editingSpec, setEditingSpec] = useState<SpecificationWithRevision | null>(null);

  const { data: areas } = useSpecificationAreas(projectId);
  const deleteMutation = useDeleteSpecification(projectId);

  const initialFilters: SpecFilterState = {
    status: searchParams.get("status") ?? undefined,
    area_id: searchParams.get("area_id") ?? undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "specifications",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "section_number",
      sortDirection: "asc",
      visibleColumns: DEFAULT_VISIBLE,
      filters: initialFilters,
    },
  });

  const activeFilters = tableState.activeFilters as SpecFilterState;
  const statusFilter = typeof activeFilters.status === "string" ? activeFilters.status : undefined;
  const areaFilter = typeof activeFilters.area_id === "string" ? activeFilters.area_id : undefined;

  const { data, isLoading, isFetching } = useSpecifications(projectId, {
    search: tableState.debouncedSearch || undefined,
    status: statusFilter as StatusFilter | undefined,
    area_id: areaFilter ? parseInt(areaFilter) : undefined,
    page: tableState.page,
    page_size: tableState.perPage,
  });

  const specifications = React.useMemo(
    () => data?.specifications ?? [],
    [data?.specifications],
  );
  const totalCount = data?.total_count || 0;

  const handleView = (specId: number) => {
    router.push(`/${projectId}/specifications/${specId}`);
  };

  const handleDownload = async (specId: number, revisionId: number) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/specifications/${specId}/revisions/${revisionId}/download`,
      );
      if (!response.ok) throw new Error("Failed to generate download URL");
      const { url } = await response.json();
      window.open(url, "_blank");
    } catch {
      toast.error("Failed to download file");
    }
  };

  const columns = React.useMemo<TableColumn<SpecificationWithRevision>[]>(
    () => [
      {
        id: "section_number",
        label: "Section #",
        render: (spec) => (
          <span className="font-mono font-medium">{spec.section_number}</span>
        ),
        sortValue: (spec) => spec.section_number,
        sortable: true,
      },
      {
        id: "title",
        label: "Title",
        render: (spec) => (
          <div>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{spec.title}</span>
            </div>
            {spec.description && (
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {spec.description}
              </p>
            )}
          </div>
        ),
        sortValue: (spec) => spec.title,
        sortable: true,
      },
      {
        id: "status",
        label: "Status",
        render: (spec) => <SpecStatusBadge status={spec.status} />,
        sortValue: (spec) => spec.status,
        sortable: true,
      },
      {
        id: "revision",
        label: "Revision",
        render: (spec) =>
          spec.current_revision ? (
            <span className="text-sm">Rev {spec.current_revision.revision_number}</span>
          ) : (
            <span className="text-sm text-muted-foreground">No revisions</span>
          ),
      },
      {
        id: "file_size",
        label: "File Size",
        render: (spec) =>
          spec.current_revision ? (
            <span className="text-sm">{formatFileSize(spec.current_revision.file_size)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        id: "updated_at",
        label: "Last Updated",
        render: (spec) => (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(spec.updated_at || spec.created_at), {
              addSuffix: true,
            })}
          </span>
        ),
        sortValue: (spec) => new Date(spec.updated_at || spec.created_at).getTime(),
        sortable: true,
      },
      {
        id: "areas",
        label: "Areas",
        render: (spec) =>
          spec.area_count > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {spec.area_count}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  const handleFilterChange = (next: SpecFilterState) => {
    tableState.setActiveFilters(next);
    tableState.setSearchParams({
      status: typeof next.status === "string" ? next.status : null,
      area_id: typeof next.area_id === "string" ? next.area_id : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const isFiltered =
    Boolean(tableState.searchInput) || Boolean(statusFilter) || Boolean(areaFilter);

  const filters = React.useMemo(
    () => [
      {
        id: "status",
        label: "Status",
        type: "select" as const,
        options: [
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
          { value: "superseded", label: "Superseded" },
        ],
      },
      ...(areas && areas.length > 0
        ? [
            {
              id: "area_id",
              label: "Area",
              type: "select" as const,
              options: (areas as { id: number; name: string }[]).map((a) => ({
                value: a.id.toString(),
                label: a.name,
              })),
            },
          ]
        : []),
    ],
    [areas],
  );

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Specifications",
          description: "Manage project specifications and revisions",
          actions: (
            <SpecificationUploadDialog projectId={projectId}>
              <Button size="sm">
                <Plus />
                Upload Specification
              </Button>
            </SpecificationUploadDialog>
          ),
        }}
        toolbar={{
          totalItems: totalCount,
          filteredItems: specifications.length,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search by section number or title...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          enabledViews: ["table", "card", "list"],
          filters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: columns.map((c) => ({ id: c.id, label: c.label })),
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
        }}
        data={{
          items: specifications,
          isLoading,
          isFetching,
        }}
        table={{
          columns,
          getRowId: (item) => String(item.id),
          onRowClick: (item) => handleView(item.id),
          rowActions: (item) => {
            const items: TableRowActionItem[] = [
              {
                key: "view",
                label: "View Details",
                icon: Eye,
                onSelect: () => handleView(item.id),
              },
              ...(item.current_revision
                ? [
                    {
                      key: "download",
                      label: "Download",
                      icon: Download,
                      onSelect: () =>
                        handleDownload(item.id, item.current_revision!.id),
                    } satisfies TableRowActionItem,
                  ]
                : []),
              {
                key: "edit",
                label: "Edit Metadata",
                icon: Pencil,
                onSelect: () => setEditingSpec(item),
              },
              {
                key: "delete",
                label: "Delete",
                icon: Trash2,
                onSelect: () => deleteMutation.mutate(item.id.toString()),
                destructive: true,
              },
            ];
            return <TableRowActionsMenu items={items} />;
          },
        }}
        views={{
          card: (item) => renderSpecCard(item, handleView),
          list: (item) => renderSpecList(item, handleView),
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
        pagination={{
          page: tableState.page,
          perPage: tableState.perPage,
          totalPages: Math.max(1, Math.ceil(totalCount / tableState.perPage)),
          onPageChange: (page) => {
            tableState.setPage(page);
            tableState.setSearchParams({ page: page.toString() });
          },
          onPerPageChange: (perPage) => {
            const n = parseInt(perPage, 10) || 25;
            tableState.setPerPage(n);
            tableState.setPage(1);
            tableState.setSearchParams({ per_page: perPage, page: "1" });
          },
        }}
        emptyState={{
          title: "No specifications",
          description: "Get started by uploading a new specification document.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered,
          action: (
            <SpecificationUploadDialog projectId={projectId}>
              <Button size="sm">
                <Plus />
                Upload Specification
              </Button>
            </SpecificationUploadDialog>
          ),
        }}
        features={{
          enableExport: true,
          enableBulkDelete: true,
          enableRowSelection: true,
        }}
      />

      <SpecificationEditModal
        projectId={projectId}
        specification={editingSpec}
        open={!!editingSpec}
        onOpenChange={(open) => !open && setEditingSpec(null)}
      />
    </>
  );
}
