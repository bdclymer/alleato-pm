"use client";

import * as React from "react";
import { Project } from "@/types/portfolio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type ColumnConfig,
  type FilterConfig,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

const PROJECT_COLUMNS: ColumnConfig[] = [
  { id: "name", label: "Project", alwaysVisible: true },
  { id: "jobNumber", label: "Job Number", defaultVisible: true },
  { id: "client", label: "Client", defaultVisible: true },
  { id: "startDate", label: "Start Date", defaultVisible: true },
  { id: "state", label: "State", defaultVisible: true },
  { id: "phase", label: "Phase", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
];

export default function PortfolioPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);

  const parseProjectsResponse = React.useCallback(
    async (response: Response) => {
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        try {
          return await response.json();
        } catch (error) {
          return null;
        }
      }

      const fallbackBody = await response.text();
      console.error('Failed to fetch projects:', fallbackBody);
      return null;
    },
    [],
  );

  // Fetch projects from Supabase
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const baseParams = new URLSearchParams();
        baseParams.append("archived", "false");

        const allProjectRows: Record<string, unknown>[] = [];
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
          const pagedParams = new URLSearchParams(baseParams);
          pagedParams.set("page", String(page));
          pagedParams.set("limit", "100");

          const response = await fetch(`/api/projects?${pagedParams.toString()}`);
          const result = await parseProjectsResponse(response);

          if (!result || !response.ok) {
            setProjects([]);
            return;
          }

          const pageRows = Array.isArray(result.data) ? result.data : [];
          allProjectRows.push(...pageRows);
          const apiTotalPages =
            typeof result.meta?.totalPages === "number"
              ? result.meta.totalPages
              : 1;
          totalPages = Math.max(apiTotalPages, 1);
          page += 1;
        }

        const toStringValue = (value: unknown, fallback = ""): string => {
          if (typeof value === "string") return value;
          if (typeof value === "number") return String(value);
          return fallback;
        };
        const toNullableString = (value: unknown): string | null =>
          typeof value === "string" ? value : null;
        const toNullableNumber = (value: unknown): number | null =>
          typeof value === "number" ? value : null;

        const mappedProjects: Project[] = allProjectRows.map(
          (p: Record<string, unknown>) => {
            const address = toStringValue(p.address);
            const phase = toStringValue(p.phase);
            const category = toStringValue(p.category);

            return {
              id: toStringValue(p.id, "0"),
              name: toStringValue(p.name, "Untitled Project"),
              jobNumber: toStringValue(p["job number"], toStringValue(p.id, "0")),
              client: toStringValue(p.client),
              startDate: toNullableString(p["start date"]),
              state: toStringValue(p.state),
              phase,
              estRevenue: toNullableNumber(p["est revenue"]),
              estProfit: toNullableNumber(p["est profit"]),
              category,
              // Legacy fields for backward compatibility
              projectNumber: toStringValue(
                p["job number"],
                toStringValue(p.id, "0"),
              ),
              address,
              city: address ? address.split(",")[0] || "" : "",
              zip: "",
              phone: "",
              status: p.archived ? "Inactive" : "Active",
              stage: phase || "Unknown",
              type: category || "General",
              notes: toStringValue(p.summary),
              isFlagged: false,
            };
          },
        );

        setProjects(mappedProjects);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        // Intentionally swallowed: UI shows empty state on error
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [parseProjectsResponse]);

  // Extract unique phase, category, and client options from projects
  const phaseOptions = React.useMemo(() => {
    const phases = new Set(
      projects.map((p) => p.phase).filter((p): p is string => Boolean(p)),
    );
    return Array.from(phases).sort();
  }, [projects]);

  const categoryOptions = React.useMemo(() => {
    const categories = new Set(
      projects.map((p) => p.category).filter((c): c is string => Boolean(c)),
    );
    return Array.from(categories).sort();
  }, [projects]);

  const clientOptions = React.useMemo(() => {
    const clients = new Set(
      projects.map((p) => p.client).filter((c): c is string => Boolean(c)),
    );
    return Array.from(clients).sort();
  }, [projects]);

  const handleCreateProject = () => {
    router.push("/create-project");
  };

  const projectFilters = React.useMemo<FilterConfig[]>(
    () => [
      {
        id: "client",
        label: "Client",
        type: "select",
        options: clientOptions.map((client) => ({ value: client, label: client })),
      },
      {
        id: "phase",
        label: "Phase",
        type: "select",
        options: phaseOptions.map((phase) => ({ value: phase, label: phase })),
      },
      {
        id: "category",
        label: "Category",
        type: "select",
        options: categoryOptions.map((category) => ({ value: category, label: category })),
      },
    ],
    [categoryOptions, clientOptions, phaseOptions],
  );

  const defaultVisibleColumns = React.useMemo(
    () => PROJECT_COLUMNS.filter((column) => column.defaultVisible !== false).map((column) => column.id),
    [],
  );

  const tableState = useUnifiedTableState({
    entityKey: "homepage-projects",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "name",
      sortDirection: "asc",
      visibleColumns: defaultVisibleColumns,
      filters: {
        client: undefined,
        phase: undefined,
        category: undefined,
      },
    },
  });

  React.useEffect(() => {
    if (tableState.visibleColumns.length === 0) {
      tableState.setVisibleColumns(defaultVisibleColumns);
    }
  }, [defaultVisibleColumns, tableState]);

  const activeFilters = tableState.activeFilters;

  const filteredProjects = React.useMemo(() => {
    const normalizedSearch = tableState.debouncedSearch.trim().toLowerCase();

    return projects.filter((project) => {
      const clientMatch =
        !activeFilters.client ||
        (project.client ?? "").toLowerCase() ===
          String(activeFilters.client).toLowerCase();
      const phaseMatch =
        !activeFilters.phase ||
        (project.phase ?? "").toLowerCase() ===
          String(activeFilters.phase).toLowerCase();
      const categoryMatch =
        !activeFilters.category ||
        (project.category ?? "").toLowerCase() ===
          String(activeFilters.category).toLowerCase();

      if (!clientMatch || !phaseMatch || !categoryMatch) return false;

      if (!normalizedSearch) return true;

      return [
        project.name,
        project.jobNumber,
        project.client,
        project.phase,
        project.category,
        project.state,
      ]
        .map((value) => (value ?? "").toLowerCase())
        .some((value) => value.includes(normalizedSearch));
    });
  }, [activeFilters.category, activeFilters.client, activeFilters.phase, projects, tableState.debouncedSearch]);

  const handleFilterChange = (nextFilters: Record<string, FilterValue>) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      client:
        typeof nextFilters.client === "string" ? nextFilters.client : null,
      phase: typeof nextFilters.phase === "string" ? nextFilters.phase : null,
      category:
        typeof nextFilters.category === "string" ? nextFilters.category : null,
      page: "1",
    });
  };

  const PROJECT_TABLE_COLUMNS: TableColumn<Project>[] = [
    {
      ...PROJECT_COLUMNS[0],
      render: (item) => <span className="font-medium">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    {
      ...PROJECT_COLUMNS[1],
      render: (item) => <span>{item.jobNumber ?? "-"}</span>,
      sortValue: (item) => item.jobNumber ?? "",
    },
    {
      ...PROJECT_COLUMNS[2],
      render: (item) => <span>{item.client || "-"}</span>,
      sortValue: (item) => item.client ?? "",
    },
    {
      ...PROJECT_COLUMNS[3],
      render: (item) => <span>{item.startDate || "-"}</span>,
      sortValue: (item) => item.startDate ?? "",
    },
    {
      ...PROJECT_COLUMNS[4],
      render: (item) => <span>{item.state || "-"}</span>,
      sortValue: (item) => item.state ?? "",
    },
    {
      ...PROJECT_COLUMNS[5],
      render: (item) => <Badge variant="outline">{item.phase || "-"}</Badge>,
      sortValue: (item) => item.phase ?? "",
    },
    {
      ...PROJECT_COLUMNS[6],
      render: (item) => <span>{item.category || "-"}</span>,
      sortValue: (item) => item.category ?? "",
    },
    {
      ...PROJECT_COLUMNS[7],
      render: (item) => (
        <Badge variant={item.status === "Active" ? "default" : "secondary"}>
          {item.status}
        </Badge>
      ),
      sortValue: (item) => item.status,
    },
  ];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(filteredProjects.map((project) => project.id));
      return;
    }
    tableState.setSelectedIds([]);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds((previous) => [...previous, id]);
      return;
    }
    tableState.setSelectedIds((previous) =>
      previous.filter((itemId) => itemId !== id),
    );
  };

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.client) ||
    Boolean(activeFilters.phase) ||
    Boolean(activeFilters.category);

  return (
    <UnifiedTablePage
      header={{
        title: "Portfolio",
        description: "All projects across your organization",
        actions: (
          <Button size="sm" onClick={handleCreateProject}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        ),
      }}
      toolbar={{
        totalItems: projects.length,
        filteredItems: filteredProjects.length,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search projects...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        filters: projectFilters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () =>
          handleFilterChange({
            client: undefined,
            phase: undefined,
            category: undefined,
          }),
        columns: PROJECT_COLUMNS,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: filteredProjects,
        isLoading: loading,
      }}
      table={{
        columns: PROJECT_TABLE_COLUMNS,
        getRowId: (item) => item.id,
        onRowClick: (item) => {
          router.push(`/${item.id}/home`);
        },
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
        title: "No projects found",
        description: "No projects are available yet.",
        filteredDescription: "No projects match your current search or filters.",
        isFiltered,
      }}
    />
  );
}
