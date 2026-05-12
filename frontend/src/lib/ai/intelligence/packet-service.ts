import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database.types";
import type {
  ClientProjectIntelligencePacket,
  ConfidenceLevel,
  ConfidenceSummary,
  InsightCard,
  InsightCardEvidence,
  InsightCardEvidenceRow,
  InsightCardReviewFeedback,
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
type SourceDocumentPreview = Pick<
  Database["public"]["Tables"]["document_metadata"]["Row"],
  "id" | "type" | "category" | "content" | "raw_text" | "summary" | "overview" | "description" | "notes"
>;

const SUPABASE_IN_FILTER_CHUNK_SIZE = 100;

function chunkArray<T>(items: T[], size = SUPABASE_IN_FILTER_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

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

function cleanSourcePreview(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  return cleaned || null;
}

function normalizePreview(value: string | null | undefined): string {
  return cleanSourcePreview(value)
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim() ?? "";
}

function isMetadataOnlyPreview(value: string | null | undefined): boolean {
  const text = normalizePreview(value);
  return (
    text.startsWith("subject ") ||
    (text.includes(" subject ") && text.includes(" from ")) ||
    (text.includes(" date ") && text.includes(" from ") && text.includes(" to ")) ||
    (
      text.includes("duration") &&
      text.includes("organizer email") &&
      (text.includes("fireflies link") || text.includes("participants"))
    )
  );
}

function getSourcePreview(source: SourceDocumentPreview | undefined): string | null {
  if (!source) return null;
  const sourceKind = `${source.type ?? ""} ${source.category ?? ""}`.toLowerCase();
  const isEmailSource = sourceKind.includes("email");
  const primaryContent = [source.content, source.raw_text]
    .map((value) => cleanSourcePreview(value))
    .find(Boolean);

  if (isEmailSource) {
    return primaryContent ?? null;
  }

  const nonMetadataPrimaryContent = [source.content, source.raw_text]
    .map((value) => cleanSourcePreview(value))
    .find((value) => value && !isMetadataOnlyPreview(value));

  if (nonMetadataPrimaryContent) return nonMetadataPrimaryContent;

  return [source.summary, source.overview, source.description, source.notes, source.content, source.raw_text]
    .map((value) => cleanSourcePreview(value))
    .find((value) => Boolean(value)) ?? null;
}

function mapEvidence(
  row: InsightCardEvidenceRow,
  sourceDocument: SourceDocumentPreview | undefined,
): InsightCardEvidence {
  return {
    id: row.id,
    sourceDocumentId: row.source_document_id,
    sourceChunkId: row.source_chunk_id,
    sourceMessageId: row.source_message_id,
    sourceType: row.source_type,
    sourceCategory: sourceDocument?.category ?? sourceDocument?.type ?? null,
    sourceTitle: row.source_title,
    sourceOccurredAt: row.source_occurred_at,
    participants: row.participants,
    sourceContentPreview: getSourcePreview(sourceDocument),
    excerpt: row.excerpt,
    summary: row.summary,
    relevanceReason: row.relevance_reason,
    evidenceRole: row.evidence_role,
    confidence: row.confidence as ConfidenceLevel,
  };
}

function isFeedbackSignal(value: unknown): value is InsightCardReviewFeedback["signal"] {
  return value === "useful" || value === "wrong" || value === "stale";
}

function mapReviewFeedback(
  row: Database["public"]["Tables"]["intelligence_reviews"]["Row"],
): InsightCardReviewFeedback | null {
  const proposedValue = toRecord(row.proposed_value);
  const signal = proposedValue.signal;
  if (!isFeedbackSignal(signal)) return null;

  return {
    id: row.id,
    status: row.status,
    signal,
    reason: typeof proposedValue.reason === "string" ? proposedValue.reason : null,
    correction: typeof proposedValue.correction === "string" ? proposedValue.correction : null,
    createdAt: row.created_at,
  };
}

function mapCard(
  row: InsightCardRow,
  packetCard: IntelligencePacketCardRow | undefined,
  evidence: InsightCardEvidence[],
  latestFeedback: InsightCardReviewFeedback | null,
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
    latestFeedback,
  };
}

function sourceCoverageCategory(evidence: InsightCardEvidence): string {
  const raw = `${evidence.sourceCategory ?? ""} ${evidence.sourceType ?? ""}`.toLowerCase();
  if (raw.includes("meeting") || raw.includes("fireflies") || raw.includes("transcript")) return "meeting";
  if (raw.includes("email") || raw.includes("outlook")) return "email";
  if (raw.includes("teams") || raw.includes("chat") || raw.includes("message")) return "teams";
  if (raw.includes("rfi")) return "rfi";
  if (raw.includes("submittal")) return "submittal";
  if (raw.includes("drawing")) return "drawing";
  if (raw.includes("spec")) return "specification";
  if (raw.includes("daily")) return "daily_report";
  if (raw.includes("task")) return "task";
  if (raw.includes("risk")) return "risk";
  return "document";
}

function enrichSourceCoverage(
  sourceCoverage: SourceCoverageSummary,
  cards: InsightCard[],
): SourceCoverageSummary {
  if (Array.isArray(sourceCoverage.categoryCoverage)) {
    return sourceCoverage;
  }

  const counts = new Map<string, { count: number; latestAt: string | null }>();
  for (const card of cards) {
    for (const evidence of card.evidence) {
      const category = sourceCoverageCategory(evidence);
      const current = counts.get(category) ?? { count: 0, latestAt: null };
      const latestAt =
        evidence.sourceOccurredAt && (!current.latestAt || evidence.sourceOccurredAt > current.latestAt)
          ? evidence.sourceOccurredAt
          : current.latestAt;
      counts.set(category, { count: current.count + 1, latestAt });
    }
  }

  return {
    ...sourceCoverage,
    categoryCoverage: Array.from(counts.entries()).map(([category, value]) => ({
      category,
      label: category.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
      availableCount: value.count,
      sourceCount: value.count,
      inPacketCount: value.count,
      latestAt: value.latestAt,
      tableNames: ["insight_card_evidence"],
    })),
  };
}

function mapPacket(row: IntelligencePacketRow, cards: InsightCard[]): ClientProjectIntelligencePacket {
  const sourceCoverage = enrichSourceCoverage(
    toRecord(row.source_coverage) as SourceCoverageSummary,
    cards,
  );

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
    sourceCoverage,
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
  includeSourcePreview?: boolean;
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
    includeSourcePreview: input.includeSourcePreview,
  });

  return mapPacket(data, cards);
}

