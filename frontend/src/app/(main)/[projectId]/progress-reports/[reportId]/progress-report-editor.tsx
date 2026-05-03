"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Mail, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { Markdown } from "@/components/misc/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import {
  useProgressReport,
  useUpdateProgressReport,
} from "@/hooks/use-progress-reports";
import { formatProgressReportDate } from "@/lib/progress-reports/date-format";
import type {
  ProgressReportContact,
  ProgressReportPhotoRecord,
  ProgressReportStatus,
} from "@/lib/progress-reports/types";

interface EditorState {
  title: string;
  status: ProgressReportStatus;
  week_start: string;
  week_end: string;
  construction_start_date: string | null;
  scheduled_completion_date: string | null;
  past_week_highlights: string;
  upcoming_week_activities: string;
  open_items: string;
  weather_days_lost: number;
  contacts: ProgressReportContact[];
  client_recipients: string[];
  selectedPhotos: Array<{
    project_photo_id: number;
    caption: string | null;
  }>;
}

function statusVariant(status: ProgressReportStatus) {
  switch (status) {
    case "sent":
      return "default";
    case "ready":
      return "secondary";
    default:
      return "outline";
  }
}

function normalizeReportMarkdown(value: string): string {
  return value
    .split("\n")
    .map((line) =>
      line
        .trimEnd()
        .replace(/^[-*]\s+#{1,6}\s+/, "- ")
        .replace(/#{1,6}\s+/g, "")
        .replace(/\*{1,2}([^*\n]+?)\*{1,2}/g, "**$1**"),
    )
    .join("\n");
}

function ReportMarkdownSection({
  title,
  value,
  empty,
}: {
  title: string;
  value: string;
  empty: string;
}) {
  const content = normalizeReportMarkdown(value).trim();

  return (
    <section className="space-y-3">
      <SectionRuleHeading label={title} className="mb-2" />
      {content ? (
        <Markdown
          className="text-sm leading-6 text-foreground [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-3 [&_p]:leading-6 last:[&_p]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground"
        >
          {content}
        </Markdown>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function ContactList({ contacts }: { contacts: ProgressReportContact[] }) {
  if (contacts.length === 0) {
    return <p className="text-sm text-muted-foreground">No contacts added yet.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {contacts.map((contact, index) => (
        <div key={`${contact.email}-${index}`} className="min-w-0 border-t border-border pt-3">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {contact.role || "Project Team"}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {contact.name || "Unnamed contact"}
          </div>
          {contact.email ? (
            <div className="mt-1 break-words text-sm text-muted-foreground">{contact.email}</div>
          ) : null}
          {contact.phone ? (
            <div className="text-sm text-muted-foreground">{contact.phone}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ProgressReportEditor({
  projectId,
  reportId,
}: {
  projectId: number;
  reportId: string;
}) {
  const reportQuery = useProgressReport(projectId, reportId);
  const updateMutation = useUpdateProgressReport(projectId, reportId);
  const [draft, setDraft] = useState<EditorState | null>(null);
  const [emailRecipientsInput, setEmailRecipientsInput] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!reportQuery.data) return;
    const { report, selectedPhotos } = reportQuery.data;
    setDraft({
      title: report.title,
      status: report.status,
      week_start: report.week_start,
      week_end: report.week_end,
      construction_start_date: report.construction_start_date,
      scheduled_completion_date: report.scheduled_completion_date,
      past_week_highlights: report.past_week_highlights,
      upcoming_week_activities: report.upcoming_week_activities,
      open_items: report.open_items,
      weather_days_lost: report.weather_days_lost,
      contacts: report.contacts.length > 0 ? report.contacts : [],
      client_recipients: report.client_recipients,
      selectedPhotos: selectedPhotos.map((photo) => ({
        project_photo_id: photo.project_photo_id,
        caption: photo.caption,
      })),
    });
    setEmailRecipientsInput(report.client_recipients.join(", "));
  }, [reportQuery.data]);

  const selectedPhotoIds = useMemo(
    () => new Set(draft?.selectedPhotos.map((photo) => photo.project_photo_id) ?? []),
    [draft?.selectedPhotos],
  );

  function updateField<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateContact(index: number, key: keyof ProgressReportContact, value: string) {
    setDraft((current) => {
      if (!current) return current;
      const contacts = current.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [key]: value } : contact,
      );
      return { ...current, contacts };
    });
  }

  function removeContact(index: number) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        contacts: current.contacts.filter((_, contactIndex) => contactIndex !== index),
      };
    });
  }

  function addContact() {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        contacts: [
          ...current.contacts,
          { role: "", name: "", email: "", phone: "" },
        ],
      };
    });
  }

  function togglePhoto(photo: ProgressReportPhotoRecord) {
    setDraft((current) => {
      if (!current) return current;

      if (current.selectedPhotos.some((entry) => entry.project_photo_id === photo.id)) {
        return {
          ...current,
          selectedPhotos: current.selectedPhotos.filter(
            (entry) => entry.project_photo_id !== photo.id,
          ),
        };
      }

      return {
        ...current,
        selectedPhotos: [
          ...current.selectedPhotos,
          { project_photo_id: photo.id, caption: photo.title },
        ],
      };
    });
  }

  function updatePhotoCaption(projectPhotoId: number, caption: string) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        selectedPhotos: current.selectedPhotos.map((photo) =>
          photo.project_photo_id === projectPhotoId
            ? { ...photo, caption }
            : photo,
        ),
      };
    });
  }

  async function handleSave(nextStatus?: ProgressReportStatus) {
    if (!draft) return;

    const recipients = emailRecipientsInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    await updateMutation.mutateAsync({
      ...draft,
      status: nextStatus ?? draft.status,
      client_recipients: recipients,
      selected_photos: draft.selectedPhotos.map((photo, index) => ({
        project_photo_id: photo.project_photo_id,
        caption: photo.caption,
        sort_order: index,
      })),
    });

    if (!nextStatus) {
      toast.success("Progress report saved");
      setIsEditing(false);
    }
  }

  async function handleSendEmail() {
    if (!draft) return;
    const recipients = emailRecipientsInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      toast.error("Add at least one recipient before sending");
      return;
    }

    setIsSending(true);
    try {
      await handleSave("sent");

      await apiFetch(`/api/projects/${projectId}/progress-reports/${reportId}/email`, {
        method: "POST",
        body: JSON.stringify({
          recipients,
          note: emailNote.trim() || null,
        }),
      });

      toast.success("Progress report emailed");
      reportQuery.refetch();
    } catch (error) {
      toast.error(
        "Could not email progress report",
        { description: error instanceof Error ? error.message : String(error) },
      );
    } finally {
      setIsSending(false);
    }
  }

  if (reportQuery.isLoading || !draft || !reportQuery.data) {
    return (
      <div className="space-y-6 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading progress report…
        </div>
      </div>
    );
  }

  const report = reportQuery.data.report;
  const detail = reportQuery.data;
  const selectedPhotos = detail.selectedPhotos.filter((photo) =>
    selectedPhotoIds.has(photo.project_photo_id),
  );

  if (!isEditing) {
    return (
      <div className="space-y-10">
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <SectionRuleHeading label={draft.title} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              Week of {formatProgressReportDate(draft.week_start)} to{" "}
              {formatProgressReportDate(draft.week_end)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(draft.status)}>{draft.status}</Badge>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <a href={`/api/projects/${projectId}/progress-reports/${reportId}/pdf`} className="inline-flex">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </a>
          </div>
        </section>

        <section className="grid gap-4 border-y border-border py-5 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Construction Start Date
            </div>
            <div className="mt-1 text-sm font-medium text-foreground">
              {formatProgressReportDate(draft.construction_start_date)}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Scheduled Completion
            </div>
            <div className="mt-1 text-sm font-medium text-foreground">
              {formatProgressReportDate(draft.scheduled_completion_date)}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Project Team Contacts
            </div>
            <ContactList contacts={draft.contacts.slice(0, 6)} />
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-10">
          <ReportMarkdownSection
            title="1. Past Week's Highlights"
            value={draft.past_week_highlights}
            empty="No past week highlights added yet."
          />
          <ReportMarkdownSection
            title="2. Upcoming Week's Activities"
            value={draft.upcoming_week_activities}
            empty="No upcoming activities added yet."
          />
          <ReportMarkdownSection
            title="3. Open Items"
            value={draft.open_items}
            empty="No open items added yet."
          />

          <section className="space-y-3">
            <SectionRuleHeading label="4. Days Lost Due to Weather This Week" className="mb-2" />
            <p className="text-sm font-medium text-foreground">
              {draft.weather_days_lost} day{draft.weather_days_lost === 1 ? "" : "s"}
            </p>
          </section>

          <section className="space-y-3">
            <SectionRuleHeading label="5. Progress Mark-up / Photos" className="mb-2" />
            {selectedPhotos.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {selectedPhotos.map((selection) => (
                  <figure key={selection.id} className="space-y-2">
                    <div className="aspect-[4/3] overflow-hidden rounded-md bg-muted">
                      <img
                        src={selection.photo.file_url}
                        alt={selection.photo.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <figcaption className="text-sm">
                      <div className="font-medium text-foreground">
                        {selection.caption || selection.photo.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatProgressReportDate(selection.photo.date_taken ?? selection.photo.created_at)}
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No progress photos selected yet.</p>
            )}
          </section>

          <section className="space-y-3">
            <SectionRuleHeading label="Project Contacts" className="mb-2" />
            <ContactList contacts={draft.contacts} />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <SectionRuleHeading label={draft.title} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              Week of {formatProgressReportDate(draft.week_start)} to{" "}
              {formatProgressReportDate(draft.week_end)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(draft.status)}>{draft.status}</Badge>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() => {
                const { report: currentReport, selectedPhotos: currentSelectedPhotos } = detail;
                setDraft({
                  title: currentReport.title,
                  status: currentReport.status,
                  week_start: currentReport.week_start,
                  week_end: currentReport.week_end,
                  construction_start_date: currentReport.construction_start_date,
                  scheduled_completion_date: currentReport.scheduled_completion_date,
                  past_week_highlights: currentReport.past_week_highlights,
                  upcoming_week_activities: currentReport.upcoming_week_activities,
                  open_items: currentReport.open_items,
                  weather_days_lost: currentReport.weather_days_lost,
                  contacts: currentReport.contacts.length > 0 ? currentReport.contacts : [],
                  client_recipients: currentReport.client_recipients,
                  selectedPhotos: currentSelectedPhotos.map((photo) => ({
                    project_photo_id: photo.project_photo_id,
                    caption: photo.caption,
                  })),
                });
                setEmailRecipientsInput(currentReport.client_recipients.join(", "));
                setIsEditing(false);
              }}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <a href={`/api/projects/${projectId}/progress-reports/${reportId}/pdf`} className="inline-flex">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </a>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => void handleSave()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="report-title">Report title</Label>
            <Input
              id="report-title"
              value={draft.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="week-start">Week start</Label>
            <Input
              id="week-start"
              type="date"
              value={draft.week_start}
              onChange={(event) => updateField("week_start", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="week-end">Week end</Label>
            <Input
              id="week-end"
              type="date"
              value={draft.week_end}
              onChange={(event) => updateField("week_end", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={draft.status}
              onValueChange={(value) => updateField("status", value as ProgressReportStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="construction-start">Construction start</Label>
            <Input
              id="construction-start"
              type="date"
              value={draft.construction_start_date ?? ""}
              onChange={(event) =>
                updateField("construction_start_date", event.target.value || null)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduled-completion">Scheduled completion</Label>
            <Input
              id="scheduled-completion"
              type="date"
              value={draft.scheduled_completion_date ?? ""}
              onChange={(event) =>
                updateField("scheduled_completion_date", event.target.value || null)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weather-days">Weather days lost</Label>
            <Input
              id="weather-days"
              type="number"
              min={0}
              value={draft.weather_days_lost}
              onChange={(event) =>
                updateField("weather_days_lost", Number.parseInt(event.target.value || "0", 10))
              }
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <div className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="highlights">Past week&apos;s highlights</Label>
              <Textarea
                id="highlights"
                rows={8}
                value={draft.past_week_highlights}
                onChange={(event) => updateField("past_week_highlights", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upcoming">Upcoming week&apos;s activities</Label>
              <Textarea
                id="upcoming"
                rows={8}
                value={draft.upcoming_week_activities}
                onChange={(event) => updateField("upcoming_week_activities", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="open-items">Open items</Label>
              <Textarea
                id="open-items"
                rows={7}
                value={draft.open_items}
                onChange={(event) => updateField("open_items", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div>
                <SectionRuleHeading label="Client delivery" className="mb-2" />
                <p className="text-sm text-muted-foreground">
                  Save recipient defaults here, then email the generated PDF directly from the report.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-recipients">Recipients</Label>
                <Input
                  id="client-recipients"
                  placeholder="client@example.com, pm@example.com"
                  value={emailRecipientsInput}
                  onChange={(event) => setEmailRecipientsInput(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-note">Optional note</Label>
                <Textarea
                  id="email-note"
                  rows={4}
                  value={emailNote}
                  onChange={(event) => setEmailNote(event.target.value)}
                />
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => void handleSendEmail()}
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Email PDF
              </Button>
            </div>

            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <SectionRuleHeading label="Project contacts" className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    These show in the report footer.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-2" onClick={addContact}>
                  <Plus className="h-4 w-4" />
                  Add contact
                </Button>
              </div>

              {draft.contacts.length > 0 ? (
                <div className="space-y-3">
                  {draft.contacts.map((contact, index) => (
                    <div key={`${contact.email}-${index}`} className="grid gap-3 rounded-lg border border-border p-3">
                      <div className="flex justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => removeContact(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Role"
                        value={contact.role}
                        onChange={(event) => updateContact(index, "role", event.target.value)}
                      />
                      <Input
                        placeholder="Name"
                        value={contact.name}
                        onChange={(event) => updateContact(index, "name", event.target.value)}
                      />
                      <Input
                        placeholder="Email"
                        value={contact.email}
                        onChange={(event) => updateContact(index, "email", event.target.value)}
                      />
                      <Input
                        placeholder="Phone"
                        value={contact.phone}
                        onChange={(event) => updateContact(index, "phone", event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No contacts added yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <SectionRuleHeading label="Photos" className="mb-2" />
            <p className="text-sm text-muted-foreground">
              Choose which uploaded project photos appear in the PDF. Selected photos stay editable and can be captioned.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {detail.availablePhotos.map((photo) => {
              const selected = selectedPhotoIds.has(photo.id);
              const selectedEntry = draft.selectedPhotos.find(
                (entry) => entry.project_photo_id === photo.id,
              );

              return (
                <div
                  key={photo.id}
                  className={`rounded-xl border p-3 transition-colors ${selected ? "border-foreground/30" : "border-border"}`}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto w-full justify-start p-0 text-left hover:bg-transparent"
                    onClick={() => togglePhoto(photo)}
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                      <img
                        src={photo.file_url}
                        alt={photo.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">{photo.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatProgressReportDate(photo.date_taken ?? photo.created_at)}
                        </div>
                      </div>
                      <Badge variant={selected ? "default" : "outline"}>
                        {selected ? "Selected" : "Available"}
                      </Badge>
                    </div>
                  </Button>

                  {selected && selectedEntry ? (
                    <div className="mt-3 space-y-2">
                      <Label htmlFor={`photo-caption-${photo.id}`}>Caption</Label>
                      <Input
                        id={`photo-caption-${photo.id}`}
                        value={selectedEntry.caption ?? ""}
                        onChange={(event) =>
                          updatePhotoCaption(photo.id, event.target.value)
                        }
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <SectionRuleHeading label="Meeting sources" className="mb-2" />
            <ul className="mt-3 space-y-3 text-sm">
              {report?.source_snapshot.meetings.length ? (
                report.source_snapshot.meetings.map((meeting) => (
                  <li key={meeting.id}>
                    <div className="font-medium text-foreground">{meeting.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatProgressReportDate(meeting.date, "MMM d, yyyy", "No date")}
                    </div>
                    {meeting.summary ? (
                      <div className="mt-1 text-muted-foreground">{meeting.summary}</div>
                    ) : null}
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No meeting sources were captured for this draft.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-border p-4">
            <SectionRuleHeading label="Email sources" className="mb-2" />
            <ul className="mt-3 space-y-3 text-sm">
              {report?.source_snapshot.emails.length ? (
                report.source_snapshot.emails.map((email) => (
                  <li key={email.id}>
                    <div className="font-medium text-foreground">{email.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatProgressReportDate(email.date, "MMM d, yyyy", "No date")}
                    </div>
                    {email.preview ? (
                      <div className="mt-1 text-muted-foreground">{email.preview}</div>
                    ) : null}
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No email sources were captured for this draft.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-border p-4">
            <SectionRuleHeading label="Draft provenance" className="mb-2" />
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <div>
                Generated:{" "}
                {report?.source_snapshot.generatedAt
                  ? formatProgressReportDate(report.source_snapshot.generatedAt, "MMM d, yyyy h:mm a")
                  : "Unknown"}
              </div>
              <div>Strategy: {report?.source_snapshot.strategy ?? "Unknown"}</div>
              <div>
                Photos available in draft snapshot: {report?.source_snapshot.photos.length ?? 0}
              </div>
            </div>
          </div>
        </section>
    </div>
  );
}
