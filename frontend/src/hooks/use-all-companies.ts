import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  business_phone?: string;
  email_address?: string;
  company_type?: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

interface CompanyListResponse {
  data: Company[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

interface CompanyFilters {
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "all";
  company_type?: string;
  sort?: string;
  page?: number;
  per_page?: number;
}

interface UseAllCompaniesResult {
  companies: Company[];
  pagination: CompanyListResponse["pagination"] | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAllCompanies(
  filters: CompanyFilters = {}
): UseAllCompaniesResult {
  const query = useQuery<CompanyListResponse, Error>({
    queryKey: ["all-companies", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.company_type)
        params.set("company_type", filters.company_type);
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.per_page) params.set("per_page", String(filters.per_page));

      const response = await fetch(
        `/api/directory/companies?${params}`
      );
      if (!response.ok) {
        let errorMessage = "Failed to fetch companies";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          // If response doesn't have valid JSON, use default message
          errorMessage = `Failed to fetch companies (${response.status})`;
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
    refetch: query.refetch,
  };
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Company>) => {
      const response = await fetch(
        `/api/directory/companies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) {
        let errorMessage = "Failed to create company";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          // If response doesn't have valid JSON, use default message
          errorMessage = `Failed to create company (${response.status})`;
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["all-companies"],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create company");
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string;
      data: Partial<Company>;
    }) => {
      const response = await fetch(
        `/api/directory/companies/${companyId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) {
        let errorMessage = "Failed to update company";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          // If response doesn't have valid JSON, use default message
          errorMessage = `Failed to update company (${response.status})`;
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["all-companies"],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update company");
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await fetch(
        `/api/directory/companies/${companyId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        let errorMessage = "Failed to delete company";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          // If response doesn't have valid JSON, use default message
          errorMessage = `Failed to delete company (${response.status})`;
        }
        throw new Error(errorMessage);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["all-companies"],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete company");
    },
  });
}