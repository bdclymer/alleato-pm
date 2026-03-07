import { useQuery } from "@tanstack/react-query";

interface GlobalProjectCompany {
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
}

interface GlobalProjectCompanyListResponse {
  data: GlobalProjectCompany[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

interface GlobalProjectCompanyFilters {
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "all";
  company_type?: string;
  sort?: string;
  page?: number;
  per_page?: number;
}

interface UseGlobalProjectCompaniesResult {
  companies: GlobalProjectCompany[];
  pagination: GlobalProjectCompanyListResponse["pagination"] | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

export type { GlobalProjectCompany, GlobalProjectCompanyFilters };

export function useGlobalProjectCompanies(
  filters: GlobalProjectCompanyFilters = {},
): UseGlobalProjectCompaniesResult {
  const query = useQuery<GlobalProjectCompanyListResponse, Error>({
    queryKey: ["global-project-companies", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.company_type) params.set("company_type", filters.company_type);
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.per_page) params.set("per_page", String(filters.per_page));

      const response = await fetch(`/api/directory/project-companies?${params.toString()}`);
      if (!response.ok) {
        let errorMessage = "Failed to fetch project companies";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          errorMessage = `Failed to fetch project companies (${response.status})`;
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    enabled: true,
  });

  return {
    companies: query.data?.data || [],
    pagination: query.data?.pagination || null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
