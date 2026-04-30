import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database.types";
import type {
  ClientProjectIntelligencePacket,
  ConfidenceLevel,
  ConfidenceSummary,
  InsightCard,
  InsightCardEvidence,
  InsightCardEvidenceRow,
  InsightCardRow,
  IntelligencePacketCardRow,
  IntelligencePacketRow,
  IntelligenceTargetRow,
  IntelligenceTargetType,
  PacketFreshnessStatus,
  ResolvedIntelligenceTarget,
  SourceCoverageSummary,
} from "./types";

type AlleatoSupabaseClient = SupabaseClient<Database>;

function toRecord(value: Json | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return normalizeQuery(value).replace(/\s+/g, "-");
}

function targetMatchesQuery(target: IntelligenceTargetRow, query: string): boolean {
  const normalized = normalizeQuery(query);
  const targetName = normalizeQuery(target.name);
  const targetSlug = slugify(target.slug);

  return (
    normalized === targetName ||
    normalized === targetSlug ||
    normalized.includes(targetName) ||
    normalized.includes(targetSlug.replace(/-/g, " "))
  );
}

function mapTarget(
  row: IntelligenceTargetRow,
  source: ResolvedIntelligenceTarget["source"],
  resolutionReason: string,
): ResolvedIntelligenceTarget {
  return {
    id: row.id,
    targetType: row.target_type as IntelligenceTargetType,
    name: row.name,
    slug: row.slug,
    projectId: row.project_id,
    status: row.status,
    resolutionReason,
    source,
  };
}

function mapEvidence(row: InsightCardEvidenceRow): InsightCardEvidence {
  return {
    id: row.id,
    sourceDocumentId: row.source_document_id,
    sourceChunkId: row.source_chunk_id,
    sourceType: row.source_type,
    sourceTitle: row.source_title,
    sourceOccurredAt: row.source_occurred_at,
    excerpt: row.excerpt,
    summary: row.summary,
    relevanceReason: row.relevance_reason,
    evidenceRole: row.evidence_role,
    confidence: row.confidence as ConfidenceLevel,
  };
}

function mapCard(
  row: InsightCardRow,
  packetCard: IntelligencePacketCardRow | undefined,
  evidence: InsightCardEvidence[],
): InsightCard {
  return {
    id: row.id,
    title: row.title,
    cardType: row.card_type as InsightCard["cardType"],
    section: packetCard?.section ?? null,
    rank: packetCard?.rank ?? null,
    summary: row.summary,
    whyItMatters: row.why_it_matters,
    currentStatus: row.current_status,
    confidence: row.confidence as ConfidenceLevel,
    attributionStatus: row.attribution_status,
    nextAction: row.next_action,
    sourceCount: row.source_count,
    metadata: toRecord(row.metadata),
    evidence,
  };
}

function mapPacket(row: IntelligencePacketRow, cards: InsightCard[]): ClientProjectIntelligencePacket {
  return {
    id: row.id,
    targetId: row.target_id,
    packetType: row.packet_type,
    packetVersion: row.packet_version,
    generatedAt: row.generated_at,
    coveredStartAt: row.covered_start_at,
    coveredEndAt: row.covered_end_at,
    freshnessStatus: row.freshness_status as PacketFreshnessStatus,
    executiveSummary: row.executive_summary,
    currentStatus: row.current_status,
    strategicRead: row.strategic_read,
    whyItMatters: row.why_it_matters,
    recommendedNextMoves: row.recommended_next_moves,
    confidenceSummary: toRecord(row.confidence_summary) as ConfidenceSummary,
    sourceCoverage: toRecord(row.source_coverage) as SourceCoverageSummary,
    reviewQueueCount: row.review_queue_count,
    staleItemCount: row.stale_item_count,
    packetJson: toRecord(row.packet_json),
    compilerVersion: row.compiler_version,
    cards,
  };
}

