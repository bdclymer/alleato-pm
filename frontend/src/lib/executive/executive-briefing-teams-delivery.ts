import { Card, CardText as ChatText, Divider, Actions, LinkButton } from "chat";
import type { PostableCard, CardChild } from "chat";
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

async function sendTeamsMessage(userId: string, card: PostableCard) {
  const { sendProactiveCard } = await import("@/lib/bot/teams-chat");
  await sendProactiveCard(userId, card);
}

// Return 2–3 bullet strings for an item (cleaned, clipped).
function getBullets(item: BrandonBriefItem, max = 3): string[] {
  const bullets = (item.bullets ?? [])
    .map(cleanBullet)
    .filter((b) => b.length > 8)
    .slice(0, max);
  if (bullets.length > 0) return bullets.map((b) => clip(b, 110));
  const fallback = clip(item.recommendedAction ?? item.summary, 160);
  return [fallback];
}

export function buildExecutiveBriefingCard(
  packet: BrandonDailyUpdatePacket,
  firstName: string | null,
  options: { now?: Date } = {},
): PostableCard {
  const now = options.now ?? new Date();
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(now);
  const easternHour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/New_York",
    }).format(now),
  );
  const daypart =
    easternHour < 12 ? "morning" : easternHour < 17 ? "afternoon" : "evening";
  const greeting = firstName
    ? `Good ${daypart}, ${firstName}.`
    : `Good ${daypart}.`;

  const { needsBrandon, waitingOnOthers, importantUpdates } = packet.sections;

  type SectionKey = keyof typeof packet.sections;
  const sectionRank: Record<SectionKey, number> = {
    needsBrandon: 0,
    waitingOnOthers: 1,
    importantUpdates: 2,
  };

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

  const meetings = Array.from(meetingMap.entries()).sort(
    (a, b) => sectionRank[a[1].section] - sectionRank[b[1].section],
  );

  const children: CardChild[] = [];

  // ── Today's Meetings ───────────────────────────────────────────────────────
  if (meetings.length > 0) {
    children.push(Divider());
    children.push(ChatText(`Today's Meetings (${meetings.length})`, { style: "bold" }));
    for (const [title, { item }] of meetings) {
      children.push(Divider());
      children.push(ChatText(clip(title, 70), { style: "bold" }));
      for (const bullet of getBullets(item, 3)) {
        children.push(ChatText(`• ${bullet}`));
      }
    }
  }

  // ── Decisions Needed ───────────────────────────────────────────────────────
  if (needsBrandon.length > 0) {
    children.push(Divider());
    children.push(ChatText(`Decisions Needed (${needsBrandon.length})`, { style: "bold" }));
    needsBrandon.forEach((item, i) => {
      children.push(ChatText(`${i + 1}. ${projectName(item.project)}`, { style: "bold" }));
      for (const bullet of getBullets(item, 3)) {
        children.push(ChatText(`• ${bullet}`));
      }
    });
  }

  // ── Pending ────────────────────────────────────────────────────────────────
  if (waitingOnOthers.length > 0) {
    children.push(Divider());
    children.push(ChatText(`Pending (${waitingOnOthers.length})`, { style: "bold" }));
    for (const item of waitingOnOthers) {
      children.push(ChatText(projectName(item.project), { style: "bold" }));
      for (const bullet of getBullets(item, 2)) {
        children.push(ChatText(`• ${bullet}`));
      }
    }
  }

  const totalItems = needsBrandon.length + waitingOnOthers.length + meetings.length;
  children.push(Divider());
  children.push(
    ChatText(
      totalItems > 0
        ? "Reply with a project name to get source detail or draft a follow-up."
        : "No action items today. Ask about a specific project if you need a drill-down.",
      { style: "muted" },
    ),
  );

  children.push(
    Actions([
      LinkButton({ label: "Open Alleato", url: "https://projects.alleatogroup.com" }),
    ]),
  );

  const card = Card({
    title: `Daily Brief — ${today}`,
    subtitle: greeting,
    children,
  });

  return {
    card,
    fallbackText: `Daily Brief — ${today}. ${greeting} ${totalItems} item${totalItems !== 1 ? "s" : ""} require attention.`,
  };
}

// Strip leading project number "31 Uniqlo..." → "Uniqlo..."
function projectName(value: string | null | undefined): string {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!s || /^no project linked$/i.test(s)) return "Company-wide";
  return s.replace(/^\d+\s+/, "").trim() || s;
}

// Clip at sentence/word boundary.
function clip(value: string | null | undefined, max = 110): string {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const dot = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("?"), cut.lastIndexOf("!"));
  if (dot >= 50) return cut.slice(0, dot + 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > 0 ? cut.slice(0, sp) : cut) + "…";
}

