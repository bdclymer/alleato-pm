"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

export interface PCO {
  id: number;
  project_id: number;
  number: string;
  title: string;
  description: string | null;
  type: "CLIENT_REQUESTED" | "INTERNAL" | "MIXED";
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "REVISION_REQUESTED"
    | "APPROVED"
    | "VOID"
    | "CONVERTED";
  current_version: number;
  created_by_id: string | null;
  estimated_value: number | null;
  approved_value: number | null;
  markup_percentage: number | null;
  schedule_impact_days: number | null;
  schedule_impact_description: string | null;
  rfq_required: boolean;
  rfq_status: string | null;
  annotation: string | null;
  annotation_note: string | null;
  root_cause: string | null;
  prime_change_order_id: number | null;
  change_reason: string | null;
  location: string | null;
  reference: string | null;
  request_received_from: string | null;
  due_date: string | null;
  is_private: boolean;
  field_change: boolean;
  paid_in_full: boolean;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  // Joined data (from GET single)
  change_events?: ChangeEventSummary[];
  versions?: PCOVersion[];
  line_items?: PCOLineItem[];
}

export interface PCOVersion {
  id: number;
  pco_id: number;
  version: number;
  snapshot_data: Record<string, unknown>;
  submitted_at: string;
  submitted_by_id: string | null;
  client_decision: string | null;
  client_decision_at: string | null;
  client_decision_note: string | null;
}

export interface PCOLineItem {
  id: number;
  pco_id: number;
  change_event_line_item_id: number | null;
  cost_code: string | null;
  description: string | null;
  quantity: number | null;
  uom: string | null;
  unit_cost: number | null;
  line_amount: number | null;
  line_type: string | null;
  category: string | null;
  subcontractor_id: string | null;
}

interface ChangeEventSummary {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
  estimated_amount: number | null;
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch all PCOs for a project
 */
export function useProjectPCOs(projectId: string) {
  return useQuery<PCO[]>({
    queryKey: ["pcos", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/pcos`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch PCOs");
      }
      const payload = await res.json();
      return payload.data ?? payload;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single PCO with joined data (change events, versions, line items)
 */
export function usePCO(projectId: string, pcoId: string) {
  return useQuery<PCO>({
    queryKey: ["pco", projectId, pcoId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/pcos/${pcoId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch PCO");
      }
      return res.json();
    },
    enabled: !!projectId && !!pcoId,
  });
}

/**
 * Fetch line items for a specific PCO
 */
export function usePCOLineItems(projectId: string, pcoId: string) {
  return useQuery<PCOLineItem[]>({
    queryKey: ["pco-line-items", projectId, pcoId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/pcos/${pcoId}/line-items`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch PCO line items");
      }
      const payload = await res.json();
      return payload.data ?? payload;
    },
    enabled: !!projectId && !!pcoId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Create a new PCO
 */
export function useCreatePCO(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<PCO>) => {
      const res = await fetch(`/api/projects/${projectId}/pcos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create PCO");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pcos", projectId] });
      toast.success("PCO created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create PCO: ${error.message}`);
    },
  });
}

/**
 * Update an existing PCO
 */
export function useUpdatePCO(projectId: string, pcoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<PCO>) => {
      const res = await fetch(`/api/projects/${projectId}/pcos/${pcoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update PCO");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pcos", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["pco", projectId, pcoId],
      });
      toast.success("PCO updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update PCO: ${error.message}`);
    },
  });
}

/**
 * Group a change event into a PCO
 */
export function useGroupChangeEvent(projectId: string, pcoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changeEventId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/pcos/${pcoId}/change-events`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ change_event_id: changeEventId }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add change event to PCO");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pcos", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["pco", projectId, pcoId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pco-line-items", projectId, pcoId],
      });
      toast.success("Change event added to PCO");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add change event: ${error.message}`);
    },
  });
}

/**
 * Remove a change event from a PCO
 */
export function useUngroupChangeEvent(projectId: string, pcoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changeEventId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/pcos/${pcoId}/change-events/${changeEventId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || "Failed to remove change event from PCO",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pcos", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["pco", projectId, pcoId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pco-line-items", projectId, pcoId],
      });
      toast.success("Change event removed from PCO");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove change event: ${error.message}`);
    },
  });
}

/**
 * Submit a PCO to the client for review
 */
export function useSubmitPCO(projectId: string, pcoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/pcos/${pcoId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit PCO");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pcos", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["pco", projectId, pcoId],
      });
      toast.success("PCO submitted to client");
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit PCO: ${error.message}`);
    },
  });
}

/**
 * Record a client decision (approve or request revision) on a PCO
 */
export function useClientDecision(projectId: string, pcoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      decision: "approved" | "revision_requested";
      note?: string;
    }) => {
      const res = await fetch(
        `/api/projects/${projectId}/pcos/${pcoId}/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to record client decision");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pcos", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["pco", projectId, pcoId],
      });
      const label =
        variables.decision === "approved" ? "approved" : "sent back for revision";
      toast.success(`PCO ${label}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to record decision: ${error.message}`);
    },
  });
}

/**
 * Create a line item on a PCO
 */
export function useCreatePCOLineItem(projectId: string, pcoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<PCOLineItem>) => {
      const res = await fetch(
        `/api/projects/${projectId}/pcos/${pcoId}/line-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create line item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pco-line-items", projectId, pcoId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pco", projectId, pcoId],
      });
      queryClient.invalidateQueries({ queryKey: ["pcos", projectId] });
      toast.success("Line item added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create line item: ${error.message}`);
    },
  });
}

/**
 * Update a line item on a PCO
 */
export function useUpdatePCOLineItem(projectId: string, pcoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lineItemId,
      data,
    }: {
      lineItemId: number;
      data: Partial<PCOLineItem>;
    }) => {
      const res = await fetch(
        `/api/projects/${projectId}/pcos/${pcoId}/line-items/${lineItemId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update line item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pco-line-items", projectId, pcoId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pco", projectId, pcoId],
      });
      queryClient.invalidateQueries({ queryKey: ["pcos", projectId] });
      toast.success("Line item updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update line item: ${error.message}`);
    },
  });
}

/**
 * Delete a line item from a PCO
 */
export function useDeletePCOLineItem(projectId: string, pcoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineItemId: number) => {
      const res = await fetch(
        `/api/projects/${projectId}/pcos/${pcoId}/line-items/${lineItemId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete line item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pco-line-items", projectId, pcoId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pco", projectId, pcoId],
      });
      queryClient.invalidateQueries({ queryKey: ["pcos", projectId] });
      toast.success("Line item deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete line item: ${error.message}`);
    },
  });
}
