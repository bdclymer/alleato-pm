"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { getDirectoryTabs } from "@/config/directory-tabs";
import type { Database } from "@/types/database.types";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  CellBadge,
  CellText,
  CellEmail,
  TableDateValue,
  type FilterValue,
  type CellColorMap,
} from "@/components/tables/unified";
import type { ColumnConfig, TableColumn } from "@/components/tables/unified";
import { Button } from "@/components/ui/button";

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

const STATUS_COLORS: CellColorMap = {
  active: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  inactive: "bg-muted text-muted-foreground",
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

function buildClientTableColumns(): TableColumn<ClientTableRow>[] {
  return [
    {
      ...clientColumns[0],
      render: (item) => <span className="font-medium">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    {
      ...clientColumns[1],
      render: (item) => <CellText value={item.primary_contact} emptyLabel="-" />,
      sortValue: (item) => item.primary_contact || "",
    },
    {
      ...clientColumns[2],
      render: (item) => <CellEmail value={item.email} emptyLabel="-" />,
      sortValue: (item) => item.email || "",
    },
    {
      ...clientColumns[3],
      render: (item) => <CellText value={item.phone} emptyLabel="-" />,
      sortValue: (item) => item.phone || "",
    },
    {
      ...clientColumns[4],
      render: (item) => <CellText value={item.city} emptyLabel="-" />,
      sortValue: (item) => item.city || "",
    },
    {
      ...clientColumns[5],
      render: (item) => <CellText value={item.state} emptyLabel="-" />,
      sortValue: (item) => item.state || "",
    },
    {
      ...clientColumns[6],
      render: (item) => <CellBadge value={item.status} colorMap={STATUS_COLORS} emptyLabel="-" />,
      sortValue: (item) => item.status || "",
    },
    {
      ...clientColumns[7],
      render: (item) => <TableDateValue value={item.created_at} emptyLabel="-" />,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
  ];
}

function ClientPreviewPane({
  client,
  clients,
  onSelectClient,
  onClose,
}: {
  client: ClientTableRow | null;
  clients: ClientTableRow[];
  onSelectClient: (id: string) => void;
  onClose: () => void;
}): ReactElement {
  const currentIndex = client ? clients.findIndex((c) => c.id === client.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < clients.length - 1;

  if (!client) {
    return (
      <div className="p-6 space-y-3 text-sm text-muted-foreground">
        <p>Select a client to preview details.</p>
      </div>
    );
  }

  const cityState = [client.city, client.state].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col h-full">
      {/* Panel header with navigation */}
      <div className="flex items-center justify-between gap-1 px-4 border-b border-border h-11">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            disabled={!hasPrev}
            onClick={() => hasPrev && onSelectClient(clients[currentIndex - 1].id)}
            aria-label="Previous client"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            disabled={!hasNext}
            onClick={() => hasNext && onSelectClient(clients[currentIndex + 1].id)}
            aria-label="Next client"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground ml-1">
            {currentIndex + 1} of {clients.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => onClose()}
            aria-label="Open full page"
            title="Open full page"
          >
            <ArrowUpRight className="h-3 w-3" />
          </Button>
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
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Client header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-tight truncate">{client.name}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {client.status && (
                  <CellBadge value={client.status} colorMap={STATUS_COLORS} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact section */}
        {(client.primary_contact || client.email || client.phone || cityState) && (
          <div className="px-5 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Contact
            </p>
            <div className="space-y-2">
              {client.primary_contact && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{client.primary_contact}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${client.email}`}
                    className="text-primary hover:underline truncate"
                  >
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{client.phone}</span>
                </div>
              )}
              {cityState && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{cityState}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Details section */}
        {client.created_at && (
          <div className="px-5 pb-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Details
            </p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Added</dt>
                <dd>
                  <TableDateValue value={client.created_at} />
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
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

  const selectedClientId = searchParams.get("detail");
  const selectedClient =
    (selectedClientId ? tableData.find((client) => client.id === selectedClientId) : null) ||
    tableData[0] ||
    null;
  const activeClientId = selectedClient?.id ?? null;

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(tableData.map((client) => client.id));
      return;
    }
    tableState.setSelectedIds([]);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds((prev) => [...prev, id]);
      return;
    }
    tableState.setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
  };

  return (
    <UnifiedTablePage
      header={{
        title: "Clients",
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
        activeRowId: activeClientId,
        onRowClick: (item) => tableState.setSearchParams({ detail: item.id }),
        onDelete: handleDeleteClient,
      }}
      sidePanel={{
        content: (
          <ClientPreviewPane
            client={selectedClient}
            clients={tableData}
            onSelectClient={(id) => tableState.setSearchParams({ detail: id })}
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
          tableState.setSearchParams({
            sort: sortBy,
            sort_dir: direction,
          });
        },
      }}
      selection={{
        selectedIds: tableState.selectedIds,
        onSelectAll: handleSelectAll,
        onSelectRow: handleSelectRow,
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
      }}
    />
  );
}
