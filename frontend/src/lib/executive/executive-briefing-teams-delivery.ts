import { sendProactiveMessage } from "@/lib/bot/teams-chat";
import { createServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  type BrandonBriefItem,
  type BrandonDailyUpdatePacket,
} from "@/lib/executive/brandon-daily-update";
import {
  CEO_EXECUTIVE_BRIEFING_RECAP_KIND,
  regenerateExecutiveBriefingDraft,
} from "@/lib/executive/executive-briefing-workflow";

export type ExecutiveBriefingTeamsSendResult =
  | {
      ok: true;
      status: "sent";
      draftId: string;
      recipients: Array<{ userId: string; recipientName: string | null }>;
      itemCount: number;
    }
  | {
      ok: false;
      status: "blocked" | "skipped";
      reason: string;
      draftId?: string;
      workflowStatus?: string;
      userId?: string | null;
    };

function formatItem(item: BrandonBriefItem): string {
  const action = item.recommendedAction
    ? `\n  -> ${item.recommendedAction}`
    : "";
  return `- **${item.title}** (${item.project})${action}`;
}

function formatSection(items: BrandonBriefItem[], cap = 5): string {
  return items.slice(0, cap).map(formatItem).join("\n");
}

export function formatExecutiveBriefingTeamsMessage(
  packet: BrandonDailyUpdatePacket,
  firstName: string | null,
): string {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date());

  const { needsBrandon, waitingOnOthers, importantUpdates } = packet.sections;
  const totalItems =
    needsBrandon.length + waitingOnOthers.length + importantUpdates.length;
  const greeting = firstName ? `Good morning, ${firstName}!` : "Good morning.";

  const lines: string[] = [
    `${greeting} Here's your approved daily operating brief for **${today}**: ${totalItems} item${totalItems === 1 ? "" : "s"} across ${packet.windowDays} day${packet.windowDays === 1 ? "" : "s"}.`,
    "",
  ];

  if (needsBrandon.length > 0) {
    lines.push(`**Needs Your Attention** (${needsBrandon.length})`);
    lines.push(formatSection(needsBrandon));
    lines.push("");
  }

  if (waitingOnOthers.length > 0) {
    lines.push(`**Waiting on Others** (${waitingOnOthers.length})`);
    lines.push(formatSection(waitingOnOthers));
    lines.push("");
  }

  if (importantUpdates.length > 0) {
    lines.push(
      `**Project Signals** (${Math.min(importantUpdates.length, 3)} of ${importantUpdates.length})`,
    );
    lines.push(formatSection(importantUpdates, 3));
    lines.push("");
  }

  lines.push(
    "Reply to ask me anything about any of these, or ask me to follow up with someone.",
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

  // Generate the brief once, then fan out to all recipients
  const { draft } = await regenerateExecutiveBriefingDraft({
    windowDays: DEFAULT_EXECUTIVE_WINDOW_DAYS,
  });

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
    .update({ sent_teams: true })
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
  };
}
