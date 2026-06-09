/**
 * Owner Briefing Builder — Pipeline B data loader for the daily Teams card.
 *
 * Replaces the legacy `brandon-daily-update` extraction path which re-queried
 * raw document_metadata + document_chunks every morning. This loader reads the
 * curated intelligence layer (insight_cards + intelligence_packets) and
 * produces an action-oriented data structure for the Adaptive Card builder.
 *
 * Design principles:
 * - Owner-relevant cards only — filter to risks, blockers, financial
 *   exposures, schedule risks, open decisions, and pending change orders.
 *   Skip task/requirement/process_issue/product_need (PM-level).
 * - Rank projects by composite urgency, not alphabetically.
 * - Highlight packets that are stale (compiler not refreshing for that target).
 * - Cap items per project so the card stays under Teams' 28KB limit.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { PACKET_STALE_AFTER_HOURS } from "@/lib/ai/intelligence/types";
import type {
  ConfidenceLevel,
  InsightCardType,
} from "@/lib/ai/intelligence/types";

// -----------------------------------------------------------------------------
// Card type buckets — drives which cards land in which briefing section.
// -----------------------------------------------------------------------------

const DECISION_CARD_TYPES: InsightCardType[] = [
  "risk",
  "blocker",
  "financial_exposure",
  "schedule_risk",
  "decision",
  "change_management",
];

const ACTION_CARD_TYPES: InsightCardType[] = ["open_question", "task"];

// All card types the owner wants to see.
const OWNER_RELEVANT_CARD_TYPES: InsightCardType[] = [
  ...DECISION_CARD_TYPES,
  ...ACTION_CARD_TYPES,
];

// Cards in these states are considered "live" — open or needing attention.
// We skip resolved/closed cards entirely.
const ACTIVE_CARD_STATUSES = new Set([
  "open",
  "blocked",
  "needs_review",
  "stale",
]);

// Only fully-attributed or manually approved cards surface.
// needs_review and candidate are still in the review queue — their content is
// often placeholder boilerplate and should not appear in the owner brief.
const VALID_ATTRIBUTION_STATUSES = new Set([
  "auto_assigned",
  "approved",
]);

// -----------------------------------------------------------------------------
// Confidence ranking — Postgres alpha-sorts confidence wrong, so we sort
// client-side. high > medium > low.
// -----------------------------------------------------------------------------

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// -----------------------------------------------------------------------------
// Output types
// -----------------------------------------------------------------------------

export type OwnerBriefingCardItem = {
  cardId: string;
  cardType: InsightCardType;
  title: string;
  summary: string | null;
  whyItMatters: string | null;
  nextAction: string | null;
  confidence: ConfidenceLevel;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  ageHours: number | null;
  isNewSinceYesterday: boolean;
  suggestedOwnerLabel: string | null;
};

export type OwnerBriefingProject = {
  targetId: string;
  projectId: number | null;
  projectName: string;
  packetId: string | null;
  packetGeneratedAt: string | null;
  packetIsStale: boolean;
  packetAgeHours: number | null;
  urgencyScore: number;
  decisionsNeeded: OwnerBriefingCardItem[];
  actionsRequired: OwnerBriefingCardItem[];
};

export type OwnerBriefingData = {
  generatedAt: string;
  dateLabel: string;
  greeting: string;
  recipientName: string;
  portfolio: {
    activeProjectCount: number;
    totalDecisionsNeeded: number;
    totalActionsRequired: number;
    totalNewSinceYesterday: number;
    stalePacketCount: number;
  };
  topProjects: OwnerBriefingProject[];
};

// -----------------------------------------------------------------------------
// Tuning constants
// -----------------------------------------------------------------------------

const MAX_PROJECTS_IN_CARD = 5;
const MAX_DECISIONS_PER_PROJECT = 3;
const MAX_ACTIONS_PER_PROJECT = 2;
const NEW_SINCE_HOURS = 24;
const SOFT_CARD_LIMIT_PER_TARGET = 25; // Query cap; we filter further below.

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export type BuildOwnerBriefingInput = {
  recipientName: string;
  now?: Date;
  /**
   * Limit to specific target IDs (e.g. for testing). If omitted, the builder
   * pulls every active client_project target.
   */
  targetIds?: string[];
};

