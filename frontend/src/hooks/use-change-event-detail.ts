"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

import type {
  ChangeEventDetail,
  ChangeEventDetailLineItem,
  ChangeEventAttachment,
  ChangeEventHistoryEntry,
  ChangeEventRelatedItem,
  ChangeEventRelatedItemOption,
} from "@/types/change-events";
import type { ChangeEventFormData } from "@/components/domain/change-events/ChangeEventForm";

/* ── Constants ─────────────────────────────────────────────────────── */

const STATUS_MAP: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  void: "Void",
  pending: "Pending",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  converted: "Converted",
};

const REASON_MAP: Record<string, string> = {
  allowance: "Allowance",
  backcharge: "Backcharge",
  client_request: "Client Request",
  design_development: "Design Development",
  existing_condition: "Existing Condition",
};

/* ── Helper ────────────────────────────────────────────────────────── */

function baseUrl(projectId: number, changeEventId: string) {
  return `/api/projects/${projectId}/change-events/${changeEventId}`;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json();
    return json.error ?? json.message ?? fallback;
  } catch {
    return fallback;
  }
}

/* ── Hook ──────────────────────────────────────────────────────────── */

export function useChangeEventDetail(
  projectId: number,
  changeEventId: string,
) {
  const [changeEvent, setChangeEvent] = useState<ChangeEventDetail | null>(
    null,
  );
  const [lineItems, setLineItems] = useState<ChangeEventDetailLineItem[]>([]);
  const [attachments, setAttachments] = useState<ChangeEventAttachment[]>([]);
  const [historyEntries, setHistoryEntries] = useState<
    ChangeEventHistoryEntry[]
  >([]);
  const [relatedItems, setRelatedItems] = useState<ChangeEventRelatedItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch detail ─────────────────────────────────────────────── */

  const fetchChangeEventDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(baseUrl(projectId, changeEventId));
      if (!res.ok) {
        const msg = await parseError(res, "Failed to fetch change event");
        setError(msg);
        return;
      }

      const data = await res.json();
      setChangeEvent(data);

      // Line items — prefer embedded, fall back to separate fetch
      if (data.lineItems && Array.isArray(data.lineItems)) {
        setLineItems(data.lineItems);
      } else {
        try {
          const liRes = await fetch(
            `${baseUrl(projectId, changeEventId)}/line-items`,
          );
          if (liRes.ok) {
            const liData = await liRes.json();
            setLineItems(Array.isArray(liData) ? liData : liData.data ?? []);
          }
        } catch {
          // Non-critical — leave line items empty
        }
      }

      // History — map from snake_case API format
      if (data.history && Array.isArray(data.history)) {
        const mapped: ChangeEventHistoryEntry[] = data.history.map(
          (h: Record<string, unknown>) => ({
            id: (h.id as string) ?? crypto.randomUUID(),
            changeEventId:
              (h.change_event_id as string) ?? (h.changeEventId as string),
            action: (h.changeType as string) ?? (h.change_type as string) ?? (h.action as string) ?? "update",
            fieldName:
              (h.field_name as string) ?? (h.fieldName as string) ?? "",
            oldValue:
              (h.old_value as string | null) ??
              (h.oldValue as string | null) ??
              null,
            newValue:
              (h.new_value as string | null) ??
              (h.newValue as string | null) ??
              null,
            changedBy:
              (h.changed_by as string | null) ??
              (h.changedBy as string | null) ??
              null,
            changedAt:
              (h.changed_at as string) ??
              (h.changedAt as string) ??
              new Date().toISOString(),
            description: (h.description as string) ?? undefined,
          }),
        );
        setHistoryEntries(mapped);
      }

      // Attachments — prefer embedded, fall back to separate fetch
      if (data.attachments && Array.isArray(data.attachments)) {
        setAttachments(data.attachments);
      } else {
        try {
          const attRes = await fetch(
            `${baseUrl(projectId, changeEventId)}/attachments`,
          );
          if (attRes.ok) {
            const attData = await attRes.json();
            setAttachments(
              Array.isArray(attData) ? attData : attData.data ?? [],
            );
          }
        } catch {
          // Non-critical
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to fetch change event";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, changeEventId]);

  /* ── Fetch related items ──────────────────────────────────────── */

  const fetchRelatedItems = useCallback(async () => {
    try {
      const res = await fetch(
        `${baseUrl(projectId, changeEventId)}/related-items`,
      );
      if (res.ok) {
        const data = await res.json();
        setRelatedItems(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch {
      // Non-critical — leave related items empty
    }
  }, [projectId, changeEventId]);

  /* ── Effects ──────────────────────────────────────────────────── */

  useEffect(() => {
    fetchChangeEventDetails();
  }, [fetchChangeEventDetails]);

  useEffect(() => {
    fetchRelatedItems();
  }, [fetchRelatedItems]);

  /* ── Actions ──────────────────────────────────────────────────── */

  const refetch = useCallback(async () => {
    await Promise.all([fetchChangeEventDetails(), fetchRelatedItems()]);
  }, [fetchChangeEventDetails, fetchRelatedItems]);

  const updateStatus = useCallback(
    async (newStatus: string) => {
      if (!changeEvent) return;

      const normalized = STATUS_MAP[newStatus] ?? newStatus;

      try {
        const res = await fetch(baseUrl(projectId, changeEventId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            title: changeEvent.title,
            status: normalized,
          }),
        });

        if (!res.ok) {
          const msg = await parseError(res, "Failed to update status");
          toast.error(msg);
          throw new Error(msg);
        }

        setChangeEvent((prev) =>
          prev ? { ...prev, status: normalized } : prev,
        );
        toast.success(`Status updated to ${normalized}`);
      } catch (err) {
        if (
          !(err instanceof Error && err.message.startsWith("Failed to update"))
        ) {
          toast.error("Failed to update status");
        }
        throw err;
      }
    },
    [projectId, changeEventId, changeEvent],
  );

  const deleteChangeEvent = useCallback(async () => {
    try {
      const res = await fetch(baseUrl(projectId, changeEventId), {
        method: "DELETE",
      });

      if (!res.ok) {
        const msg = await parseError(res, "Failed to delete change event");
        toast.error(msg);
        throw new Error(msg);
      }

      toast.success("Change event deleted");
    } catch (err) {
      if (
        !(err instanceof Error && err.message.startsWith("Failed to delete"))
      ) {
        toast.error("Failed to delete change event");
      }
      throw err;
    }
  }, [projectId, changeEventId]);

  const submitEdit = useCallback(
    async (data: ChangeEventFormData) => {
      try {
        // Map reason value
        const reason = data.changeReason
          ? REASON_MAP[data.changeReason] ?? data.changeReason
          : undefined;

        const res = await fetch(baseUrl(projectId, changeEventId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            status: data.status,
            origin: data.origin,
            type: data.type,
            reason,
            scope: data.scope,
            expectingRevenue: data.expectingRevenue,
            lineItemRevenueSource: data.lineItemRevenueSource || undefined,
            primeContractId: data.primeContractId || undefined,
            description: data.description,
          }),
        });

        if (!res.ok) {
          const msg = await parseError(res, "Failed to update change event");
          toast.error(msg);
          throw new Error(msg);
        }

        // Save line items
        for (const [index, item] of data.lineItems.entries()) {
          // Parse prefixed commitment IDs (form stores as "sub-{id}" or "po-{id}")
          let commitmentId: string | null = null;
          let commitmentType: string | null = null;
          const contractValue = item.contract;

          if (contractValue && contractValue.startsWith("sub-")) {
            commitmentId = contractValue.replace("sub-", "");
            commitmentType = "subcontract";
          } else if (contractValue && contractValue.startsWith("po-")) {
            commitmentId = contractValue.replace("po-", "");
            commitmentType = "purchase_order";
          }

          const lineItemPayload: Record<string, unknown> = {
            description: item.description,
            sortOrder: index,
          };
          if (item.revenueUnitOfMeasure) lineItemPayload.unitOfMeasure = item.revenueUnitOfMeasure;
          if (item.costQuantity != null) lineItemPayload.quantity = item.costQuantity;
          if (item.costUnitCost != null) lineItemPayload.unitCost = item.costUnitCost;
          if (item.costRom != null) lineItemPayload.costRom = item.costRom;
          if (item.revenueRom != null) lineItemPayload.revenueRom = item.revenueRom;
          if (item.nonCommittedCost != null) lineItemPayload.nonCommittedCost = item.nonCommittedCost;
          if (item.budgetCode) lineItemPayload.budgetCodeId = item.budgetCode;
          if (item.vendor) lineItemPayload.vendorId = item.vendor;
          const resolvedContractId = commitmentId ?? contractValue;
          if (resolvedContractId) lineItemPayload.contractId = resolvedContractId;
          if (commitmentType) lineItemPayload.commitmentType = commitmentType;
          if (item.commitmentLineItemId) lineItemPayload.commitmentLineItemId = item.commitmentLineItemId;

          if (item.id) {
            // Update existing
            await fetch(
              `${baseUrl(projectId, changeEventId)}/line-items/${item.id}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(lineItemPayload),
              },
            );
          } else {
            // Create new
            await fetch(
              `${baseUrl(projectId, changeEventId)}/line-items`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(lineItemPayload),
              },
            );
          }
        }

        // Upload attachments
        if (data.attachments && data.attachments.length > 0) {
          const formData = new FormData();
          for (const file of data.attachments) {
            formData.append("files", file);
          }
          await fetch(
            `${baseUrl(projectId, changeEventId)}/attachments`,
            {
              method: "POST",
              body: formData,
            },
          );
        }

        // Refetch to sync state
        await fetchChangeEventDetails();
        toast.success("Change event updated");
      } catch (err) {
        if (
          !(
            err instanceof Error &&
            err.message.startsWith("Failed to update change event")
          )
        ) {
          toast.error("Failed to save changes");
        }
        throw err;
      }
    },
    [projectId, changeEventId, fetchChangeEventDetails],
  );

  /* ── Related item actions ─────────────────────────────────────── */

  const fetchRelatedItemOptions = useCallback(
    async (
      type: string,
      search: string,
    ): Promise<ChangeEventRelatedItemOption[]> => {
      try {
        const params = new URLSearchParams({ type, search });
        const res = await fetch(
          `${baseUrl(projectId, changeEventId)}/related-items/options?${params}`,
        );
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : data.data ?? [];
      } catch {
        return [];
      }
    },
    [projectId, changeEventId],
  );

  const linkRelatedItem = useCallback(
    async (type: string, relatedId: string) => {
      try {
        const res = await fetch(
          `${baseUrl(projectId, changeEventId)}/related-items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              relatedType: type,
              relatedId,
            }),
          },
        );

        if (!res.ok) {
          const msg = await parseError(res, "Failed to link related item");
          toast.error(msg);
          throw new Error(msg);
        }

        await fetchRelatedItems();
        toast.success("Related item linked");
      } catch (err) {
        if (
          !(err instanceof Error && err.message.startsWith("Failed to link"))
        ) {
          toast.error("Failed to link related item");
        }
        throw err;
      }
    },
    [projectId, changeEventId, fetchRelatedItems],
  );

  const unlinkRelatedItem = useCallback(
    async (relatedItemId: string) => {
      // Optimistic removal
      setRelatedItems((prev) =>
        prev.filter((item) => item.id !== relatedItemId),
      );

      try {
        const res = await fetch(
          `${baseUrl(projectId, changeEventId)}/related-items/${relatedItemId}`,
          { method: "DELETE" },
        );

        if (!res.ok) {
          // Revert on failure
          await fetchRelatedItems();
          const msg = await parseError(res, "Failed to unlink related item");
          toast.error(msg);
          throw new Error(msg);
        }

        toast.success("Related item removed");
      } catch (err) {
        if (
          !(err instanceof Error && err.message.startsWith("Failed to unlink"))
        ) {
          toast.error("Failed to unlink related item");
        }
        throw err;
      }
    },
    [projectId, changeEventId, fetchRelatedItems],
  );

  /* ── Return ───────────────────────────────────────────────────── */

  return {
    // Data
    changeEvent,
    lineItems,
    attachments,
    historyEntries,
    relatedItems,

    // Loading / error
    isLoading,
    error,

    // Actions
    actions: {
      refetch,
      updateStatus,
      deleteChangeEvent,
      submitEdit,
      fetchRelatedItemOptions,
      linkRelatedItem,
      unlinkRelatedItem,
    },
  };
}
