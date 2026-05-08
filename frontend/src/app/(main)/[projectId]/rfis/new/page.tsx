"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Save } from "lucide-react";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { FormActions } from "@/components/forms/FormActions";
import {
  RFI_FORM_DEFAULTS,
  RfiFormFields,
} from "@/components/rfis/rfi-form-fields";
import { useCreateRfi } from "@/hooks/use-rfis";
import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
import {
  rfiDraftSchema,
  rfiOpenSchema,
  type RfiFormValues,
} from "@/lib/schemas/rfi-schema";

export default function NewRfiPage() {
  const router = useRouter();
  const params = useParams()! ?? {};
  const projectId = Number(params.projectId);
  const createRfi = useCreateRfi(projectId);

  const form = useForm<RfiFormValues>({
    defaultValues: RFI_FORM_DEFAULTS,
  });

  const submitRfi = async (status: "draft" | "open") => {
    const data = form.getValues();
    const schema = status === "open" ? rfiOpenSchema : rfiDraftSchema;
    const result = schema.safeParse(data);

    if (!result.success) {
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
    } catch (error) {
      reportNonCriticalFailure({
        area: "rfis",
        operation: "create-rfi",
        error,
        userVisibleFallback: "RFI was not created.",
        metadata: { projectId, status },
      });
    }
  };

  return (
    <PageShell
      variant="form"
      title="New RFI"
      description="Create a new Request for Information"
      onBack={() => router.push(`/${projectId}/rfis`)}
      backLabel="Back to RFIs"
    >
      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          submitRfi("open");
        }}
      >
        <RfiFormFields form={form} projectId={projectId} />

        <FormActions
          submitLabel="Create Open"
          onCancel={() => router.push(`/${projectId}/rfis`)}
          isSubmitting={createRfi.isPending}
          align="between"
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => submitRfi("draft")}
            disabled={createRfi.isPending}
          >
            <Save />
            Save as Draft
          </Button>
        </FormActions>
      </form>
    </PageShell>
  );
}
