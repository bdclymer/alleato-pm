import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type TimelineItem = {
  id: string;
  source: "email" | "teams" | "meeting" | "insight";
  title: string;
  detail: string | null;
  timestamp: string;
  href: string | null;
  projectId: number | null;
};

function toIsoDateBoundary(input: string | null, endOfDay = false): string | null {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date.toISOString();
}

function normalizeTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function coalesceTimestamp(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const normalized = normalizeTimestamp(value);
    if (normalized) return normalized;
  }
  return null;
}

export async function GET(request: Request) {
  const user = await getApiRouteUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectIdRaw = searchParams.get("projectId");
  const projectId = projectIdRaw ? Number(projectIdRaw) : null;
  const startIso =
    toIsoDateBoundary(searchParams.get("startDate")) ??
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const endIso =
    toIsoDateBoundary(searchParams.get("endDate"), true) ?? new Date().toISOString();

  if (projectIdRaw && (!projectId || Number.isNaN(projectId))) {
    return new Response("projectId must be a valid number", { status: 400 });
  }

  const supabase = createServiceClient();

  const projectNamePromise = projectId
    ? supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single()
    : Promise.resolve({ data: null, error: null } as const);

  const emailsPromise = projectId
    ? supabase
        .from("project_emails")
        .select(
          "id, project_id, subject, body, from_name, from_email, sent_at, received_at, created_at",
        )
        .eq("project_id", projectId)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false })
        .limit(150)
    : Promise.resolve({ data: [], error: null } as const);

  const meetingsPromise = projectId
    ? supabase
        .from("document_metadata")
        .select("id, project_id, title, summary, date, created_at")
        .eq("project_id", projectId)
        .eq("type", "meeting")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false })
        .limit(150)
    : Promise.resolve({ data: [], error: null } as const);

  const insightsPromise = projectId
    ? supabase
        .from("ai_insights")
        .select("id, project_id, title, description, insight_type, severity, created_at")
        .eq("project_id", projectId)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false })
        .limit(150)
    : Promise.resolve({ data: [], error: null } as const);

  const teamsPromise = supabase
    .from("team_chat_messages")
    .select("id, channel_id, user_name, content, created_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(300);

  const [projectNameRes, emailsRes, meetingsRes, insightsRes, teamsRes] =
    await Promise.all([
      projectNamePromise,
      emailsPromise,
      meetingsPromise,
      insightsPromise,
      teamsPromise,
    ]);

  if (emailsRes.error || meetingsRes.error || insightsRes.error || teamsRes.error) {
    return Response.json(
      {
        error:
          emailsRes.error?.message ||
          meetingsRes.error?.message ||
          insightsRes.error?.message ||
          teamsRes.error?.message ||
          "Failed to load timeline",
      },
      { status: 500 },
    );
  }

  const projectName = String(projectNameRes.data?.name ?? "").trim().toLowerCase();

  const emailItems: TimelineItem[] = (emailsRes.data ?? [])
    .map((row) => {
      const timestamp = coalesceTimestamp(
        row.received_at,
        row.sent_at,
        row.created_at,
      );
      if (!timestamp) return null;
      return {
        id: `email-${row.id}`,
        source: "email" as const,
        title: row.subject || "Untitled email",
        detail:
          row.from_name ||
          row.from_email ||
          (row.body ? row.body.slice(0, 160) : null),
        timestamp,
        href: row.project_id ? `/${row.project_id}/emails/${row.id}` : null,
        projectId: row.project_id ?? null,
      };
    })
    .filter((item): item is TimelineItem => Boolean(item));

  const meetingItems: TimelineItem[] = (meetingsRes.data ?? [])
    .map((row) => {
      const timestamp = coalesceTimestamp(row.date, row.created_at);
      if (!timestamp) return null;
      return {
        id: `meeting-${row.id}`,
        source: "meeting" as const,
        title: row.title || "Untitled meeting",
        detail: row.summary ? String(row.summary).slice(0, 180) : null,
        timestamp,
        href: row.project_id ? `/${row.project_id}/meetings/${row.id}` : `/meetings/${row.id}`,
        projectId: row.project_id ?? null,
      };
    })
    .filter((item): item is TimelineItem => Boolean(item));

  const insightItems: TimelineItem[] = (insightsRes.data ?? [])
    .map((row) => {
      const timestamp = normalizeTimestamp(row.created_at);
      if (!timestamp) return null;
      const detailParts = [row.insight_type, row.severity]
        .filter(Boolean)
        .map((v) => String(v));
      return {
        id: `insight-${row.id}`,
        source: "insight" as const,
        title: row.title || "AI insight",
        detail:
          row.description ||
          (detailParts.length > 0 ? detailParts.join(" · ") : null),
        timestamp,
        href: row.project_id ? `/${row.project_id}/insights` : "/insights",
        projectId: row.project_id ?? null,
      };
    })
    .filter((item): item is TimelineItem => Boolean(item));

  const teamItems: TimelineItem[] = (teamsRes.data ?? [])
    .filter((row) => {
      if (!projectId) return true;
      if (!projectName) return false;
      const text = `${row.channel_id} ${row.content}`.toLowerCase();
      return text.includes(projectName);
    })
    .map((row) => {
      const timestamp = normalizeTimestamp(row.created_at);
      if (!timestamp) return null;
      return {
        id: `teams-${row.id}`,
        source: "teams" as const,
        title: row.channel_id ? `#${row.channel_id}` : "Teams channel",
        detail: `${row.user_name}: ${row.content.slice(0, 160)}`,
        timestamp,
        href: "/team-chat",
        projectId: projectId ?? null,
      };
    })
    .filter((item): item is TimelineItem => Boolean(item));

  const items = [...emailItems, ...teamItems, ...meetingItems, ...insightItems]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 250);

  return Response.json({
    items,
    range: { startDate: startIso, endDate: endIso },
    counts: {
      email: emailItems.length,
      teams: teamItems.length,
      meeting: meetingItems.length,
      insight: insightItems.length,
    },
  });
}
