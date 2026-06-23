"use client";

import * as React from "react";
import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

import { PageShell } from "@/components/layout";
import { InfoAlert } from "@/components/ds/InfoAlert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUploadField } from "@/components/forms/FileUploadField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { useProjectCompanies } from "@/hooks/use-project-companies";
import { useAuthUsers } from "@/hooks/use-auth-users";
import { useCompanyContacts } from "@/hooks/use-company-contacts";
import {
  useCreateSubmittal,
  useUpdateSubmittal,
  useWorkflowTemplates,
  uploadSubmittalAttachments,
  type SubmittalDetail,
  type SubmittalSummary,
} from "@/hooks/use-submittals";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { RHFComboboxField } from "@/components/forms/fields/RHFComboboxField";
import {
  buildAuthUserOptions,
  buildCompanyContactOptions,
  isAlleatoEmployee,
  isCompanyContact,
} from "@/lib/submittals/people-options";
import {
  normalizeSubmittalWorkflowRole,
  SUBMITTAL_WORKFLOW_ROLES,
} from "@/lib/submittals/workflow-roles";
import {
  reconcilePendingAttachmentEntries,
  toPendingAttachmentEntry,
  type PendingAttachmentEntry,
  type PendingAttachmentFileInfo,
} from "@/lib/submittals/attachment-files";
import { appToast as toast } from "@/lib/toast/app-toast";

// ─── Division lead time defaults (days) ──────────────────────────────────────

const DIVISION_LEAD_TIMES: Record<string, number> = {
  "01": 14,  // General requirements
  "02": 21,  // Existing conditions
  "03": 56,  // Concrete
  "04": 56,  // Masonry
  "05": 56,  // Metals
  "06": 42,  // Wood/plastics/composites
  "07": 42,  // Thermal & moisture protection
  "08": 84,  // Openings — doors, frames, hardware (12 weeks typical)
  "09": 28,  // Finishes
  "10": 42,  // Specialties
  "11": 56,  // Equipment
  "12": 56,  // Furnishings
  "13": 84,  // Special construction
  "14": 84,  // Conveying equipment (elevators)
  "21": 42,  // Fire suppression
  "22": 42,  // Plumbing
  "23": 42,  // HVAC
  "25": 42,  // Integrated automation
  "26": 42,  // Electrical
  "27": 42,  // Communications
  "28": 42,  // Electronic safety
  "31": 21,  // Earthwork
  "32": 21,  // Exterior improvements
  "33": 21,  // Utilities
};

function getDivisionLeadTime(specSection: string | null | undefined): number | null {
  if (!specSection) return null;
  const match = specSection.trim().match(/^(\d{2})/);
  if (!match) return null;
  return DIVISION_LEAD_TIMES[match[1]] ?? null;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubmittalType {
  id: string;
  name: string;
}

function useSubmittalTypes(projectId: number) {
  return useQuery<SubmittalType[]>({
    queryKey: ["submittal-types", projectId],
    queryFn: ({ signal }) =>
      apiFetch<SubmittalType[]>(
        `/api/projects/${projectId}/submittal-types`,
        { signal },
      ),
    enabled: Boolean(projectId),
  });
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const submittalFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  submittal_number: z.string().min(1, "Number is required"),
  revision: z.number().int().min(0),
  status: z.enum(["Draft", "Open", "Distributed", "Closed"]),
  specification_section: z.string().nullable().optional(),
  submittal_type_id: z.string().nullable().optional(),
  division: z.string().nullable().optional(),
  final_due_date: z.string().nullable().optional(),
  lead_time: z.number().int().min(0).nullable().optional(),
  required_on_site_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_private: z.boolean(),
  ball_in_court: z.string().nullable().optional(),
  responsible_contractor_id: z.string().nullable().optional(),
  received_from_id: z.string().nullable().optional(),
  submittal_manager_id: z.string().nullable().optional(),
  submittal_package_id: z.string().nullable().optional(),
  workflow_template_id: z.string().nullable().optional(),
  // No .default() here: keeping the schema transform-free means the Zod input
  // and output types stay identical, so zodResolver matches useForm<SubmittalFormValues>.
  // Runtime defaults are supplied by buildDefaults() via the form's defaultValues.
  initial_workflow_steps: z.array(
    z.object({
      user_id: z.string().min(1, "Reviewer is required"),
      step_type: z.string().min(1, "Role is required"),
      required: z.boolean(),
    }),
  ),
});

type SubmittalFormValues = z.infer<typeof submittalFormSchema>;
type EditableSubmittal = SubmittalSummary & Partial<SubmittalDetail>;

