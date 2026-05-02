"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Plus,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { getDirectoryTabs } from "@/config/directory-tabs";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  CellBadge,
  CellEmail,
  CellText,
  TableDateValue,
  type FilterValue,
  type CellColorMap,
} from "@/components/tables/unified";
import type { ColumnConfig, TableColumn } from "@/components/tables/unified";
import { Button } from "@/components/ui/button";

const ALLEATO_COMPANY = "Alleato Group";

interface EmployeeRow {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  job_title: string;
  business_unit: string;
  phone: string;
  status: string;
  person_type: string;
  created_at: string | null;
}

type EmployeeFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: EmployeeFilterState = {
  status: undefined,
  business_unit: undefined,
};

const STATUS_COLORS: CellColorMap = {
  active: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  inactive: "bg-muted text-muted-foreground",
};

const employeeColumns: ColumnConfig[] = [
  { id: "full_name", label: "Name", alwaysVisible: true },
  { id: "job_title", label: "Job Title", defaultVisible: true },
  { id: "business_unit", label: "Business Unit", defaultVisible: true },
  { id: "email", label: "Email", defaultVisible: true },
  { id: "phone", label: "Phone", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "person_type", label: "Type", defaultVisible: false },
  { id: "created_at", label: "Added", defaultVisible: false },
];

const employeeDefaultVisibleColumns = employeeColumns
  .filter((col) => col.defaultVisible !== false)
  .map((col) => col.id);

