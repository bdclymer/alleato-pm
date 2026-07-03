"use client";

import * as React from "react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FormActions, FormGrid, FormSection } from "@/components/forms";
import { RHFCheckboxField } from "@/components/forms/fields/RHFCheckboxField";
import { RHFDateField } from "@/components/forms/fields/RHFDateField";
import { RHFMultiComboboxField } from "@/components/forms/fields/RHFMultiComboboxField";
import { RHFSelectField, type SelectOption } from "@/components/forms/fields/RHFSelectField";
import { RHFTextField } from "@/components/forms/fields/RHFTextField";
import { RHFTextareaField } from "@/components/forms/fields/RHFTextareaField";
import { RHFTimeField } from "@/components/forms/fields/RHFTimeField";
import { useCreateMeeting, useMeetingSeriesList } from "@/hooks/use-meetings";
import {
  useMeetingPlanningSuggestions,
  type MeetingPlanningRecap,
  type MeetingPlanningSuggestion,
} from "@/hooks/use-meeting-planning-suggestions";
import { useMeetingTemplateOptions } from "@/hooks/use-meeting-templates";
import { usePeople } from "@/hooks/use-people";
import { apiFetch } from "@/lib/api-client";
import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";

/** Fallback IANA timezone when the project has no configured timezone source. */
const DEFAULT_TIMEZONE = "America/Indiana/Indianapolis";

const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: "America/Indiana/Indianapolis", label: "Eastern (Indianapolis)" },
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Phoenix", label: "Mountain (no DST — Arizona)" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
];

const NO_TEMPLATE_VALUE = "__none__";

// Time fields are entered as free text and normalized to "HH:MM" by
// RHFTimeField on blur. Empty string means "not set" and must be normalized
// to undefined before submit so the optional Zod schema doesn't see it.
const timeFieldSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid time, e.g. 9:00 AM")
  .optional()
  .or(z.literal(""));

const createMeetingFormSchema = z
  .object({
    template_id: z.string().optional(),
    name: z.string().min(1, "Meeting name is required."),
    series_name: z.string().min(1, "Series is required."),
    meeting_date: z.string().optional().or(z.literal("")),
    timezone: z.string().min(1, "Timezone is required."),
    start_time: timeFieldSchema,
    end_time: timeFieldSchema,
    location: z.string().optional(),
    meeting_link: z.string().optional(),
    is_private: z.boolean(),
    is_draft: z.boolean(),
    overview: z.string().optional(),
    attendee_person_ids: z.array(z.string()),
  })
  .refine(
    (data) =>
      !data.start_time || !data.end_time || data.start_time <= data.end_time,
    { message: "End time must be after start time.", path: ["end_time"] },
  );

type CreateMeetingFormValues = z.infer<typeof createMeetingFormSchema>;

function buildDefaultValues(): CreateMeetingFormValues {
  return {
    template_id: NO_TEMPLATE_VALUE,
    name: "",
    series_name: "",
    meeting_date: "",
    timezone: DEFAULT_TIMEZONE,
    start_time: "",
    end_time: "",
    location: "",
    meeting_link: "",
    is_private: false,
    is_draft: false,
    overview: "",
    attendee_person_ids: [],
  };
}

interface CreateMeetingFormProps {
  projectId: string;
  onCancel?: () => void;
}

