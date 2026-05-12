import { Card, CardText, Section, Divider, Actions, LinkButton, Field, Fields } from "chat";
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

function compactCardText(value: string | null | undefined, maxLength = 180): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("?"),
    clipped.lastIndexOf("!"),
  );
  if (sentenceEnd >= 80) return clipped.slice(0, sentenceEnd + 1).trim();
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim()}...`;
}

function displayProjectName(value: string | null | undefined): string {
  const project = compactCardText(value, 90);
  if (!project || /^no project linked$/i.test(project)) return "Company-wide";
  return project.replace(/^\d+\s+/, "").trim() || project;
}

function briefAppUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://projects.alleatogroup.com";
  return `${base}/executive`;
}

export function formatExecutiveBriefingTeamsMessage(
  packet: BrandonDailyUpdatePacket,
  firstName: string | null,
  options: { now?: Date } = {},
): CardElement {
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
  const allItems: Array<{ item: BrandonBriefItem; section: SectionKey }> = [
    ...needsBrandon.map((item) => ({ item, section: "needsBrandon" as const })),
    ...waitingOnOthers.map((item) => ({
      item,
      section: "waitingOnOthers" as const,
    })),
    ...importantUpdates.map((item) => ({
      item,
      section: "importantUpdates" as const,
    })),
  ];

  // Group meeting-sourced items by meeting title; pick highest-priority action per meeting.
  const meetingGroupMap = new Map<
    string,
    Array<{ item: BrandonBriefItem; section: SectionKey }>
  >();
  for (const entry of allItems) {
    if (entry.item.source !== "Meeting") continue;
    const key = compactCardText(entry.item.sourceDetail, 90) || "Untitled meeting";
    if (!meetingGroupMap.has(key)) meetingGroupMap.set(key, []);
    meetingGroupMap.get(key)!.push(entry);
  }
  const meetingGroups = Array.from(meetingGroupMap.entries())
    .map(([title, items]) => ({
      title,
      topItem: items.sort(
        (a, b) => sectionRank[a.section] - sectionRank[b.section],
      )[0],
    }))
    .sort(
      (a, b) =>
        sectionRank[a.topItem.section] - sectionRank[b.topItem.section],
    );

  const cardChildren = [];

  // ── Today's Meetings ────────────────────────────────────────────────────────
  if (meetingGroups.length > 0) {
    cardChildren.push(
      Section([
        CardText(`From Today's Meetings (${meetingGroups.length})`, {
          style: "bold",
        }),
        ...meetingGroups.map(({ title, topItem }) => {
          const action = compactCardText(
            topItem.item.recommendedAction ?? topItem.item.summary,
            155,
          );
          return CardText(`• ${title} — ${action}`);
        }),
      ]),
    );
    cardChildren.push(Divider());
  }

  // ── Decisions Needed ────────────────────────────────────────────────────────
  if (needsBrandon.length > 0) {
    cardChildren.push(
      Section([
        CardText(`Decisions Needed (${needsBrandon.length})`, { style: "bold" }),
        Fields(
          needsBrandon.map((item, index) =>
            Field({
              label: `${index + 1}. ${displayProjectName(item.project)}`,
              value: compactCardText(
                item.recommendedAction ?? item.summary,
                160,
              ),
            }),
          ),
        ),
      ]),
    );
    if (waitingOnOthers.length > 0) cardChildren.push(Divider());
  }

  // ── Pending ─────────────────────────────────────────────────────────────────
  if (waitingOnOthers.length > 0) {
    cardChildren.push(
      Section([
        CardText(`Pending (${waitingOnOthers.length})`, { style: "bold" }),
        ...waitingOnOthers.map((item) => {
          const project = displayProjectName(item.project);
          const action = compactCardText(
            item.recommendedAction ?? item.summary,
            160,
          );
          return CardText(`• ${project} — ${action}`, { style: "muted" });
        }),
      ]),
    );
  }

  // ── Action button ───────────────────────────────────────────────────────────
  cardChildren.push(
    Actions([LinkButton({ label: "Open Full Brief", url: briefAppUrl() })]),
  );

  const totalItems = needsBrandon.length + waitingOnOthers.length;
  const footerText =
    totalItems > 0
      ? "Reply with a number or project name for source detail or to draft a follow-up."
      : "No owner-level items today. Ask for a project, cash, or schedule drill-down if needed.";

  return Card({
    title: `Daily Brief — ${today}`,
    subtitle: greeting,
    children: [
      ...cardChildren,
      Section([CardText(footerText, { style: "muted" })]),
    ],
  });
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
    throw new Error(
      `Failed to load Teams recipient mapping: ${error.message}`,
    );
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

  if (error) {
    throw new Error(
      `Failed to mark executive briefing as sent to Teams: ${error.message}`,
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
