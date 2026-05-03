"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Edit, ExternalLink, Loader2, Mail, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  ContentSectionStack,
  DetailPanel,
  SectionRuleHeading,
  SummaryValueRow,
} from "@/components/layout";
import { InfoAlert } from "@/components/ds/InfoAlert";
import { StatusBadge } from "@/components/ds/status-badge";
import { Markdown } from "@/components/misc/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import {
  useProgressReport,
  useUpdateProgressReport,
} from "@/hooks/use-progress-reports";
import { useProjectTitle } from "@/hooks/useProjectTitle";
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

interface AiGeneratedSections {
  past_week_highlights: string;
  upcoming_week_activities: string;
  open_items: string;
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

function PhotoGrid({
  photos,
  selectedPhotoIds,
  selectedPhotos,
  onToggle,
  onCaption,
}: {
  photos: ProgressReportPhotoRecord[];
  selectedPhotoIds: Set<number>;
  selectedPhotos: Array<{ project_photo_id: number; caption: string | null }>;
  onToggle: (photo: ProgressReportPhotoRecord) => void;
  onCaption: (photoId: number, caption: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {photos.map((photo) => {
        const selected = selectedPhotoIds.has(photo.id);
        const selectedEntry = selectedPhotos.find((e) => e.project_photo_id === photo.id);
        return (
          <div
            key={photo.id}
            className={`rounded-xl p-3 transition-colors ${selected ? "bg-primary/5 ring-1 ring-primary/30" : "bg-muted/30"}`}
          >
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start p-0 text-left hover:bg-transparent"
              onClick={() => onToggle(photo)}
            >
              <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                <img
                  src={photo.file_url}
                  alt={photo.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{photo.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatProgressReportDate(photo.date_taken ?? photo.created_at)}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {selected ? "In report" : "Add"}
                </span>
              </div>
            </Button>
            {selected && selectedEntry !== undefined ? (
              <div className="mt-3 space-y-1.5">
                <Label htmlFor={`photo-caption-${photo.id}`} className="text-xs">Caption</Label>
                <Input
                  id={`photo-caption-${photo.id}`}
                  value={selectedEntry.caption ?? ""}
                  onChange={(event) => onCaption(photo.id, event.target.value)}
                  placeholder="Add a caption…"
                />
              </div>
            ) : null}
          </div>
        );
      })}
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
  const [isGenerating, setIsGenerating] = useState(false);

  useProjectTitle(draft?.title ?? "Progress Report");

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

  const availablePhotos = reportQuery.data?.availablePhotos;

  const weekPhotos = useMemo(() => {
    if (!draft || !availablePhotos) return [];
    return availablePhotos.filter((photo) => {
      const dateStr = photo.date_taken ?? photo.created_at;
      if (!dateStr) return false;
      const d = dateStr.slice(0, 10);
      return d >= draft.week_start && d <= draft.week_end;
    });
  }, [availablePhotos, draft?.week_start, draft?.week_end]);

  const unselectedWeekPhotos = useMemo(
    () => weekPhotos.filter((photo) => !selectedPhotoIds.has(photo.id)),
    [weekPhotos, selectedPhotoIds],
  );

  const otherPhotos = useMemo(() => {
    if (!availablePhotos) return [];
    const weekIds = new Set(weekPhotos.map((p) => p.id));
    return availablePhotos.filter((photo) => !weekIds.has(photo.id));
  }, [availablePhotos, weekPhotos]);

  function addAllWeekPhotos() {
    setDraft((current) => {
      if (!current) return current;
      const toAdd = weekPhotos.filter(
        (photo) => !current.selectedPhotos.some((s) => s.project_photo_id === photo.id),
      );
      if (toAdd.length === 0) return current;
      return {
        ...current,
        selectedPhotos: [
          ...current.selectedPhotos,
          ...toAdd.map((photo) => ({ project_photo_id: photo.id, caption: photo.title })),
        ],
      };
    });
  }

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

  async function handleAiGenerate() {
    if (!draft) return;
    setIsGenerating(true);
    try {
      const result = await apiFetch<AiGeneratedSections>(
        `/api/projects/${projectId}/progress-reports/${reportId}/ai-generate`,
        { method: "POST" },
      );
      if (result) {
        setDraft((current) =>
          current
            ? {
                ...current,
                past_week_highlights: result.past_week_highlights,
                upcoming_week_activities: result.upcoming_week_activities,
                open_items: result.open_items,
              }
            : current,
        );
        toast.success("AI draft generated — review and save when ready");
      }
    } catch (error) {
      toast.error("AI generation failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsGenerating(false);
    }
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

  // ── Loading ──
  if (reportQuery.isLoading || !draft || !reportQuery.data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const report = reportQuery.data.report;
  const detail = reportQuery.data;
  const selectedPhotos = detail.selectedPhotos.filter((photo) =>
    selectedPhotoIds.has(photo.project_photo_id),
  );

  const weekRange = `${formatProgressReportDate(draft.week_start)} – ${formatProgressReportDate(draft.week_end)}`;

  // ── Edit mode ──
  if (isEditing) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{draft.title}</p>
            <p className="text-xs text-muted-foreground">{weekRange}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleAiGenerate()}
              disabled={isGenerating || updateMutation.isPending}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? "Generating…" : "AI Generate"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
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
            <Button
              size="sm"
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
        </div>

        <div className="space-y-10">
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
              <div className="space-y-4 rounded-xl bg-muted/40 px-5 py-4">
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
                {draft.status === "draft" && (
                  <InfoAlert variant="warning">
                    Set the report status to <strong>Ready</strong> before emailing. Draft reports cannot be sent to clients.
                  </InfoAlert>
                )}
                <Button
                  className="w-full gap-2"
                  onClick={() => void handleSendEmail()}
                  disabled={isSending || draft.status === "draft"}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Email PDF
                </Button>
              </div>

              <div className="space-y-4 rounded-xl bg-muted/40 px-5 py-4">
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
                      <div key={`${contact.email}-${index}`} className="grid gap-3 rounded-lg bg-background px-3 py-3">
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <SectionRuleHeading label="Photos" className="mb-2" />
                <p className="text-sm text-muted-foreground">
                  Choose which project photos appear in the PDF. Click to add or remove; edit captions on selected photos.
                </p>
              </div>
              {unselectedWeekPhotos.length > 0 && (
                <Button size="sm" variant="outline" className="gap-2 shrink-0" onClick={addAllWeekPhotos}>
                  <Plus className="h-4 w-4" />
                  Add all from this week ({unselectedWeekPhotos.length})
                </Button>
              )}
            </div>

            {(availablePhotos ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos uploaded for this project yet.</p>
            ) : (
              <div className="space-y-6">
                {weekPhotos.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      This week — {formatProgressReportDate(draft.week_start)} to {formatProgressReportDate(draft.week_end)} ({weekPhotos.length})
                    </div>
                    <PhotoGrid
                      photos={weekPhotos}
                      selectedPhotoIds={selectedPhotoIds}
                      selectedPhotos={draft.selectedPhotos}
                      onToggle={togglePhoto}
                      onCaption={updatePhotoCaption}
                    />
                  </div>
                )}
                {otherPhotos.length > 0 && (
                  <div className="space-y-3">
                    {weekPhotos.length > 0 && (
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Other recent photos ({otherPhotos.length})
                      </div>
                    )}
                    <PhotoGrid
                      photos={otherPhotos}
                      selectedPhotoIds={selectedPhotoIds}
                      selectedPhotos={draft.selectedPhotos}
                      onToggle={togglePhoto}
                      onCaption={updatePhotoCaption}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <SectionRuleHeading label="Sources used to generate this draft" className="mb-3" />
            <p className="text-sm text-muted-foreground">
              These records were used to populate the report. Click any link to verify the source.
            </p>
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-xl bg-muted/30 px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meetings</span>
                  <Link
                    href={`/${projectId}/meetings`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    target="_blank"
                  >
                    View all
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {report?.source_snapshot.meetings.length ? (
                  <ul className="space-y-3 text-sm">
                    {report.source_snapshot.meetings.map((meeting) => (
                      <li key={meeting.id}>
                        <Link
                          href={`/${projectId}/meetings/${meeting.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                          target="_blank"
                        >
                          {meeting.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {formatProgressReportDate(meeting.date, "MMM d, yyyy", "No date")}
                        </div>
                        {meeting.summary ? (
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{meeting.summary}</div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No meeting sources were captured for this draft.</p>
                )}
              </div>

              <div className="rounded-xl bg-muted/30 px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Emails</span>
                  <Link
                    href={`/${projectId}/emails`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    target="_blank"
                  >
                    View all
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {report?.source_snapshot.emails.length ? (
                  <ul className="space-y-3 text-sm">
                    {report.source_snapshot.emails.map((email) => (
                      <li key={email.id}>
                        <div className="font-medium text-foreground">{email.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatProgressReportDate(email.date, "MMM d, yyyy", "No date")}
                        </div>
                        {email.preview ? (
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{email.preview}</div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No email sources were captured for this draft.</p>
                )}
              </div>

              <div className="rounded-xl bg-muted/30 px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Photos</span>
                  <span className="text-xs text-muted-foreground">
                    {report?.source_snapshot.photos.length ?? 0} in snapshot
                  </span>
                </div>
                {report?.source_snapshot.photos.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {report.source_snapshot.photos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={photo.title}
                        className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
                      >
                        { }
                        <img
                          src={photo.file_url}
                          alt={photo.title}
                          className="h-full w-full object-cover transition-opacity group-hover:opacity-75"
                        />
                        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="truncate px-1.5 pb-1 text-[10px] text-primary-foreground">{photo.title}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No photos were captured for this draft.</p>
                )}
                {report?.source_snapshot.generatedAt && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Draft generated {formatProgressReportDate(report.source_snapshot.generatedAt, "MMM d, yyyy h:mm a")}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ── View mode ──
  return (
    <ContentSectionStack>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{draft.title}</p>
          <p className="text-xs text-muted-foreground">{weekRange}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={draft.status} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
          <a href={`/api/projects/${projectId}/progress-reports/${reportId}/pdf`} className="inline-flex">
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 h-4 w-4" />
              Download PDF
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="space-y-0">
          <DetailPanel className="space-y-8">
            <ReportMarkdownSection
              title="Past Week's Highlights"
              value={draft.past_week_highlights}
              empty="No past week highlights added yet."
            />
            <ReportMarkdownSection
              title="Upcoming Week's Activities"
              value={draft.upcoming_week_activities}
              empty="No upcoming activities added yet."
            />
            <ReportMarkdownSection
              title="Open Items"
              value={draft.open_items}
              empty="No open items added yet."
            />
            <section className="space-y-3">
              <SectionRuleHeading label="Days Lost Due to Weather" className="mb-2" />
              <p className="text-sm font-medium text-foreground">
                {draft.weather_days_lost} day{draft.weather_days_lost === 1 ? "" : "s"}
              </p>
            </section>

            {(selectedPhotos.length > 0 || unselectedWeekPhotos.length > 0) && (
              <section className="space-y-3">
                <SectionRuleHeading label="Progress Photos" className="mb-2" />
                {selectedPhotos.length > 0 && (
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
                )}
                {unselectedWeekPhotos.length > 0 && (
                  <InfoAlert variant="info">
                    <span className="flex items-center justify-between gap-3">
                      <span>{unselectedWeekPhotos.length} photo{unselectedWeekPhotos.length === 1 ? "" : "s"} from this week not yet included in the report.</span>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>Add Photos</Button>
                    </span>
                  </InfoAlert>
                )}
              </section>
            )}

            {draft.contacts.length > 0 && (
              <section className="space-y-3">
                <SectionRuleHeading label="Project Contacts" className="mb-2" />
                <ContactList contacts={draft.contacts} />
              </section>
            )}
          </DetailPanel>
        </div>

        <aside className="space-y-6">
          <DetailPanel>
            <SectionRuleHeading label="Details" className="mb-6 pb-0" />
            <dl className="space-y-3 text-sm">
              <SummaryValueRow
                label="Construction Start"
                value={formatProgressReportDate(draft.construction_start_date) || "—"}
              />
              <SummaryValueRow
                label="Scheduled Substantial Completion Date"
                value={formatProgressReportDate(draft.scheduled_completion_date) || "—"}
              />
              <SummaryValueRow
                label="Week End"
                value={formatProgressReportDate(draft.week_end)}
              />
              <SummaryValueRow
                label="Week Start"
                value={formatProgressReportDate(draft.week_start)}
              />
              <SummaryValueRow
                label="Days Lost due to Weather"
                value={String(draft.weather_days_lost)}
              />
            </dl>
          </DetailPanel>
        </aside>
      </div>
    </ContentSectionStack>
  );
}
