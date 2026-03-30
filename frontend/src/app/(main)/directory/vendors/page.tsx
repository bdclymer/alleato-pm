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
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/ds";

type Vendor = Database["public"]["Tables"]["vendors"]["Row"];

type VendorFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: VendorFilterState = {
  is_active: undefined,
  vendor_class: undefined,
  payment_method: undefined,
};

const vendorColumns: ColumnConfig[] = [
  { id: "name", label: "Vendor Name", alwaysVisible: true },
  { id: "legal_name", label: "Legal Name", defaultVisible: false },
  { id: "contact_name", label: "Contact", defaultVisible: true },
  { id: "contact_email", label: "Email", defaultVisible: true },
  { id: "contact_phone", label: "Phone", defaultVisible: true },
  { id: "city", label: "City", defaultVisible: true },
  { id: "state", label: "State", defaultVisible: true },
  { id: "is_active", label: "Status", defaultVisible: true },
  { id: "vendor_class", label: "Class", defaultVisible: true },
  { id: "payment_method", label: "Payment Method", defaultVisible: false },
  { id: "terms", label: "Terms", defaultVisible: false },
  { id: "is_1099_vendor", label: "1099", defaultVisible: false },
  { id: "acumatica_vendor_id", label: "Acumatica ID", defaultVisible: false },
  { id: "created_at", label: "Created", defaultVisible: false },
];

const vendorDefaultVisibleColumns = vendorColumns
  .filter((col) => col.defaultVisible !== false)
  .map((col) => col.id);

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function normalizeVendorField(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Supabase/Postgres empty-array/object text artifacts sometimes appear as "{}"/"[]".
  if (
    trimmed === "{}" ||
    trimmed === "[]" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined"
  ) {
    return "";
  }

  return trimmed;
}

