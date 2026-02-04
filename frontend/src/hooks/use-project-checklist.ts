import { useQuery } from "@tanstack/react-query";

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
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/checklist`);
      if (!response.ok) {
        throw new Error("Failed to fetch checklist status");
      }
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });
}
