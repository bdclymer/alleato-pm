"use client";

import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, FileText, Plus, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
import { Separator } from "@/components/ui/separator";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { useSubmittals, useDeleteSubmittal, type SubmittalSummary } from "@/hooks/use-submittals";
import {
  buildSubmittalTableColumns,
  submittalColumns,
  submittalDefaultVisibleColumns,
  submittalFilters,
  renderSubmittalCard,
  renderSubmittalList,
  type SubmittalTableRow,
} from "@/features/submittals/submittals-table-config";
import { SubmittalFormDialog } from "@/features/submittals/submittal-form-dialog";

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
    fetch(`/api/projects/${projectId}/submittals/packages`)
      .then((r) => r.json())
      .then((data: PackageItem[]) => setPackages(data ?? []))
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
            <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {packages.length === 0 ? "No packages found for this project." : "No packages match your search."}
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
                  <span className="font-medium text-foreground">{pkg.name}</span>
                  {pkg.description && (
                    <span className="ml-2 text-xs text-muted-foreground">{pkg.description}</span>
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
    fetch(`/api/projects/${projectId}/submittals/specs`)
      .then((r) => r.json())
      .then((data: SpecItem[]) => setSpecs(data ?? []))
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
            <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {specs.length === 0 ? "No specifications found for this project." : "No sections match your search."}
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
                    <span className="ml-2 text-xs text-muted-foreground">{spec.division}</span>
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

function toTableRow(item: SubmittalSummary): SubmittalTableRow {
  // Resolve responsible contractor from joined company data
  const itemAny = item as unknown as Record<string, unknown>;
  const responsibleContractor =
    typeof itemAny.responsible_contractor === "object" && itemAny.responsible_contractor
      ? (itemAny.responsible_contractor as { name?: string })?.name ?? null
      : null;

  // Resolve approvers and latest response from joined workflow steps
  const workflowSteps = itemAny.submittal_workflow_steps as
    | { step_type: string; submittal_responses: { responder_id: string; response_status: string }[] }[]
    | undefined;

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
        ? (item.submittal_type as { name?: string } | null)?.name ?? null
        : item.submittal_type ?? null,
    status: item.status ?? "Draft",
    responsible_contractor: responsibleContractor,
    received_from: null, // TODO: resolve from received_from_id when user join is available
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
}: {
  groups: { label: string; items: SubmittalTableRow[] }[];
  columns: TableColumn<SubmittalTableRow>[];
  onRowClick: (item: SubmittalTableRow) => void;
  visibleColumns: string[];
  extraAction?: (item: SubmittalTableRow) => ReactNode;
}) {
  const visibleCols = columns.filter((col) => visibleColumns.includes(col.id));

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
        No items found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {groups.map((group, idx) => (
        <React.Fragment key={group.label}>
          {idx > 0 && <Separator />}
          <div className="flex flex-col gap-3">
            {/* Section heading */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{group.label}</span>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {group.items.length}
              </span>
            </div>

            {/* Simple table */}
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {visibleCols.map((col) => (
                      <th
                        key={col.id}
                        className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                      >
                        {col.label}
                      </th>
                    ))}
                    {extraAction && (
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {group.items.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => onRowClick(item)}
                    >
                      {visibleCols.map((col) => (
                        <td key={col.id} className="whitespace-nowrap px-3 py-2 text-foreground">
                          {col.render(item)}
                        </td>
                      ))}
                      {extraAction && (
                        <td
                          className="whitespace-nowrap px-3 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {extraAction(item)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SubmittalsPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const projectId = parseInt(params.projectId ?? "", 10);
  const activeTab = searchParams.get("tab") || "items";

  useProjectTitle("Submittals");

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [packagePickerOpen, setPackagePickerOpen] = React.useState(false);
  const [specPickerOpen, setSpecPickerOpen] = React.useState(false);
  const [formDefaults, setFormDefaults] = React.useState<{ submittal_package_id?: string; specification_section?: string } | undefined>(undefined);
  const deleteSubmittal = useDeleteSubmittal(projectId);

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
    const statusFilter = typeof activeFilters.status === "string" ? activeFilters.status : "";
    const responseFilter =
      typeof activeFilters.latest_response === "string" ? activeFilters.latest_response : "";
    const divisionFilter =
      typeof activeFilters.division === "string" ? activeFilters.division : "";

    return tableRows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (responseFilter && row.latest_response !== responseFilter) return false;
      if (divisionFilter && (row.division ?? "").toLowerCase() !== divisionFilter.toLowerCase())
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

  const packageGroups = React.useMemo(() => {
    if (activeTab !== "packages") return [];
    const map = new Map<string, SubmittalTableRow[]>();
    for (const row of filteredItems) {
      const key = packageNameById.get(row.id) ?? "No Package";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, items]) => ({ label, items }));
  }, [activeTab, filteredItems, packageNameById]);

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
      const res = await fetch(`/api/projects/${projectId}/submittals/${submittalId}/restore`, {
        method: "PATCH",
      });
      if (res.ok) {
        toast.success("Submittal restored");
        await qc.invalidateQueries({ queryKey: ["submittals", projectId] });
      } else {
        toast.error("Could not restore submittal");
      }
    },
    [projectId, qc],
  );

  // -------------------------------------------------------------------------
  // Tabs
  // -------------------------------------------------------------------------

  const tabs = [
    {
      label: "Items",
      href: `/${projectId}/submittals`,
      count: activeTab === "items" ? filteredItems.length : undefined,
      isActive: activeTab === "items",
      testId: "submittals-tab-items",
    },
    {
      label: "Packages",
      href: `/${projectId}/submittals?tab=packages`,
      isActive: activeTab === "packages",
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
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      latest_response:
        typeof nextFilters.latest_response === "string" ? nextFilters.latest_response : null,
      division: typeof nextFilters.division === "string" ? nextFilters.division : null,
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
        onRowClick={(item) => router.push(`/${projectId}/submittals/${item.id}`)}
        visibleColumns={tableState.visibleColumns}
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
        const val = (item as unknown as Record<string, unknown>)[c.id];
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
                    const val = (item as unknown as Record<string, unknown>)[c.id];
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
          setFormDefaults({ submittal_package_id: pkg.id });
          setDialogOpen(true);
        }}
      />
      <SpecPickerDialog
        projectId={projectId}
        open={specPickerOpen}
        onOpenChange={setSpecPickerOpen}
        onSelect={(spec) => {
          setFormDefaults({ specification_section: `${spec.section_number} - ${spec.section_title}` });
          setDialogOpen(true);
        }}
      />
      <UnifiedTablePage
        header={{
          title: "Submittals",
          description: "Manage submittal items, packages, and review workflows",
          actions: (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" data-testid="submittals-dropdown-create">
                  <Plus className="h-4 w-4" />
                  Create
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                  Create Submittal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPackagePickerOpen(true)}>
                  Create from Package
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSpecPickerOpen(true)}>
                  Create from Specifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          onRowClick: (item) => router.push(`/${projectId}/submittals/${item.id}`),
          onDelete: activeTab === "recycle-bin" ? undefined : (item) => deleteSubmittal.mutate(item.id),
          rowActions: activeTab === "recycle-bin" ? recycleRowActions : undefined,
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
            renderSubmittalCard(item, (r) => router.push(`/${projectId}/submittals/${r.id}`)),
          list: (item) =>
            renderSubmittalList(item, (r) => router.push(`/${projectId}/submittals/${r.id}`)),
        }}
        emptyState={{
          title: isGroupedTab ? "" : "No submittals found",
          description: isGroupedTab
            ? ""
            : activeTab === "recycle-bin"
              ? "No submittals in the Recycle Bin."
              : "Create your first submittal to get started.",
          filteredDescription: isGroupedTab ? "" : "Try adjusting your search or filters.",
          isFiltered: isFiltered && !isGroupedTab,
          action:
            isGroupedTab || activeTab === "recycle-bin" ? undefined : (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
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
        topContent={groupedTopContent}
      />

      <SubmittalFormDialog
        projectId={projectId}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setFormDefaults(undefined);
        }}
        defaultOverrides={formDefaults}
      />
    </>
  );
}
