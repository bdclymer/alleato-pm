import { apiFetch } from "@/lib/api-client";
import type { ColumnConfig, FilterValue } from "@/components/tables/unified";
import type { ServerTableDefinition } from "@/features/tables/server-table";

export interface CompanyRow {
  id: string;
  project_id: number;
  company_id: string;
  business_phone: string | null;
  email_address: string | null;
  primary_contact_id: string | null;
  erp_vendor_id: string | null;
  company_type: string | null;
  status: string | null;
  logo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  company_name: string | null;
  website: string | null;
  contact_count: number;
  project_count: number;
}

export type CompanyFilterState = {
  status: FilterValue;
  company_type: FilterValue;
};

export const EMPTY_COMPANY_FILTERS: CompanyFilterState = {
  status: undefined,
  company_type: undefined,
};

export const companyColumns: ColumnConfig[] = [
  { id: "company_name", label: "Name", alwaysVisible: true },
  { id: "company_type", label: "Type", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "contact_count", label: "Contacts", defaultVisible: true },
  { id: "project_count", label: "Projects", defaultVisible: true },
  { id: "business_phone", label: "Phone", defaultVisible: true },
  { id: "website", label: "Website", defaultVisible: true },
  { id: "email_address", label: "Email", defaultVisible: false },
  { id: "erp_vendor_id", label: "ERP Vendor ID", defaultVisible: false },
  { id: "created_at", label: "Date Added", defaultVisible: false },
  { id: "updated_at", label: "Last Updated", defaultVisible: false },
  { id: "primary_contact_id", label: "Primary Contact ID", defaultVisible: false },
  { id: "logo_url", label: "Logo URL", defaultVisible: false },
];

export const companyDefaultVisibleColumns = companyColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

const ALLOWED_SERVER_SORT_FIELDS = new Set([
  "company_name",
  "company_type",
  "status",
  "business_phone",
  "website",
  "email_address",
  "erp_vendor_id",
  "created_at",
  "updated_at",
]);

interface GlobalCompaniesResponse {
  data: CompanyRow[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export function createGlobalCompaniesTableDefinition(options: {
  entityKey: string;
  forcedCompanyType?: string;
}): ServerTableDefinition<CompanyRow, CompanyFilterState> {
  const { entityKey, forcedCompanyType } = options;

  return {
    entityKey,
    allowedViews: ["table", "card", "list"],
    defaultView: "table",
    defaultPerPage: 50,
    defaultSortBy: "updated_at",
    defaultSortDirection: "desc",
    searchPlaceholder: "Search name, phone, email, ERP ID...",
    columns: companyColumns,
    defaultVisibleColumns: companyDefaultVisibleColumns,
    filters: [],
    defaultFilters: {
      ...EMPTY_COMPANY_FILTERS,
      ...(forcedCompanyType ? { company_type: forcedCompanyType } : {}),
    },
    parseFiltersFromSearchParams(searchParams) {
      return {
        status: searchParams.get("status") ?? undefined,
        company_type:
          forcedCompanyType ?? searchParams.get("company_type") ?? undefined,
      };
    },
    serializeFiltersToSearchParams(filters) {
      return {
        status: typeof filters.status === "string" ? filters.status : null,
        company_type: forcedCompanyType
          ? forcedCompanyType
          : typeof filters.company_type === "string"
            ? filters.company_type
            : null,
      };
    },
    async fetchPage(query) {
      const params = new URLSearchParams();

      if (query.search.trim()) params.set("search", query.search.trim());
      if (typeof query.filters.status === "string" && query.filters.status) {
        params.set("status", query.filters.status);
      } else {
        params.set("status", "all");
      }

      const effectiveCompanyType =
        forcedCompanyType ||
        (typeof query.filters.company_type === "string"
          ? query.filters.company_type
          : "");
      if (effectiveCompanyType) {
        params.set("company_type", effectiveCompanyType);
      }

      params.set("page", String(query.page));
      params.set("per_page", String(query.perPage));

      const sortBy = ALLOWED_SERVER_SORT_FIELDS.has(query.sortBy ?? "")
        ? query.sortBy
        : "updated_at";
      params.set("sort", `${sortBy}:${query.sortDirection}`);

      const result = await apiFetch<GlobalCompaniesResponse>(
        `/api/directory/project-companies?${params.toString()}`,
        { cache: "no-store" },
      );

      return {
        items: result.data ?? [],
        total: result.pagination?.total ?? result.data?.length ?? 0,
        totalPages: result.pagination?.total_pages ?? 1,
      };
    },
  };
}
