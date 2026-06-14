"use client";

import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ChevronDown,
  FileText,
  MoreVertical,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-client";
import { handleFormError } from "@/lib/handle-form-error";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import {
  useSubmittals,
  useDeleteSubmittal,
  usePackages,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
  type SubmittalSummary,
  type PackageRow,
} from "@/hooks/use-submittals";
import {
  buildSubmittalTableColumns,
  submittalColumns,
  submittalDefaultVisibleColumns,
  submittalFilters,
  renderSubmittalCard,
  renderSubmittalList,
  type SubmittalTableRow,
} from "@/features/submittals/submittals-table-config";
import { useConfirm } from "@/hooks/use-confirm";
import { Skeleton } from "@/components/ui/skeleton";

type SubmittalFilterState = Record<string, FilterValue>;

// ---------------------------------------------------------------------------
// Picker types
// ---------------------------------------------------------------------------

interface PackageItem {
  id: string;
  name: string;
  description?: string | null;
}

interface SpecItem {
  id: string;
  section_number: string;
  section_title: string;
  division: string | null;
}

// ---------------------------------------------------------------------------
// PackagePickerDialog
// ---------------------------------------------------------------------------

function PackagePickerDialog({
  projectId,
  open,
  onOpenChange,
  onSelect,
}: {
  projectId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (pkg: PackageItem) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [packages, setPackages] = React.useState<PackageItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<PackageItem[]>(`/api/projects/${projectId}/submittals/packages`)
      .then((data) => setPackages(data ?? []))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((p) => p.name.toLowerCase().includes(q));
  }, [packages, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Package</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search packages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-1"
          autoFocus
        />
        <ScrollArea className="mt-2 h-64">
          {loading ? (
            <div className="space-y-1.5 px-1 py-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {packages.length === 0
                ? "No packages found for this project."
                : "No packages match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5 pr-2">
              {filtered.map((pkg) => (
                <Button
                  key={pkg.id}
                  variant="ghost"
                  className="w-full justify-start rounded px-3 py-2 text-left text-sm h-auto"
                  onClick={() => {
                    onSelect(pkg);
                    onOpenChange(false);
                  }}
                >
                  <span className="font-medium text-foreground">
                    {pkg.name}
                  </span>
                  {pkg.description && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {pkg.description}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// SpecPickerDialog
// ---------------------------------------------------------------------------

function SpecPickerDialog({
  projectId,
  open,
  onOpenChange,
  onSelect,
}: {
  projectId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (spec: SpecItem) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [specs, setSpecs] = React.useState<SpecItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<SpecItem[]>(`/api/projects/${projectId}/submittals/specs`)
      .then((data) => setSpecs(data ?? []))
      .catch(() => setSpecs([]))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return specs;
    return specs.filter(
      (s) =>
        s.section_number.toLowerCase().includes(q) ||
        s.section_title.toLowerCase().includes(q) ||
        (s.division ?? "").toLowerCase().includes(q),
    );
  }, [specs, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Spec Section</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search spec sections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-1"
          autoFocus
        />
        <ScrollArea className="mt-2 h-64">
          {loading ? (
            <div className="space-y-1.5 px-1 py-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {specs.length === 0
                ? "No specifications found for this project."
                : "No sections match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5 pr-2">
              {filtered.map((spec) => (
                <Button
                  key={spec.id}
                  variant="ghost"
                  className="w-full justify-start rounded px-3 py-2 text-left text-sm h-auto"
                  onClick={() => {
                    onSelect(spec);
                    onOpenChange(false);
                  }}
                >
                  <span className="font-medium text-foreground">
                    {spec.section_number} — {spec.section_title}
                  </span>
                  {spec.division && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {spec.division}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY_FILTERS: SubmittalFilterState = {
  status: undefined,
  latest_response: undefined,
  division: undefined,
};

type SubmittalSummaryWithRelations = SubmittalSummary & {
  responsible_contractor?: { name?: string | null } | null;
  submittal_workflow_steps?: {
    step_type: string;
    submittal_responses?: {
      responder_id: string;
      response_status: string;
    }[];
  }[];
};

function getSubmittalColumnValue(
  item: SubmittalTableRow,
  columnId: string,
): unknown {
  return item[columnId as keyof SubmittalTableRow];
}

function toTableRow(item: SubmittalSummary): SubmittalTableRow {
  // Resolve responsible contractor from joined company data
  const itemWithRelations = item as SubmittalSummaryWithRelations;
  const responsibleContractor =
    typeof itemWithRelations.responsible_contractor === "object" &&
    itemWithRelations.responsible_contractor
      ? (itemWithRelations.responsible_contractor.name ?? null)
      : null;

  // Resolve approvers and latest response from joined workflow steps
  const workflowSteps = itemWithRelations.submittal_workflow_steps;

  let approverNames: string | null = null;
  let latestResponse: string | null = null;

  if (workflowSteps?.length) {
    // Collect all approver responder IDs
    const approverIds = new Set<string>();
    for (const step of workflowSteps) {
      for (const resp of step.submittal_responses ?? []) {
        approverIds.add(resp.responder_id);
        // Track latest non-Pending response
        if (resp.response_status && resp.response_status !== "Pending") {
          latestResponse = resp.response_status;
        }
      }
    }
    if (approverIds.size > 0) {
      approverNames = `${approverIds.size} reviewer${approverIds.size > 1 ? "s" : ""}`;
    }
  }

  return {
    id: item.id,
    specification_section: item.specification_section ?? null,
    submittal_number: item.submittal_number ?? "",
    revision: item.revision ?? 0,
    title: item.title ?? "Untitled Submittal",
    submittal_type_name:
      typeof item.submittal_type === "object"
        ? ((item.submittal_type as { name?: string } | null)?.name ?? null)
        : (item.submittal_type ?? null),
    status: item.status ?? "Draft",
    responsible_contractor: responsibleContractor,
    received_from: item.received_from ?? null,
    ball_in_court: item.ball_in_court ?? null,
    approvers: approverNames,
    latest_response: latestResponse,
    sent_date: item.sent_date ?? null,
    is_private: item.is_private ?? false,
    division: item.division ?? null,
    final_due_date: item.final_due_date ?? null,
    deleted_at: item.deleted_at ?? null,
  };
}

// ---------------------------------------------------------------------------
// Inline grouped view component
// ---------------------------------------------------------------------------

function GroupedSubmittalView({
  groups,
  columns,
  onRowClick,
  visibleColumns,
  extraAction,
  groupAction,
}: {
  groups: { label: string; items: SubmittalTableRow[] }[];
  columns: TableColumn<SubmittalTableRow>[];
  onRowClick: (item: SubmittalTableRow) => void;
  visibleColumns: string[];
  extraAction?: (item: SubmittalTableRow) => ReactNode;
  groupAction?: (label: string) => ReactNode;
}) {
  const visibleCols = columns.filter((col) => visibleColumns.includes(col.id));
  const colSpan = visibleCols.length + (extraAction ? 1 : 0);

  if (groups.length === 0) {
    return (
      <div className="py-8 text-sm text-muted-foreground">
        No submittals match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {groups.map((group) => (
        <section key={group.label} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {group.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {group.items.length}
            </span>
            {groupAction && groupAction(group.label)}
          </div>

          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-sm" style={{ minWidth: 960 }}>
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {visibleCols.map((col) => (
                    <th
                      key={col.id}
                      className="h-8 whitespace-nowrap px-3 text-left text-xs font-medium uppercase text-muted-foreground"
                    >
                      {col.label}
                    </th>
                  ))}
                  {extraAction && (
                    <th className="h-8 whitespace-nowrap px-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {group.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colSpan}
                      className="px-3 py-6 text-sm text-muted-foreground"
                    >
                      No submittals in this group.
                    </td>
                  </tr>
                ) : (
                  group.items.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => onRowClick(item)}
                    >
                      {visibleCols.map((col) => (
                        <td
                          key={col.id}
                          className="h-9 whitespace-nowrap px-3 text-foreground"
                        >
                          {col.render(item)}
                        </td>
                      ))}
                      {extraAction && (
                        <td
                          className="h-9 whitespace-nowrap px-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {extraAction(item)}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PackageManageDialog
// ---------------------------------------------------------------------------

function PackageManageDialog({
  mode,
  initialPackage,
  onClose,
  onCreate,
  onUpdate,
  isPending,
}: {
  mode: "create" | "edit";
  initialPackage: PackageRow | null;
  onClose: () => void;
  onCreate: (name: string, description: string | null) => void;
  onUpdate: (id: string, name: string, description: string | null) => void;
  isPending: boolean;
}) {
  const [name, setName] = React.useState(initialPackage?.name ?? "");
  const [description, setDescription] = React.useState(
    initialPackage?.description ?? "",
  );

  // Reset when dialog opens with a new package
  React.useEffect(() => {
    setName(initialPackage?.name ?? "");
    setDescription(initialPackage?.description ?? "");
  }, [initialPackage]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === "create") {
      onCreate(name.trim(), description.trim() || null);
    } else if (initialPackage) {
      onUpdate(initialPackage.id, name.trim(), description.trim() || null);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Package" : "Edit Package"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-3">
          <div className="space-y-1">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="pkg-name"
            >
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="pkg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Structural Package"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="pkg-desc"
            >
              Description
            </label>
            <Input
              id="pkg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || isPending}
            >
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SubmittalsPage(): ReactElement {
  const params = useParams<{ projectId: string }>()!;
  const pathname = usePathname()!;
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const qc = useQueryClient();

  const projectId = parseInt(params.projectId ?? "", 10);
  const activeTab = searchParams.get("tab") || "packages";

  useProjectTitle("Submittals");

  const { confirm, ConfirmDialog } = useConfirm();
  const [packagePickerOpen, setPackagePickerOpen] = React.useState(false);
  const [specPickerOpen, setSpecPickerOpen] = React.useState(false);
  const deleteSubmittal = useDeleteSubmittal(projectId);
  const [packageManageOpen, setPackageManageOpen] = React.useState(false);
  const [editingPackage, setEditingPackage] = React.useState<PackageRow | null>(
    null,
  );
  const { data: allPackages = [] } = usePackages(projectId);
  const createPackageMutation = useCreatePackage(projectId);
  const updatePackageMutation = useUpdatePackage(projectId);
  const deletePackageMutation = useDeletePackage(projectId);

  const initialFilters: SubmittalFilterState = {
    status: searchParams.get("status") ?? undefined,
    latest_response: searchParams.get("latest_response") ?? undefined,
    division: searchParams.get("division") ?? undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "submittals",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "submittal_number",
      sortDirection: "asc",
      visibleColumns: submittalDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const { data: submittals = [], isLoading } = useSubmittals(
    projectId,
    activeTab === "recycle-bin" ? "recycle-bin" : undefined,
  );

  const tableRows = React.useMemo<SubmittalTableRow[]>(
    () => submittals.map(toTableRow),
    [submittals],
  );

  const activeFilters = tableState.activeFilters as SubmittalFilterState;

  const filteredItems = React.useMemo(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    const statusFilter =
      typeof activeFilters.status === "string" ? activeFilters.status : "";
    const responseFilter =
      typeof activeFilters.latest_response === "string"
        ? activeFilters.latest_response
        : "";
    const divisionFilter =
      typeof activeFilters.division === "string" ? activeFilters.division : "";

    return tableRows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (responseFilter && row.latest_response !== responseFilter)
        return false;
      if (
        divisionFilter &&
        (row.division ?? "").toLowerCase() !== divisionFilter.toLowerCase()
      )
        return false;
      if (!search) return true;
      return (
        row.submittal_number.toLowerCase().includes(search) ||
        row.title.toLowerCase().includes(search) ||
        (row.specification_section ?? "").toLowerCase().includes(search) ||
        (row.submittal_type_name ?? "").toLowerCase().includes(search) ||
        row.status.toLowerCase().includes(search)
      );
    });
  }, [activeFilters, tableRows, tableState.debouncedSearch]);

  const tableColumns = React.useMemo(() => buildSubmittalTableColumns(), []);

  // -------------------------------------------------------------------------
  // Grouped data derivations
  // -------------------------------------------------------------------------

  // Build a lookup from submittal id → package name using raw SubmittalSummary data
  const packageNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const s of submittals) {
      m.set(s.id, s.submittal_package?.name ?? "No Package");
    }
    return m;
  }, [submittals]);

  const packageIdByName = React.useMemo(() => {
    const m = new Map<string, PackageRow>();
    // Seed from allPackages first so empty packages are included
    for (const pkg of allPackages) {
      m.set(pkg.name, pkg);
    }
    // Also seed from submittals data (handles packages not yet in allPackages cache)
    for (const s of submittals) {
      const pkg = s.submittal_package;
      if (pkg?.id && pkg?.name && !m.has(pkg.name)) {
        m.set(pkg.name, {
          id: pkg.id,
          name: pkg.name,
          description:
            (pkg as { description?: string | null }).description ?? null,
        });
      }
    }
    return m;
  }, [submittals, allPackages]);

  const packageGroups = React.useMemo(() => {
    if (activeTab !== "packages") return [];
    const map = new Map<string, SubmittalTableRow[]>();
    // Seed all known packages (including empty ones) so they appear as group headers
    for (const pkg of allPackages) {
      map.set(pkg.name, []);
    }
    // "No Package" group always exists
    map.set("No Package", []);
    for (const row of filteredItems) {
      const key = packageNameById.get(row.id) ?? "No Package";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === "No Package") return 1;
        if (b === "No Package") return -1;
        return a.localeCompare(b);
      })
      .map(([label, items]) => ({ label, items }));
  }, [activeTab, filteredItems, packageNameById, allPackages]);

  const specSectionGroups = React.useMemo(() => {
    if (activeTab !== "spec-sections") return [];
    const map = new Map<string, SubmittalTableRow[]>();
    for (const row of filteredItems) {
      const key = row.specification_section ?? "No Spec Section";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, items]) => ({ label, items }));
  }, [activeTab, filteredItems]);

  const ballInCourtGroups = React.useMemo(() => {
    if (activeTab !== "ball-in-court") return [];
    const withBic = filteredItems.filter((r) => r.ball_in_court);
    const map = new Map<string, SubmittalTableRow[]>();
    for (const row of withBic) {
      const key = row.ball_in_court!;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, items]) => ({ label, items }));
  }, [activeTab, filteredItems]);

  // -------------------------------------------------------------------------
  // Restore handler (recycle bin)
  // -------------------------------------------------------------------------

  const handleRestore = React.useCallback(
    async (submittalId: string) => {
      try {
        await apiFetch(
          `/api/projects/${projectId}/submittals/${submittalId}/restore`,
          {
            method: "PATCH",
          },
        );
        toast.success("Submittal restored");
        await qc.invalidateQueries({ queryKey: ["submittals", projectId] });
      } catch (error) {
        handleFormError(error, { entity: "submittal", action: "save" });
      }
    },
    [projectId, qc],
  );

  // -------------------------------------------------------------------------
  // Tabs
  // -------------------------------------------------------------------------

  const tabs = [
    {
      label: "Packages",
      href: `/${projectId}/submittals`,
      isActive: activeTab === "packages",
    },
    {
      label: "All Items",
      href: `/${projectId}/submittals?tab=items`,
      count: activeTab === "items" ? filteredItems.length : undefined,
      isActive: activeTab === "items",
      testId: "submittals-tab-items",
    },
    {
      label: "Spec Sections",
      href: `/${projectId}/submittals?tab=spec-sections`,
      isActive: activeTab === "spec-sections",
    },
    {
      label: "Ball In Court",
      href: `/${projectId}/submittals?tab=ball-in-court`,
      isActive: activeTab === "ball-in-court",
      testId: "submittals-tab-ball-in-court",
    },
    {
      label: "Recycle Bin",
      href: `/${projectId}/submittals?tab=recycle-bin`,
      isActive: activeTab === "recycle-bin",
    },
  ];

  const handleFilterChange = (nextFilters: SubmittalFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status:
        typeof nextFilters.status === "string" ? nextFilters.status : null,
      latest_response:
        typeof nextFilters.latest_response === "string"
          ? nextFilters.latest_response
          : null,
      division:
        typeof nextFilters.division === "string" ? nextFilters.division : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.latest_response) ||
    Boolean(activeFilters.division);

  const isGroupedTab =
    activeTab === "packages" ||
    activeTab === "spec-sections" ||
    activeTab === "ball-in-court";

  // -------------------------------------------------------------------------
  // Grouped tab: topContent replaces the table body; items=[] hides the table
  // -------------------------------------------------------------------------

  const groupedTopContent = React.useMemo<ReactNode>(() => {
    if (!isGroupedTab) return undefined;

    const groups =
      activeTab === "packages"
        ? packageGroups
        : activeTab === "spec-sections"
          ? specSectionGroups
          : ballInCourtGroups;

    return (
      <GroupedSubmittalView
        groups={groups}
        columns={tableColumns}
        onRowClick={(item) =>
          router.push(`/${projectId}/submittals/${item.id}`)
        }
        visibleColumns={tableState.visibleColumns}
        groupAction={
          activeTab === "packages"
            ? (label) => {
                const pkg = packageIdByName.get(label);
                if (!pkg) return null;
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingPackage(pkg);
                          setPackageManageOpen(true);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={async () => {
                          const ok = await confirm({
                            description: `Delete package "${pkg.name}"? Submittals will be unlinked.`,
                            variant: "destructive",
                            confirmLabel: "Delete",
                          });
                          if (ok) {
                            deletePackageMutation.mutate(pkg.id);
                          }
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
            : undefined
        }
      />
    );
  }, [
    isGroupedTab,
    activeTab,
    packageGroups,
    specSectionGroups,
    ballInCourtGroups,
    tableColumns,
    tableState.visibleColumns,
    router,
    projectId,
    packageIdByName,
    deletePackageMutation,
    confirm,
  ]);

  // -------------------------------------------------------------------------
  // Recycle bin: restore row action
  // -------------------------------------------------------------------------

  const recycleRowActions = React.useCallback(
    (item: SubmittalTableRow): ReactNode => (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          void handleRestore(item.id);
        }}
      >
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        Restore
      </Button>
    ),
    [handleRestore],
  );

  // -------------------------------------------------------------------------
  // Export handlers
  // -------------------------------------------------------------------------

  const handleExport = React.useCallback(() => {
    const visibleCols = submittalColumns.filter((c) =>
      tableState.visibleColumns.includes(c.id),
    );
    const headers = visibleCols.map((c) => c.label);
    const rows = filteredItems.map((item) =>
      visibleCols.map((c) => {
        const val = getSubmittalColumnValue(item, c.id);
        if (val === null || val === undefined) return "";
        return String(val).replace(/,/g, ";").replace(/\n/g, " ");
      }),
    );
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submittals-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredItems, tableState.visibleColumns]);

  const handlePdfExport = React.useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const visibleCols = submittalColumns.filter((c) =>
      tableState.visibleColumns.includes(c.id),
    );
    const tableHtml = `
      <html><head><title>Submittals</title>
      <style>
        body { font-family: sans-serif; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; text-align: left; padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 11px; }
        td { padding: 5px 8px; border: 1px solid #e5e7eb; }
        tr:nth-child(even) { background: #f9fafb; }
        h1 { font-size: 16px; margin-bottom: 12px; }
      </style></head>
      <body>
        <h1>Submittals</h1>
        <table>
          <thead><tr>${visibleCols.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>
          <tbody>${filteredItems
            .map(
              (item) =>
                `<tr>${visibleCols
                  .map((c) => {
                    const val = getSubmittalColumnValue(item, c.id);
                    return `<td>${val === null || val === undefined ? "" : String(val)}</td>`;
                  })
                  .join("")}</tr>`,
            )
            .join("")}</tbody>
        </table>
      </body></html>
    `;
    printWindow.document.write(tableHtml);
    printWindow.document.close();
    printWindow.print();
  }, [filteredItems, tableState.visibleColumns]);

  return (
    <>
      <PackagePickerDialog
        projectId={projectId}
        open={packagePickerOpen}
        onOpenChange={setPackagePickerOpen}
        onSelect={(pkg) => {
          router.push(
            `/${projectId}/submittals/new?package_id=${encodeURIComponent(pkg.id)}`,
          );
        }}
      />
      <SpecPickerDialog
        projectId={projectId}
        open={specPickerOpen}
        onOpenChange={setSpecPickerOpen}
        onSelect={(spec) => {
          const section = encodeURIComponent(
            `${spec.section_number} - ${spec.section_title}`,
          );
          router.push(
            `/${projectId}/submittals/new?specification_section=${section}`,
          );
        }}
      />
      {packageManageOpen && (
        <PackageManageDialog
          mode={editingPackage ? "edit" : "create"}
          initialPackage={editingPackage}
          onClose={() => {
            setPackageManageOpen(false);
            setEditingPackage(null);
          }}
          onCreate={(name, description) => {
            createPackageMutation.mutate(
              { name, description },
              {
                onSuccess: () => {
                  setPackageManageOpen(false);
                },
              },
            );
          }}
          onUpdate={(id, name, description) => {
            updatePackageMutation.mutate(
              { id, name, description },
              {
                onSuccess: () => {
                  setPackageManageOpen(false);
                  setEditingPackage(null);
                },
              },
            );
          }}
          isPending={
            createPackageMutation.isPending || updatePackageMutation.isPending
          }
        />
      )}
      {ConfirmDialog}
      <UnifiedTablePage
        header={{
          title: "Submittals",
          description: "Manage submittal items, packages, and review workflows",
          actions: (
            <div className="flex items-center gap-1.5">
              {activeTab === "packages" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingPackage(null);
                    setPackageManageOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New Package
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" data-testid="submittals-create-button">
                    <Plus className="h-4 w-4" />
                    Create Submittal
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => router.push(`/${projectId}/submittals/new`)}
                  >
                    Create new submittal
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setPackagePickerOpen(true)}>
                    Create from package
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSpecPickerOpen(true)}>
                    Create from specification
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        }}
        tabs={tabs}
        toolbar={{
          totalItems: tableRows.length,
          filteredItems: filteredItems.length,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search submittals...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          enabledViews: ["table", "card", "list"],
          filters: submittalFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: submittalColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onExport: handleExport,
          customActions: (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePdfExport}
              title="Export PDF"
            >
              <FileText className="h-4 w-4" />
            </Button>
          ),
        }}
        data={{
          // For grouped tabs, suppress the built-in table/empty-state entirely
          items: isGroupedTab ? [] : filteredItems,
          isLoading,
          isFetching: false,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          onRowClick: (item) =>
            router.push(`/${projectId}/submittals/${item.id}`),
          onDelete:
            activeTab === "recycle-bin"
              ? undefined
              : (item) => deleteSubmittal.mutate(item.id),
          rowActions:
            activeTab === "recycle-bin" ? recycleRowActions : undefined,
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
          card: (item) =>
            renderSubmittalCard(item, (r) =>
              router.push(`/${projectId}/submittals/${r.id}`),
            ),
          list: (item) =>
            renderSubmittalList(item, (r) =>
              router.push(`/${projectId}/submittals/${r.id}`),
            ),
        }}
        emptyState={{
          title: isGroupedTab ? "" : "No submittals found",
          description: isGroupedTab
            ? ""
            : activeTab === "recycle-bin"
              ? "No submittals in the Recycle Bin."
              : "Create your first submittal to get started.",
          filteredDescription: isGroupedTab
            ? ""
            : "Try adjusting your search or filters.",
          isFiltered: isFiltered && !isGroupedTab,
          action:
            isGroupedTab || activeTab === "recycle-bin" ? undefined : (
              <Button
                size="sm"
                onClick={() => router.push(`/${projectId}/submittals/new`)}
              >
                <Plus />
                Create your first submittal
              </Button>
            ),
        }}
        features={{
          enableExport: true,
          enableBulkDelete: activeTab === "items",
          enableRowSelection: activeTab === "items",
        }}
        layout={{
          hideTableBody: isGroupedTab,
        }}
        topContent={groupedTopContent}
      />
    </>
  );
}
