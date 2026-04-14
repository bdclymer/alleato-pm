import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

interface ChecklistStatus {
  "setup-team": boolean;
  "configure-budget": boolean;
  "add-contracts": boolean;
  "create-schedule": boolean;
  "upload-drawings": boolean;
  "setup-rfis": boolean;
  "setup-change-orders": boolean;
  "setup-submittals": boolean;
}

export function useProjectChecklist(projectId: string) {
  return useQuery<ChecklistStatus>({
    queryKey: ["project-checklist", projectId],
    queryFn: ({ signal }) =>
      apiFetch<ChecklistStatus>(`/api/projects/${projectId}/checklist`, { signal }),
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });
}