const STATUS_OPTIONS = ["Draft", "Open", "Distributed", "Closed"] as const;
const WORKFLOW_ROLE_OPTIONS = SUBMITTAL_WORKFLOW_ROLES;

function getSubmittalTypeId(v: SubmittalSummary["submittal_type"] | undefined): string | null {
  if (!v) return null;
  if (typeof v === "object") return v.id ?? null;
  return null;
}

function buildDefaults(
  submittal: EditableSubmittal | undefined,
  overrides?: { submittal_package_id?: string; specification_section?: string },
): SubmittalFormValues {
  return {
    title: submittal?.title ?? "",
    submittal_number: submittal?.submittal_number ?? "",
    revision: submittal?.revision ?? 0,
    status: (submittal?.status as "Draft" | "Open" | "Distributed" | "Closed") ?? "Draft",
    specification_section:
      overrides?.specification_section ?? submittal?.specification_section ?? "",
    submittal_type_id: getSubmittalTypeId(submittal?.submittal_type),
    division: submittal?.division ?? "",
    final_due_date: submittal?.final_due_date ?? "",
    lead_time: submittal?.lead_time ?? null,
    required_on_site_date: submittal?.required_on_site_date ?? "",
    description: submittal?.description ?? "",
    is_private: submittal?.is_private ?? false,
    ball_in_court: submittal?.ball_in_court ?? "",
    responsible_contractor_id: submittal?.responsible_contractor_id ?? null,
    received_from_id: submittal?.received_from_id ?? null,
    submittal_manager_id: submittal?.submittal_manager_id ?? null,
    submittal_package_id:
      overrides?.submittal_package_id ??
      (typeof submittal?.submittal_package === "object"
        ? (submittal?.submittal_package as { id?: string } | null)?.id
        : null) ??
      null,
    workflow_template_id: null,
    initial_workflow_steps: [],
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SubmittalFormPageProps {
  projectId: number;
  submittal?: EditableSubmittal;
  defaultOverrides?: { submittal_package_id?: string; specification_section?: string };
  mode?: "page" | "inline";
  onCancel?: () => void;
  onSaved?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubmittalFormPage({
  projectId,
  submittal,
  defaultOverrides,
  mode = "page",
  onCancel,
  onSaved,
}: SubmittalFormPageProps) {
  const router = useRouter();
  const isEditing = Boolean(submittal);

  const createMutation = useCreateSubmittal(projectId);
  const updateMutation = useUpdateSubmittal(projectId, submittal?.id ?? "");
  const [pendingAttachmentEntries, setPendingAttachmentEntries] = React.useState<
    PendingAttachmentEntry[]
  >([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = React.useState(false);

  const { companies, isLoading: companiesLoading } = useProjectCompanies(String(projectId), {
    per_page: 200,
  });
  const { users, allUsers, isLoading: usersLoading } = useAuthUsers(String(projectId));
  const { data: submittalTypes, isLoading: typesLoading } = useSubmittalTypes(projectId);
  const { data: workflowTemplates, isLoading: workflowTemplatesLoading } =
    useWorkflowTemplates(projectId);
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ["submittal-packages", projectId],
    queryFn: async () =>
      apiFetch<{ id: string; name: string }[]>(
        `/api/projects/${projectId}/submittals/packages`,
      ),
  });

  const form = useForm<SubmittalFormValues>({
    resolver: zodResolver(submittalFormSchema),
    defaultValues: buildDefaults(submittal, defaultOverrides),
  });

  const workflowFieldArray = useFieldArray({
    control: form.control,
    name: "initial_workflow_steps",
  });

  const watchedStatus = form.watch("status");
  const watchedSubmittalManager = form.watch("submittal_manager_id");
  const watchedResponsibleContractor = form.watch("responsible_contractor_id");
  const watchedRequiredOnSite = form.watch("required_on_site_date");
  const watchedLeadTime = form.watch("lead_time");
  const watchedFinalDueDate = form.watch("final_due_date");
  const watchedSpecSection = form.watch("specification_section");
  const watchedWorkflowSteps = form.watch("initial_workflow_steps");
  const previousResponsibleContractor = React.useRef(watchedResponsibleContractor);

  const {
    contacts: responsibleContractorContacts,
    isLoading: receivedFromLoading,
  } = useCompanyContacts({
    companyId: watchedResponsibleContractor ?? undefined,
    enabled: Boolean(watchedResponsibleContractor),
  });

  // When creating new: default submittal_manager_id to the current logged-in user.
  // Run once on mount — supabase client is a stable singleton, safe to omit from deps.
  const formSetValue = form.setValue;
  const formGetValues = form.getValues;
  React.useEffect(() => {
    if (isEditing) return;
    const current = formGetValues("submittal_manager_id");
    if (current) return;
    const client = createClient();
    client.auth.getUser().then(({ data }) => {
      if (data.user?.id) {
        formSetValue("submittal_manager_id", data.user.id, { shouldDirty: false });
      }
    });
  }, [isEditing, formGetValues, formSetValue]);

  // When creating new: ball_in_court defaults to the submittal manager when status is Draft
  React.useEffect(() => {
    if (isEditing) return;
    const currentBic = form.getValues("ball_in_court");
    if (currentBic) return;
    if (watchedStatus === "Draft" && watchedSubmittalManager) {
      form.setValue("ball_in_court", watchedSubmittalManager, { shouldDirty: false });
    }
  }, [isEditing, watchedStatus, watchedSubmittalManager, form]);

  // Auto-compute final_due_date = required_on_site_date minus lead_time days
  React.useEffect(() => {
    if (!watchedRequiredOnSite || !watchedLeadTime) return;
    try {
      const computed = addDays(watchedRequiredOnSite, -watchedLeadTime);
      form.setValue("final_due_date", computed, { shouldDirty: true });
    } catch {
      // Invalid date — leave as-is
    }
  }, [watchedRequiredOnSite, watchedLeadTime, form]);

  // Auto-set lead_time default when spec section changes (new forms or empty lead_time)
  React.useEffect(() => {
    if (!watchedSpecSection) return;
    const currentLeadTime = form.getValues("lead_time");
    if (currentLeadTime != null) return;
    const defaultDays = getDivisionLeadTime(watchedSpecSection);
    if (defaultDays != null) {
      form.setValue("lead_time", defaultDays, { shouldDirty: false });
    }
  }, [watchedSpecSection, form]);

  const isPending =
    createMutation.isPending || updateMutation.isPending || isUploadingAttachments;

  const companyOptions = useMemo(
    () =>
      companies
        .filter((c) => c.company_id)
        .map((c) => ({
          value: c.company_id,
          label: c.company?.name ?? c.company_id,
        })),
    [companies],
  );

  const userOptions = useMemo(
    () =>
      users.map((u) => {
        const name =
          u.first_name || u.last_name
            ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()
            : u.email;
        return {
          value: u.id,
          label: name,
          keywords: [u.email].filter(Boolean) as string[],
        };
      }),
    [users],
  );

  const managerOptions = useMemo(
    () => buildAuthUserOptions(allUsers.filter(isAlleatoEmployee)),
    [allUsers],
  );

  const receivedFromOptions = useMemo(
    () =>
      buildCompanyContactOptions(
        responsibleContractorContacts.filter(isCompanyContact),
      ),
    [responsibleContractorContacts],
  );

  // Ball-in-court: when workflow steps are defined, restrict to those participants
  const ballInCourtOptions = useMemo(() => {
    const stepUserIds = new Set(
      (watchedWorkflowSteps ?? []).map((s) => s.user_id).filter(Boolean),
    );
    if (stepUserIds.size === 0) return userOptions;
    return userOptions.filter((u) => stepUserIds.has(u.value));
  }, [watchedWorkflowSteps, userOptions]);

  // Warning: due date + lead time exceeds required-on-site date
  const dueDateWarning = useMemo(() => {
    if (!watchedFinalDueDate || !watchedLeadTime || !watchedRequiredOnSite) return false;
    try {
      const projected = addDays(watchedFinalDueDate, watchedLeadTime);
      return projected > watchedRequiredOnSite;
    } catch {
      return false;
    }
  }, [watchedFinalDueDate, watchedLeadTime, watchedRequiredOnSite]);

  React.useEffect(() => {
    if (previousResponsibleContractor.current !== watchedResponsibleContractor) {
      previousResponsibleContractor.current = watchedResponsibleContractor;
      form.setValue("received_from_id", null, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [form, watchedResponsibleContractor]);

  function handleWorkflowTemplateChange(templateId: string) {
    form.setValue("workflow_template_id", templateId === "__none__" ? null : templateId, {
      shouldDirty: true,
    });

    if (templateId === "__none__") {
      workflowFieldArray.replace([]);
      return;
    }

    const template = workflowTemplates?.find((item) => item.id === templateId);
    workflowFieldArray.replace(
      (template?.steps ?? []).map((step) => ({
        user_id: step.user_id ?? "",
        step_type: normalizeSubmittalWorkflowRole(step.step_type),
        required: step.required ?? true,
      })),
    );
  }

  function addWorkflowStep() {
    workflowFieldArray.append({
      user_id: "",
      step_type: "Approver",
      required: true,
    });
  }

  function handleAttachmentFilesSelected(files: File[]) {
    setPendingAttachmentEntries((current) =>
      [...current, ...files.map(toPendingAttachmentEntry)].slice(0, 10),
    );
  }

  function handleAttachmentListChange(nextFiles: PendingAttachmentFileInfo[]) {
    setPendingAttachmentEntries((current) =>
      reconcilePendingAttachmentEntries(current, nextFiles),
    );
  }

  async function uploadPendingAttachments(submittalId: string) {
    const files = pendingAttachmentEntries.map((entry) => entry.file);
    if (files.length === 0) return;

    setIsUploadingAttachments(true);
    try {
      await uploadSubmittalAttachments(projectId, submittalId, files);
      toast.success(
        files.length === 1
          ? "Attachment uploaded"
          : `${files.length} attachments uploaded`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The server did not return a reason.";
      toast.error("Submittal was created, but attachments did not upload", {
        description: message,
      });
    } finally {
      setIsUploadingAttachments(false);
    }
  }

  async function onSubmit(values: SubmittalFormValues) {
    const { workflow_template_id: _workflowTemplateId, ...submittalValues } = values;
    const payload = {
      ...submittalValues,
      specification_section: values.specification_section || null,
      submittal_type_id: values.submittal_type_id || null,
      division: values.division || null,
      final_due_date: values.final_due_date || null,
      required_on_site_date: values.required_on_site_date || null,
      description: values.description || null,
      ball_in_court: values.ball_in_court || null,
      responsible_contractor_id: values.responsible_contractor_id ?? null,
      received_from_id: values.received_from_id || null,
      submittal_manager_id: values.submittal_manager_id || null,
      submittal_package_id: values.submittal_package_id || null,
      initial_workflow_steps: isEditing
        ? undefined
        : values.initial_workflow_steps.map((step) => ({
            user_id: step.user_id,
            step_type: step.step_type,
            required: step.required,
          })),
    };

    if (isEditing && submittal) {
      await updateMutation.mutateAsync(payload);
      if (onSaved) {
        onSaved();
      } else {
        router.push(`/${projectId}/submittals/${submittal.id}`);
      }
    } else {
      const result = await createMutation.mutateAsync(payload);
      const newId = (result as { id?: string } | null)?.id;
      if (newId) {
        await uploadPendingAttachments(newId);
        router.push(`/${projectId}/submittals/${newId}`);
      } else {
        router.push(`/${projectId}/submittals`);
      }
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }

    if (isEditing && submittal) {
      router.push(`/${projectId}/submittals/${submittal.id}`);
    } else {
      router.push(`/${projectId}/submittals`);
    }
  }

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* ── General Information ── */}
        <section className="space-y-4">
          <SectionRuleHeading label="General Information" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="submittal_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 08-1113-1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="revision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revision *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Doors, Frames, Hardware" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="submittal_package_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submittal Package</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                    value={field.value ?? "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={packagesLoading ? "Loading..." : "Select package"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {(packages ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="specification_section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specification Section</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 08-1113 - Doors, Frames"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="division"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Division</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Division 8"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="submittal_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submittal Type</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                    value={field.value ?? "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={typesLoading ? "Loading..." : "Select type"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {(submittalTypes ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

        </section>

        {/* ── People & Companies ── */}
        <section className="space-y-4">
          <SectionRuleHeading label="People & Companies" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RHFComboboxField
              control={form.control}
              name="responsible_contractor_id"
              label="Responsible Contractor"
              placeholder={companiesLoading ? "Loading..." : "Select company"}
              searchPlaceholder="Search companies..."
              emptyMessage="No matching company found."
              options={companyOptions}
              disabled={companiesLoading}
              clearable
            />

            <RHFComboboxField
              control={form.control}
              name="received_from_id"
              label="Received From"
              placeholder={
                !watchedResponsibleContractor
                  ? "Select responsible contractor first"
                  : receivedFromLoading
                    ? "Loading..."
                    : "Select contact"
              }
              searchPlaceholder="Search contacts..."
              emptyMessage="No contacts found for this contractor."
              options={receivedFromOptions}
              disabled={!watchedResponsibleContractor || receivedFromLoading}
              clearable
            />

            <RHFComboboxField
              control={form.control}
              name="submittal_manager_id"
              label="Submittal Manager"
              placeholder={usersLoading ? "Loading..." : "Select person"}
              searchPlaceholder="Search by name or email..."
              emptyMessage="No Alleato employees found."
              options={managerOptions}
              disabled={usersLoading}
              clearable
            />
          </div>
        </section>

        {/* ── Distribution & Scheduling ── */}
        <section className="space-y-4">
          <SectionRuleHeading label="Distribution & Scheduling" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="final_due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Final Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="required_on_site_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required On-Site Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lead_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Time (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : parseInt(e.target.value, 10),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <RHFComboboxField
              control={form.control}
              name="ball_in_court"
              label="Ball In Court"
              placeholder={usersLoading ? "Loading..." : "Select person"}
              searchPlaceholder="Search by name or email..."
              emptyMessage="No matching person found."
              options={ballInCourtOptions}
              disabled={usersLoading}
              clearable
            />
          </div>

          {dueDateWarning && (
            <InfoAlert variant="warning">
              Due date plus lead time extends past the required on-site date. The submittal may not arrive in time.
            </InfoAlert>
          )}
        </section>

        {!isEditing ? (
          <section className="space-y-4">
            <SectionRuleHeading label="Submittal Workflow" />

            {(workflowTemplates?.length ?? 0) > 0 ? (
              <div className="max-w-sm">
                <FormField
                  control={form.control}
                  name="workflow_template_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workflow Template</FormLabel>
                      <Select
                        onValueChange={handleWorkflowTemplateChange}
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                workflowTemplatesLoading
                                  ? "Loading..."
                                  : "Select template"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Build from scratch</SelectItem>
                          {(workflowTemplates ?? []).map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            <div className="space-y-3">
              {workflowFieldArray.fields.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-full divide-y rounded-md border">
                    <div className="grid grid-cols-[4rem_minmax(16rem,1fr)_12rem_4rem] gap-3 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>Step</span>
                      <span>Name</span>
                      <span>Role</span>
                      <span className="sr-only">Actions</span>
                    </div>
                    {workflowFieldArray.fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-[4rem_minmax(16rem,1fr)_12rem_4rem] items-start gap-3 px-3 py-3"
                      >
                        <div className="pt-2 text-sm text-muted-foreground">
                          {index + 1}
                        </div>
                        <RHFComboboxField
                          control={form.control}
                          name={`initial_workflow_steps.${index}.user_id`}
                          label="Name"
                          placeholder={usersLoading ? "Loading..." : "Select person"}
                          searchPlaceholder="Search by name or email..."
                          emptyMessage="No matching person found."
                          options={userOptions}
                          disabled={usersLoading}
                        />
                        <FormField
                          control={form.control}
                          name={`initial_workflow_steps.${index}.step_type`}
                          render={({ field: roleField }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select
                                onValueChange={roleField.onChange}
                                value={roleField.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {WORKFLOW_ROLE_OPTIONS.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6"
                          aria-label={`Remove workflow step ${index + 1}`}
                          onClick={() => workflowFieldArray.remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <Button
                type="button"
                variant="outline"
                onClick={addWorkflowStep}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Step
              </Button>
            </div>
          </section>
        ) : null}

        {/* ── Content ── */}
        <section className="space-y-4">
          <SectionRuleHeading label="Content" />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder="Describe this submittal..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_private"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="cursor-pointer font-normal">
                  Private (visible only to admins and distribution list)
                </FormLabel>
              </FormItem>
            )}
          />
        </section>

        {!isEditing ? (
          <section className="space-y-4">
            <SectionRuleHeading label="Attachments" />
            <FileUploadField
              value={pendingAttachmentEntries.map((entry) => entry.info)}
              onChange={handleAttachmentListChange}
              onFilesSelected={handleAttachmentFilesSelected}
              multiple
              maxFiles={10}
              maxSize={50 * 1024 * 1024}
              variant="minimal"
              showMetaText={false}
              dropzoneTestId="submittal-attachments-dropzone"
              inputTestId="submittal-attachments-input"
              fileListTestId="submittal-attachments-list"
              disabled={isPending}
            />
          </section>
        ) : null}

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? "Updating..."
                : isUploadingAttachments
                  ? "Uploading attachments..."
                  : "Creating..."
              : isEditing
                ? "Update Submittal"
                : "Create Submittal"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );

  if (mode === "inline") {
    return formContent;
  }

  return (
    <PageShell
      variant="form"
      title={isEditing ? "Edit Submittal" : "Create Submittal"}
      onBack={handleCancel}
    >
      {formContent}
    </PageShell>
  );
}
