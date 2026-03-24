import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string | null;
  person_type: string;
}

export interface InitiativeCard {
  id: string;
  title: string;
  description: string | null;
  status: "idea" | "planned" | "in_progress" | "done";
  priority: "urgent" | "high" | "medium" | "low";
  labels: string[] | null;
  sort_order: number;
  linked_record_type: string | null;
  linked_record_id: string | null;
  source: "manual" | "agentation" | "ai_chat" | "github";
  external_id: string | null;
  github_issue_url: string | null;
  assignee: string | null;
  assignee_id: string | null;
  due_date: string | null;
  dispatch_status: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ["initiative-cards"];

export function useInitiativeCards() {
  return useQuery<InitiativeCard[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/initiative-cards");
      if (!res.ok) throw new Error("Failed to fetch cards");
      return res.json();
    },
  });
}

export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 min
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (card: Partial<InitiativeCard>) => {
      const res = await fetch("/api/initiative-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });
      if (!res.ok) throw new Error("Failed to create card");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<InitiativeCard> & { id: string }) => {
      const res = await fetch(`/api/initiative-cards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update card");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/initiative-cards/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete card");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useReorderCards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      cards: { id: string; status: string; sort_order: number }[],
    ) => {
      const res = await fetch("/api/initiative-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards }),
      });
      if (!res.ok) throw new Error("Failed to reorder cards");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDispatchCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cardId: string) => {
      const res = await fetch(`/api/initiative-cards/${cardId}/dispatch`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to dispatch card");
      return res.json() as Promise<{
        success: boolean;
        prompt: string;
        cliCommand: string;
        message: string;
      }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
