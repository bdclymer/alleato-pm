"use client";

import * as React from "react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { PageShell } from "@/components/layout";
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
import { useCreateSubmittal, useUpdateSubmittal, type SubmittalSummary } from "@/hooks/use-submittals";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { RHFComboboxField } from "@/components/forms/fields/RHFComboboxField";

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
});

type SubmittalFormValues = z.infer<typeof submittalFormSchema>;

const STATUS_OPTIONS = ["Draft", "Open", "Distributed", "Closed"] as const;

function getSubmittalTypeId(v: SubmittalSummary["submittal_type"] | undefined): string | null {
  if (!v) return null;
  if (typeof v === "object") return v.id ?? null;
  return null;
}

// The edit page passes the full DB record cast to SubmittalSummary; use an
// extended type to safely access fields that aren't on SubmittalSummary.
type ExtendedSubmittal = SubmittalSummary & {
  lead_time?: number | null;
  required_on_site_date?: string | null;
  description?: string | null;
  received_from_id?: string | null;
  submittal_manager_id?: string | null;
};

function buildDefaults(
  submittal: SubmittalSummary | undefined,
  overrides?: { submittal_package_id?: string; specification_section?: string },
): SubmittalFormValues {
  const s = submittal as ExtendedSubmittal | undefined;
  return {
    title: s?.title ?? "",
    submittal_number: s?.submittal_number ?? "",
    revision: s?.revision ?? 0,
    status: (s?.status as "Draft" | "Open" | "Distributed" | "Closed") ?? "Draft",
    specification_section:
      overrides?.specification_section ?? s?.specification_section ?? "",
    submittal_type_id: getSubmittalTypeId(s?.submittal_type),
    division: s?.division ?? "",
    final_due_date: s?.final_due_date ?? "",
    lead_time: s?.lead_time ?? null,
    required_on_site_date: s?.required_on_site_date ?? "",
    description: s?.description ?? "",
    is_private: s?.is_private ?? false,
    ball_in_court: s?.ball_in_court ?? "",
    responsible_contractor_id: null,
    received_from_id: s?.received_from_id ?? null,
    submittal_manager_id: s?.submittal_manager_id ?? null,
    submittal_package_id:
      overrides?.submittal_package_id ??
      (typeof s?.submittal_package === "object"
        ? (s?.submittal_package as { id?: string } | null)?.id
        : null) ??
      null,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SubmittalFormPageProps {
  projectId: number;
  submittal?: SubmittalSummary;
  defaultOverrides?: { submittal_package_id?: string; specification_section?: string };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubmittalFormPage({
  projectId,
  submittal,
  defaultOverrides,
}: SubmittalFormPageProps) {
  const router = useRouter();
  const isEditing = Boolean(submittal);

  const createMutation = useCreateSubmittal(projectId);
  const updateMutation = useUpdateSubmittal(projectId, submittal?.id ?? "");

  const { companies, isLoading: companiesLoading } = useProjectCompanies(String(projectId), {
    per_page: 200,
  });
  const { users, isLoading: usersLoading } = useAuthUsers(String(projectId));
  const { data: submittalTypes, isLoading: typesLoading } = useSubmittalTypes(projectId);
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

  const watchedStatus = form.watch("status");
  const watchedSubmittalManager = form.watch("submittal_manager_id");
  const watchedRequiredOnSite = form.watch("required_on_site_date");
  const watchedLeadTime = form.watch("lead_time");
  const watchedSpecSection = form.watch("specification_section");

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

  const isPending = createMutation.isPending || updateMutation.isPending;

  const companyOptions = useMemo(
    () =>
      companies.map((c) => ({
        value: c.id,
        label: c.company?.name ?? c.id,
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

  async function onSubmit(values: SubmittalFormValues) {
    const payload = {
      ...values,
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
    };

    if (isEditing && submittal) {
      await updateMutation.mutateAsync(payload);
      router.push(`/${projectId}/submittals/${submittal.id}`);
    } else {
      const result = await createMutation.mutateAsync(payload);
      const newId = (result as { id?: string } | null)?.id;
      if (newId) {
        router.push(`/${projectId}/submittals/${newId}`);
      } else {
        router.push(`/${projectId}/submittals`);
      }
    }
  }

  return (
    <PageShell
      variant="form"
      title={isEditing ? "Edit Submittal" : "Create Submittal"}
      onBack={() => {
        if (isEditing && submittal) {
          router.push(`/${projectId}/submittals/${submittal.id}`);
        } else {
          router.push(`/${projectId}/submittals`);
        }
      }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* ── General Information ── */}
          <section className="space-y-4">
            <SectionRuleHeading label="General Information" />

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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
          </section>

          {/* ── People & Companies ── */}
          <section className="space-y-4">
            <SectionRuleHeading label="People & Companies" />

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

            <div className="grid grid-cols-2 gap-4">
              <RHFComboboxField
                control={form.control}
                name="received_from_id"
                label="Received From"
                placeholder={usersLoading ? "Loading..." : "Select person"}
                searchPlaceholder="Search by name or email..."
                emptyMessage="No matching person found."
                options={userOptions}
                disabled={usersLoading}
                clearable
              />

              <RHFComboboxField
                control={form.control}
                name="submittal_manager_id"
                label="Submittal Manager"
                placeholder={usersLoading ? "Loading..." : "Select person"}
                searchPlaceholder="Search by name or email..."
                emptyMessage="No matching person found."
                options={userOptions}
                disabled={usersLoading}
                clearable
              />
            </div>
          </section>

          {/* ── Distribution & Scheduling ── */}
          <section className="space-y-4">
            <SectionRuleHeading label="Distribution & Scheduling" />

            <div className="grid grid-cols-2 gap-4">
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
            </div>

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

            <RHFComboboxField
              control={form.control}
              name="ball_in_court"
              label="Ball In Court"
              placeholder={usersLoading ? "Loading..." : "Select person"}
              searchPlaceholder="Search by name or email..."
              emptyMessage="No matching person found."
              options={userOptions}
              disabled={usersLoading}
              clearable
            />
          </section>

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

          {/* ── Actions ── */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update Submittal"
                  : "Create Submittal"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                if (isEditing && submittal) {
                  router.push(`/${projectId}/submittals/${submittal.id}`);
                } else {
                  router.push(`/${projectId}/submittals`);
                }
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </PageShell>
  );
}
