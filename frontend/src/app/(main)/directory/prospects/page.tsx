"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { getDirectoryTabs } from "@/config/directory-tabs";
import type { Database } from "@/types/database.types";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import type { ColumnConfig, FilterConfig, TableColumn } from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ds";

type Prospect = Database["public"]["Tables"]["prospects"]["Row"];

type ProspectFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: ProspectFilterState = {
  status: undefined,
  lead_source: undefined,
  industry: undefined,
};

const prospectColumns: ColumnConfig[] = [
  { id: "company_name", label: "Company", alwaysVisible: true },
  { id: "contact_name", label: "Contact", defaultVisible: true },
  { id: "contact_email", label: "Email", defaultVisible: true },
  { id: "contact_phone", label: "Phone", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "lead_source", label: "Lead Source", defaultVisible: true },
  { id: "industry", label: "Industry", defaultVisible: true },
  { id: "estimated_project_value", label: "Est. Value", defaultVisible: true },
  { id: "probability", label: "Probability", defaultVisible: true },
  { id: "assigned_to", label: "Assigned To", defaultVisible: false },
  { id: "next_follow_up", label: "Next Follow-Up", defaultVisible: false },
  { id: "last_contacted", label: "Last Contacted", defaultVisible: false },
  { id: "project_type", label: "Project Type", defaultVisible: false },
  { id: "created_at", label: "Created", defaultVisible: false },
];

