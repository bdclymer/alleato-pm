"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Copy,
  Download,
  MoreVertical,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  ContentSectionStack,
  DetailLayout,
  DetailPanel,
  PageShell,
  PageTabs,
  SectionAction,
  SectionRuleHeading,
} from "@/components/layout";
import {
  ConfirmDeleteDialog,
  DetailField,
  DetailFieldGrid,
  EditableDetailField,
  EmptyState,
  EntityAttachments,
  StatusBadge,
} from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ds/error-state";
import { formatDate } from "@/lib/format";
import { usePeople } from "@/hooks/use-people";
import {
  useConvertMeeting,
  useCreateFollowUpMeeting,
  useDeleteMeeting,
  useMeetingDetail,
  useSetAttendeeAttendance,
  useUpdateMeeting,
} from "@/hooks/use-meetings";
import { apiFetch, apiFetchBlob } from "@/lib/api-client";
import { AgendaSection } from "@/components/domain/meetings/agenda-section";
import { MeetingSummaryPane } from "@/components/domain/meetings/meeting-summary-pane";
import { MeetingTranscriptPane } from "@/components/domain/meetings/meeting-transcript-pane";
import {
  meetingStatusLabel,
  meetingStatusVariant,
} from "@/features/meetings/meeting-series-table-config";

type DetailTab = "details" | "transcript";

const TIMEZONE_OPTIONS = [
  { value: "America/Indiana/Indianapolis", label: "Eastern (Indianapolis)" },
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Los_Angeles", label: "Pacific" },
];