export async function loadPacketCards(input: {
  targetId: string;
  supabase: AlleatoSupabaseClient;
  includeCandidate?: boolean;
  includeSourcePreview?: boolean;
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
  const cardIds = Array.from(new Set(packetCardRows.map((row) => row.insight_card_id)));
  if (cardIds.length === 0) return [];

  const cardResults = await Promise.all(
    chunkArray(cardIds).map((ids) =>
      input.includeCandidate
        ? input.supabase
            .from("insight_cards")
            .select("*")
            .in("id", ids)
        : input.supabase
            .from("insight_cards")
            .select("*")
            .in("id", ids)
            .neq("attribution_status", "rejected"),
    ),
  );
  const cardsError = cardResults.find((result) => result.error)?.error;
  if (cardsError) {
    throw new Error(`Failed to load insight cards: ${cardsError.message}`);
  }
  const cardRows = cardResults.flatMap((result) => result.data ?? []);

  const evidenceResults = await Promise.all(
    chunkArray(cardIds).map((ids) =>
      input.supabase
        .from("insight_card_evidence")
        .select("*")
        .in("insight_card_id", ids)
        .order("source_occurred_at", { ascending: false, nullsFirst: false }),
    ),
  );
  const evidenceError = evidenceResults.find((result) => result.error)?.error;
  if (evidenceError) {
    throw new Error(`Failed to load insight card evidence: ${evidenceError.message}`);
  }
  const evidenceRows = evidenceResults.flatMap((result) => result.data ?? []);

  const sourceDocumentIds = input.includeSourcePreview === false
    ? []
    : Array.from(
        new Set(
          evidenceRows
            .map((row) => row.source_document_id)
            .filter((value): value is string => Boolean(value)),
        ),
      );
  const sourceDocumentResults = sourceDocumentIds.length > 0
    ? await Promise.all(
        chunkArray(sourceDocumentIds).map((ids) =>
          input.supabase
            .from("document_metadata")
            .select("id,type,category,content,raw_text,summary,overview,description,notes")
            .in("id", ids),
        ),
      )
    : [];
  const sourceDocumentError = sourceDocumentResults.find((result) => result.error)?.error;
  if (sourceDocumentError) {
    throw new Error(`Failed to load insight card source content: ${sourceDocumentError.message}`);
  }
  const sourceDocumentRows = sourceDocumentResults.flatMap((result) => result.data ?? []);

  const reviewResults = await Promise.all(
    chunkArray(cardIds).map((ids) =>
      input.supabase
        .from("intelligence_reviews")
        .select("*")
        .eq("review_type", "packet_card_feedback")
        .in("insight_card_id", ids)
        .order("created_at", { ascending: false }),
    ),
  );
  const reviewError = reviewResults.find((result) => result.error)?.error;
  if (reviewError) {
    throw new Error(`Failed to load insight card feedback: ${reviewError.message}`);
  }
  const reviewRows = reviewResults.flatMap((result) => result.data ?? []);

  const sourceDocumentById = new Map(
    (sourceDocumentRows as SourceDocumentPreview[]).map((row) => [row.id, row]),
  );
  const evidenceByCard = new Map<string, InsightCardEvidence[]>();
  for (const row of evidenceRows) {
    const existing = evidenceByCard.get(row.insight_card_id) ?? [];
    existing.push(mapEvidence(row, row.source_document_id ? sourceDocumentById.get(row.source_document_id) : undefined));
    evidenceByCard.set(row.insight_card_id, existing);
  }

  const feedbackByCard = new Map<string, InsightCardReviewFeedback>();
  for (const row of reviewRows) {
    if (!row.insight_card_id || feedbackByCard.has(row.insight_card_id)) continue;
    const feedback = mapReviewFeedback(row);
    if (feedback) feedbackByCard.set(row.insight_card_id, feedback);
  }

  const cardsById = new Map(cardRows.map((row) => [row.id, row]));
  return packetCardRows
    .map((packetCard) => {
      const card = cardsById.get(packetCard.insight_card_id);
      return card
        ? mapCard(
            card,
            packetCard,
            evidenceByCard.get(card.id) ?? [],
            feedbackByCard.get(card.id) ?? null,
          )
        : null;
    })
    .filter((card): card is InsightCard => Boolean(card));
}
