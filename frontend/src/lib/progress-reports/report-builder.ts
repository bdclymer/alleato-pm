import type {
  ProgressReportContact,
  ProgressReportSourceSnapshot,
} from "@/lib/progress-reports/types";

interface DraftProjectInput {
  name: string | null;
  project_number: string | null;
  client: string | null;
  start_date: string | null;
  scheduled_completion_date: string | null;
}

interface DraftMeetingInput {
  id: string;
  title: string | null;
  date: string | null;
  summary: string | null;
  overview: string | null;
  action_items: string | null;
  summary_bullets: unknown;
}

interface DraftEmailInput {
  id: number;
  subject: string;
  body: string | null;
  body_text: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string | null;
}

interface DraftPhotoInput {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  date_taken: string | null;
  created_at: string | null;
  location: string | null;
  tags: string[] | null;
}

interface DraftCurrentUser {
  email: string | null;
  fullName: string | null;
}

export interface ProgressReportDraftResult {
  title: string;
  constructionStartDate: string | null;
  scheduledCompletionDate: string | null;
  pastWeekHighlights: string;
  upcomingWeekActivities: string;
  openItems: string;
  weatherDaysLost: number;
  contacts: ProgressReportContact[];
  clientRecipients: string[];
  sourceSnapshot: ProgressReportSourceSnapshot;
  selectedPhotos: Array<{
    project_photo_id: number;
    sort_order: number;
    caption: string | null;
  }>;
}

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function cleanText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\u2022/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitBulletCandidates(value: string | null | undefined): string[] {
  return cleanText(value)
    .split(/\n|(?<=[.?!])\s+(?=[A-Z0-9])/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length >= 10);
}

function uniqueItems(items: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items) {
    const normalized = item.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(item);
  }

  return output;
}

function parseJsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatBulletBlock(items: string[], fallback: string): string {
  const lines = items.slice(0, 5);
  if (lines.length === 0) return fallback;
  return lines.map((line) => `- ${line}`).join("\n");
}

function getEmailDate(email: DraftEmailInput): string | null {
  return email.received_at ?? email.sent_at ?? email.created_at ?? null;
}

function buildDefaultContacts(currentUser: DraftCurrentUser): ProgressReportContact[] {
  if (!currentUser.email && !currentUser.fullName) return [];

  return [
    {
      role: "Project Manager",
      name: currentUser.fullName ?? currentUser.email ?? "Project Manager",
      email: currentUser.email ?? "",
      phone: "",
    },
  ];
}

export function defaultWeeklyReportRange(referenceDate = new Date()) {
  const end = new Date(referenceDate);
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - 7);

  return {
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
  };
}

export function buildProgressReportDraft({
  project,
  meetings,
  emails,
  photos,
  currentUser,
  projectContacts = [],
}: {
  project: DraftProjectInput;
  meetings: DraftMeetingInput[];
  emails: DraftEmailInput[];
  photos: DraftPhotoInput[];
  currentUser: DraftCurrentUser;
  projectContacts?: ProgressReportContact[];
}): ProgressReportDraftResult {
  const meetingHighlightLines = uniqueItems(
    meetings.flatMap((meeting) => [
      ...parseJsonStringArray(meeting.summary_bullets),
      ...splitBulletCandidates(meeting.overview),
      ...splitBulletCandidates(meeting.summary),
    ]),
  );

  const meetingActionLines = uniqueItems(
    meetings.flatMap((meeting) => splitBulletCandidates(meeting.action_items)),
  );

  const photoLines = uniqueItems(
    photos.map((photo) => {
      const location = photo.location ? ` at ${photo.location}` : "";
      return `${photo.title}${location}`;
    }),
  );

  const emailOpenItems = uniqueItems(
    emails.flatMap((email) => {
      const preview = splitBulletCandidates(email.body_text ?? email.body);
      return [email.subject, ...preview.slice(0, 1)];
    }),
  );

  const pastWeekHighlights = formatBulletBlock(
    uniqueItems([...meetingHighlightLines, ...photoLines]),
    "- Add weekly highlights for the client-facing report.",
  );

  const upcomingWeekActivities = formatBulletBlock(
    uniqueItems([
      ...meetingActionLines,
      ...meetingHighlightLines.map((line) => `Continue ${line.charAt(0).toLowerCase()}${line.slice(1)}`),
    ]),
    "- Add the upcoming week activities for the client-facing report.",
  );

  const openItems = formatBulletBlock(
    uniqueItems([...emailOpenItems, ...meetingActionLines]),
    "- Add open items that still need client visibility.",
  );

  const sourceSnapshot: ProgressReportSourceSnapshot = {
    generatedAt: new Date().toISOString(),
    strategy: "deterministic-progress-report-v1",
    meetings: meetings.slice(0, 6).map((meeting) => ({
      id: meeting.id,
      title: meeting.title ?? "Untitled meeting",
      date: meeting.date,
      summary:
        parseJsonStringArray(meeting.summary_bullets)[0] ??
        splitBulletCandidates(meeting.summary)[0] ??
        splitBulletCandidates(meeting.overview)[0] ??
        "",
    })),
    emails: emails.slice(0, 6).map((email) => ({
      id: email.id,
      subject: email.subject,
      date: getEmailDate(email),
      preview: splitBulletCandidates(email.body_text ?? email.body)[0] ?? "",
    })),
    photos: photos.slice(0, 12).map((photo) => ({
      id: photo.id,
      title: photo.title,
      date: photo.date_taken ?? photo.created_at,
      file_url: photo.file_url,
    })),
  };

  return {
    title: `${project.name ?? "Project"} Weekly Progress Report`,
    constructionStartDate: toIsoDate(project.start_date),
    scheduledCompletionDate: toIsoDate(project.scheduled_completion_date),
    pastWeekHighlights,
    upcomingWeekActivities,
    openItems,
    weatherDaysLost: 0,
    contacts: projectContacts.length > 0 ? projectContacts : buildDefaultContacts(currentUser),
    clientRecipients: [],
    sourceSnapshot,
    selectedPhotos: photos.slice(0, 4).map((photo, index) => ({
      project_photo_id: photo.id,
      sort_order: index,
      caption: photo.title,
    })),
  };
}
