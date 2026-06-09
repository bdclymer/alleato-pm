import { Card, CardText as ChatText, Divider, Actions, LinkButton } from "chat";
import type { PostableCard, CardChild } from "chat";
import { createServiceClient } from "@/lib/supabase/service";
import {
  type BrandonBriefItem,
  type BrandonDailyUpdatePacket,
} from "@/lib/executive/brandon-daily-update";
import { CEO_EXECUTIVE_BRIEFING_RECAP_KIND } from "@/lib/executive/executive-briefing-workflow";
import {
  formatExecutiveBriefingTeamsMessage,
  getBriefHeader,
  getBullets,
  insightLine,
  linkedClaimSources,
  projectName,
} from "@/lib/executive/executive-briefing-render";

export { formatExecutiveBriefingTeamsMessage } from "@/lib/executive/executive-briefing-render";

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

export function buildExecutiveBriefingCard(
  packet: BrandonDailyUpdatePacket,
  firstName: string | null,
  options: { now?: Date } = {},
): PostableCard {
  const now = options.now ?? new Date();
  const { today, greeting } = getBriefHeader(now, firstName);

  const { needsBrandon, waitingOnOthers, importantUpdates } = packet.sections;
  const updates = importantUpdates;

  const children: CardChild[] = [];

  const renderItem = (item: BrandonBriefItem, heading: string, bulletMax: number) => {
    children.push(ChatText(heading, { style: "bold" }));
    for (const bullet of getBullets(item, bulletMax)) {
      children.push(ChatText(`• ${bullet}`));
    }
    const insight = insightLine(item);
    if (insight) {
      children.push(ChatText(`What this means: ${insight}`, { style: "muted" }));
    }
    const sources = linkedClaimSources(item);
    if (sources.length > 0) {
      children.push(
        ChatText(
          sources.map((source) => `[${source.label}](${source.href})`).join("  ·  "),
          { style: "muted" },
        ),
      );
    }
  };

  if (needsBrandon.length > 0) {
    children.push(Divider());
    children.push(ChatText(`Needs your attention (${needsBrandon.length})`, { style: "bold" }));
    needsBrandon.forEach((item, i) =>
      renderItem(item, `${i + 1}. ${projectName(item.project)}`, 4),
    );
  }

  if (waitingOnOthers.length > 0) {
    children.push(Divider());
    children.push(ChatText(`Waiting on others (${waitingOnOthers.length})`, { style: "bold" }));
    for (const item of waitingOnOthers) {
      renderItem(item, projectName(item.project), 3);
    }
  }

  if (updates.length > 0) {
    children.push(Divider());
    children.push(ChatText(`Worth knowing (${updates.length})`, { style: "bold" }));
    for (const item of updates) {
      renderItem(item, projectName(item.project), 3);
    }
  }

  const totalItems = needsBrandon.length + waitingOnOthers.length + updates.length;
  children.push(Divider());
  children.push(
    ChatText(
      totalItems > 0
        ? "Each item links to its source — open it for the full meeting, email, or thread."
        : "Nothing needs your attention today.",
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