function buildEmployeeTableColumns(): TableColumn<EmployeeRow>[] {
  return [
    {
      ...employeeColumns[0],
      render: (item) => <span className="font-medium">{item.full_name}</span>,
      sortValue: (item) => item.full_name,
    },
    {
      ...employeeColumns[1],
      render: (item) => <CellText value={item.job_title} emptyLabel="-" />,
      sortValue: (item) => item.job_title || "",
    },
    {
      ...employeeColumns[2],
      render: (item) => <CellText value={item.business_unit} emptyLabel="-" />,
      sortValue: (item) => item.business_unit || "",
    },
    {
      ...employeeColumns[3],
      render: (item) => <CellEmail value={item.email} emptyLabel="-" />,
      sortValue: (item) => item.email || "",
    },
    {
      ...employeeColumns[4],
      render: (item) => <CellText value={item.phone} emptyLabel="-" />,
      sortValue: (item) => item.phone || "",
    },
    {
      ...employeeColumns[5],
      render: (item) => <CellBadge value={item.status} colorMap={STATUS_COLORS} emptyLabel="-" />,
      sortValue: (item) => item.status || "",
    },
    {
      ...employeeColumns[6],
      render: (item) => <CellText value={item.person_type} emptyLabel="-" />,
      sortValue: (item) => item.person_type || "",
    },
    {
      ...employeeColumns[7],
      render: (item) => <TableDateValue value={item.created_at} emptyLabel="-" />,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
  ];
}

function EmployeePreviewPane({
  employee,
  employees,
  onSelectEmployee,
  onClose,
}: {
  employee: EmployeeRow | null;
  employees: EmployeeRow[];
  onSelectEmployee: (id: string) => void;
  onClose: () => void;
}): ReactElement {
  const currentIndex = employee ? employees.findIndex((e) => e.id === employee.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < employees.length - 1;

  if (!employee) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        <p>Select an employee to preview details.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-1 px-4 h-11">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            disabled={!hasPrev}
            onClick={() => hasPrev && onSelectEmployee(employees[currentIndex - 1].id)}
            aria-label="Previous employee"
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            disabled={!hasNext}
            onClick={() => hasNext && onSelectEmployee(employees[currentIndex + 1].id)}
            aria-label="Next employee"
          >
            <ChevronRight />
          </Button>
          <span className="text-xs text-muted-foreground ml-1">
            {currentIndex + 1} of {employees.length}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              {/* eslint-disable-next-line design-system/no-raw-heading */}
              <h3 className="text-sm font-semibold leading-tight truncate">{employee.full_name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {employee.job_title && (
                  <span className="text-xs text-muted-foreground">{employee.job_title}</span>
                )}
                {employee.status && (
                  <CellBadge value={employee.status} colorMap={STATUS_COLORS} />
                )}
              </div>
            </div>
          </div>
        </div>

        {employee.business_unit && (
          <div className="px-5 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Business Unit
            </p>
            <p className="text-sm">{employee.business_unit}</p>
          </div>
        )}

        {(employee.email || employee.phone) && (
          <div className="px-5 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Contact
            </p>
            <div className="space-y-2">
              {employee.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <CellEmail value={employee.email} />
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <CellText value={employee.phone} />
                </div>
              )}
            </div>
          </div>
        )}

        {employee.created_at && (
          <div className="px-5 pb-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Details
            </p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Added</dt>
                <dd><TableDateValue value={employee.created_at} /></dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DirectoryEmployeesPage(): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = searchParams.get("status") ?? "";
  const initialBusinessUnit = searchParams.get("business_unit") ?? "";
  const initialFilters: EmployeeFilterState = {
    status: initialStatus || undefined,
    business_unit: initialBusinessUnit || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "global-directory-employees",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "full_name",
      sortDirection: "asc",
      visibleColumns: employeeDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const [employees, setEmployees] = React.useState<EmployeeRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchEmployees = React.useCallback(async () => {
    try {
      setError(null);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("people")
        .select("*")
        .ilike("company", `%${ALLEATO_COMPANY}%`)
        .order("last_name", { ascending: true });

      if (fetchError) throw fetchError;

      setEmployees(
        (data || []).map((person) => ({
          id: person.id,
          first_name: person.first_name || "",
          last_name: person.last_name || "",
          full_name: `${person.first_name || ""} ${person.last_name || ""}`.trim() || "Unnamed",
          email: person.email || "",
          job_title: person.job_title || "",
          business_unit: person.business_unit || "",
          phone: person.phone_business || person.phone_mobile || "",
          status: person.status || "",
          person_type: person.person_type || "",
          created_at: person.created_at,
        })),
      );
    } catch (err) {
      setError(err as Error);
      toast.error("Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  const activeFilters = tableState.activeFilters as EmployeeFilterState;

  const tableData = React.useMemo<EmployeeRow[]>(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    const statusFilter = typeof activeFilters.status === "string" ? activeFilters.status : "";
    const unitFilter = typeof activeFilters.business_unit === "string" ? activeFilters.business_unit : "";

    return employees.filter((emp) => {
      if (statusFilter && emp.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (unitFilter && emp.business_unit.toLowerCase() !== unitFilter.toLowerCase()) return false;
      if (!search) return true;
      return (
        emp.full_name.toLowerCase().includes(search) ||
        emp.email.toLowerCase().includes(search) ||
        emp.job_title.toLowerCase().includes(search) ||
        emp.business_unit.toLowerCase().includes(search)
      );
    });
  }, [activeFilters, employees, tableState.debouncedSearch]);

  const uniqueBusinessUnits = React.useMemo(
    () => Array.from(new Set(employees.map((e) => e.business_unit).filter(Boolean))),
    [employees],
  );

  const selectedEmployeeId = searchParams.get("detail");
  const selectedEmployee = selectedEmployeeId
    ? tableData.find((e) => e.id === selectedEmployeeId) ?? null
    : null;

  const tabs = getDirectoryTabs(pathname);
  const tableColumns = React.useMemo(() => buildEmployeeTableColumns(), []);
  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.business_unit);
  const totalPages = Math.max(1, Math.ceil(tableData.length / tableState.perPage));
  const currentPage = Math.min(tableState.page, totalPages);

  const handleFilterChange = (nextFilters: EmployeeFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      business_unit: typeof nextFilters.business_unit === "string" ? nextFilters.business_unit : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    tableState.setSelectedIds(checked ? tableData.map((e) => e.id) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds((prev) => [...new Set([...prev, id])]);
    } else {
      tableState.setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  return (
    <UnifiedTablePage
      header={{
        title: "Employees",
        description: "Alleato Group employees",
        actions: (
          <Button className="bg-primary hover:bg-primary/90">
            <Plus />
            New Employee
          </Button>
        ),
      }}
      tabs={tabs}
      toolbar={{
        totalItems: employees.length,
        filteredItems: tableData.length,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search employees...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "card", "list"],
        filters: [
          {
            id: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
          ...(uniqueBusinessUnits.length > 0
            ? [
                {
                  id: "business_unit",
                  label: "Business Unit",
                  type: "select" as const,
                  options: uniqueBusinessUnits.map((unit) => ({ value: unit, label: unit })),
                },
              ]
            : []),
        ],
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: employeeColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: tableData,
        isLoading,
        isFetching: false,
        error: error ?? undefined,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.id,
        activeRowId: selectedEmployee?.id ?? null,
        onRowClick: (item) => tableState.setSearchParams({ detail: item.id }),
      }}
      sidePanel={{
        content: (
          <EmployeePreviewPane
            employee={selectedEmployee}
            employees={tableData}
            onSelectEmployee={(id) => tableState.setSearchParams({ detail: id })}
            onClose={() => tableState.setSearchParams({ detail: null })}
          />
        ),
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
        title: "No employees found",
        description: `No people with company set to "${ALLEATO_COMPANY}".`,
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
      }}
      pagination={{
        page: currentPage,
        totalPages,
        perPage: tableState.perPage,
        clientSide: true,
        onPageChange: (nextPage) => {
          tableState.setPage(nextPage);
          tableState.setSearchParams({ page: String(nextPage) });
        },
        onPerPageChange: (nextPerPage) => {
          const parsed = Number(nextPerPage);
          if (!Number.isFinite(parsed) || parsed <= 0) return;
          tableState.setPerPage(parsed);
          tableState.setSearchParams({ per_page: String(parsed), page: "1" });
          tableState.setPage(1);
        },
      }}
      features={{
        enableExport: false,
        enableBulkDelete: false,
        enableRowSelection: true,
      }}
      layout={{
        fullBleedTable: true,
        removeTableFrame: true,
      }}
    />
  );
}
