import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectCompany,
  CompanyCreateDTO,
  CompanyUpdateDTO,
  CompanyFilters,
} from "@/services/companyService";
import {
  CompanyListResponseSchema,
  ProjectCompanySchema,
  type CompanyListResponse as CompanyListResponseParsed,
  type ProjectCompanyResponse,
} from "@/lib/validation/companies";
import { safeParse } from "@/lib/validation/schemas";

interface UseProjectCompaniesResult {
  companies: ProjectCompany[];
  pagination: CompanyListResponseParsed["pagination"] | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useProjectCompanies(
  projectId: string,
  filters: CompanyFilters = {},
): UseProjectCompaniesResult {
  const query = useQuery<CompanyListResponseParsed, Error>({
    queryKey: ["project-companies", projectId, filters],
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
        `/api/projects/${projectId}/directory/companies?${params}`,
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
      const payload = await response.json();
      const parsed = safeParse(CompanyListResponseSchema, payload);
      if (!parsed.success) {
        throw new Error("Invalid companies response from server");
      }
      return parsed.data;
    },
    enabled: !!projectId,
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

interface UseProjectCompanyResult {
  company: ProjectCompany | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useProjectCompany(
  projectId: string,
  companyId: string | null,
): UseProjectCompanyResult {
  const query = useQuery<ProjectCompanyResponse, Error>({
    queryKey: ["project-company", projectId, companyId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/companies/${companyId}`,
      );
      if (!response.ok) {
        let errorMessage = "Failed to fetch company";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          // If response doesn't have valid JSON, use default message
          errorMessage = `Failed to fetch company (${response.status})`;
        }
        throw new Error(errorMessage);
      }
      const payload = await response.json();
      const parsed = safeParse(ProjectCompanySchema, payload);
      if (!parsed.success) {
        throw new Error("Invalid company response from server");
      }
      return parsed.data;
    },
    enabled: !!projectId && !!companyId,
  });

  return {
    company: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateProjectCompany(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CompanyCreateDTO) => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/companies`,
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
      const payload = await response.json();
      const parsed = safeParse(ProjectCompanySchema, payload);
      if (!parsed.success) {
        throw new Error("Invalid company response from server");
      }
      return parsed.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-companies", projectId],
      });
    },
  });
}

export function useUpdateProjectCompany(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string;
      data: CompanyUpdateDTO;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/companies/${companyId}`,
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
      const payload = await response.json();
      const parsed = safeParse(ProjectCompanySchema, payload);
      if (!parsed.success) {
        throw new Error("Invalid company response from server");
      }
      return parsed.data;
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: ["project-companies", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project-company", projectId, companyId],
      });
    },
  });
}

export function useDeleteProjectCompany(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/companies/${companyId}`,
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
        queryKey: ["project-companies", projectId],
      });
    },
  });
}
