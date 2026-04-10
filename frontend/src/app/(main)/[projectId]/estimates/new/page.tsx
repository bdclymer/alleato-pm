"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { Form, FormGrid, FormSection } from "@/components/forms";
import { FormActions } from "@/components/forms/FormActions";
import { TextField } from "@/components/forms/TextField";
import { SelectField } from "@/components/forms/SelectField";
import { NumberField } from "@/components/forms/NumberField";
import { TextareaField } from "@/components/forms/TextareaField";
import { DateField } from "@/components/forms/DateField";
import {
  EstimateCreateSchema,
  EstimateStatuses,
  EstimateStatusLabels,
  EstimateTypes,
  EstimateTypeLabels,
} from "@/lib/schemas/estimates";

interface EstimateFormValues {
  title: string;
  estimate_number?: string | null;
  revision?: number;
  status?: "draft" | "pending_review" | "approved" | "rejected";
  estimate_type?: "asrs" | "design_build" | null;
  estimate_date?: string | null;
  location?: string | null;
  estimator?: string | null;
  project_duration_weeks?: number | null;
  contingency_amount?: number;
  insurance_rate?: number;
  fee_rate?: number;
  notes?: string | null;
}

function toDateValue(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toDateString(value?: Date) {
  if (!value) return undefined;
  return value.toISOString().split("T")[0];
}

export default function NewEstimatePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const form = useForm<EstimateFormValues>({
    resolver: zodResolver(EstimateCreateSchema) as any,
    defaultValues: {
      title: "",
      estimate_number: "",
      revision: 1,
      status: "draft",
      estimate_type: null,
      estimate_date: undefined,
      location: "",
      estimator: "",
      project_duration_weeks: undefined,
      contingency_amount: 0,
      insurance_rate: 0.0125,
      fee_rate: 0.1,
      notes: "",
    },
  });

  const onSubmit = async (data: EstimateFormValues) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/estimates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create estimate");
      }

      const result = await response.json();
      toast.success("Estimate created successfully");
      router.push(`/${projectId}/estimates/${result.estimate_id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create estimate",
      );
    }
  };

  const values = form.watch();
  const errors = form.formState.errors;

  return (
    <PageShell
      variant="form"
      title="New Estimate"
      description="Create a new project estimate and quantity takeoff"
      onBack={() => router.back()}
      backLabel="Back to Estimates"
    >
      <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormSection title="Basic Information">
          <FormGrid columns={2}>
            <TextField
              label="Title"
              required
              fullWidth
              value={values.title ?? ""}
              onChange={(event) =>
                form.setValue("title", event.target.value, { shouldValidate: true })
              }
              error={errors.title?.message}
              placeholder="e.g., Ulta Beauty Fresno DC New RTUs R6"
            />

            <TextField
              label="Estimate Number"
              value={values.estimate_number ?? ""}
              onChange={(event) =>
                form.setValue("estimate_number", event.target.value, {
                  shouldValidate: true,
                })
              }
              error={errors.estimate_number?.message}
              placeholder="Optional reference number"
            />

            <NumberField
              label="Revision"
              value={values.revision ?? 1}
              onChange={(value) =>
                form.setValue("revision", value, { shouldValidate: true })
              }
              error={errors.revision?.message}
              min={1}
            />

            <SelectField
              label="Status"
              value={values.status ?? "draft"}
              onValueChange={(value) =>
                form.setValue("status", value as EstimateFormValues["status"], {
                  shouldValidate: true,
                })
              }
              error={errors.status?.message}
              options={EstimateStatuses.map((status) => ({
                value: status,
                label: EstimateStatusLabels[status],
              }))}
            />

            <SelectField
              label="Estimate Type"
              value={values.estimate_type ?? ""}
              onValueChange={(value) =>
                form.setValue(
                  "estimate_type",
                  (value || null) as EstimateFormValues["estimate_type"],
                  { shouldValidate: true }
                )
              }
              error={errors.estimate_type?.message}
              placeholder="Select type (optional)"
              options={[
                { value: "", label: "None" },
                ...EstimateTypes.map((t) => ({
                  value: t,
                  label: EstimateTypeLabels[t],
                })),
              ]}
            />

            <DateField
              label="Date"
              value={toDateValue(values.estimate_date)}
              onChange={(value) =>
                form.setValue("estimate_date", toDateString(value), {
                  shouldValidate: true,
                })
              }
              error={errors.estimate_date?.message}
            />

            <TextField
              label="Estimator"
              value={values.estimator ?? ""}
              onChange={(event) =>
                form.setValue("estimator", event.target.value, {
                  shouldValidate: true,
                })
              }
              error={errors.estimator?.message}
              placeholder="Person preparing the estimate"
            />

            <TextField
              label="Location"
              value={values.location ?? ""}
              onChange={(event) =>
                form.setValue("location", event.target.value, {
                  shouldValidate: true,
                })
              }
              error={errors.location?.message}
              placeholder="Project location"
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Project Duration & Markup Rates">
          <FormGrid columns={3}>
            <NumberField
              label="Project Duration (weeks)"
              value={values.project_duration_weeks ?? undefined}
              onChange={(value) =>
                form.setValue("project_duration_weeks", value, {
                  shouldValidate: true,
                })
              }
              error={errors.project_duration_weeks?.message}
              min={1}
              placeholder="e.g., 12"
            />

            <NumberField
              label="Insurance Rate"
              value={values.insurance_rate ?? undefined}
              onChange={(value) =>
                form.setValue("insurance_rate", value, { shouldValidate: true })
              }
              error={errors.insurance_rate?.message}
              min={0}
              max={1}
              step="0.0001"
              placeholder="0.0125"
            />

            <NumberField
              label="Fee Rate"
              value={values.fee_rate ?? undefined}
              onChange={(value) =>
                form.setValue("fee_rate", value, { shouldValidate: true })
              }
              error={errors.fee_rate?.message}
              min={0}
              max={1}
              step="0.0001"
              placeholder="0.10"
            />

            <NumberField
              label="Contingency Amount"
              value={values.contingency_amount ?? undefined}
              onChange={(value) =>
                form.setValue("contingency_amount", value, {
                  shouldValidate: true,
                })
              }
              error={errors.contingency_amount?.message}
              min={0}
              step="0.01"
              placeholder=""
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Notes" className="border-b-0 pb-0">
          <TextareaField
            label="Notes"
            value={values.notes ?? ""}
            onChange={(event) =>
              form.setValue("notes", event.target.value, { shouldValidate: true })
            }
            error={errors.notes?.message}
            placeholder="Additional notes about this estimate..."
            rows={3}
            fullWidth
          />
        </FormSection>

        <FormActions
          submitLabel={form.formState.isSubmitting ? "Creating..." : "Create Estimate"}
          onCancel={() => router.back()}
          isSubmitting={form.formState.isSubmitting}
        />
      </Form>
    </PageShell>
  );
}
