import { Card, CardText, Section, Divider, Actions, LinkButton } from "chat";
import type { CardElement } from "chat";
import { createServiceClient } from "@/lib/supabase/service";
import {
  type BrandonBriefItem,
  type BrandonDailyUpdatePacket,
} from "@/lib/executive/brandon-daily-update";
import { CEO_EXECUTIVE_BRIEFING_RECAP_KIND } from "@/lib/executive/executive-briefing-workflow";

export type ExecutiveBriefingTeamsSendResult =
  | {
      ok: true;
      status: "sent";
      draftId: string;
      recipients: Array<{ userId: string; recipientName: string | null }>;
      itemCount: number;
      refreshedAt: string;
    }
  | {
      ok: false;
      status: "blocked" | "skipped";
      reason: string;
      draftId?: string;
      workflowStatus?: string;
      userId?: string | null;
    };

async function sendTeamsMessage(userId: string, message: CardElement | string) {
  const { sendProactiveMessage } = await import("@/lib/bot/teams-chat");
  await sendProactiveMessage(userId, message);
}

// Strip leading project number ("31 Uniqlo...") and truncate.
function projectName(value: string | null | undefined): string {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!s || /^no project linked$/i.test(s)) return "Company-wide";
  return s.replace(/^\d+\s+/, "").trim() || s;
}

// Clip text cleanly at a sentence or word boundary.
function clip(value: string | null | undefined, max = 120): string {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const dot = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("?"), cut.lastIndexOf("!"));
  if (dot >= 60) return cut.slice(0, dot + 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > 0 ? cut.slice(0, sp) : cut) + "…";
}

// Strip "Label: " prefix pattern that the AI adds to bullets (e.g. "Permit Approval: ...").
function cleanBullet(value: string): string {
  return value
    .replace(/^[A-Z][^:]{0,40}:\s*/, "")  // strip "Title: " prefix
    .replace(/^[-•]\s*/, "")               // strip leading dash/bullet
    .trim();
}

// Format an item's bullets as a markdown list. Falls back to summary.
function bulletLines(item: BrandonBriefItem, max = 3): string {
  const bullets = (item.bullets ?? [])
    .map(cleanBullet)
    .filter((b) => b.length > 10)
    .slice(0, max);
  if (bullets.length > 0) {
    return bullets.map((b) => `- ${clip(b, 110)}`).join("\n");
  }
  // fallback: split summary into sentences
  const fallback = clip(item.recommendedAction ?? item.summary, 200);
  return `- ${fallback}`;
}

function briefAppUrl(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://projects.alleatogroup.com").replace(/\/$/, "");
  return `${base}/executive`;
}

export function formatExecutiveBriefingTeamsMessage(
  packet: BrandonDailyUpdatePacket,
  firstName: string | null,
  options: { now?: Date } = {},
): CardElement {
  const now = options.now ?? new Date();
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric",
    timeZone: "America/New_York",
  }).format(now);
  const easternHour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric", hour12: false, timeZone: "America/New_York",
    }).format(now),
  );
  const daypart = easternHour < 12 ? "morning" : easternHour < 17 ? "afternoon" : "evening";
  const greeting = firstName ? `Good ${daypart}, ${firstName}.` : `Good ${daypart}.`;

  const { needsBrandon, waitingOnOthers, importantUpdates } = packet.sections;

  type SectionKey = keyof typeof packet.sections;
  const sectionRank: Record<SectionKey, number> = {
    needsBrandon: 0,
    waitingOnOthers: 1,
    importantUpdates: 2,
  };

  // Group meeting-sourced items by meeting (sourceDetail), pick highest-priority per meeting.
  const meetingMap = new Map<string, { item: BrandonBriefItem; section: SectionKey }>();
  for (const [section, items] of [
    ["needsBrandon", needsBrandon],
    ["waitingOnOthers", waitingOnOthers],
    ["importantUpdates", importantUpdates],
  ] as [SectionKey, BrandonBriefItem[]][]) {
    for (const item of items) {
      if (item.source !== "Meeting") continue;
      const key = String(item.sourceDetail ?? "").trim() || "Untitled meeting";
      const existing = meetingMap.get(key);
      if (!existing || sectionRank[section] < sectionRank[existing.section]) {
        meetingMap.set(key, { item, section });
      }
    }
  }

  // Sort meetings: decisions first, then waiting, then signals.
  const meetings = Array.from(meetingMap.entries())
    .sort((a, b) => sectionRank[a[1].section] - sectionRank[b[1].section]);

  const cardChildren = [];

  // ── Today's Meetings ──────────────────────────────────────────────────────
  if (meetings.length > 0) {
    cardChildren.push(
      Section([
        CardText(`**Today's Meetings (${meetings.length})**`),
        CardText(""),
        ...meetings.map(([title, { item }]) =>
          CardText(`**${clip(title, 70)}**\n${bulletLines(item, 3)}`),
        ),
      ]),
    );
    cardChildren.push(Divider());
  }

  // ── Decisions Needed ──────────────────────────────────────────────────────
  if (needsBrandon.length > 0) {
    cardChildren.push(
      Section([
        CardText(`**Decisions Needed (${needsBrandon.length})**`),
        CardText(""),
        ...needsBrandon.map((item, i) =>
          CardText(
            `**${i + 1}. ${projectName(item.project)}**\n${bulletLines(item, 3)}`,
          ),
        ),
      ]),
    );
    if (waitingOnOthers.length > 0) cardChildren.push(Divider());
  }

  // ── Pending ───────────────────────────────────────────────────────────────
  if (waitingOnOthers.length > 0) {
    cardChildren.push(
      Section([
        CardText(`**Pending (${waitingOnOthers.length})**`),
        CardText(""),
        ...waitingOnOthers.map((item) =>
          CardText(
            `**${projectName(item.project)}**\n${bulletLines(item, 2)}`,
          ),
        ),
      ]),
    );
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const totalItems = needsBrandon.length + waitingOnOthers.length + meetings.length;
  cardChildren.push(Divider());
  cardChildren.push(
    Section([
      CardText(
        totalItems > 0
          ? "_Reply with a project name to get source detail or draft a follow-up._"
          : "_No action items today. Ask about a specific project if you need a drill-down._",
        { style: "muted" },
      ),
    ]),
  );
  cardChildren.push(
    Actions([LinkButton({ label: "Open Full Brief", url: briefAppUrl() })]),
  );

  return Card({
    title: `Daily Brief — ${today}`,
    subtitle: greeting,
    children: cardChildren,
  });
}