// Strip "Label: " prefix the AI adds to bullets. Keep just the substance.
function cleanBullet(s: string): string {
  return s
    .replace(/^[A-Z][^:]{0,40}:\s*/, "")
    .replace(/^[-•]\s*/, "")
    .trim();
}

// Return 2–3 bullet lines for an item, one per line, markdown list format.
function bulletBlock(item: BrandonBriefItem, max = 3): string {
  const bullets = (item.bullets ?? [])
    .map(cleanBullet)
    .filter((b) => b.length > 8)
    .slice(0, max);

  if (bullets.length > 0) {
    return bullets.map((b) => `- ${clip(b, 110)}`).join("\n");
  }
  // fallback to recommendedAction or summary
  const fallback = clip(item.recommendedAction ?? item.summary, 160);
  return `- ${fallback}`;
}

export function formatExecutiveBriefingTeamsMessage(
  packet: BrandonDailyUpdatePacket,
  firstName: string | null,
  options: { now?: Date } = {},
): string {
  const now = options.now ?? new Date();
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(now);
  const easternHour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/New_York",
    }).format(now),
  );
  const daypart =
    easternHour < 12 ? "morning" : easternHour < 17 ? "afternoon" : "evening";
  const greeting = firstName
    ? `Good ${daypart}, ${firstName}.`
    : `Good ${daypart}.`;

  const { needsBrandon, waitingOnOthers, importantUpdates } = packet.sections;

  type SectionKey = keyof typeof packet.sections;
  const sectionRank: Record<SectionKey, number> = {
    needsBrandon: 0,
    waitingOnOthers: 1,
    importantUpdates: 2,
  };

  // Group meeting-sourced items by meeting title, pick highest-priority per meeting.
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

  const meetings = Array.from(meetingMap.entries()).sort(
    (a, b) => sectionRank[a[1].section] - sectionRank[b[1].section],
  );

  const lines: string[] = [
    `**Daily Brief — ${today}**`,
    greeting,
    "",
  ];

  // ── Today's Meetings ──────────────────────────────────────────────────────
  if (meetings.length > 0) {
    lines.push(`**Today's Meetings (${meetings.length})**`);
    lines.push("");
    for (const [title, { item }] of meetings) {
      lines.push(`**${clip(title, 70)}**`);
      lines.push(bulletBlock(item, 3));
      lines.push("");
    }
  }

  // ── Decisions Needed ──────────────────────────────────────────────────────
  if (needsBrandon.length > 0) {
    lines.push(`**Decisions Needed (${needsBrandon.length})**`);
    lines.push("");
    needsBrandon.forEach((item, i) => {
      lines.push(`**${i + 1}. ${projectName(item.project)}**`);
      lines.push(bulletBlock(item, 3));
      lines.push("");
    });
  }

  // ── Pending ───────────────────────────────────────────────────────────────
  if (waitingOnOthers.length > 0) {
    lines.push(`**Pending (${waitingOnOthers.length})**`);
    lines.push("");
    for (const item of waitingOnOthers) {
      lines.push(`**${projectName(item.project)}**`);
      lines.push(bulletBlock(item, 2));
      lines.push("");
    }
  }

  const totalItems = needsBrandon.length + waitingOnOthers.length + meetings.length;
  lines.push(
    totalItems > 0
      ? "_Reply with a project name to get source detail or draft a follow-up._"
      : "_No action items today. Ask about a specific project if you need a drill-down._",
  );

  return lines.join("\n");
}

async function resolveAllTeamsUserIds(
  singleUserId?: string | null,
): Promise<string[]> {
  if (singleUserId) return [singleUserId];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("teams_conversation_refs")
    .select("supabase_user_id")
    .order("last_seen_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to resolve Teams-linked users: ${error.message}`);
  }
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
  if (error) {
    throw new Error(`Failed to load Teams recipient mapping: ${error.message}`);
  }
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
  if (error) {
    throw new Error(
      `Failed to load approved executive briefing: ${error.message}`,
    );
  }
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
      reason:
        "No Teams-linked users found. Have recipients message the Teams bot once to register.",
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

  const recipients: Array<{ userId: string; recipientName: string | null }> =
    [];
  await Promise.all(
    targetUserIds.map(async (userId) => {
      const firstName = await getTeamsRecipientFirstName(userId);
      const card = buildExecutiveBriefingCard(draft.packet, firstName);
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
  if (error) {
    throw new Error(
      `Failed to mark executive briefing as sent: ${error.message}`,
    );
  }

  return {
    ok: true,
    status: "sent",
    draftId: draft.id,
    recipients,
    itemCount,
    refreshedAt,
  };
}
