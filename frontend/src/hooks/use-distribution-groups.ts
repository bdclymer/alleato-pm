import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  DistributionGroupWithMembers,
  GroupCreateDTO,
  GroupUpdateDTO,
} from "@/services/distributionGroupService";

interface UseDistributionGroupsResult {
  groups: DistributionGroupWithMembers[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDistributionGroups(
  projectId: string,
  includeMembers = true,
  status: "active" | "inactive" | "all" = "active",
): UseDistributionGroupsResult {
  const query = useQuery<DistributionGroupWithMembers[], Error>({
    queryKey: ["distribution-groups", projectId, includeMembers, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        include_members: String(includeMembers),
        status,
      });
      const response = await fetch(
        `/api/projects/${projectId}/directory/groups?${params}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch distribution groups");
      }
      return response.json();
    },
    enabled: !!projectId,
  });

  return {
    groups: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useDistributionGroup(
  projectId: string,
  groupId: string | null,
) {
  return useQuery<DistributionGroupWithMembers, Error>({
    queryKey: ["distribution-group", projectId, groupId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/groups/${groupId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch distribution group");
      }
      return response.json();
    },
    enabled: !!projectId && !!groupId,
  });
}

export function useCreateGroup(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GroupCreateDTO) => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create group");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["distribution-groups", projectId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create group");
    },
  });
}

export function useUpdateGroup(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      data,
    }: {
      groupId: string;
      data: GroupUpdateDTO;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/groups/${groupId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update group");
      }
      return response.json();
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ["distribution-groups", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["distribution-group", projectId, groupId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update group");
    },
  });
}

export function useDeleteGroup(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/groups/${groupId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete group");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["distribution-groups", projectId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete group");
    },
  });
}

export function useUpdateGroupMembers(projectId: string, groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (operation: {
      add_user_ids?: string[];
      remove_user_ids?: string[];
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/groups/${groupId}/members`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(operation),
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update group members");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["distribution-groups", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["distribution-group", projectId, groupId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update group members");
    },
  });
}
