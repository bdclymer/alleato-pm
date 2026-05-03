import { createServiceClient } from "@/lib/supabase/service";
import {
  buildProgressReportDraft,
  defaultWeeklyReportRange,
} from "@/lib/progress-reports/report-builder";
import type {
  ProgressReportContact,
  ProgressReportDetailResponse,
  ProgressReportListItem,
  ProgressReportRecord,
  ProgressReportSourceSnapshot,
  ProgressReportPhotoRecord,
  ProgressReportPhotoSelection,
} from "@/lib/progress-reports/types";

interface ProgressReportRow {
  id: string;
  project_id: number;
  title: string;
  report_type: "weekly";
  status: "draft" | "ready" | "sent";
  week_start: string;
  week_end: string;
  construction_start_date: string | null;
  scheduled_completion_date: string | null;
  past_week_highlights: string;
  upcoming_week_activities: string;
  open_items: string;
  weather_days_lost: number;
  contacts: unknown;
  client_recipients: string[] | null;
  source_snapshot: unknown;
  sent_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ProgressReportPhotoLinkRow {
  id: string;
  progress_report_id: string;
  project_id: number;
  project_photo_id: number;
  sort_order: number;
  caption: string | null;
  created_at: string | null;
}

interface ProjectPhotoRow {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  date_taken: string | null;
  created_at: string | null;
  location: string | null;
  tags: string[] | null;
}

function parseContacts(value: unknown): ProgressReportContact[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      return {
        role: typeof entry.role === "string" ? entry.role : "",
        name: typeof entry.name === "string" ? entry.name : "",
        email: typeof entry.email === "string" ? entry.email : "",
        phone: typeof entry.phone === "string" ? entry.phone : "",
      };
    })
    .filter((item): item is ProgressReportContact => item !== null);
}

function parseSourceSnapshot(value: unknown): ProgressReportSourceSnapshot {
  if (!value || typeof value !== "object") {
    return {
      generatedAt: new Date().toISOString(),
      strategy: "unknown",
      meetings: [],
      emails: [],
      photos: [],
    };
  }

  const snapshot = value as Record<string, unknown>;
  return {
    generatedAt:
      typeof snapshot.generatedAt === "string"
        ? snapshot.generatedAt
        : new Date().toISOString(),
    strategy:
      typeof snapshot.strategy === "string" ? snapshot.strategy : "unknown",
    meetings: Array.isArray(snapshot.meetings)
      ? snapshot.meetings
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const entry = item as Record<string, unknown>;
            return {
              id: typeof entry.id === "string" ? entry.id : "",
              title: typeof entry.title === "string" ? entry.title : "Untitled meeting",
              date: typeof entry.date === "string" ? entry.date : null,
              summary: typeof entry.summary === "string" ? entry.summary : "",
            };
          })
          .filter((item): item is ProgressReportSourceSnapshot["meetings"][number] => item !== null)
      : [],
    emails: Array.isArray(snapshot.emails)
      ? snapshot.emails
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const entry = item as Record<string, unknown>;
            return {
              id: typeof entry.id === "number" ? entry.id : 0,
              subject: typeof entry.subject === "string" ? entry.subject : "Untitled email",
              date: typeof entry.date === "string" ? entry.date : null,
              preview: typeof entry.preview === "string" ? entry.preview : "",
            };
          })
          .filter((item): item is ProgressReportSourceSnapshot["emails"][number] => item !== null)
      : [],
    photos: Array.isArray(snapshot.photos)
      ? snapshot.photos
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const entry = item as Record<string, unknown>;
            return {
              id: typeof entry.id === "number" ? entry.id : 0,
              title: typeof entry.title === "string" ? entry.title : "Untitled photo",
              date: typeof entry.date === "string" ? entry.date : null,
              file_url: typeof entry.file_url === "string" ? entry.file_url : "",
            };
          })
          .filter((item): item is ProgressReportSourceSnapshot["photos"][number] => item !== null)
      : [],
  };
}

function mapPhoto(photo: ProjectPhotoRow): ProgressReportPhotoRecord {
  return {
    id: photo.id,
    title: photo.title,
    description: photo.description,
    file_url: photo.file_url,
    date_taken: photo.date_taken,
    created_at: photo.created_at,
    location: photo.location,
    tags: photo.tags,
  };
}

function mapReport(row: ProgressReportRow): ProgressReportRecord {
  return {
    ...row,
    contacts: parseContacts(row.contacts),
    client_recipients: row.client_recipients ?? [],
    source_snapshot: parseSourceSnapshot(row.source_snapshot),
  };
}

