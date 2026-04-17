"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { LabelValueRow, PageContainer, ProjectPageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface PrimeContractPcoFormData {
  title: string;
  status: "draft" | "pending" | "approved" | "void";
  revision: number;
  change_reason: string;
  is_private: boolean;
  description: string;
  executed: boolean;
  signed_co_received_date: string;
  request_received_from: string;
  location: string;
  schedule_impact: string;
  field_change: boolean;
  reference: string;
  paid_in_full: boolean;
  prime_contract_id: string | null;
  pco_number: string;
}

interface PrimeContractPcoResponse {
  id: string;
  title: string;
  status: "draft" | "pending" | "approved" | "void";
  revision: number | null;
  change_reason: string | null;
  is_private: boolean;
  description: string | null;
  executed: boolean;
  signed_co_received_date: string | null;
  request_received_from: string | null;
  location: string | null;
  schedule_impact: number | null;
  field_change: boolean;
  reference: string | null;
  paid_in_full: boolean;
  prime_contract_id: string | null;
  pco_number: string;
}

const STATUS_OPTIONS: Array<{ value: PrimeContractPcoFormData["status"]; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending - In Review" },
  { value: "approved", label: "Approved" },
  { value: "void", label: "Void" },
];

const CHANGE_REASONS = [
  "Allowance",
  "Backcharge",
  "Client Request",
  "Design Development",
  "Design Error",
  "Design Omission",
  "Existing Condition",
  "Field Condition",
  "Owner Request",
  "Regulatory Requirement",
  "Scope Change",
  "Unforeseen Condition",
  "Value Engineering",
  "Other",
];

const EMPTY_FORM: PrimeContractPcoFormData = {
  title: "",
  status: "draft",
  revision: 0,
  change_reason: "",
  is_private: false,
  description: "",
  executed: false,
  signed_co_received_date: "",
  request_received_from: "",
  location: "",
  schedule_impact: "",
  field_change: false,
  reference: "",
  paid_in_full: false,
  prime_contract_id: null,
  pco_number: "",
};

// Converts nullable API fields into controlled form-safe values.
function toFormData(pco: PrimeContractPcoResponse): PrimeContractPcoFormData {
  return {
    title: pco.title ?? "",
    status: pco.status,
    revision: pco.revision ?? 0,
    change_reason: pco.change_reason ?? "",
    is_private: pco.is_private,
    description: pco.description ?? "",
    executed: pco.executed,
    signed_co_received_date: pco.signed_co_received_date ?? "",
    request_received_from: pco.request_received_from ?? "",
    location: pco.location ?? "",
    schedule_impact: pco.schedule_impact != null ? String(pco.schedule_impact) : "",
    field_change: pco.field_change,
    reference: pco.reference ?? "",
    paid_in_full: pco.paid_in_full,
    prime_contract_id: pco.prime_contract_id,
    pco_number: pco.pco_number,
  };
}

