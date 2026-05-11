import { sendProactiveMessage } from "@/lib/bot/teams-chat";
import { createServiceClient } from "@/lib/supabase/service";
import {
  type BrandonBriefItem,
  type BriefCitation,
  type BrandonDailyUpdatePacket,
} from "@/lib/executive/brandon-daily-update";
import { getExecutiveBriefBullets } from "@/lib/executive/executive-brief-bullets";
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

function compactText(value: string | null | undefined, maxLength = 180): string {
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

function formatCitation(citation: BriefCitation): string {
  const label = [citation.source, citation.sourceDetail, citation.date]
    .filter(Boolean)
    .join(" - ");
  return citation.sourceUrl ? `[${label}](${citation.sourceUrl})` : label;
}

function itemActionLabel(section: "decision" | "waiting" | "signal"): string {
  if (section === "waiting") return "Follow-up";
  if (section === "signal") return "Watch";
  return "Next";
}

function formatItem(
  item: BrandonBriefItem,
  section: "decision" | "waiting" | "signal",
): string {
  const action = compactText(item.recommendedAction, 180);
  const why = compactText(item.whyItMatters, 180);
  const source = item.citations?.[0]
    ? formatCitation(item.citations[0])
    : formatCitation({
        source: item.source,
        sourceDetail: item.sourceDetail,
        sourceUrl: item.sourceUrl,
        sourceId: item.sourceId,
        evidence: item.evidence,
        date: item.date,
      });
  const bullets = getExecutiveBriefBullets(item)
    .slice(0, 2)
    .map((bullet) => `  - ${compactText(bullet, 190)}`);
  const lines = [
    `- **${compactText(item.title, 120)}** - ${item.project}`,
    ...bullets,
  ];

  if (action) lines.push(`  ${itemActionLabel(section)}: ${action}`);
  if (why) lines.push(`  Value: ${why}`);
  lines.push(`  Source: ${source}`);

  return lines.join("\n");
}

function formatSection(
  items: BrandonBriefItem[],
  section: "decision" | "waiting" | "signal",
): string {
  return items.map((item) => formatItem(item, section)).join("\n");
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

  const { needsBrandon, waitingOnOthers, importantUpdates } = packet.sections;
  const totalItems =
    needsBrandon.length + waitingOnOthers.length + importantUpdates.length;
  const easternHour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/New_York",
    }).format(now),
  );
  const daypart =
    easternHour < 12
      ? "morning"
      : easternHour < 17
        ? "afternoon"
        : "evening";
  const greeting = firstName
    ? `Good ${daypart}, ${firstName}!`
    : `Good ${daypart}.`;
  const startHere =
    packet.operatingBrief?.startHere
      ?.map((item) => compactText(item, 170))
      .filter(Boolean)
      .slice(0, 3) ?? [];

  const lines: string[] = [
    `${greeting} **Daily Brief - ${today}**`,
    `${totalItems} item${totalItems === 1 ? "" : "s"} from the last ${packet.windowDays} day${packet.windowDays === 1 ? "" : "s"}. Start with the decisions and follow-ups below.`,
    "",
  ];

  if (startHere.length > 0) {
    lines.push("**Start Here**");
    lines.push(startHere.map((item) => `- ${item}`).join("\n"));
    lines.push("");
  }

  if (needsBrandon.length > 0) {
    lines.push(`**Needs Your Decision** (${needsBrandon.length})`);
    lines.push(formatSection(needsBrandon, "decision"));
    lines.push("");
  }

  if (waitingOnOthers.length > 0) {
    lines.push(`**Waiting on Others** (${waitingOnOthers.length})`);
    lines.push(formatSection(waitingOnOthers, "waiting"));
    lines.push("");
  }

  if (importantUpdates.length > 0) {
    lines.push(`**Business Signals** (${importantUpdates.length})`);
    lines.push(formatSection(importantUpdates, "signal"));
    lines.push("");
  }

  const recommendedMoves = packet.operatingBrief?.recommendedMoves ?? [];
  if (recommendedMoves.length > 0) {
    lines.push(`**Recommended Moves** (${recommendedMoves.length})`);
    lines.push(
      recommendedMoves
        .slice(0, 5)
        .map((move, index) => `${index + 1}. ${compactText(move, 180)}`)
        .join("\n"),
    );
    lines.push("");
  }

  lines.push(
    "Reply with the item title to dig in, or ask me to draft the follow-up.",
  );

  return lines.join("\n");
}

async function resolveAllTeamsUserIds(singleUserId?: string | null): Promise<string[]> {
  if (singleUserId) return [singleUserId];

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("teams_conversation_refs")
    .select("supabase_user_id")
    .order("last_seen_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to resolve Teams-linked users: ${error.message}`);
  }

  // Deduplicate — a user may have multiple conversation refs
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

async function loadLatestApprovedExecutiveBriefingDraft(): Promise<
  | {
      id: string;
      workflowStatus: string;
      packet: BrandonDailyUpdatePacket;
    }
  | null
> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_recaps")
    .select("id, workflow_status, briefing_packet")
    .eq("recap_kind", CEO_EXECUTIVE_BRIEFING_RECAP_KIND)
    .eq("workflow_status", "approved")
    .not("briefing_packet", "is", null)
    .order("recap_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load approved executive briefing: ${error.message}`);
  }

  if (!data?.briefing_packet) return null;

  return {
    id: data.id,
    workflowStatus: data.workflow_status,
    packet: data.briefing_packet as BrandonDailyUpdatePacket,
  };
}

export async function sendApprovedExecutiveBriefingToTeams(
  options: {
    userId?: string | null;
  } = {},
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

  const recipients: Array<{ userId: string; recipientName: string | null }> = [];

  await Promise.all(
    targetUserIds.map(async (userId) => {
      const firstName = await getTeamsRecipientFirstName(userId);
      const message = formatExecutiveBriefingTeamsMessage(draft.packet, firstName);
      await sendProactiveMessage(userId, message);
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
