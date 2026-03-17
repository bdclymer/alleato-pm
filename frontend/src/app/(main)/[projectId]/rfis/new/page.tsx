"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Save, Send } from "lucide-react";

import { ProjectFormPageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormActions } from "@/components/forms/FormActions";
import { FormGrid, FormSection } from "@/components/forms";
import { RHFDateField } from "@/components/forms/fields/RHFDateField";
import { RHFSelectField } from "@/components/forms/fields/RHFSelectField";
import { RHFTextField } from "@/components/forms/fields/RHFTextField";
import { RHFTextareaField } from "@/components/forms/fields/RHFTextareaField";
import { Input } from "@/components/ui/input";
import { useCreateRfi } from "@/hooks/use-rfis";
import {
  rfiDraftSchema,
  rfiOpenSchema,
  RFI_IMPACT_OPTIONS,
  type RfiFormValues,
} from "@/lib/schemas/rfi-schema";

export default function NewRfiPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.projectId);
  const createRfi = useCreateRfi(projectId);

  const form = useForm<RfiFormValues>({
    defaultValues: {
      subject: "",
      question: "",
      due_date: null,
      assignees: [],
      rfi_manager: null,
      received_from: null,
      responsible_contractor: null,
      distribution_list: [],
      location: null,
      specification: null,
      cost_code: null,
      schedule_impact: null,
      cost_impact: null,
      reference: null,
      is_private: false,
      rfi_stage: null,
      drawing_number: null,
    },
  });

  const submitRfi = async (status: "draft" | "open") => {
    const data = form.getValues();
    const schema = status === "open" ? rfiOpenSchema : rfiDraftSchema;
    const result = schema.safeParse(data);

    if (!result.success) {
      // Set form errors from Zod validation
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof RfiFormValues;
        if (path) {
          form.setError(path, { message: issue.message });
        }
      }
      return;
    }

    try {
      await createRfi.mutateAsync({ ...result.data, status });
      router.push(`/${projectId}/rfis`);
    } catch {
      // Error handled by mutation onError
    }
  };

  const handleSaveAsDraft = () => submitRfi("draft");
  const handleCreateOpen = () => submitRfi("open");

  return (
    <ProjectFormPageLayout
        title="New RFI"
        description="Create a new Request for Information"
      maxWidth="lg"
      headerActions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${projectId}/rfis`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to RFIs
        </Button>
      }
    >
      <Form {...form}>
        <form className="space-y-8">
          <FormSection title="RFI Details">
            <RHFTextField
              control={form.control}
              name="subject"
              label="Subject *"
              placeholder="Enter RFI subject"
            />

            <RHFTextareaField
              control={form.control}
              name="question"
              label="Question (required for Open)"
              placeholder="Describe the information you need..."
              rows={5}
            />

            <FormGrid columns={2}>
              <RHFDateField
                control={form.control}
                name="due_date"
                label="Due Date (required for Open)"
                nullable
              />

              <RHFTextField
                control={form.control}
                name="rfi_manager"
                label="RFI Manager"
                placeholder="Enter RFI manager name"
              />
            </FormGrid>
          </FormSection>

          <FormSection title="Assignment">
            <FormField
              control={form.control}
              name="assignees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Assignees (required for Open)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter assignee names (comma-separated)"
                      value={(field.value ?? []).join(", ")}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(
                          val
                            ? val.split(",").map((s) => s.trim()).filter(Boolean)
                            : [],
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormGrid columns={2}>
              <RHFTextField
                control={form.control}
                name="received_from"
                label="Received From"
                placeholder="Enter sender name"
              />

              <RHFTextField
                control={form.control}
                name="responsible_contractor"
                label="Responsible Contractor"
                placeholder="Enter contractor name"
              />
            </FormGrid>

            <FormField
              control={form.control}
              name="distribution_list"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Distribution List</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter distribution list (comma-separated)"
                      value={(field.value ?? []).join(", ")}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(
                          val
                            ? val.split(",").map((s) => s.trim()).filter(Boolean)
                            : [],
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Additional Details">
            <FormGrid columns={2}>
              <RHFTextField
                control={form.control}
                name="location"
                label="Location"
                placeholder="Enter location"
              />

              <RHFTextField
                control={form.control}
                name="specification"
                label="Specification"
                placeholder="Enter specification section"
              />

              <RHFTextField
                control={form.control}
                name="cost_code"
                label="Cost Code"
                placeholder="Enter cost code"
              />

              <RHFTextField
                control={form.control}
                name="rfi_stage"
                label="RFI Stage"
                placeholder="Enter RFI stage"
              />

              <RHFSelectField
                control={form.control}
                name="schedule_impact"
                label="Schedule Impact"
                placeholder="Select..."
                options={RFI_IMPACT_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />

              <RHFSelectField
                control={form.control}
                name="cost_impact"
                label="Cost Impact"
                placeholder="Select..."
                options={RFI_IMPACT_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </FormGrid>

            <FormGrid columns={2}>
              <RHFTextField
                control={form.control}
                name="reference"
                label="Reference"
                placeholder="Enter reference"
              />

              <RHFTextField
                control={form.control}
                name="drawing_number"
                label="Drawing Number"
                placeholder="Enter drawing/sheet number"
              />
            </FormGrid>

            <FormField
              control={form.control}
              name="is_private"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-4 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Private</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </FormSection>

          <FormActions
            submitLabel="Create Open"
            onCancel={() => router.push(`/${projectId}/rfis`)}
            isSubmitting={createRfi.isPending}
            align="between"
          >
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveAsDraft}
              disabled={createRfi.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
          </FormActions>
        </form>
      </Form>
    </ProjectFormPageLayout>
  );
}
