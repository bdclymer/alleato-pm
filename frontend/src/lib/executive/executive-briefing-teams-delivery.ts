import { createServiceClient } from "@/lib/supabase/service";
import {
  type BrandonBriefItem,
  type BriefCitation,
  type BrandonDailyUpdatePacket,
  type ExecutiveOperatingBriefFocusItem,
  type ExecutiveOperatingBriefRiskItem,
  type ExecutiveOperatingBriefShortItem,
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

async function sendTeamsMessage(userId: string, message: string) {
  const { sendProactiveMessage } = await import("@/lib/bot/teams-chat");
  await sendProactiveMessage(userId, message);
}

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

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatCitation(citation: BriefCitation): string {
  const label = [citation.source, citation.sourceDetail, citation.date]
    .filter(Boolean)
    .join(" - ");
  return citation.sourceUrl ? `[${label}](${citation.sourceUrl})` : label;
}

function firstCitation(item: BrandonBriefItem): BriefCitation {
  return item.citations?.[0] ?? {
    source: item.source,
    sourceDetail: item.sourceDetail,
    sourceUrl: item.sourceUrl,
    sourceId: item.sourceId,
    evidence: item.evidence,
    date: item.date,
  };
}

function ownerLine(item: BrandonBriefItem): string | null {
  const owner = compactText(item.owner, 80);
  const status = compactText(item.status, 80);
  if (owner && status) return `Owner/status: ${owner} - ${status}`;
  if (owner) return `Owner: ${owner}`;
  if (status) return `Status: ${status}`;
  return null;
}

function formatItemCard(
  item: BrandonBriefItem,
  options: {
    index: number;
    actionLabel: string;
    actionFallback: string;
    whyFallback: string;
  },
): string {
  const project = compactText(item.project || "Company-wide", 90);
  const action =
    compactText(item.recommendedAction, 190) || options.actionFallback;
  const why = compactText(item.whyItMatters, 190) || options.whyFallback;
  const source = formatCitation(firstCitation(item));
  const evidence = getExecutiveBriefBullets(item)
    .filter((bullet) => !action || bullet !== action)
    .slice(0, 2)
    .map((bullet) => `   - ${compactText(bullet, 190)}`);
  const ownership = ownerLine(item);
  const lines = [
    `${options.index}. **${project}: ${compactText(item.title, 105)}**`,
    `   ${options.actionLabel}: ${action}`,
    `   Why it matters: ${why}`,
    ...evidence,
  ];

  if (ownership) lines.push(`   ${ownership}`);
  lines.push(`   Source: ${source}`);

  return lines.join("\n");
}

function formatItemSection(
  items: BrandonBriefItem[],
  options: {
    actionLabel: string;
    actionFallback: string;
    whyFallback: string;
    maxItems?: number;
  },
): string {
  const maxItems = options.maxItems ?? 3;
  const visible = items.slice(0, maxItems);
  const lines = visible.map((item, index) =>
    formatItemCard(item, {
      ...options,
      index: index + 1,
    }),
  );
  const hiddenCount = items.length - visible.length;
  if (hiddenCount > 0) {
    lines.push(
      `_Plus ${pluralize(hiddenCount, "additional item")} in the approved brief._`,
    );
  }
  return lines.join("\n\n");
}

function formatFocusItem(item: ExecutiveOperatingBriefFocusItem, index: number) {
  const project = compactText(item.item.project || "Company-wide", 80);
  const materiality = item.materiality.slice(0, 3).join(", ");
  return [
    `${index}. **${project}: ${compactText(item.item.title, 100)}**`,
    `   What changed: ${compactText(item.whatChanged || item.item.summary, 180)}`,
    `   CEO reason: ${compactText(item.whyItMatters || item.item.whyItMatters, 180)}`,
    `   Best next move: ${compactText(item.recommendedNextMove || item.item.recommendedAction, 180)}`,
    materiality ? `   Materiality: ${materiality}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatShortItem(
  item: ExecutiveOperatingBriefShortItem | ExecutiveOperatingBriefRiskItem,
  index: number,
) {
  const project = compactText(item.item.project || "Company-wide", 80);
  const riskImpact = "impact" in item && item.impact
    ? `   Impact: ${compactText(item.impact, 170)}\n`
    : "";
  return `${index}. **${project}: ${compactText(item.item.title, 100)}**\n${riskImpact}   Next: ${compactText(item.nextAction || item.item.recommendedAction, 180)}`;
}

function formatShortItemList(
  items: Array<ExecutiveOperatingBriefShortItem | ExecutiveOperatingBriefRiskItem>,
  maxItems = 3,
) {
  return items
    .slice(0, maxItems)
    .map((item, index) => formatShortItem(item, index + 1))
    .join("\n\n");
}

function formatSourceHealth(packet: BrandonDailyUpdatePacket): string | null {
  const warnings = packet.retrievalNotes
    .filter((note) => /fail|warning|stale|empty|zero/i.test(note))
    .slice(0, 2);
  const weakSources = packet.sourceCoverage
    .filter((source) => source.status === "warning" || source.status === "empty")
    .slice(0, 3)
    .map((source) => `${source.label}: ${source.status}`);
  const notes = [...weakSources, ...warnings].filter(Boolean);
  if (notes.length === 0) return null;
  return `Source health: ${notes.map((note) => compactText(note, 120)).join("; ")}`;
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
    ? `Good ${daypart}, ${firstName}.`
    : `Good ${daypart}.`;
  const startHere =
    packet.operatingBrief?.startHere
      ?.map((item) => compactText(item, 170))
      .filter(Boolean)
      .slice(0, 3) ?? [];

  const decisionCount = needsBrandon.length;
  const waitingCount = waitingOnOthers.length;
  const signalCount = importantUpdates.length;
  const topFocus = packet.operatingBrief?.topExecutiveFocus ?? [];
  const riskRadar = packet.operatingBrief?.projectRiskRadar ?? [];
  const cashWatch = packet.operatingBrief?.cashAndMarginWatch ?? [];
  const peopleItems = packet.operatingBrief?.peopleAndAccountability ?? [];
  const sourceHealth = formatSourceHealth(packet);

  const lines: string[] = [
    `${greeting} **CEO Operating Brief - ${today}**`,
    `Snapshot: ${pluralize(decisionCount, "decision")} for you, ${pluralize(waitingCount, "blocker")} waiting on others, ${pluralize(signalCount, "business signal")} from the last ${packet.windowDays} day${packet.windowDays === 1 ? "" : "s"}.`,
    `Read this as: what needs your call, what can slip margin/schedule/customer trust, and who should move next.`,
    "",
  ];

  if (startHere.length > 0) {
    lines.push("**Start Here - CEO Scan**");
    lines.push(startHere.map((item, index) => `${index + 1}. ${item}`).join("\n"));
    lines.push("");
  }

  if (topFocus.length > 0) {
    lines.push(`**Top Executive Focus** (${topFocus.length})`);
    lines.push(
      topFocus
        .slice(0, 3)
        .map((item, index) => formatFocusItem(item, index + 1))
        .join("\n\n"),
    );
    if (topFocus.length > 3) {
      lines.push(`_Plus ${pluralize(topFocus.length - 3, "additional focus item")}._`);
    }
    lines.push("");
  }

  if (needsBrandon.length > 0) {
    lines.push(`**Decisions Needed From You** (${needsBrandon.length})`);
    lines.push(
      formatItemSection(needsBrandon, {
        actionLabel: "Decision needed",
        actionFallback: "Decide the owner, commitment, or approval path.",
        whyFallback: "This item needs Brandon-level direction before the team can move cleanly.",
      }),
    );
    lines.push("");
  }

  if (waitingOnOthers.length > 0) {
    lines.push(`**Blocked / Waiting on Others** (${waitingOnOthers.length})`);
    lines.push(
      formatItemSection(waitingOnOthers, {
        actionLabel: "Follow-up",
        actionFallback: "Assign an owner and deadline for the next response.",
        whyFallback: "This can become schedule, billing, or customer-risk drift if nobody owns the follow-up.",
      }),
    );
    lines.push("");
  }

  const riskItems = riskRadar.length > 0 ? riskRadar : cashWatch;
  if (riskItems.length > 0) {
    lines.push(`**Risk Radar** (${riskItems.length})`);
    lines.push(formatShortItemList(riskItems));
    lines.push("");
  }

  if (importantUpdates.length > 0 || peopleItems.length > 0) {
    lines.push(`**Business Signals / Accountability** (${importantUpdates.length + peopleItems.length})`);
    if (importantUpdates.length > 0) {
      lines.push(
        formatItemSection(importantUpdates, {
          actionLabel: "Watch",
          actionFallback: "Keep this visible until it is tied to an owner or next action.",
          whyFallback: "This is a material business signal across projects, customers, vendors, or internal execution.",
        }),
      );
    }
    if (peopleItems.length > 0) {
      if (importantUpdates.length > 0) lines.push("");
      lines.push(formatShortItemList(peopleItems));
    }
    lines.push("");
  }

  const recommendedMoves = packet.operatingBrief?.recommendedMoves ?? [];
  if (recommendedMoves.length > 0) {
    lines.push("**Recommended Next Moves**");
    lines.push(
      recommendedMoves
        .slice(0, 4)
        .map((move, index) => `${index + 1}. ${compactText(move, 180)}`)
        .join("\n"),
    );
    lines.push("");
  }

  if (sourceHealth) {
    lines.push(`_${sourceHealth}_`);
    lines.push("");
  }

  lines.push(
    totalItems > 0
      ? "Reply with a number or project name and I can pull the source detail or draft the follow-up."
      : "No owner-level exceptions surfaced in this window. Ask for a project, cash, schedule, or customer drill-down if you want one.",
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
    .order("created_at", { ascending: false })
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
      await sendTeamsMessage(userId, message);
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