export async function buildOwnerBriefingData(
  input: BuildOwnerBriefingInput,
): Promise<OwnerBriefingData> {
  const now = input.now ?? new Date();
  const supabase = createServiceClient();

  // ---------------------------------------------------------------------------
  // 1. Resolve active targets (client_project only, status=active).
  // ---------------------------------------------------------------------------
  let targetQuery = supabase
    .from("intelligence_targets")
    .select("id,name,project_id,target_type,status")
    .eq("status", "active")
    .eq("target_type", "client_project");

  if (input.targetIds && input.targetIds.length > 0) {
    targetQuery = targetQuery.in("id", input.targetIds);
  }

  const { data: targetRows, error: targetError } = await targetQuery;
  if (targetError) {
    throw new Error(`Failed to load intelligence targets: ${targetError.message}`);
  }
  const targets = targetRows ?? [];
  if (targets.length === 0) {
    return emptyBriefing({ now, recipientName: input.recipientName });
  }

  const targetIds = targets.map((t) => t.id);

  // ---------------------------------------------------------------------------
  // 2. Pull the current packet per target — for freshness signal.
  //    We don't render packet exec_summary in the card; we only use generated_at
  //    to flag stale packets and packet_id for the deep link.
  // ---------------------------------------------------------------------------
  const { data: packetRows, error: packetError } = await supabase
    .from("intelligence_packets")
    .select("id,target_id,generated_at,freshness_status")
    .in("target_id", targetIds)
    .eq("packet_type", "current");
  if (packetError) {
    throw new Error(`Failed to load intelligence packets: ${packetError.message}`);
  }
  const packetByTarget = new Map<
    string,
    { id: string; generatedAt: string | null; freshnessStatus: string | null }
  >();
  for (const row of packetRows ?? []) {
    // If multiple rows somehow exist for a target, keep the freshest.
    const prev = packetByTarget.get(row.target_id);
    if (
      !prev ||
      (row.generated_at && (!prev.generatedAt || row.generated_at > prev.generatedAt))
    ) {
      packetByTarget.set(row.target_id, {
        id: row.id,
        generatedAt: row.generated_at,
        freshnessStatus: row.freshness_status,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Pull owner-relevant insight cards for every target in ONE query.
  //    We over-fetch (up to SOFT_CARD_LIMIT * targets) then trim per project.
  // ---------------------------------------------------------------------------
  const nowIso = now.toISOString();
  const { data: cardRows, error: cardError } = await supabase
    .from("insight_cards")
    .select(
      `id,
       primary_target_id,
       title,
       summary,
       why_it_matters,
       current_status,
       card_type,
       confidence,
       attribution_status,
       suggested_owner_label,
       next_action,
       first_seen_at,
       last_seen_at,
       stale_after`,
    )
    .in("primary_target_id", targetIds)
    .in("card_type", OWNER_RELEVANT_CARD_TYPES)
    // Snoozed cards (stale_after in the future) are filtered. Cards with no
    // stale_after set are always eligible.
    .or(`stale_after.is.null,stale_after.lte.${nowIso}`)
    .order("last_seen_at", { ascending: false })
    .limit(SOFT_CARD_LIMIT_PER_TARGET * targets.length);
  if (cardError) {
    throw new Error(`Failed to load insight cards: ${cardError.message}`);
  }

  // ---------------------------------------------------------------------------
  // 4. Group cards by target, apply filters, rank, and trim.
  // ---------------------------------------------------------------------------
  const newSinceThresholdMs = now.getTime() - NEW_SINCE_HOURS * 3_600_000;
  const cardsByTarget = new Map<string, OwnerBriefingCardItem[]>();

  // Cards created by the source-attribution pipeline before full intelligence
  // extraction have this placeholder text stamped in why_it_matters. They are
  // not real actionable intelligence — skip them.
  const ATTRIBUTION_PLACEHOLDER = "This source contains project-relevant language";

  for (const row of cardRows ?? []) {
    if (!ACTIVE_CARD_STATUSES.has(row.current_status)) continue;
    if (!VALID_ATTRIBUTION_STATUSES.has(row.attribution_status)) continue;
    if (row.why_it_matters?.startsWith(ATTRIBUTION_PLACEHOLDER)) continue;

    const firstSeenAt = row.first_seen_at;
    const lastSeenAt = row.last_seen_at;
    const ageHours = lastSeenAt
      ? Math.max(0, (now.getTime() - new Date(lastSeenAt).getTime()) / 3_600_000)
      : null;
    const isNew = firstSeenAt
      ? new Date(firstSeenAt).getTime() >= newSinceThresholdMs
      : false;

    const item: OwnerBriefingCardItem = {
      cardId: row.id,
      cardType: row.card_type as InsightCardType,
      title: row.title,
      summary: row.summary,
      whyItMatters: row.why_it_matters,
      nextAction: row.next_action,
      confidence: (row.confidence as ConfidenceLevel) ?? "medium",
      firstSeenAt,
      lastSeenAt,
      ageHours,
      isNewSinceYesterday: isNew,
      suggestedOwnerLabel: row.suggested_owner_label,
    };

    const bucket = cardsByTarget.get(row.primary_target_id) ?? [];
    bucket.push(item);
    cardsByTarget.set(row.primary_target_id, bucket);
  }

  // ---------------------------------------------------------------------------
  // 5. Build per-project briefing objects with urgency scoring.
  // ---------------------------------------------------------------------------
  const projectBriefings: OwnerBriefingProject[] = targets.map((target) => {
    const allCards = cardsByTarget.get(target.id) ?? [];
    const decisions = allCards
      .filter((c) => DECISION_CARD_TYPES.includes(c.cardType))
      .sort(byUrgencyDesc)
      .slice(0, MAX_DECISIONS_PER_PROJECT);
    const actions = allCards
      .filter(
        (c) =>
          ACTION_CARD_TYPES.includes(c.cardType) && (c.nextAction?.trim().length ?? 0) > 0,
      )
      .sort(byUrgencyDesc)
      .slice(0, MAX_ACTIONS_PER_PROJECT);

    const packet = packetByTarget.get(target.id);
    const generatedAt = packet?.generatedAt ?? null;
    const packetAgeHours = generatedAt
      ? Math.max(0, (now.getTime() - new Date(generatedAt).getTime()) / 3_600_000)
      : null;
    const isStale =
      packetAgeHours === null || packetAgeHours > PACKET_STALE_AFTER_HOURS;

    const urgencyScore = computeUrgency({ decisions, actions, isStale, packetAgeHours });

    return {
      targetId: target.id,
      projectId: target.project_id,
      projectName: target.name,
      packetId: packet?.id ?? null,
      packetGeneratedAt: generatedAt,
      packetIsStale: isStale,
      packetAgeHours,
      urgencyScore,
      decisionsNeeded: decisions,
      actionsRequired: actions,
    };
  });

  // ---------------------------------------------------------------------------
  // 6. Pick the top N most urgent projects with at least one card to show.
  // ---------------------------------------------------------------------------
  const topProjects = projectBriefings
    .filter((p) => p.decisionsNeeded.length + p.actionsRequired.length > 0)
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .slice(0, MAX_PROJECTS_IN_CARD);

  // ---------------------------------------------------------------------------
  // 7. Portfolio aggregates across ALL active targets (not just top N shown).
  // ---------------------------------------------------------------------------
  const totalDecisions = projectBriefings.reduce(
    (sum, p) => sum + p.decisionsNeeded.length,
    0,
  );
  const totalActions = projectBriefings.reduce(
    (sum, p) => sum + p.actionsRequired.length,
    0,
  );
  const totalNew = projectBriefings.reduce(
    (sum, p) =>
      sum +
      p.decisionsNeeded.filter((c) => c.isNewSinceYesterday).length +
      p.actionsRequired.filter((c) => c.isNewSinceYesterday).length,
    0,
  );
  const staleCount = projectBriefings.filter((p) => p.packetIsStale).length;

  return {
    generatedAt: now.toISOString(),
    dateLabel: formatDateLabel(now),
    greeting: greetingFor(now, input.recipientName),
    recipientName: input.recipientName,
    portfolio: {
      activeProjectCount: targets.length,
      totalDecisionsNeeded: totalDecisions,
      totalActionsRequired: totalActions,
      totalNewSinceYesterday: totalNew,
      stalePacketCount: staleCount,
    },
    topProjects,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function byUrgencyDesc(a: OwnerBriefingCardItem, b: OwnerBriefingCardItem): number {
  // First: newer items first (last 24h).
  if (a.isNewSinceYesterday !== b.isNewSinceYesterday) {
    return a.isNewSinceYesterday ? -1 : 1;
  }
  // Then: higher confidence first.
  const confDiff = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
  if (confDiff !== 0) return confDiff;
  // Then: more recently seen.
  return (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? "");
}

function computeUrgency(params: {
  decisions: OwnerBriefingCardItem[];
  actions: OwnerBriefingCardItem[];
  isStale: boolean;
  packetAgeHours: number | null;
}): number {
  let score = 0;
  for (const c of params.decisions) {
    // High-confidence risk/blocker > medium > low.
    score += CONFIDENCE_RANK[c.confidence] * 4;
    if (c.isNewSinceYesterday) score += 5;
  }
  for (const c of params.actions) {
    score += CONFIDENCE_RANK[c.confidence] * 1;
    if (c.isNewSinceYesterday) score += 2;
  }
  // Stale packets penalty — a project whose compiler hasn't fired in days
  // shouldn't outrank a project with live signal.
  if (params.isStale) score -= 3;
  return score;
}

function emptyBriefing(params: {
  now: Date;
  recipientName: string;
}): OwnerBriefingData {
  return {
    generatedAt: params.now.toISOString(),
    dateLabel: formatDateLabel(params.now),
    greeting: greetingFor(params.now, params.recipientName),
    recipientName: params.recipientName,
    portfolio: {
      activeProjectCount: 0,
      totalDecisionsNeeded: 0,
      totalActionsRequired: 0,
      totalNewSinceYesterday: 0,
      stalePacketCount: 0,
    },
    topProjects: [],
  };
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function greetingFor(date: Date, name: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
  if (hour < 12) return `Good morning, ${name}.`;
  if (hour < 17) return `Good afternoon, ${name}.`;
  return `Good evening, ${name}.`;
}