export function CreateMeetingForm({ projectId, onCancel }: CreateMeetingFormProps) {
  const router = useRouter();
  const createMeeting = useCreateMeeting(projectId);
  const { data: templateData } = useMeetingTemplateOptions();
  const { data: seriesData } = useMeetingSeriesList(projectId);
  const planningSuggestions = useMeetingPlanningSuggestions(projectId);
  const { people, isLoading: isLoadingPeople } = usePeople({ type: "all" });
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [isSeedingSuggestions, setIsSeedingSuggestions] = React.useState(false);

  const templateOptions: SelectOption[] = useMemo(
    () => [
      { value: NO_TEMPLATE_VALUE, label: "No Template" },
      ...(templateData?.templates ?? []).map((template) => ({
        value: template.id,
        label: template.name,
      })),
    ],
    [templateData],
  );

  const existingSeriesNames: string[] = useMemo(() => {
    const names = new Set<string>();
    for (const series of seriesData?.series ?? []) {
      if (series.name) names.add(series.name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [seriesData]);

  const attendeeOptions = useMemo(
    () =>
      people.map((person) => {
        const fullName = `${person.first_name} ${person.last_name}`.trim();
        // Many imported contacts only have an email — fall back to it so the
        // option never renders blank (root cause of "select attendees
        // doesn't work": a name-only label collapsed to "" for these rows).
        const displayName = fullName || person.email || "Unnamed contact";
        const label = person.company?.name
          ? `${displayName} — ${person.company.name}`
          : displayName;
        return {
          value: person.id,
          label,
          keywords: [person.email || "", person.company?.name || ""].filter(Boolean),
        };
      }),
    [people],
  );

  const form = useForm<CreateMeetingFormValues>({
    resolver: zodResolver(createMeetingFormSchema),
    defaultValues: buildDefaultValues(),
  });

  const projectQuickLinks = [
    { label: "Submittals", href: `/${projectId}/submittals` },
    { label: "RFIs", href: `/${projectId}/rfis` },
    { label: "Change events", href: `/${projectId}/change-events` },
    { label: "Change orders", href: `/${projectId}/change-orders` },
    { label: "Schedule", href: `/${projectId}/schedule` },
    { label: "Drawings", href: `/${projectId}/drawings` },
    { label: "Commitments", href: `/${projectId}/commitments` },
  ];

  const nameValue = form.watch("name");
  const seriesTouched = React.useRef(false);
  const suggestions = planningSuggestions.data?.suggestions ?? [];
  const meetingRecaps = planningSuggestions.data?.meetingRecaps ?? [];
  const suggestionSource = planningSuggestions.data?.generatedBy ?? "fallback";
  const suggestionFallbackReason = planningSuggestions.data?.fallbackReason;
  const acceptedSuggestions = suggestions.filter(
    (suggestion) => !dismissedSuggestionIds.has(suggestion.id),
  );

  // Series defaults to the meeting name until the user edits Series directly.
  React.useEffect(() => {
    if (!seriesTouched.current) {
      form.setValue("series_name", nameValue, {
        shouldValidate: form.formState.isSubmitted,
        shouldDirty: false,
      });
    }
  }, [nameValue, form]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(`/${projectId}/meetings`);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const created = await createMeeting.mutateAsync({
        name: values.name.trim(),
        series_name: values.series_name.trim() || undefined,
        meeting_date: values.meeting_date || undefined,
        timezone: values.timezone || undefined,
        start_time: values.start_time || undefined,
        end_time: values.end_time || undefined,
        location: values.location?.trim() || undefined,
        meeting_link: values.meeting_link?.trim() || undefined,
        is_private: values.is_private,
        is_draft: values.is_draft,
        overview: values.overview?.trim() || undefined,
        attendee_person_ids: values.attendee_person_ids,
        template_id:
          values.template_id && values.template_id !== NO_TEMPLATE_VALUE
            ? values.template_id
            : undefined,
      });
      if (acceptedSuggestions.length > 0) {
        setIsSeedingSuggestions(true);
        try {
          const seedResult = await seedAcceptedSuggestions(
            projectId,
            created.meeting.id,
            created.categories[0]?.id,
            acceptedSuggestions,
          );
          if (seedResult.failed > 0) {
            toast.warning(
              `Meeting created, but ${seedResult.failed} prep suggestion${
                seedResult.failed === 1 ? " was" : "s were"
              } not added.`,
            );
            reportNonCriticalFailure({
              area: "meetings",
              operation: "seed-meeting-prep-suggestions",
              error: new Error(`${seedResult.failed} prep suggestion inserts failed.`),
              userVisibleFallback: "Meeting was created with partial prep suggestions.",
              metadata: {
                projectId,
                meetingId: created.meeting.id,
                attempted: seedResult.attempted,
                failed: seedResult.failed,
              },
            });
          }
        } catch (seedError) {
          toast.warning("Meeting created, but prep suggestions were not added.");
          reportNonCriticalFailure({
            area: "meetings",
            operation: "seed-meeting-prep-suggestions",
            error: seedError,
            userVisibleFallback: "Meeting was created without prep suggestions.",
            metadata: { projectId, meetingId: created.meeting.id },
          });
        } finally {
          setIsSeedingSuggestions(false);
        }
      }
      router.push(`/${projectId}/meetings/${created.meeting.id}/agenda`);
    } catch (error) {
      reportNonCriticalFailure({
        area: "meetings",
        operation: "create-meeting",
        error,
        userVisibleFallback: "Meeting was not created.",
        metadata: { projectId },
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="min-w-0 space-y-8">
            <FormSection title="Meeting details">
              <FormGrid columns={2} className="gap-y-5">
                <RHFTextField
                  control={form.control}
                  name="name"
                  label="Meeting title"
                  placeholder="Weekly OAC meeting"
                />

                <RHFTextField
                  control={form.control}
                  name="series_name"
                  label="Series"
                  placeholder="Defaults to meeting title"
                  list="meeting-series-options"
                  onFocus={() => {
                    seriesTouched.current = true;
                  }}
                />
              </FormGrid>
              <datalist id="meeting-series-options">
                {existingSeriesNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>

              <FormGrid columns={3} className="gap-y-5">
                <RHFDateField control={form.control} name="meeting_date" label="Date" nullable />
                <RHFTimeField control={form.control} name="start_time" label="Start time" />
                <RHFTimeField control={form.control} name="end_time" label="End time" />
              </FormGrid>

              <FormGrid columns={2} className="gap-y-5">
                <RHFSelectField
                  control={form.control}
                  name="timezone"
                  label="Timezone"
                  options={TIMEZONE_OPTIONS}
                  placeholder="Select timezone"
                />

                <RHFTextField
                  control={form.control}
                  name="location"
                  label="Location"
                  placeholder="Conference room or address"
                />
              </FormGrid>

              <RHFTextField
                control={form.control}
                name="meeting_link"
                label="Meeting link"
                placeholder="https://..."
              />

              <RHFTextareaField
                control={form.control}
                name="overview"
                label="Objective"
                placeholder="What should this meeting cover?"
                rows={4}
              />
            </FormSection>

            <FormSection title="Attendees">
              <RHFMultiComboboxField
                control={form.control}
                name="attendee_person_ids"
                label="People"
                options={attendeeOptions}
                placeholder="Select attendees"
                searchPlaceholder="Search people..."
                emptyMessage="No matching person found."
                disabled={isLoadingPeople}
              />
            </FormSection>

            <FormSection title="Meeting prep">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="max-w-3xl text-sm text-muted-foreground">
                      {suggestionSource === "ai"
                        ? "AI-generated agenda prep from open project work. Remove anything that does not belong in this meeting."
                        : "Source-backed agenda prep from open project work. Remove anything that does not belong in this meeting."}
                    </p>
                    {suggestionFallbackReason ? (
                      <p className="text-xs text-muted-foreground">
                        {suggestionFallbackReason}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setDismissedSuggestionIds(new Set());
                      void planningSuggestions.refetch();
                    }}
                    disabled={planningSuggestions.isFetching}
                    className="w-fit"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Regenerate
                  </Button>
                </div>

                <div className="divide-y divide-border/60">
                  {planningSuggestions.isLoading || planningSuggestions.isFetching ? (
                    <p className="py-2 text-sm text-muted-foreground">
                      Preparing agenda suggestions...
                    </p>
                  ) : acceptedSuggestions.length > 0 ? (
                    acceptedSuggestions.map((suggestion) => (
                      <PlanningSuggestionRow
                        key={suggestion.id}
                        suggestion={suggestion}
                        onRemove={() =>
                          setDismissedSuggestionIds((current) => {
                            const next = new Set(current);
                            next.add(suggestion.id);
                            return next;
                          })
                        }
                      />
                    ))
                  ) : (
                    <p className="py-2 text-sm text-muted-foreground">
                      No suggestions selected. You can still create a blank agenda.
                    </p>
                  )}
                </div>

                {dismissedSuggestionIds.size > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setDismissedSuggestionIds(new Set())}
                  >
                    Restore removed suggestions
                  </Button>
                ) : null}
              </div>
            </FormSection>

            {meetingRecaps.length > 0 ? (
              <FormSection title="Recent meeting recaps">
                <div className="divide-y divide-border/60">
                  {meetingRecaps.map((recap) => (
                    <MeetingRecapRow key={recap.id} recap={recap} />
                  ))}
                </div>
              </FormSection>
            ) : null}

            <FormActions
              submitLabel="Create agenda"
              cancelVariant="ghost"
              onCancel={handleCancel}
              isSubmitting={createMeeting.isPending || isSeedingSuggestions}
              stickyOnMobile
            />
          </div>

          <aside aria-label="Meeting planning" className="min-w-0 space-y-6">
            <section className="space-y-3">
              <div className="text-sm font-semibold text-foreground">Template</div>
              <RHFSelectField
                control={form.control}
                name="template_id"
                label="Starting point"
                options={templateOptions}
                placeholder="No template"
              />
            </section>

            <section className="space-y-3 border-t border-border/60 pt-4">
              <div className="text-sm font-semibold text-foreground">Meeting options</div>
              <div className="space-y-3">
                <RHFCheckboxField control={form.control} name="is_private" label="Private" />
                <RHFCheckboxField control={form.control} name="is_draft" label="Draft" />
              </div>
            </section>

            <section className="space-y-3 border-t border-border/60 pt-4">
              <div className="text-sm font-semibold text-foreground">Quick links</div>
              <div className="grid gap-2">
                {projectQuickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex min-h-8 items-center justify-between gap-3 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="space-y-3 border-t border-border/60 pt-4">
              <div className="text-sm font-semibold text-foreground">After create</div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <span>Open meeting</span>
                  <span className="text-muted-foreground/70">Agenda tab</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Status</span>
                  <span className="text-muted-foreground/70">Draft</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </form>
    </Form>
  );
}

async function seedAcceptedSuggestions(
  projectId: string,
  meetingId: string,
  categoryId: string | undefined,
  suggestions: MeetingPlanningSuggestion[],
): Promise<{ attempted: number; failed: number }> {
  if (!categoryId) {
    throw new Error("Meeting category was not available for prep suggestion seeding.");
  }

  const results = await Promise.allSettled(
    suggestions.map((suggestion) =>
      apiFetch(`/api/projects/${projectId}/meetings/${meetingId}/items`, {
        method: "POST",
        body: JSON.stringify({
          category_id: categoryId,
          title: suggestion.title,
          description: `${suggestion.description}\n\nSource: ${suggestion.href}`,
          priority: suggestion.priority ?? "medium",
          status: "open",
        }),
      }),
    ),
  );

  return {
    attempted: results.length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}

function PlanningSuggestionRow({
  suggestion,
  onRemove,
}: {
  suggestion: MeetingPlanningSuggestion;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {suggestion.title}
          </span>
          <Link
            href={suggestion.href}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Open source
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {suggestion.description}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label={`Remove ${suggestion.title}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function MeetingRecapRow({ recap }: { recap: MeetingPlanningRecap }) {
  const evidenceItems = [
    ...recap.openThreads.map((item) => ({ kind: "Open", text: item })),
    ...recap.decisions.map((item) => ({ kind: "Decision", text: item })),
  ].slice(0, 4);

  return (
    <div className="space-y-2 py-3">
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 truncate text-sm font-medium text-foreground">
              {recap.title}
            </span>
            {recap.date ? (
              <span className="text-xs text-muted-foreground">
                {formatMeetingDate(recap.date)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {recap.summary}
          </p>
        </div>
        <Link
          href={recap.href}
          className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Open source
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {evidenceItems.length > 0 ? (
        <div className="grid gap-1 text-xs text-muted-foreground">
          {evidenceItems.map((item, index) => (
            <div key={`${item.kind}-${index}`} className="flex gap-2">
              <span className="w-12 shrink-0 text-muted-foreground/70">{item.kind}</span>
              <span className="min-w-0">{item.text}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatMeetingDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
