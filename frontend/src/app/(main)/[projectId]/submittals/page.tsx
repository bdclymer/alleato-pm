"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import {
  buildSubmittalTableColumns,
  submittalColumns,
  submittalDefaultVisibleColumns,
  submittalFilters,
  renderSubmittalCard,
  renderSubmittalList,
  type SubmittalTableRow,
} from "@/features/submittals/submittals-table-config";

interface Submittal {
  id: string;
  submittal_number: string;
  title: string;
  status: string;
  priority: string;
  submitter_company: string;
  submission_date: string | null;
  required_approval_date: string | null;
  submittal_type_name: string | null;
  project_name: string | null;
}

type SubmittalFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: SubmittalFilterState = {
  status: undefined,
  priority: undefined,
};

function formatLabel(value?: string | null): string {
  if (!value) return "";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function SubmittalsPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = parseInt(params.projectId ?? "", 10);
  const activeTab = searchParams.get("tab") || "items";

  useProjectTitle("Submittals");

  const initialStatus = searchParams.get("status") ?? "";
  const initialPriority = searchParams.get("priority") ?? "";
  const initialFilters: SubmittalFilterState = {
    status: initialStatus || undefined,
    priority: initialPriority || undefined,
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
      sortBy: "submission_date",
      sortDirection: "desc",
      visibleColumns: submittalDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    const nextPriority = searchParams.get("priority") ?? "";
    tableState.setActiveFilters((prev) => {
      const normalizedStatus = nextStatus || undefined;
      const normalizedPriority = nextPriority || undefined;
      if (prev.status === normalizedStatus && prev.priority === normalizedPriority) {
        return prev;
      }
      return {
        status: normalizedStatus,
        priority: normalizedPriority,
      };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const [submittals, setSubmittals] = React.useState<Submittal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSubmittals = async () => {
      if (!projectId) return;

      try {
        const response = await fetch(`/api/projects/${projectId}/submittals`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setSubmittals(data || []);
      } catch {
        toast.error("Failed to load submittals");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmittals();
  }, [projectId]);

  const tableRows = React.useMemo<SubmittalTableRow[]>(
    () =>
      (submittals || []).map((item) => ({
        id: item.id ?? item.submittal_number ?? crypto.randomUUID(),
        submittal_number: item.submittal_number ?? "",
        title: item.title ?? "Untitled Submittal",
        statusDisplay: formatLabel(String(item.status)) || "Submitted",
        priorityLabel: formatLabel(String(item.priority)) || "Normal",
        submitter_company: item.submitter_company ?? "",
        submission_date: item.submission_date,
        required_approval_date: item.required_approval_date,
        submittal_type_name: item.submittal_type_name,
        project_name: item.project_name,
        ballInCourt:
          item.status === "submitted" || item.status === "under_review",
      })),
    [submittals],
  );

  const activeFilters = tableState.activeFilters as SubmittalFilterState;

  const filteredItems = React.useMemo(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    const statusFilter = typeof activeFilters.status === "string" ? activeFilters.status : "";
    const priorityFilter =
      typeof activeFilters.priority === "string" ? activeFilters.priority : "";

    if (
      activeTab === "packages" ||
      activeTab === "spec-sections" ||
      activeTab === "recycle-bin"
    ) {
      return [] as SubmittalTableRow[];
    }

    return tableRows.filter((row) => {
      if (activeTab === "ball-in-court" && !row.ballInCourt) {
        return false;
      }
      if (statusFilter && row.statusDisplay !== statusFilter) {
        return false;
      }
      if (priorityFilter && row.priorityLabel !== priorityFilter) {
        return false;
      }
      if (!search) {
        return true;
      }
      return (
        row.submittal_number.toLowerCase().includes(search) ||
        row.title.toLowerCase().includes(search) ||
        row.submitter_company.toLowerCase().includes(search) ||
        row.statusDisplay.toLowerCase().includes(search) ||
        row.priorityLabel.toLowerCase().includes(search) ||
        (row.submittal_type_name ?? "").toLowerCase().includes(search)
      );
    });
  }, [
    activeFilters.priority,
    activeFilters.status,
    activeTab,
    tableRows,
    tableState.debouncedSearch,
  ]);

  const tableColumns = React.useMemo(() => buildSubmittalTableColumns(), []);

  const tabs = [
    {
      label: "Items",
      href: `/${projectId}/submittals`,
      count: tableRows.length,
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
      priority: typeof nextFilters.priority === "string" ? nextFilters.priority : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.priority);

  const isComingSoonTab =
    activeTab === "packages" ||
    activeTab === "spec-sections" ||
    activeTab === "recycle-bin";

  const emptyDescription = isComingSoonTab
    ? `This tab is reserved for upcoming ${activeTab.replace("-", " ")} workflows.`
    : "Create your first submittal to get started.";

  return (
    <UnifiedTablePage
      header={{
        title: "Submittals",
        description: "Manage submittal items, packages, and review workflows",
        actions: (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild data-testid="submittals-dropdown-create">
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Submittal
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem data-testid="submittals-create-submittal">
                  Submittal
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="submittals-create-package">
                  Submittal Package
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild data-testid="submittals-dropdown-export">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem data-testid="submittals-export-csv">CSV</DropdownMenuItem>
                <DropdownMenuItem data-testid="submittals-export-pdf">PDF</DropdownMenuItem>
                <DropdownMenuItem data-testid="submittals-export-excel">Excel</DropdownMenuItem>
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
      }}
      data={{
        items: filteredItems,
        isLoading,
        isFetching: false,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.id,
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
        card: (item) => renderSubmittalCard(item, () => undefined),
        list: (item) => renderSubmittalList(item, () => undefined),
      }}
      emptyState={{
        title: isComingSoonTab ? "Coming Soon" : "No submittals found",
        description: emptyDescription,
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered: isFiltered && !isComingSoonTab,
        action: isComingSoonTab ? undefined : (
          <Button size="sm" onClick={() => router.push(`/${projectId}/submittals/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Create your first submittal
          </Button>
        ),
      }}
      features={{
        enableExport: false,
        enableBulkDelete: false,
        enableRowSelection: false,
        enableRowActions: false,
      }}
    />
  );
}
