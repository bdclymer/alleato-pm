"use client";

import * as React from "react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { RHFCheckboxField } from "@/components/forms/fields/RHFCheckboxField";
import { RHFDateField } from "@/components/forms/fields/RHFDateField";
import { RHFMultiComboboxField } from "@/components/forms/fields/RHFMultiComboboxField";
import { RHFSelectField, type SelectOption } from "@/components/forms/fields/RHFSelectField";
import { RHFTextField } from "@/components/forms/fields/RHFTextField";
import { RHFTextareaField } from "@/components/forms/fields/RHFTextareaField";
import { RHFTimeField } from "@/components/forms/fields/RHFTimeField";
import { useCreateMeeting, useMeetingSeriesList } from "@/hooks/use-meetings";
import { useMeetingTemplateOptions } from "@/hooks/use-meeting-templates";
import { usePeople } from "@/hooks/use-people";
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
  const { people, isLoading: isLoadingPeople } = usePeople({ type: "all" });

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

  const nameValue = form.watch("name");
  const seriesTouched = React.useRef(false);

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
      <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
        <RHFSelectField
          control={form.control}
          name="template_id"
          label="Template"
          options={templateOptions}
          placeholder="No Template"
        />

        <RHFTextField
          control={form.control}
          name="name"
          label="Meeting Name *"
          placeholder="Weekly OAC Meeting"
        />

        <RHFTextField
          control={form.control}
          name="series_name"
          label="Series"
          placeholder="Defaults to the meeting name"
          description="Type an existing series to group this meeting with it, or leave it to start a new series."
          list="meeting-series-options"
          onFocus={() => {
            seriesTouched.current = true;
          }}
        />
        <datalist id="meeting-series-options">
          {existingSeriesNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RHFDateField control={form.control} name="meeting_date" label="Date" nullable />
          <RHFSelectField
            control={form.control}
            name="timezone"
            label="Timezone"
            options={TIMEZONE_OPTIONS}
            placeholder="Select timezone"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RHFTimeField control={form.control} name="start_time" label="Start Time" />
          <RHFTimeField control={form.control} name="end_time" label="End Time" />
        </div>

        <RHFTextField
          control={form.control}
          name="location"
          label="Location"
          placeholder="Conference room or address"
        />

        <RHFTextField
          control={form.control}
          name="meeting_link"
          label="Meeting Link"
          placeholder="https://..."
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
          <RHFCheckboxField control={form.control} name="is_private" label="Private" />
          <RHFCheckboxField control={form.control} name="is_draft" label="Draft" />
        </div>

        <RHFTextareaField
          control={form.control}
          name="overview"
          label="Overview"
          placeholder="What should this meeting cover?"
          rows={4}
        />

        <RHFMultiComboboxField
          control={form.control}
          name="attendee_person_ids"
          label="Attendees"
          options={attendeeOptions}
          placeholder="Select attendees"
          searchPlaceholder="Search people..."
          emptyMessage="No matching person found."
          disabled={isLoadingPeople}
        />

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={createMeeting.isPending}>
            {createMeeting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Meeting
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={createMeeting.isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