export async function listProgressReports(
  projectId: number,
): Promise<ProgressReportListItem[]> {
  const db = createServiceClient();

  const [{ data: reports, error: reportsError }, { data: photoLinks, error: linksError }] =
    await Promise.all([
      db
        .from("project_progress_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("week_end", { ascending: false }),
      db
        .from("project_progress_report_photos")
        .select("progress_report_id")
        .eq("project_id", projectId),
    ]);

  if (reportsError) throw new Error(reportsError.message);
  if (linksError) throw new Error(linksError.message);

  const counts = new Map<string, number>();
  for (const link of photoLinks ?? []) {
    const reportId = (link as { progress_report_id: string }).progress_report_id;
    counts.set(reportId, (counts.get(reportId) ?? 0) + 1);
  }

  return ((reports ?? []) as ProgressReportRow[]).map((report) => ({
    ...mapReport(report),
    selected_photo_count: counts.get(report.id) ?? 0,
  }));
}

export async function getProgressReportDetail(
  projectId: number,
  reportId: string,
): Promise<ProgressReportDetailResponse> {
  const db = createServiceClient();

  const { data: reportRow, error: reportError } = await db
    .from("project_progress_reports")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", reportId)
    .single();

  if (reportError || !reportRow) {
    throw new Error(reportError?.message ?? "Progress report not found");
  }

  const [photoLinksResult, availablePhotosResult] = await Promise.all([
    db
      .from("project_progress_report_photos")
      .select("*")
      .eq("progress_report_id", reportId)
      .order("sort_order", { ascending: true }),
    db
      .from("project_photos")
      .select("id, title, description, file_url, date_taken, created_at, location, tags")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("date_taken", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  if (photoLinksResult.error) throw new Error(photoLinksResult.error.message);
  if (availablePhotosResult.error) {
    throw new Error(availablePhotosResult.error.message);
  }

  const availablePhotos = ((availablePhotosResult.data ?? []) as ProjectPhotoRow[]).map(mapPhoto);
  const availablePhotoMap = new Map(availablePhotos.map((photo) => [photo.id, photo]));

  const selectedPhotos = ((photoLinksResult.data ?? []) as ProgressReportPhotoLinkRow[])
    .map((link) => {
      const photo = availablePhotoMap.get(link.project_photo_id);
      if (!photo) return null;
      return {
        ...link,
        photo,
      };
    })
    .filter((item): item is ProgressReportPhotoSelection => item !== null);

  return {
    report: mapReport(reportRow as ProgressReportRow),
    selectedPhotos,
    availablePhotos,
  };
}

function dateInRange(dateValue: string | null | undefined, start: string, end: string) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const value = date.toISOString().slice(0, 10);
  return value >= start && value <= end;
}

export async function createProgressReportDraft({
  projectId,
  userId,
  userEmail,
  weekStart,
  weekEnd,
}: {
  projectId: number;
  userId: string;
  userEmail: string | null;
  weekStart?: string;
  weekEnd?: string;
}) {
  const db = createServiceClient();
  const range = weekStart && weekEnd ? { weekStart, weekEnd } : defaultWeeklyReportRange();

  const { data: existing } = await db
    .from("project_progress_reports")
    .select("id")
    .eq("project_id", projectId)
    .eq("week_start", range.weekStart)
    .eq("week_end", range.weekEnd)
    .maybeSingle();

  if (existing?.id) {
    return { reportId: existing.id as string };
  }

  const [
    projectResult,
    meetingsResult,
    emailsResult,
    photosResult,
    profileResult,
  ] = await Promise.all([
    db
      .from("projects")
      .select(`name, project_number, client, "start date", "est completion"`)
      .eq("id", projectId)
      .single(),
    db
      .from("document_metadata")
      .select("id, title, date, summary, overview, action_items, summary_bullets")
      .eq("project_id", projectId)
      .eq("type", "meeting")
      .order("date", { ascending: false })
      .limit(20),
    db
      .from("project_emails")
      .select("id, subject, body, body_text, sent_at, received_at, created_at")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("project_photos")
      .select("id, title, description, file_url, date_taken, created_at, location, tags")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("date_taken", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("user_profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (projectResult.error || !projectResult.data) {
    throw new Error(projectResult.error?.message ?? "Project not found");
  }
  if (meetingsResult.error) throw new Error(meetingsResult.error.message);
  if (emailsResult.error) throw new Error(emailsResult.error.message);
  if (photosResult.error) throw new Error(photosResult.error.message);

  const meetings = ((meetingsResult.data ?? []) as Array<Record<string, unknown>>).filter(
    (meeting) => dateInRange(meeting.date as string | null, range.weekStart, range.weekEnd),
  );

  const emails = ((emailsResult.data ?? []) as Array<Record<string, unknown>>).filter((email) =>
    dateInRange(
      (email.received_at as string | null) ??
        (email.sent_at as string | null) ??
        (email.created_at as string | null),
      range.weekStart,
      range.weekEnd,
    ),
  );

  const photos = ((photosResult.data ?? []) as ProjectPhotoRow[]).filter((photo) =>
    dateInRange(photo.date_taken ?? photo.created_at, range.weekStart, range.weekEnd),
  );

  const draft = buildProgressReportDraft({
    project: {
      name: projectResult.data.name,
      project_number: projectResult.data.project_number,
      client: projectResult.data.client,
      start_date: projectResult.data["start date"],
      scheduled_completion_date: projectResult.data["est completion"],
    },
    meetings: meetings.length > 0 ? (meetings as never[]) : ((meetingsResult.data ?? []) as never[]),
    emails: emails.length > 0 ? (emails as never[]) : ((emailsResult.data ?? []) as never[]),
    photos: photos.length > 0 ? photos : ((photosResult.data ?? []) as ProjectPhotoRow[]),
    currentUser: {
      email: userEmail,
      fullName: profileResult.data?.full_name ?? null,
    },
  });

  const { data: created, error: createError } = await db
    .from("project_progress_reports")
    .insert({
      project_id: projectId,
      title: draft.title,
      report_type: "weekly",
      status: "draft",
      week_start: range.weekStart,
      week_end: range.weekEnd,
      construction_start_date: draft.constructionStartDate,
      scheduled_completion_date: draft.scheduledCompletionDate,
      past_week_highlights: draft.pastWeekHighlights,
      upcoming_week_activities: draft.upcomingWeekActivities,
      open_items: draft.openItems,
      weather_days_lost: draft.weatherDaysLost,
      contacts: draft.contacts,
      client_recipients: draft.clientRecipients,
      source_snapshot: draft.sourceSnapshot,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw new Error(createError?.message ?? "Could not create progress report");
  }

  if (draft.selectedPhotos.length > 0) {
    const { error: photosInsertError } = await db
      .from("project_progress_report_photos")
      .insert(
        draft.selectedPhotos.map((selection) => ({
          progress_report_id: created.id as string,
          project_id: projectId,
          project_photo_id: selection.project_photo_id,
          sort_order: selection.sort_order,
          caption: selection.caption,
          created_by: userId,
        })),
      );

    if (photosInsertError) {
      throw new Error(photosInsertError.message);
    }
  }

  return { reportId: created.id as string };
}

export async function saveProgressReport({
  projectId,
  reportId,
  userId,
  updates,
}: {
  projectId: number;
  reportId: string;
  userId: string;
  updates: {
    title: string;
    status: "draft" | "ready" | "sent";
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
    selected_photos: Array<{
      project_photo_id: number;
      sort_order: number;
      caption: string | null;
    }>;
  };
}) {
  const db = createServiceClient();

  const { error: updateError } = await db
    .from("project_progress_reports")
    .update({
      title: updates.title,
      status: updates.status,
      week_start: updates.week_start,
      week_end: updates.week_end,
      construction_start_date: updates.construction_start_date,
      scheduled_completion_date: updates.scheduled_completion_date,
      past_week_highlights: updates.past_week_highlights,
      upcoming_week_activities: updates.upcoming_week_activities,
      open_items: updates.open_items,
      weather_days_lost: updates.weather_days_lost,
      contacts: updates.contacts,
      client_recipients: updates.client_recipients,
      updated_by: userId,
      updated_at: new Date().toISOString(),
      sent_at: updates.status === "sent" ? new Date().toISOString() : null,
    })
    .eq("project_id", projectId)
    .eq("id", reportId);

  if (updateError) throw new Error(updateError.message);

  const { error: deleteLinksError } = await db
    .from("project_progress_report_photos")
    .delete()
    .eq("progress_report_id", reportId);

  if (deleteLinksError) throw new Error(deleteLinksError.message);

  if (updates.selected_photos.length > 0) {
    const { error: insertLinksError } = await db
      .from("project_progress_report_photos")
      .insert(
        updates.selected_photos.map((selection) => ({
          progress_report_id: reportId,
          project_id: projectId,
          project_photo_id: selection.project_photo_id,
          sort_order: selection.sort_order,
          caption: selection.caption,
          created_by: userId,
        })),
      );

    if (insertLinksError) throw new Error(insertLinksError.message);
  }

  return getProgressReportDetail(projectId, reportId);
}
