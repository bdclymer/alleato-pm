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
import type { ColumnConfig, TableColumn } from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type ProjectCompany = Database["public"]["Tables"]["project_companies"]["Row"];
type Person = Database["public"]["Tables"]["people"]["Row"];

interface ClientWithDetails extends ProjectCompany {
  company: Company | null;
  primary_contact: Person | null;
}

interface ClientTableRow {
  id: string;
  name: string;
  primary_contact: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status: string;
  created_at: string | null;
}

type ClientFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: ClientFilterState = {
  status: undefined,
};

const clientColumns: ColumnConfig[] = [
  { id: "name", label: "Client Name", alwaysVisible: true },
  { id: "primary_contact", label: "Primary Contact", defaultVisible: true },
  { id: "email", label: "Email", defaultVisible: true },
  { id: "phone", label: "Phone", defaultVisible: true },
  { id: "city", label: "City", defaultVisible: true },
  { id: "state", label: "State", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "created_at", label: "Created", defaultVisible: true },
];

const clientDefaultVisibleColumns = clientColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

function formatDate(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  const normalized = status.toLowerCase();
  if (normalized === "active") return "default";
  if (normalized === "inactive") return "secondary";
  return "outline";
}

function buildClientTableColumns(): TableColumn<ClientTableRow>[] {
  return [
    {
      ...clientColumns[0],
      render: (item) => <span className="font-medium">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    {
      ...clientColumns[1],
      render: (item) => <span>{item.primary_contact || "-"}</span>,
      sortValue: (item) => item.primary_contact || "",
    },
    {
      ...clientColumns[2],
      render: (item) => <span>{item.email || "-"}</span>,
      sortValue: (item) => item.email || "",
    },
    {
      ...clientColumns[3],
      render: (item) => <span>{item.phone || "-"}</span>,
      sortValue: (item) => item.phone || "",
    },
    {
      ...clientColumns[4],
      render: (item) => <span>{item.city || "-"}</span>,
      sortValue: (item) => item.city || "",
    },
    {
      ...clientColumns[5],
      render: (item) => <span>{item.state || "-"}</span>,
      sortValue: (item) => item.state || "",
    },
    {
      ...clientColumns[6],
      render: (item) => <Badge variant={statusVariant(item.status)}>{item.status || "-"}</Badge>,
      sortValue: (item) => item.status || "",
    },
    {
      ...clientColumns[7],
      render: (item) => <span>{formatDate(item.created_at)}</span>,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
  ];
}

export default function DirectoryClientsPage(): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = searchParams.get("status") ?? "";
  const initialFilters: ClientFilterState = {
    status: initialStatus || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "global-directory-clients",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "name",
      sortDirection: "asc",
      visibleColumns: clientDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    tableState.setActiveFilters((prev) => {
      const normalizedStatus = nextStatus || undefined;
      if (prev.status === normalizedStatus) {
        return prev;
      }
      return {
        status: normalizedStatus,
      };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const [clients, setClients] = React.useState<ClientWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchClients = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const [projectCompaniesResult, companiesResult, peopleResult] = await Promise.all([
        supabase
          .from("project_companies")
          .select("*")
          .eq("company_type", "client")
          .order("created_at", { ascending: false }),
        supabase.from("companies").select("*"),
        supabase.from("people").select("*"),
      ]);

      if (projectCompaniesResult.error) throw projectCompaniesResult.error;

      const companiesMap = new Map((companiesResult.data || []).map((company) => [company.id, company]));
      const peopleMap = new Map((peopleResult.data || []).map((person) => [person.id, person]));

      const clientsWithDetails = (projectCompaniesResult.data || []).map((projectCompany) => ({
        ...projectCompany,
        company: projectCompany.company_id
          ? companiesMap.get(projectCompany.company_id) || null
          : null,
        primary_contact: projectCompany.primary_contact_id
          ? peopleMap.get(projectCompany.primary_contact_id) || null
          : null,
      }));

      setClients(clientsWithDetails);
    } catch (fetchError) {
      setError(fetchError as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const activeFilters = tableState.activeFilters as ClientFilterState;
  const tableData = React.useMemo<ClientTableRow[]>(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    const statusFilter = typeof activeFilters.status === "string" ? activeFilters.status : "";

    return clients
      .map((client) => ({
        id: client.id,
        name: client.company?.name || "Unnamed Client",
        primary_contact: client.primary_contact
          ? `${client.primary_contact.first_name || ""} ${client.primary_contact.last_name || ""}`.trim()
          : "",
        email: client.email_address || "",
        phone: client.business_phone || "",
        city: client.company?.city || "",
        state: client.company?.state || "",
        status: client.status || "active",
        created_at: client.created_at,
      }))
      .filter((client) => {
        if (statusFilter && client.status.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
        if (!search) {
          return true;
        }
        return (
          client.name.toLowerCase().includes(search) ||
          client.primary_contact.toLowerCase().includes(search) ||
          client.email.toLowerCase().includes(search) ||
          client.city.toLowerCase().includes(search)
        );
      });
  }, [activeFilters.status, clients, tableState.debouncedSearch]);

  const tabs = getDirectoryTabs(pathname);
  const tableColumns = React.useMemo(() => buildClientTableColumns(), []);
  const isFiltered = Boolean(tableState.searchInput) || Boolean(activeFilters.status);

  const handleDeleteClient = React.useCallback(
    async (client: ClientTableRow) => {
      try {
        const resp = await fetch(`/api/directory/clients/${client.id}`, { method: "DELETE" });
        if (!resp.ok) throw new Error("Failed to delete client");
        toast.success("Client deleted");
        void fetchClients();
      } catch {
        toast.error("Failed to delete client");
      }
    },
    [fetchClients],
  );

  const handleFilterChange = (nextFilters: ClientFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  return (
    <UnifiedTablePage
      header={{
        title: "Company Directory: Clients",
        description:
          "Manage companies, clients, contacts, users, and employees across your organization",
        actions: (
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        ),
      }}
      tabs={tabs}
      toolbar={{
        totalItems: clients.length,
        filteredItems: tableData.length,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search clients...",
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
        ],
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: clientColumns,
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
        onDelete: handleDeleteClient,
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
      emptyState={{
        title: "No clients found",
        description: "No clients are available yet.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
      }}
      features={{
        enableExport: false,
        enableBulkDelete: false,
        enableRowSelection: false,
      }}
    />
  );
}
