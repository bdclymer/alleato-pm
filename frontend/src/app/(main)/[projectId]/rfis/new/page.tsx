"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Save } from "lucide-react";

import { PageShell } from "@/components/layout";
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
import { RHFComboboxField } from "@/components/forms/fields/RHFComboboxField";
import { RHFDateField } from "@/components/forms/fields/RHFDateField";
import { RHFSelectField } from "@/components/forms/fields/RHFSelectField";
import { RHFTextField } from "@/components/forms/fields/RHFTextField";
import { RHFTextareaField } from "@/components/forms/fields/RHFTextareaField";
import { Input } from "@/components/ui/input";
import { useProjectUsers } from "@/hooks/use-project-users";
import { useCreateRfi } from "@/hooks/use-rfis";
import { apiFetch } from "@/lib/api-client";
import {
  rfiDraftSchema,
  rfiOpenSchema,
  RFI_IMPACT_OPTIONS,
  type RfiFormValues,
} from "@/lib/schemas/rfi-schema";

interface ProjectTeamMember {
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
}

interface ProjectWithTeamMembers {
  team_members?: unknown[] | null;
}

/** Returns a normalized display name from a raw project team-member payload. */
function getTeamMemberName(rawMember: unknown): string | null {
  const parsed =
    typeof rawMember === "string"
      ? (() => {
          try {
            return JSON.parse(rawMember) as unknown;
          } catch {
            return { name: rawMember };
          }
        })()
      : rawMember;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const member = parsed as ProjectTeamMember;
  const fullName = member.full_name?.trim() || member.name?.trim();
  if (fullName) return fullName;

  const firstName = member.first_name?.trim() || "";
  const lastName = member.last_name?.trim() || "";
  const combined = `${firstName} ${lastName}`.trim();
  return combined || null;
}

export default function NewRfiPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.projectId);
  const createRfi = useCreateRfi(projectId);
  const normalizedProjectId =
    Number.isFinite(projectId) && projectId > 0 ? String(projectId) : "";
  const { users: projectUsers, isLoading: isLoadingProjectUsers } = useProjectUsers(
    normalizedProjectId,
    { type: "all" },
  );
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ["project", projectId, "team-members"],
    queryFn: () => apiFetch<ProjectWithTeamMembers>(`/api/projects/${projectId}`),
    enabled: Number.isFinite(projectId) && projectId > 0,
  });

  const rfiManagerOptions = useMemo(() => {
    const optionMap = new Map<string, { value: string; label: string; keywords: string[] }>();

    for (const person of projectUsers) {
      const first = person.first_name?.trim() || "";
      const last = person.last_name?.trim() || "";
      const fullName = `${first} ${last}`.trim();
      if (!fullName) continue;

      optionMap.set(fullName.toLowerCase(), {
        value: fullName,
        label: fullName,
        keywords: [person.email || "", person.company?.name || ""].filter(Boolean),
      });
    }

    for (const rawMember of project?.team_members || []) {
      const fullName = getTeamMemberName(rawMember);
      if (!fullName) continue;

      const key = fullName.toLowerCase();
      if (!optionMap.has(key)) {
        optionMap.set(key, {
          value: fullName,
          label: fullName,
          keywords: [],
        });
      }
    }

    return Array.from(optionMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [project?.team_members, projectUsers]);

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
    <PageShell
      variant="form"
      title="New RFI"
      description="Create a new Request for Information"
      onBack={() => router.push(`/${projectId}/rfis`)}
      backLabel="Back to RFIs"
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

              <RHFComboboxField
                control={form.control}
                name="rfi_manager"
                label="RFI Manager"
                placeholder="Select RFI manager"
                searchPlaceholder="Search project members..."
                emptyMessage="No matching project member found."
                options={rfiManagerOptions}
                disabled={isLoadingProjectUsers || isLoadingProject}
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
              <Save />
              Save as Draft
            </Button>
          </FormActions>
        </form>
      </Form>
    </PageShell>
  );
}