const prospectDefaultVisibleColumns = prospectColumns
  .filter((col) => col.defaultVisible !== false)
  .map((col) => col.id);

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function buildProspectTableColumns(): TableColumn<Prospect>[] {
  return [
    {
      ...prospectColumns[0],
      render: (item) => <span className="font-medium">{item.company_name}</span>,
      sortValue: (item) => item.company_name,
    },
    {
      ...prospectColumns[1],
      render: (item) => <span>{item.contact_name || "-"}</span>,
      sortValue: (item) => item.contact_name || "",
    },
    {
      ...prospectColumns[2],
      render: (item) => <span>{item.contact_email || "-"}</span>,
      sortValue: (item) => item.contact_email || "",
    },
    {
      ...prospectColumns[3],
      render: (item) => <span>{item.contact_phone || "-"}</span>,
      sortValue: (item) => item.contact_phone || "",
    },
    {
      ...prospectColumns[4],
      render: (item) =>
        item.status ? <StatusBadge status={item.status} /> : <span>-</span>,
      sortValue: (item) => item.status || "",
    },
    {
      ...prospectColumns[5],
      render: (item) => <span>{item.lead_source || "-"}</span>,
      sortValue: (item) => item.lead_source || "",
    },
    {
      ...prospectColumns[6],
      render: (item) => <span>{item.industry || "-"}</span>,
      sortValue: (item) => item.industry || "",
    },
    {
      ...prospectColumns[7],
      render: (item) => (
        <span className="tabular-nums">{formatCurrency(item.estimated_project_value)}</span>
      ),
      sortValue: (item) => item.estimated_project_value ?? 0,
    },
    {
      ...prospectColumns[8],
      render: (item) => (
        <span className="tabular-nums">{item.probability != null ? `${item.probability}%` : "-"}</span>
      ),
      sortValue: (item) => item.probability ?? 0,
    },
    {
      ...prospectColumns[9],
      render: (item) => <span>{item.assigned_to || "-"}</span>,
      sortValue: (item) => item.assigned_to || "",
    },
    {
      ...prospectColumns[10],
      render: (item) => <span>{formatDate(item.next_follow_up)}</span>,
      sortValue: (item) => (item.next_follow_up ? new Date(item.next_follow_up).getTime() : 0),
    },
    {
      ...prospectColumns[11],
      render: (item) => <span>{formatDate(item.last_contacted)}</span>,
      sortValue: (item) => (item.last_contacted ? new Date(item.last_contacted).getTime() : 0),
    },
    {
      ...prospectColumns[12],
      render: (item) => <span>{item.project_type || "-"}</span>,
      sortValue: (item) => item.project_type || "",
    },
    {
      ...prospectColumns[13],
      render: (item) => <span>{formatDate(item.created_at)}</span>,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
  ];
}

export default function DirectoryProspectsPage(): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilters: ProspectFilterState = {
    status: searchParams.get("status") || undefined,
    lead_source: searchParams.get("lead_source") || undefined,
    industry: searchParams.get("industry") || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "global-directory-prospects",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "company_name",
      sortDirection: "asc",
      visibleColumns: prospectDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const [prospects, setProspects] = React.useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchProspects = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setProspects(data || []);
    } catch (fetchError) {
      setError(fetchError as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  // Sync URL filters to table state
  React.useEffect(() => {
    const nextStatus = searchParams.get("status") || undefined;
    const nextLeadSource = searchParams.get("lead_source") || undefined;
    const nextIndustry = searchParams.get("industry") || undefined;
    tableState.setActiveFilters((prev) => {
      if (
        prev.status === nextStatus &&
        prev.lead_source === nextLeadSource &&
        prev.industry === nextIndustry
      ) {
        return prev;
      }
      return { status: nextStatus, lead_source: nextLeadSource, industry: nextIndustry };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as ProspectFilterState;

  // Derive filter options from data
  const filterOptions = React.useMemo(() => {
    const statuses = Array.from(new Set(prospects.map((p) => p.status).filter(Boolean)));
    const sources = Array.from(new Set(prospects.map((p) => p.lead_source).filter(Boolean)));
    const industries = Array.from(new Set(prospects.map((p) => p.industry).filter(Boolean)));
    return { statuses, sources, industries };
  }, [prospects]);

  const filters: FilterConfig[] = React.useMemo(
    () => [
      {
        id: "status",
        label: "Status",
        type: "select",
        options: filterOptions.statuses.map((s) => ({ value: String(s), label: String(s) })),
      },
      {
        id: "lead_source",
        label: "Lead Source",
        type: "select",
        options: filterOptions.sources.map((s) => ({ value: String(s), label: String(s) })),
      },
      {
        id: "industry",
        label: "Industry",
        type: "select",
        options: filterOptions.industries.map((s) => ({ value: String(s), label: String(s) })),
      },
    ],
    [filterOptions],
  );

  // Client-side filtering
  const filteredProspects = React.useMemo(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    const statusFilter = typeof activeFilters.status === "string" ? activeFilters.status : "";
    const sourceFilter = typeof activeFilters.lead_source === "string" ? activeFilters.lead_source : "";
    const industryFilter = typeof activeFilters.industry === "string" ? activeFilters.industry : "";

    return prospects.filter((p) => {
      if (statusFilter && (p.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (sourceFilter && (p.lead_source || "").toLowerCase() !== sourceFilter.toLowerCase()) return false;
      if (industryFilter && (p.industry || "").toLowerCase() !== industryFilter.toLowerCase()) return false;
      if (!search) return true;
      return (
        p.company_name.toLowerCase().includes(search) ||
        (p.contact_name || "").toLowerCase().includes(search) ||
        (p.contact_email || "").toLowerCase().includes(search) ||
        (p.industry || "").toLowerCase().includes(search) ||
        (p.assigned_to || "").toLowerCase().includes(search)
      );
    });
  }, [prospects, activeFilters, tableState.debouncedSearch]);

  const tableColumns = React.useMemo(() => buildProspectTableColumns(), []);
  const tabs = getDirectoryTabs(pathname);
  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.lead_source) ||
    Boolean(activeFilters.industry);

  const handleDeleteProspect = React.useCallback(
    async (prospect: Prospect) => {
      try {
        const supabase = createClient();
        const { error: deleteError } = await supabase
          .from("prospects")
          .delete()
          .eq("id", prospect.id);
        if (deleteError) throw deleteError;
        toast.success("Prospect deleted");
        setProspects((prev) => prev.filter((p) => p.id !== prospect.id));
      } catch {
        toast.error("Failed to delete prospect");
      }
    },
    [],
  );

  const handleFilterChange = (nextFilters: ProspectFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      lead_source: typeof nextFilters.lead_source === "string" ? nextFilters.lead_source : null,
      industry: typeof nextFilters.industry === "string" ? nextFilters.industry : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    tableState.setSelectedIds(
      checked ? filteredProspects.map((p) => String(p.id)) : [],
    );
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    tableState.setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((i) => i !== id),
    );
  };

  return (
    <UnifiedTablePage
      header={{
        title: "Company Directory: Prospects",
        description:
          "Track and manage prospective clients, leads, and business development opportunities",
        actions: (
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Prospect
          </Button>
        ),
      }}
      tabs={tabs}
      toolbar={{
        totalItems: prospects.length,
        filteredItems: filteredProspects.length,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search company, contact, email, industry...",
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
        columns: prospectColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: filteredProspects,
        isLoading,
        isFetching: false,
        error: error ?? undefined,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => String(item.id),
        onDelete: handleDeleteProspect,
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
      selection={{
        selectedIds: tableState.selectedIds,
        onSelectAll: handleSelectAll,
        onSelectRow: handleSelectRow,
      }}
      emptyState={{
        title: "No prospects found",
        description: "No prospects have been added yet.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
      }}
      features={{
        enableExport: false,
        enableBulkDelete: true,
      }}
    />
  );
}
