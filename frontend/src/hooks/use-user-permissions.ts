"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface Permission {
  tool_name: string;
  permission_type: string;
  is_granted: boolean;
}

interface UserPermissionsResponse {
  user_id: string;
  permissions: Permission[];
  template_permissions: Record<string, string[]>;
  effective_permissions: Record<string, string[]>;
}

export function useUserPermissions(projectId: string, personId: string) {
  return useQuery<UserPermissionsResponse>({
    queryKey: ["user-permissions", projectId, personId],
    queryFn: async () => {
      return apiFetch<UserPermissionsResponse>(
        `/api/projects/${projectId}/directory/people/${personId}/permissions`,
      );
    },
    enabled: !!projectId && !!personId,
  });
}

export function useUpdateUserPermissions(projectId: string, personId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissions: Permission[]) => {
      return apiFetch<UserPermissionsResponse>(
        `/api/projects/${projectId}/directory/people/${personId}/permissions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-permissions", projectId, personId],
      });
      queryClient.invalidateQueries({
        queryKey: ["person", projectId, personId],
      });
      toast.success("Permissions updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permissions: ${error.message}`);
    },
  });
}
