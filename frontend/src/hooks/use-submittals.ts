"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubmittalSummary {
  id: string;
  project_id: number;
  submittal_number: string;
  revision: number;
  title: string;
  status: "Draft" | "Open" | "Distributed" | "Closed" | string;
  priority: string | null;
  specification_section: string | null;
  /** Raw text field on the submittals table (type name string) */
  submittal_type: string | { id: string; name: string } | null;
  division: string | null;
  ball_in_court: string | null;
  is_private: boolean;
  final_due_date: string | null;
  sent_date: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  submittal_package?: { id: string; name: string } | null;
}

export interface SubmittalDetail extends SubmittalSummary {
  description: string | null;
  received_from_id: string | null;
  responsible_contractor_id: number | null;
  submittal_manager_id: string | null;
  lead_time: number | null;
  required_on_site_date: string | null;
  cost_code_id: number | null;
  location_id: number | null;
  submittal_workflow_steps: Array<{
    id: string;
    step_order: number;
    step_type: string;
    submittal_responses: Array<{
      id: string;
      responder_id: string;
      response_status: string;
      comments: string | null;
      responded_at: string | null;
    }>;
  }>;
  submittal_distributions: Array<{
    id: string;
    from_id: string;
    message: string | null;
    distributed_at: string | null;
    submittal_distribution_recipients: Array<{
      id: string;
      recipient_id: string;
    }>;
  }>;
  submittal_attachments: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_size: number | null;
    content_type: string | null;
    is_current: boolean | null;
    uploaded_by: string | null;
    created_at: string | null;
  }>;
  submittal_linked_drawings: Array<{
    id: string;
    drawing_id: string;
  }>;
  submittal_history: Array<{
    id: string;
    action: string | null;
    actor_id: string | null;
    new_status: string | null;
    changes: unknown;
    occurred_at: string | null;
  }>;
}

export interface CreateSubmittalInput {
  title: string;
  submittal_number: string;
  revision?: number;
  status?: "Draft" | "Open" | "Distributed" | "Closed";
  specification_section?: string | null;
  submittal_type?: string | null;
  submittal_type_id?: string | null;
  division?: string | null;
  submittal_package_id?: string | null;
  responsible_contractor_id?: number | null;
  received_from_id?: string | null;
  submittal_manager_id?: string | null;
  final_due_date?: string | null;
  lead_time?: number | null;
  required_on_site_date?: string | null;
  cost_code_id?: number | null;
  location_id?: number | null;
  is_private?: boolean;
  description?: string | null;
  priority?: string | null;
  ball_in_court?: string | null;
  required_approval_date?: string | null;
  submission_date?: string | null;
}

export type UpdateSubmittalInput = Partial<CreateSubmittalInput>;

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const submittalKeys = {
  all: (projectId: number) => ["submittals", projectId] as const,
  list: (projectId: number, tab?: string) =>
    ["submittals", projectId, "list", tab] as const,
  detail: (projectId: number, submittalId: string) =>
    ["submittals", projectId, "detail", submittalId] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSubmittals(projectId: number, tab?: string) {
  return useQuery({
    queryKey: submittalKeys.list(projectId, tab),
    queryFn: async (): Promise<SubmittalSummary[]> => {
      const params = new URLSearchParams();
      if (tab) params.set("tab", tab);
      const res = await fetch(
        `/api/projects/${projectId}/submittals?${params.toString()}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: Boolean(projectId),
  });
}

export function useSubmittal(projectId: number, submittalId: string) {
  return useQuery({
    queryKey: submittalKeys.detail(projectId, submittalId),
    queryFn: async (): Promise<SubmittalDetail> => {
      const res = await fetch(
        `/api/projects/${projectId}/submittals/${submittalId}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: Boolean(projectId) && Boolean(submittalId),
  });
}

export function useCreateSubmittal(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSubmittalInput): Promise<SubmittalSummary> => {
      const res = await fetch(`/api/projects/${projectId}/submittals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: submittalKeys.all(projectId) });
      toast.success("Submittal created");
    },
    onError: (err: Error) => {
      toast.error("Could not create submittal", { description: err.message });
    },
  });
}

export function useUpdateSubmittal(projectId: number, submittalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSubmittalInput): Promise<SubmittalSummary> => {
      const res = await fetch(
        `/api/projects/${projectId}/submittals/${submittalId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: submittalKeys.all(projectId) });
      toast.success("Submittal updated");
    },
    onError: (err: Error) => {
      toast.error("Could not update submittal", { description: err.message });
    },
  });
}

export function useDeleteSubmittal(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (submittalId: string): Promise<void> => {
      const res = await fetch(
        `/api/projects/${projectId}/submittals/${submittalId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: submittalKeys.all(projectId) });
      toast.success("Submittal moved to Recycle Bin");
    },
    onError: (err: Error) => {
      toast.error("Could not delete submittal", { description: err.message });
    },
  });
}

export function useRestoreSubmittal(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (submittalId: string): Promise<SubmittalSummary> => {
      const res = await fetch(
        `/api/projects/${projectId}/submittals/${submittalId}/restore`,
        { method: "PATCH" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: submittalKeys.all(projectId) });
      toast.success("Submittal restored");
    },
    onError: (err: Error) => {
      toast.error("Could not restore submittal", { description: err.message });
    },
  });
}

export function useDuplicateSubmittal(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (submittalId: string): Promise<SubmittalSummary> => {
      const res = await fetch(
        `/api/projects/${projectId}/submittals/${submittalId}/duplicate`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: submittalKeys.all(projectId) });
      toast.success("Submittal duplicated");
    },
    onError: (err: Error) => {
      toast.error("Could not duplicate submittal", { description: err.message });
    },
  });
}

export function useAddWorkflowStep(projectId: number, submittalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      step_type: string;
      required?: boolean;
    }): Promise<{ id: string; step_order: number; step_type: string }> => {
      const res = await fetch(
        `/api/projects/${projectId}/submittals/${submittalId}/workflow-steps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: submittalKeys.all(projectId) });
      toast.success("Workflow step added");
    },
    onError: (err: Error) => {
      toast.error("Could not add workflow step", { description: err.message });
    },
  });
}

export function useRespondToWorkflowStep(
  projectId: number,
  submittalId: string,
  stepId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      response_status: string;
      comments?: string | null;
    }): Promise<{ id: string; response_status: string }> => {
      const res = await fetch(
        `/api/projects/${projectId}/submittals/${submittalId}/workflow-steps/${stepId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: submittalKeys.all(projectId) });
      toast.success("Response recorded");
    },
    onError: (err: Error) => {
      toast.error("Could not record response", { description: err.message });
    },
  });
}