function normalizeSearchText(value: string | null | undefined): string {
  return normalizeVendorField(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type VendorFieldType = "text" | "boolean" | "date" | "email" | "phone";

const vendorPreviewFields: Array<{
  key: keyof Vendor;
  label: string;
  type?: VendorFieldType;
}> = [
  { key: "name", label: "Name" },
  { key: "legal_name", label: "Legal Name" },
  { key: "is_active", label: "Active", type: "boolean" },
  { key: "vendor_class", label: "Vendor Class" },
  { key: "acumatica_vendor_id", label: "Acumatica Vendor ID" },
  { key: "acumatica_sync_at", label: "Acumatica Sync At", type: "date" },
  { key: "contact_name", label: "Contact Name" },
  { key: "contact_email", label: "Contact Email", type: "email" },
  { key: "contact_phone", label: "Contact Phone", type: "phone" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip_code", label: "Zip Code" },
  { key: "payment_method", label: "Payment Method" },
  { key: "terms", label: "Terms" },
  { key: "tax_id", label: "Tax ID" },
  { key: "notes", label: "Notes" },
  { key: "created_at", label: "Created At", type: "date" },
  { key: "updated_at", label: "Updated At", type: "date" },
];

function formatVendorFieldValue(vendor: Vendor, field: (typeof vendorPreviewFields)[number]): ReactElement {
  const value = vendor[field.key];

  if (field.type === "boolean") {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>;
    }
    return <span>{value ? "Yes" : "No"}</span>;
  }

  if (field.type === "date") {
    if (typeof value !== "string" || !value) {
      return <span className="text-muted-foreground">-</span>;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return <span className="text-muted-foreground">-</span>;
    }
    return <span>{parsed.toLocaleString()}</span>;
  }

  if (field.type === "email") {
    const email = normalizeVendorField(typeof value === "string" ? value : "");
    if (!email) {
      return <span className="text-muted-foreground">-</span>;
    }
    return (
      <a href={`mailto:${email}`} className="text-primary hover:underline break-all">
        {email}
      </a>
    );
  }

  if (field.type === "phone") {
    const phone = normalizeVendorField(typeof value === "string" ? value : "");
    if (!phone) {
      return <span className="text-muted-foreground">-</span>;
    }
    return <span>{phone}</span>;
  }

  const text = normalizeVendorField(typeof value === "string" ? value : value == null ? "" : String(value));
  if (!text) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <span className="break-words">{text}</span>;
}

function buildVendorTableColumns(): TableColumn<Vendor>[] {
  return [
    {
      ...vendorColumns[0],
      render: (item) => <span className="font-medium">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    {
      ...vendorColumns[1],
      render: (item) => <span>{item.legal_name || "-"}</span>,
      sortValue: (item) => item.legal_name || "",
    },
    {
      ...vendorColumns[2],
      render: (item) => <span>{item.contact_name || "-"}</span>,
      sortValue: (item) => item.contact_name || "",
    },
    {
      ...vendorColumns[3],
      render: (item) => <span>{normalizeVendorField(item.contact_email) || "-"}</span>,
      sortValue: (item) => normalizeVendorField(item.contact_email),
    },
    {
      ...vendorColumns[4],
      render: (item) => <span>{normalizeVendorField(item.contact_phone) || "-"}</span>,
      sortValue: (item) => normalizeVendorField(item.contact_phone),
    },
    {
      ...vendorColumns[5],
      render: (item) => <span>{item.city || "-"}</span>,
      sortValue: (item) => item.city || "",
    },
    {
      ...vendorColumns[6],
      render: (item) => <span>{item.state || "-"}</span>,
      sortValue: (item) => item.state || "",
    },
    {
      ...vendorColumns[7],
      render: (item) => (
        <StatusBadge status={item.is_active ? "Active" : "Inactive"} />
      ),
      sortValue: (item) => (item.is_active ? "Active" : "Inactive"),
    },
    {
      ...vendorColumns[8],
      render: (item) => <span>{item.vendor_class || "-"}</span>,
      sortValue: (item) => item.vendor_class || "",
    },
    {
      ...vendorColumns[9],
      render: (item) => <span>{item.payment_method || "-"}</span>,
      sortValue: (item) => item.payment_method || "",
    },
    {
      ...vendorColumns[10],
      render: (item) => <span>{item.terms || "-"}</span>,
      sortValue: (item) => item.terms || "",
    },
    {
      ...vendorColumns[11],
      render: (item) => <span>{item.is_1099_vendor ? "Yes" : "No"}</span>,
      sortValue: (item) => (item.is_1099_vendor ? "Yes" : "No"),
    },
    {
      ...vendorColumns[12],
      render: (item) => (
        <span className="font-mono text-xs">{item.acumatica_vendor_id || "-"}</span>
      ),
      sortValue: (item) => item.acumatica_vendor_id || "",
    },
    {
      ...vendorColumns[13],
      render: (item) => <span>{formatDate(item.created_at)}</span>,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
  ];
}

function VendorPreviewPane({
  vendor,
  vendors,
  onSelectVendor,
  onClose,
}: {
  vendor: Vendor | null;
  vendors: Vendor[];
  onSelectVendor: (id: string) => void;
  onClose: () => void;
}): ReactElement {
  const currentIndex = vendor ? vendors.findIndex((v) => v.id === vendor.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < vendors.length - 1;

  if (!vendor) {
    return (
      <div className="p-6 space-y-3 text-sm text-muted-foreground">
        <p>Select a vendor to preview details.</p>
      </div>
    );
  }

  const email = normalizeVendorField(vendor.contact_email);
  const phone = normalizeVendorField(vendor.contact_phone);
  const location = [vendor.city, vendor.state].filter(Boolean).join(", ");

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
            onClick={() => hasPrev && onSelectVendor(vendors[currentIndex - 1].id)}
            aria-label="Previous vendor"
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            disabled={!hasNext}
            onClick={() => hasNext && onSelectVendor(vendors[currentIndex + 1].id)}
            aria-label="Next vendor"
          >
            <ChevronRight />
          </Button>
          <span className="text-xs text-muted-foreground ml-1">
            {currentIndex + 1} of {vendors.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => window.open(`/directory/vendors/${vendor.id}`, "_blank")}
            aria-label="Open full page"
            title="Open full page"
          >
            <ArrowUpRight />
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
        {/* Vendor header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-tight truncate">{vendor.name}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={vendor.is_active ? "Active" : "Inactive"} />
                {vendor.vendor_class && (
                  <StatusBadge status={vendor.vendor_class} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact section */}
        {(email || phone) && (
          <div className="px-5 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Contact
            </p>
            <div className="space-y-2">
              {phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{phone}</span>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={`mailto:${email}`} className="text-primary hover:underline truncate">
                    {email}
                  </a>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full vendor field set */}
        <div className="px-5 pb-5">
          <dl className="space-y-3 text-sm">
            {vendorPreviewFields.map((field) => (
              <div
                key={String(field.key)}
                className="grid grid-cols-[minmax(120px,140px),1fr] items-start gap-x-2"
              >
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="min-w-0 break-words text-right">{formatVendorFieldValue(vendor, field)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

export default function DirectoryVendorsPage(): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilters: VendorFilterState = {
    is_active: searchParams.get("is_active") || undefined,
    vendor_class: searchParams.get("vendor_class") || undefined,
    payment_method: searchParams.get("payment_method") || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "global-directory-vendors",
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
      visibleColumns: vendorDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const fetchVendors = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("vendors")
        .select("*")
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;
      setVendors(data || []);
    } catch (fetchError) {
      setError(fetchError as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleErpSync = React.useCallback(async () => {
    setIsSyncing(true);
    try {
      const resp = await fetch("/api/sync/acumatica/vendors", { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Sync failed");
      const { result } = data;
      toast.success(
        `ERP sync complete: ${result.created} vendors created, ${result.updated} vendors updated, ` +
          `${result.companiesCreated ?? 0} companies created, ${result.companiesUpdated ?? 0} companies updated` +
          (result.errors.length > 0 ? ` (${result.errors.length} errors)` : ""),
      );
      await fetchVendors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ERP sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [fetchVendors]);

  // Sync URL filters to table state
  React.useEffect(() => {
    const nextActive = searchParams.get("is_active") || undefined;
    const nextClass = searchParams.get("vendor_class") || undefined;
    const nextPayment = searchParams.get("payment_method") || undefined;
    tableState.setActiveFilters((prev) => {
      if (
        prev.is_active === nextActive &&
        prev.vendor_class === nextClass &&
        prev.payment_method === nextPayment
      ) {
        return prev;
      }
      return { is_active: nextActive, vendor_class: nextClass, payment_method: nextPayment };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as VendorFilterState;

  // Derive filter options from data
  const filterOptions = React.useMemo(() => {
    const classes = Array.from(new Set(vendors.map((v) => v.vendor_class).filter(Boolean)));
    const methods = Array.from(new Set(vendors.map((v) => v.payment_method).filter(Boolean)));
    return { classes, methods };
  }, [vendors]);

  const filters: FilterConfig[] = React.useMemo(
    () => [
      {
        id: "is_active",
        label: "Status",
        type: "select",
        options: [
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive" },
        ],
      },
      {
        id: "vendor_class",
        label: "Class",
        type: "select",
        options: filterOptions.classes.map((c) => ({ value: String(c), label: String(c) })),
      },
      {
        id: "payment_method",
        label: "Payment Method",
        type: "select",
        options: filterOptions.methods.map((m) => ({ value: String(m), label: String(m) })),
      },
    ],
    [filterOptions],
  );

  // Client-side filtering
  const filteredVendors = React.useMemo(() => {
    const search = normalizeSearchText(tableState.debouncedSearch);
    const searchTokens = search ? search.split(" ") : [];
    const activeFilter = typeof activeFilters.is_active === "string" ? activeFilters.is_active : "";
    const classFilter = typeof activeFilters.vendor_class === "string" ? activeFilters.vendor_class : "";
    const methodFilter = typeof activeFilters.payment_method === "string" ? activeFilters.payment_method : "";

    return vendors.filter((v) => {
      if (activeFilter) {
        const isActive = activeFilter === "true";
        if (v.is_active !== isActive) return false;
      }
      if (classFilter && (v.vendor_class || "").toLowerCase() !== classFilter.toLowerCase()) return false;
      if (methodFilter && (v.payment_method || "").toLowerCase() !== methodFilter.toLowerCase()) return false;
      if (!search) return true;

      const searchable = normalizeSearchText(
        [
          v.name,
          v.legal_name,
          v.contact_name,
          v.contact_email,
          v.contact_phone,
          v.city,
          v.state,
          v.address,
          v.zip_code,
          v.vendor_class,
          v.payment_method,
          v.terms,
          v.tax_id,
          v.acumatica_vendor_id,
        ]
          .filter(Boolean)
          .join(" "),
      );

      const compactSearchable = searchable.replace(/\s+/g, "");
      const compactSearch = search.replace(/\s+/g, "");
      if (compactSearch && compactSearchable.includes(compactSearch)) {
        return true;
      }

      return searchTokens.every((token) => searchable.includes(token));
    });
  }, [vendors, activeFilters, tableState.debouncedSearch]);

  const tableColumns = React.useMemo(() => buildVendorTableColumns(), []);
  const tabs = getDirectoryTabs(pathname);
  const selectedVendorId = searchParams.get("detail");
  const selectedVendor =
    (selectedVendorId
      ? filteredVendors.find((vendor) => vendor.id === selectedVendorId)
      : null) ??
    filteredVendors[0] ??
    null;
  const activeVendorId = selectedVendor?.id ?? null;
  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.is_active) ||
    Boolean(activeFilters.vendor_class) ||
    Boolean(activeFilters.payment_method);

  const handleDeleteVendor = React.useCallback(
    async (vendor: Vendor) => {
      try {
        const supabase = createClient();
        const { error: deleteError } = await supabase
          .from("vendors")
          .delete()
          .eq("id", vendor.id);
        if (deleteError) throw deleteError;
        toast.success("Vendor deleted");
        setVendors((prev) => prev.filter((v) => v.id !== vendor.id));
      } catch {
        toast.error("Failed to delete vendor");
      }
    },
    [],
  );

  const handleFilterChange = (nextFilters: VendorFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      is_active: typeof nextFilters.is_active === "string" ? nextFilters.is_active : null,
      vendor_class: typeof nextFilters.vendor_class === "string" ? nextFilters.vendor_class : null,
      payment_method: typeof nextFilters.payment_method === "string" ? nextFilters.payment_method : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    tableState.setSelectedIds(
      checked ? filteredVendors.map((v) => v.id) : [],
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
        title: "Company Directory: Vendors",
        description:
          "Manage vendors, payment terms, and accounting integration across your organization",
        actions: (
          <Button className="bg-primary hover:bg-primary/90">
            <Plus />
            New Vendor
          </Button>
        ),
      }}
      tabs={tabs}
      toolbar={{
        totalItems: vendors.length,
        filteredItems: filteredVendors.length,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search name, contact, email, city, Acumatica ID...",
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
        columns: vendorColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
        customActions: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={isSyncing}
                  onClick={handleErpSync}
                  aria-label="Sync from ERP"
                >
                  <RefreshCw className={isSyncing ? "animate-spin" : undefined} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sync vendors from Acumatica</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      }}
      data={{
        items: filteredVendors,
        isLoading,
        isFetching: false,
        error: error ?? undefined,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.id,
        activeRowId: activeVendorId,
        onRowClick: (item) => tableState.setSearchParams({ detail: item.id }),
        onDelete: handleDeleteVendor,
      }}
      sidePanel={{
        sticky: false,
        content: (
          <VendorPreviewPane
            vendor={selectedVendor}
            vendors={filteredVendors}
            onSelectVendor={(id) => tableState.setSearchParams({ detail: id })}
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
        title: "No vendors found",
        description: "No vendors have been added yet.",
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