async function resolveAllTeamsUserIds(singleUserId?: string | null): Promise<string[]> {
  if (singleUserId) return [singleUserId];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("teams_conversation_refs")
    .select("supabase_user_id")
    .order("last_seen_at", { ascending: false });
  if (error) throw new Error(`Failed to resolve Teams-linked users: ${error.message}`);
  const seen = new Set<string>();
  for (const row of data ?? []) {
    if (row.supabase_user_id) seen.add(row.supabase_user_id);
  }
  return Array.from(seen);
}

async function getTeamsRecipientFirstName(userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bot_user_mappings")
    .select("display_name")
    .eq("platform", "teams")
    .eq("supabase_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load Teams recipient mapping: ${error.message}`);
  const displayName = data?.display_name?.trim();
  return displayName ? displayName.split(/\s+/)[0] : null;
}

async function loadLatestApprovedExecutiveBriefingDraft(): Promise<{
  id: string;
  workflowStatus: string;
  packet: BrandonDailyUpdatePacket;
} | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_recaps")
    .select("id, workflow_status, briefing_packet")
    .eq("recap_kind", CEO_EXECUTIVE_BRIEFING_RECAP_KIND)
    .eq("workflow_status", "approved")
    .not("briefing_packet", "is", null)
    .order("recap_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load approved executive briefing: ${error.message}`);
  if (!data?.briefing_packet) return null;
  return {
    id: data.id,
    workflowStatus: data.workflow_status,
    packet: data.briefing_packet as BrandonDailyUpdatePacket,
  };
}

export async function sendApprovedExecutiveBriefingToTeams(
  options: { userId?: string | null } = {},
): Promise<ExecutiveBriefingTeamsSendResult> {
  const targetUserIds = await resolveAllTeamsUserIds(options.userId);
  if (targetUserIds.length === 0) {
    return {
      ok: false,
      status: "blocked",
      reason: "No Teams-linked users found. Have recipients message the Teams bot once to register.",
      userId: null,
    };
  }

  const draft = await loadLatestApprovedExecutiveBriefingDraft();
  if (!draft) {
    return {
      ok: false,
      status: "skipped",
      reason: "No approved executive briefing packet is available to send.",
    };
  }

  const refreshedAt = new Date().toISOString();
  const itemCount =
    draft.packet.sections.needsBrandon.length +
    draft.packet.sections.waitingOnOthers.length +
    draft.packet.sections.importantUpdates.length;

  const recipients: Array<{ userId: string; recipientName: string | null }> = [];
  await Promise.all(
    targetUserIds.map(async (userId) => {
      const firstName = await getTeamsRecipientFirstName(userId);
      const card = formatExecutiveBriefingTeamsMessage(draft.packet, firstName);
      await sendTeamsMessage(userId, card);
      recipients.push({ userId, recipientName: firstName });
    }),
  );

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("daily_recaps")
    .update({ sent_teams: true, sent_at: refreshedAt })
    .eq("id", draft.id)
    .eq("recap_kind", CEO_EXECUTIVE_BRIEFING_RECAP_KIND);
  if (error) throw new Error(`Failed to mark executive briefing as sent: ${error.message}`);

  return { ok: true, status: "sent", draftId: draft.id, recipients, itemCount, refreshedAt };
}