export default function MeetingDetailPage() {
  const params = useParams()! ?? {};
  const router = useRouter();
  const projectId = params.projectId as string;
  const meetingId = params.meetingId as string;

  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addAttendeeId, setAddAttendeeId] = useState<string>("");

  const { data: detail, isLoading, isError, error, refetch } = useMeetingDetail(
    projectId,
    meetingId,
  );
  const updateMeeting = useUpdateMeeting(projectId);
  const convertMeeting = useConvertMeeting(projectId);
  const deleteMeeting = useDeleteMeeting(projectId);
  const createFollowUp = useCreateFollowUpMeeting(projectId);
  const setAttendeeAttendance = useSetAttendeeAttendance(projectId, meetingId);
  const { people } = usePeople();

  const attendeePersonIds = useMemo(
    () => new Set((detail?.attendees ?? []).map((a) => a.person_id)),
    [detail?.attendees],
  );
  const addableAttendees = useMemo(
    () => people.filter((p) => !attendeePersonIds.has(p.id)),
    [people, attendeePersonIds],
  );

  const handleSaveField = async (
    field: string,
    value: string | number | boolean | null,
  ) => {
    await updateMeeting.mutateAsync({ meetingId, data: { [field]: value } as never });
  };

  const handleConvert = () => {
    if (!detail) return;
    const nextMode = detail.meeting.mode === "minutes" ? "agenda" : "minutes";
    convertMeeting.mutate({ meetingId, mode: nextMode });
  };

  const handleCreateFollowUp = () => {
    createFollowUp.mutate(
      { meetingId, carry_open_items: true },
      {
        onSuccess: (created) => {
          router.push(`/${projectId}/meetings/${created.meeting.id}`);
        },
      },
    );
  };

  const handleDelete = async () => {
    await deleteMeeting.mutateAsync(meetingId);
    setDeleteDialogOpen(false);
    router.push(`/${projectId}/meetings`);
  };

  const handleAddAttendee = async () => {
    if (!addAttendeeId || !detail) return;
    const nextIds = [...attendeePersonIds, addAttendeeId];
    await apiFetch(`/api/projects/${projectId}/meetings/${meetingId}`, {
      method: "PATCH",
      body: JSON.stringify({ attendee_person_ids: nextIds }),
    });
    setAddAttendeeId("");
    refetch();
  };

  const handleRemoveAttendee = async (personId: string) => {
    if (!detail) return;
    const nextIds = [...attendeePersonIds].filter((id) => id !== personId);
    await apiFetch(`/api/projects/${projectId}/meetings/${meetingId}`, {
      method: "PATCH",
      body: JSON.stringify({ attendee_person_ids: nextIds }),
    });
    refetch();
  };

  const handleExportPdf = async () => {
    if (!detail) return;
    try {
      toast.loading("Generating PDF...", { id: "meeting-pdf-export" });
      const blob = await apiFetchBlob(`/api/projects/${projectId}/meetings/${meetingId}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-${detail.meeting.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded", { id: "meeting-pdf-export" });
    } catch {
      toast.error("Failed to generate PDF", { id: "meeting-pdf-export" });
    }
  };

  if (isLoading) {
    return (
      <PageShell variant="detail" title="Loading meeting…" onBack={() => router.push(`/${projectId}/meetings`)}>
        <Skeleton className="h-96" />
      </PageShell>
    );
  }

  if (isError || !detail) {
    return (
      <PageShell variant="detail" title="Meeting" onBack={() => router.push(`/${projectId}/meetings`)}>
        <ErrorState title="Couldn't load meeting" error={error} onRetry={() => refetch()} />
      </PageShell>
    );
  }

  const { meeting, attendees, categories } = detail;
  const isMinutesMode = meeting.mode === "minutes";
  const hasTranscript = Boolean(meeting.transcript_document_id);
  const totalItemCount = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <PageShell
      variant="detail"
      eyebrow={meeting.series_name ? `${meeting.series_name} #${meeting.number}` : `#${meeting.number}`}
      title={meeting.name}
      statusBadge={
        <StatusBadge
          status={meetingStatusLabel[meeting.status]}
          variant={meetingStatusVariant[meeting.status]}
        />
      }
      onBack={() => router.push(`/${projectId}/meetings`)}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4" />
            Export
          </Button>

          <Button variant={isMinutesMode ? "outline" : "default"} size="sm" onClick={handleConvert}>
            <ArrowRightLeft className="h-4 w-4" />
            {isMinutesMode ? "Revert to Agenda" : "Convert to Minutes"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCreateFollowUp} disabled={createFollowUp.isPending}>
                <Copy className="h-4 w-4" />
                Create Follow-Up Meeting
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <PageTabs
        variant="inline"
        tabs={[
          { label: "Meeting Details", href: "details", isActive: activeTab === "details" },
          ...(hasTranscript
            ? [{ label: "Transcript", href: "transcript", isActive: activeTab === "transcript" }]
            : []),
        ]}
        onTabClick={(href) => setActiveTab(href as DetailTab)}
      />

      <ContentSectionStack className="pt-3">
        {activeTab === "details" ? (
          <DetailLayout
            sidebar={
              <>
                <section>
                  <SectionRuleHeading
                    label="Attendees"
                    actions={
                      addableAttendees.length > 0 ? (
                        <Select value={addAttendeeId} onValueChange={setAddAttendeeId}>
                          <SelectTrigger className="h-7 w-auto border-none px-1 text-xs shadow-none">
                            <SelectValue placeholder={<UserPlus className="h-3.5 w-3.5" />} />
                          </SelectTrigger>
                          <SelectContent>
                            {addableAttendees.map((person) => (
                              <SelectItem key={person.id} value={person.id}>
                                {person.first_name} {person.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : undefined
                    }
                  />
                  {addAttendeeId ? (
                    <div className="mb-3 flex items-center gap-2">
                      <Button size="sm" onClick={handleAddAttendee}>
                        Add
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAddAttendeeId("")}>
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                  {attendees.length === 0 ? (
                    <EmptyState
                      icon={<Users />}
                      title="No attendees"
                      description="Add attendees to this meeting."
                    />
                  ) : (
                    <ul className="space-y-2">
                      {attendees.map((attendee) => (
                        <li
                          key={attendee.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {meeting.mode === "minutes" ? (
                              <Checkbox
                                checked={attendee.attended === true}
                                aria-label={`Mark ${attendee.person.first_name} ${attendee.person.last_name} attended`}
                                onCheckedChange={(checked) =>
                                  setAttendeeAttendance.mutate({
                                    personId: attendee.person_id,
                                    attended: checked === true,
                                  })
                                }
                              />
                            ) : null}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {attendee.person.first_name} {attendee.person.last_name}
                              </p>
                              {attendee.person.company_name ? (
                                <p className="truncate text-xs text-muted-foreground">
                                  {attendee.person.company_name}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label="Attendee actions">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleRemoveAttendee(attendee.person_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <SectionRuleHeading label="Attachments" />
                  <EntityAttachments
                    entityType="meeting"
                    entityId={meeting.id}
                    projectId={projectId}
                    showLabel={false}
                  />
                </section>

                <MeetingSummaryPane
                  projectId={projectId}
                  meetingId={meetingId}
                  hasTranscript={hasTranscript}
                />
              </>
            }
          >
            <DetailPanel>
              <SectionRuleHeading label="General Information" />
              <DetailFieldGrid columns={2}>
                <EditableDetailField
                  label="Meeting Name"
                  type="text"
                  value={meeting.name ?? ""}
                  onSave={(v) => handleSaveField("name", v)}
                  span={2}
                />
                <EditableDetailField
                  label="Date"
                  type="date"
                  value={meeting.meeting_date ?? ""}
                  display={meeting.meeting_date ? formatDate(meeting.meeting_date) : undefined}
                  emptyPlaceholder="Set date"
                  onSave={(v) => handleSaveField("meeting_date", v || null)}
                />
                <EditableDetailField
                  label="Timezone"
                  type="select"
                  value={meeting.timezone}
                  options={TIMEZONE_OPTIONS}
                  onSave={(v) => handleSaveField("timezone", v)}
                />
                <EditableDetailField
                  label="Start Time"
                  type="text"
                  value={meeting.start_time ?? ""}
                  emptyPlaceholder="Set start time"
                  onSave={(v) => handleSaveField("start_time", v || null)}
                />
                <EditableDetailField
                  label="End Time"
                  type="text"
                  value={meeting.end_time ?? ""}
                  emptyPlaceholder="Set end time"
                  onSave={(v) => handleSaveField("end_time", v || null)}
                />
                <EditableDetailField
                  label="Location"
                  type="text"
                  value={meeting.location ?? ""}
                  emptyPlaceholder="Add location"
                  onSave={(v) => handleSaveField("location", v || null)}
                />
                <EditableDetailField
                  label="Meeting Link"
                  type="text"
                  value={meeting.meeting_link ?? ""}
                  emptyPlaceholder="Add meeting link"
                  onSave={(v) => handleSaveField("meeting_link", v || null)}
                />
                <EditableDetailField
                  label="Private"
                  type="boolean"
                  value={String(meeting.is_private)}
                  onSave={(v) => handleSaveField("is_private", v === "true")}
                />
                <EditableDetailField
                  label="Draft"
                  type="boolean"
                  value={String(meeting.is_draft)}
                  onSave={(v) => handleSaveField("is_draft", v === "true")}
                />
                <EditableDetailField
                  label="Overview"
                  type="textarea"
                  value={meeting.overview ?? ""}
                  emptyPlaceholder="Add an overview"
                  onSave={(v) => handleSaveField("overview", v || null)}
                  span={2}
                />
                <DetailField label="Agenda Items">{String(totalItemCount)}</DetailField>
                <DetailField label="Created">{formatDate(meeting.created_at)}</DetailField>
              </DetailFieldGrid>
            </DetailPanel>

            <AgendaSection
              projectId={Number(projectId)}
              meetingId={meetingId}
              detail={detail}
              mode={meeting.mode as "agenda" | "minutes"}
            />
          </DetailLayout>
        ) : (
          <MeetingTranscriptPane
            transcriptDocumentId={meeting.transcript_document_id}
            meetingId={meetingId}
            meetingTitle={meeting.name}
            projectId={Number(projectId)}
          />
        )}
      </ContentSectionStack>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={meeting.name}
        onConfirm={handleDelete}
        isDeleting={deleteMeeting.isPending}
      />
    </PageShell>
  );
}
