"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageShell } from "@/components/layout";
import { FormGrid, FormSection } from "@/components/forms";
import { FormActions } from "@/components/forms/FormActions";
import { FormServerError } from "@/components/forms/FormServerError";
import { RHFNumberField } from "@/components/forms/fields/RHFNumberField";
import { RHFSelectField } from "@/components/forms/fields/RHFSelectField";
import { RHFTextField } from "@/components/forms/fields/RHFTextField";
import { RHFTextareaField } from "@/components/forms/fields/RHFTextareaField";
import { Form } from "@/components/ui/form";
import { useCreateMeeting } from "@/hooks/use-meetings";

const MEETING_TYPES = [
  "OAC Meeting",
  "Subcontractor Meeting",
  "Internal Meeting",
  "Safety Meeting",
  "Design Review",
  "Progress Meeting",
  "Kickoff Meeting",
  "Other",
] as const;

const meetingTypeOptions = MEETING_TYPES.map((type) => ({
  value: type,
  label: type,
}));

const meetingScheduleSchema = z.object({
  title: z.string().trim().min(1, "Meeting title is required"),
  scheduledAt: z.string().trim().min(1, "Date and time is required"),
  durationMinutes: z
    .string()
    .trim()
    .min(1, "Duration is required")
    .refine(value => !Number.isNaN(Number(value)), "Duration must be a number")
    .refine(value => Number(value) >= 1, "Duration must be at least 1 minute")
    .refine(value => Number(value) <= 1440, "Duration cannot exceed 1440 minutes"),
  category: z.string().trim().optional(),
  participants: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

type MeetingScheduleValues = z.infer<typeof meetingScheduleSchema>;

export default function ScheduleMeetingPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const createMeeting = useCreateMeeting(projectId);

  const form = useForm<MeetingScheduleValues>({
    resolver: zodResolver(meetingScheduleSchema),
    defaultValues: {
      title: "",
      scheduledAt: "",
      durationMinutes: "60",
      category: "",
      participants: "",
      description: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await createMeeting.mutateAsync({
        title: values.title.trim(),
        date: values.scheduledAt,
        duration_minutes: Number(values.durationMinutes),
        category: values.category || null,
        participants: values.participants || null,
        description: values.description || null,
        status: "scheduled",
      });

      router.push(`/${projectId}/meetings/${result.data.id}/prep`);
    } catch (error) {
      form.setError("root", {
        type: "server",
        message:
          error instanceof Error ? error.message : "Failed to schedule meeting",
      });
    }
  });

  return (
    <PageShell
      variant="form"
      title="Schedule Meeting"
      description="Schedule a future meeting and generate AI-powered meeting prep."
      onBack={() => router.push(`/${projectId}/meetings`)}
      backLabel="Back to Meetings"
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-8">
          <FormSection
            title="Meeting Details"
            description="Define timing, participants, and the context needed to prepare the agenda."
          >
            <FormGrid columns={2}>
              <div className="md:col-span-2">
                <RHFTextField
                  control={form.control}
                  name="title"
                  label="Meeting Title *"
                  placeholder="e.g., Weekly OAC Meeting"
                />
              </div>

              <RHFTextField
                control={form.control}
                name="scheduledAt"
                label="Date & Time *"
                type="datetime-local"
              />

              <RHFNumberField
                control={form.control}
                name="durationMinutes"
                label="Duration (minutes)"
                placeholder="60"
                min={1}
                step={15}
                description="Use the planned meeting length."
              />

              <RHFSelectField
                control={form.control}
                name="category"
                label="Meeting Type"
                placeholder="Select type"
                options={meetingTypeOptions}
              />

              <RHFTextField
                control={form.control}
                name="participants"
                label="Attendees"
                placeholder="Comma-separated names"
                description="List expected attendees separated by commas."
              />
            </FormGrid>

            <RHFTextareaField
              control={form.control}
              name="description"
              label="Purpose / Notes"
              placeholder="What is this meeting about?"
              rows={4}
            />
          </FormSection>

          <FormServerError message={form.formState.errors.root?.message} />

          <FormActions
            submitLabel="Schedule & Prep"
            onCancel={() => router.push(`/${projectId}/meetings`)}
            isSubmitting={createMeeting.isPending}
          />
        </form>
      </Form>
    </PageShell>
  );
}