// Prime contract PCO edit page for updating General form fields.
export default function EditPrimeContractPcoPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string; pcoId: string; contractId?: string }>();

  const projectId = params.projectId;
  const pcoId = params.pcoId;
  const contractIdFromRoute = typeof params.contractId === "string" ? params.contractId : null;

  const [formData, setFormData] = useState<PrimeContractPcoFormData>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Builds canonical detail route for this PCO while preserving nested contract context.
  const buildDetailPath = useCallback(
    (primeContractId: string | null | undefined) => {
      const resolvedContractId = contractIdFromRoute ?? primeContractId ?? null;
      if (resolvedContractId) {
        return `/${projectId}/prime-contracts/${resolvedContractId}/change-orders/pcos/${pcoId}`;
      }
      return `/${projectId}/prime-contract-pcos/${pcoId}`;
    },
    [contractIdFromRoute, pcoId, projectId],
  );

  // Loads current PCO values into the edit form.
  const loadPco = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/prime-contract-pcos/${pcoId}`);
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(
          typeof errorPayload?.error === "string"
            ? errorPayload.error
            : "Failed to load prime contract PCO",
        );
      }
      const data: PrimeContractPcoResponse = await response.json();
      setFormData(toFormData(data));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load prime contract PCO");
      router.push(`/${projectId}/prime-contract-pcos`);
    } finally {
      setIsLoading(false);
    }
  }, [pcoId, projectId, router]);

  useEffect(() => {
    void loadPco();
  }, [loadPco]);

  // Handles patch update and returns to detail page on success.
  const handleSave = useCallback(async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        status: formData.status,
        revision: Number.isFinite(formData.revision) ? formData.revision : 0,
        change_reason: formData.change_reason.trim() || null,
        is_private: formData.is_private,
        description: formData.description.trim() || null,
        executed: formData.executed,
        signed_co_received_date: formData.signed_co_received_date || null,
        request_received_from: formData.request_received_from.trim() || null,
        location: formData.location.trim() || null,
        schedule_impact: formData.schedule_impact !== "" ? Number(formData.schedule_impact) : null,
        field_change: formData.field_change,
        reference: formData.reference.trim() || null,
        paid_in_full: formData.paid_in_full,
      };

      const response = await fetch(`/api/projects/${projectId}/prime-contract-pcos/${pcoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(
          typeof errorPayload?.error === "string"
            ? errorPayload.error
            : "Failed to save prime contract PCO",
        );
      }

      toast.success("Prime Contract PCO updated");
      router.push(buildDetailPath(formData.prime_contract_id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save prime contract PCO");
    } finally {
      setIsSaving(false);
    }
  }, [buildDetailPath, formData, pcoId, projectId, router]);

  if (isLoading) {
    return (
      <>
        <ProjectPageHeader title="Edit Prime Contract PCO" />
        <PageContainer className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title={`Edit PCO #${formData.pco_number || "--"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(buildDetailPath(formData.prime_contract_id))}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        }
      />
      <PageContainer className="space-y-6">
        <Button variant="outline" size="sm" onClick={() => router.push(buildDetailPath(formData.prime_contract_id))}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            General
          </h2>
          <dl className="space-y-3">
            <LabelValueRow label="#">{formData.pco_number || "--"}</LabelValueRow>
            <LabelValueRow label="Title">
              <Input
                value={formData.title}
                onChange={(event) => setFormData((previous) => ({ ...previous, title: event.target.value }))}
                placeholder="PCO title"
              />
            </LabelValueRow>
            <LabelValueRow label="Status">
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    status: value as PrimeContractPcoFormData["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((statusOption) => (
                    <SelectItem key={statusOption.value} value={statusOption.value}>
                      {statusOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabelValueRow>
            <LabelValueRow label="Revision">
              <Input
                type="number"
                min={0}
                value={String(formData.revision)}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    revision: Number.parseInt(event.target.value || "0", 10) || 0,
                  }))
                }
              />
            </LabelValueRow>
            <LabelValueRow label="Change Reason">
              <Select
                value={formData.change_reason || "__none__"}
                onValueChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    change_reason: value === "__none__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {CHANGE_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabelValueRow>
            <LabelValueRow label="Private">
              <Checkbox
                checked={formData.is_private}
                onCheckedChange={(checked) =>
                  setFormData((previous) => ({
                    ...previous,
                    is_private: Boolean(checked),
                  }))
                }
              />
            </LabelValueRow>
            <LabelValueRow label="Description">
              <Textarea
                value={formData.description}
                onChange={(event) => setFormData((previous) => ({ ...previous, description: event.target.value }))}
                rows={4}
              />
            </LabelValueRow>
            <LabelValueRow label="Executed">
              <Checkbox
                checked={formData.executed}
                onCheckedChange={(checked) =>
                  setFormData((previous) => ({ ...previous, executed: Boolean(checked) }))
                }
              />
            </LabelValueRow>
            <LabelValueRow label="Signed Change Order Received Date">
              <Input
                type="date"
                value={formData.signed_co_received_date}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    signed_co_received_date: event.target.value,
                  }))
                }
              />
            </LabelValueRow>
            <LabelValueRow label="Request Received From">
              <Input
                value={formData.request_received_from}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    request_received_from: event.target.value,
                  }))
                }
              />
            </LabelValueRow>
            <LabelValueRow label="Location">
              <Input
                value={formData.location}
                onChange={(event) =>
                  setFormData((previous) => ({ ...previous, location: event.target.value }))
                }
              />
            </LabelValueRow>
            <LabelValueRow label="Schedule Impact (days)">
              <Input
                type="number"
                min={0}
                value={formData.schedule_impact}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    schedule_impact: event.target.value,
                  }))
                }
              />
            </LabelValueRow>
            <LabelValueRow label="Field Change">
              <Checkbox
                checked={formData.field_change}
                onCheckedChange={(checked) =>
                  setFormData((previous) => ({
                    ...previous,
                    field_change: Boolean(checked),
                  }))
                }
              />
            </LabelValueRow>
            <LabelValueRow label="Reference">
              <Input
                value={formData.reference}
                onChange={(event) =>
                  setFormData((previous) => ({ ...previous, reference: event.target.value }))
                }
              />
            </LabelValueRow>
            <LabelValueRow label="Paid in Full">
              <Checkbox
                checked={formData.paid_in_full}
                onCheckedChange={(checked) =>
                  setFormData((previous) => ({
                    ...previous,
                    paid_in_full: Boolean(checked),
                  }))
                }
              />
            </LabelValueRow>
          </dl>
        </section>
      </PageContainer>
    </>
  );
}
