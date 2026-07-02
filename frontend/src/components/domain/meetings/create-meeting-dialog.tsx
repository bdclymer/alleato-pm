"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { z } from "zod";

import {
  Modal as Dialog,
  ModalContent as DialogContent,
  ModalDescription as DialogDescription,
  ModalFooter as DialogFooter,
  ModalHeader as DialogHeader,
  ModalTitle as DialogTitle,
  ModalTrigger as DialogTrigger,
} from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { RHFCheckboxField } from "@/components/forms/fields/RHFCheckboxField";
import { RHFDateField } from "@/components/forms/fields/RHFDateField";
import { RHFMultiComboboxField } from "@/components/forms/fields/RHFMultiComboboxField";
import { RHFSelectField, type SelectOption } from "@/components/forms/fields/RHFSelectField";
import { RHFTextField } from "@/components/forms/fields/RHFTextField";
import { RHFTextareaField } from "@/components/forms/fields/RHFTextareaField";
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

// Time fields use the native HTML time input, which yields "HH:MM". Empty
// string means "not set" and must be normalized to undefined before submit
// so the optional Zod schema doesn't see the empty string.
const timeFieldSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h) format")
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

interface CreateMeetingDialogProps {
  projectId: string;
  onSuccess?: () => void;
  onCreated?: (meetingId: string) => void;
  trigger?: React.ReactNode;
}

export function CreateMeetingDialog({
  projectId,
  onSuccess,
  onCreated,
  trigger,
}: CreateMeetingDialogProps) {
  const [open, setOpen] = useState(false);
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
        const label = person.company?.name ? `${fullName} — ${person.company.name}` : fullName;
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset(buildDefaultValues());
      seriesTouched.current = false;
    }
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
      handleOpenChange(false);
      onSuccess?.();
      onCreated?.(created.meeting.id);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus />
            Create Meeting
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="xl" className="max-h-dvh overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Meeting</DialogTitle>
          <DialogDescription>
            Start a structured project meeting. Each new meeting begins with an
            Uncategorized Items agenda section.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
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
              <RHFTextField
                control={form.control}
                name="start_time"
                label="Start Time"
                type="time"
              />
              <RHFTextField control={form.control} name="end_time" label="End Time" type="time" />
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

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createMeeting.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMeeting.isPending}>
                {createMeeting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Meeting
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