export async function resolveIntelligenceTarget(input: {
  query: string;
  selectedProjectId?: number;
  supabase: AlleatoSupabaseClient;
}): Promise<ResolvedIntelligenceTarget | null> {
  if (typeof input.selectedProjectId === "number") {
    const { data, error } = await input.supabase
      .from("intelligence_targets")
      .select("*")
      .eq("target_type", "client_project")
      .eq("project_id", input.selectedProjectId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve selected intelligence project: ${error.message}`);
    }
    if (data) {
      return mapTarget(
        data,
        "selected_project",
        `Selected project ${input.selectedProjectId} resolved to intelligence target ${data.slug}.`,
      );
    }
  }

  const { data: targets, error: targetError } = await input.supabase
    .from("intelligence_targets")
    .select("*")
    .eq("status", "active")
    .limit(100);

  if (targetError) {
    throw new Error(`Failed to load intelligence targets: ${targetError.message}`);
  }

  const target = (targets ?? [])
    .filter((candidate) => candidate.target_type === "client_project")
    .find((candidate) => targetMatchesQuery(candidate, input.query));
  if (target) {
    return mapTarget(target, "target_match", `Query matched intelligence target ${target.slug}.`);
  }

  const normalized = normalizeQuery(input.query);
  if (!normalized) return null;

  const { data: projects, error: projectError } = await input.supabase
    .from("projects")
    .select("id, name, aliases")
    .limit(100);

  if (projectError) {
    throw new Error(`Failed to load projects for intelligence target resolution: ${projectError.message}`);
  }

  const project = (projects ?? []).find((candidate) => {
    const name = normalizeQuery(candidate.name ?? "");
    const aliases = candidate.aliases ?? [];
    return (
      (name && normalized.includes(name)) ||
      aliases.some((alias) => normalized.includes(normalizeQuery(alias)))
    );
  });

  if (!project) return null;

  const { data: projectTarget, error: projectTargetError } = await input.supabase
    .from("intelligence_targets")
    .select("*")
    .eq("target_type", "client_project")
    .eq("project_id", project.id)
    .maybeSingle();

  if (projectTargetError) {
    throw new Error(`Failed to resolve project intelligence target: ${projectTargetError.message}`);
  }

  return projectTarget
    ? mapTarget(
        projectTarget,
        "project_match",
        `Project name ${project.name ?? project.id} resolved to intelligence target ${projectTarget.slug}.`,
      )
    : null;
}

export async function loadCurrentIntelligencePacket(input: {
  targetId: string;
  supabase: AlleatoSupabaseClient;
}): Promise<ClientProjectIntelligencePacket | null> {
  const { data, error } = await input.supabase
    .from("intelligence_packets")
    .select("*")
    .eq("target_id", input.targetId)
    .eq("packet_type", "current")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load current intelligence packet: ${error.message}`);
  }
  if (!data) return null;

  const cards = await loadPacketCards({
    targetId: input.targetId,
    supabase: input.supabase,
  });

  return mapPacket(data, cards);
}

export async function loadPacketCards(input: {
  targetId: string;
  supabase: AlleatoSupabaseClient;
  includeCandidate?: boolean;
}): Promise<InsightCard[]> {
  const { data: packet, error: packetError } = await input.supabase
    .from("intelligence_packets")
    .select("id")
    .eq("target_id", input.targetId)
    .eq("packet_type", "current")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (packetError) {
    throw new Error(`Failed to load packet card index: ${packetError.message}`);
  }
  if (!packet) return [];

  const { data: packetCards, error: packetCardsError } = await input.supabase
    .from("intelligence_packet_cards")
    .select("*")
    .eq("packet_id", packet.id)
    .order("rank", { ascending: true });

  if (packetCardsError) {
    throw new Error(`Failed to load packet cards: ${packetCardsError.message}`);
  }

  const packetCardRows = packetCards ?? [];
  const cardIds = packetCardRows.map((row) => row.insight_card_id);
  if (cardIds.length === 0) return [];

  let cardQuery = input.supabase
    .from("insight_cards")
    .select("*")
    .in("id", cardIds);

  if (!input.includeCandidate) {
    cardQuery = cardQuery.neq("attribution_status", "rejected");
  }

  const { data: cardRows, error: cardsError } = await cardQuery;
  if (cardsError) {
    throw new Error(`Failed to load insight cards: ${cardsError.message}`);
  }

  const { data: evidenceRows, error: evidenceError } = await input.supabase
    .from("insight_card_evidence")
    .select("*")
    .in("insight_card_id", cardIds)
    .order("source_occurred_at", { ascending: false, nullsFirst: false });

  if (evidenceError) {
    throw new Error(`Failed to load insight card evidence: ${evidenceError.message}`);
  }

  const evidenceByCard = new Map<string, InsightCardEvidence[]>();
  for (const row of evidenceRows ?? []) {
    const existing = evidenceByCard.get(row.insight_card_id) ?? [];
    existing.push(mapEvidence(row));
    evidenceByCard.set(row.insight_card_id, existing);
  }

  const cardsById = new Map((cardRows ?? []).map((row) => [row.id, row]));
  return packetCardRows
    .map((packetCard) => {
      const card = cardsById.get(packetCard.insight_card_id);
      return card
        ? mapCard(card, packetCard, evidenceByCard.get(card.id) ?? [])
        : null;
    })
    .filter((card): card is InsightCard => Boolean(card));
}
