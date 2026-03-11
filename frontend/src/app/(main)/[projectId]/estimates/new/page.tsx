"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ProjectFormPageLayout } from "@/components/layout";
import { FormSection } from "@/components/forms/FormSection";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EstimateCreateSchema,
  EstimateStatuses,
  EstimateStatusLabels,
} from "@/lib/schemas/estimates";
interface EstimateFormValues {
  title: string;
  estimate_number?: string | null;
  revision?: number;
  status?: "draft" | "pending_review" | "approved" | "rejected";
  estimate_date?: string | null;
  location?: string | null;
  estimator?: string | null;
  project_duration_weeks?: number | null;
  contingency_amount?: number;
  insurance_rate?: number;
  fee_rate?: number;
  notes?: string | null;
}

export default function NewEstimatePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const form = useForm<EstimateFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(EstimateCreateSchema) as any,
    defaultValues: {
      title: "",
      estimate_number: "",
      revision: 1,
      status: "draft",
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

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
        error instanceof Error ? error.message : "Failed to create estimate"
      );
    }
  };

  return (
    <ProjectFormPageLayout
      title="New Estimate"
      description="Create a new project estimate and quantity takeoff"
      onBack={() => router.back()}
      backLabel="Back to Estimates"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Basic Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Title" required error={errors.title?.message}>
                <Input
                  {...register("title")}
                  placeholder="e.g., Ulta Beauty Fresno DC New RTUs R6"
                />
              </FormField>
            </div>

            <FormField label="Estimate Number" error={errors.estimate_number?.message}>
              <Input
                {...register("estimate_number")}
                placeholder="Optional reference number"
              />
            </FormField>

            <FormField label="Revision" error={errors.revision?.message}>
              <Input
                type="number"
                min={1}
                {...register("revision", { valueAsNumber: true })}
              />
            </FormField>

            <FormField label="Status" error={errors.status?.message}>
              <Select
                value={watch("status")}
                onValueChange={(val) =>
                  setValue("status", val as EstimateFormValues["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EstimateStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {EstimateStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Date" error={errors.estimate_date?.message}>
              <Input type="date" {...register("estimate_date")} />
            </FormField>

            <FormField label="Estimator" error={errors.estimator?.message}>
              <Input {...register("estimator")} placeholder="Person preparing the estimate" />
            </FormField>

            <FormField label="Location" error={errors.location?.message}>
              <Input
                {...register("location")}
                placeholder="Project location"
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Project Duration & Markup Rates">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Project Duration (weeks)"
              error={errors.project_duration_weeks?.message}
            >
              <Input
                type="number"
                min={1}
                {...register("project_duration_weeks", { valueAsNumber: true })}
                placeholder="e.g., 12"
              />
            </FormField>

            <FormField
              label="Insurance Rate"
              error={errors.insurance_rate?.message}
            >
              <Input
                type="number"
                step="0.0001"
                min={0}
                max={1}
                {...register("insurance_rate", { valueAsNumber: true })}
                placeholder="0.0125 (1.25%)"
              />
            </FormField>

            <FormField label="Fee Rate" error={errors.fee_rate?.message}>
              <Input
                type="number"
                step="0.0001"
                min={0}
                max={1}
                {...register("fee_rate", { valueAsNumber: true })}
                placeholder="0.10 (10%)"
              />
            </FormField>

            <FormField
              label="Contingency Amount"
              error={errors.contingency_amount?.message}
            >
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register("contingency_amount", { valueAsNumber: true })}
                placeholder="0.00"
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Notes">
          <FormField label="Notes" error={errors.notes?.message}>
            <Textarea
              {...register("notes")}
              placeholder="Additional notes about this estimate..."
              rows={3}
            />
          </FormField>
        </FormSection>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Estimate"}
          </Button>
        </div>
      </form>
    </ProjectFormPageLayout>
  );
}
