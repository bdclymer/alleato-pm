"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormGrid, FormSection } from "@/components/forms";
import { RHFComboboxField } from "@/components/forms/fields/RHFComboboxField";
import { RHFMultiComboboxField } from "@/components/forms/fields/RHFMultiComboboxField";
import { RHFDateField } from "@/components/forms/fields/RHFDateField";
import { RHFSelectField } from "@/components/forms/fields/RHFSelectField";
import { RHFTextField } from "@/components/forms/fields/RHFTextField";
import { RHFTextareaField } from "@/components/forms/fields/RHFTextareaField";
import { useProjectUsers } from "@/hooks/use-project-users";
import { apiFetch } from "@/lib/api-client";
import { RFI_IMPACT_OPTIONS, type RfiFormValues } from "@/lib/schemas/rfi-schema";

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

/**
 * Hook returning the RFI manager combobox options for a project, sourced from
 * project users + saved team_members. Shared by every RFI create/edit form so
 * the option list stays consistent.
 */
export function useRfiManagerOptions(projectId: number) {
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

  const options = useMemo(() => {
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
        optionMap.set(key, { value: fullName, label: fullName, keywords: [] });
      }
    }

    return Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [project?.team_members, projectUsers]);

  return { options, isLoading: isLoadingProjectUsers || isLoadingProject };
}

// ─────────────────────────────────────────────────────────────────────────────

interface RfiFormFieldsProps {
  form: UseFormReturn<RfiFormValues>;
  projectId: number;
  /** Wrap the fields in a `<Form>` provider. Set false when the caller already provides one. */
  withFormProvider?: boolean;
}

/**
 * Canonical field set for RFI create / edit forms.
 *
 * Used by:
 *  - `/[projectId]/rfis/new` (full-page create)
 *  - `LinkPinModal` (drawing-pin "create new RFI" tab)
 *
 * Any change to the RFI form (new field, validation, dropdown source) belongs
 * here so both surfaces stay in sync.
 *
 * The component renders fields only — submit buttons are owned by the caller
 * (because draft-vs-open submit is page-specific).
 */
export function RfiFormFields({
  form,
  projectId,
  withFormProvider = true,
}: RfiFormFieldsProps) {
  const { options: rfiManagerOptions, isLoading: isLoadingManagerOptions } =
    useRfiManagerOptions(projectId);

  const fields = (
    <>
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
            disabled={isLoadingManagerOptions}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Assignment">
        <RHFMultiComboboxField
          control={form.control}
          name="assignees"
          label="Assignees (required for Open)"
          options={rfiManagerOptions}
          placeholder="Select assignees from project directory"
          searchPlaceholder="Search project members..."
          emptyMessage="No matching project member found."
          disabled={isLoadingManagerOptions}
        />

        <FormGrid columns={2}>
          <RHFComboboxField
            control={form.control}
            name="received_from"
            label="Received From"
            placeholder="Select from project directory"
            searchPlaceholder="Search project members..."
            emptyMessage="No matching project member found."
            options={rfiManagerOptions}
            disabled={isLoadingManagerOptions}
            clearable
          />

          <RHFComboboxField
            control={form.control}
            name="responsible_contractor"
            label="Responsible Contractor"
            placeholder="Select from project directory"
            searchPlaceholder="Search project members..."
            emptyMessage="No matching project member found."
            options={rfiManagerOptions}
            disabled={isLoadingManagerOptions}
            clearable
          />
        </FormGrid>

        <RHFMultiComboboxField
          control={form.control}
          name="distribution_list"
          label="Distribution List"
          options={rfiManagerOptions}
          placeholder="Select from project directory"
          searchPlaceholder="Search project members..."
          emptyMessage="No matching project member found."
          disabled={isLoadingManagerOptions}
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
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Private</FormLabel>
              </div>
            </FormItem>
          )}
        />
      </FormSection>
    </>
  );

  if (!withFormProvider) return fields;

  return <Form {...form}>{fields}</Form>;
}

/**
 * Returns fresh RHF defaultValues for an empty RFI form. Called at render
 * time so date-relative defaults (due date = today + 14 days) are always
 * current rather than frozen at module load time.
 */
export function getRfiFormDefaults(): RfiFormValues {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  return {
    subject: "",
    question: "",
    due_date: dueDateStr,
    assignees: [],
    rfi_manager: null,
    received_from: null,
    responsible_contractor: null,
    distribution_list: [],
    location: null,
    specification: null,
    cost_code: null,
    schedule_impact: "no",
    cost_impact: "no",
    reference: null,
    is_private: false,
    rfi_stage: "Open",
    drawing_number: null,
  };
}

/** @deprecated Use getRfiFormDefaults() so date-relative fields stay current. */
export const RFI_FORM_DEFAULTS: RfiFormValues = getRfiFormDefaults();
