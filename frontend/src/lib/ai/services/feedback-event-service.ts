import { createServiceClient } from "@/lib/supabase/service";
import { toSessionUuid } from "@/lib/ai/session-id";
import type { Database, Json } from "@/types/database.types";

type Tables = Database["public"]["Tables"];

export type AiFeedbackEventRow = Tables["ai_feedback_events"]["Row"];
export type AiFeedbackEventInsert = Tables["ai_feedback_events"]["Insert"];
export type AiLearningPromotionRow = Tables["ai_learning_promotions"]["Row"];
export type AiLearningPromotionInsert = Tables["ai_learning_promotions"]["Insert"];
export type AiRetrievalFeedbackRow = Tables["ai_retrieval_feedback"]["Row"];
export type AiRetrievalFeedbackInsert = Tables["ai_retrieval_feedback"]["Insert"];
export type AiRetrievalWeightRow = Tables["ai_retrieval_weights"]["Row"];
export type AiRetrievalWeightInsert = Tables["ai_retrieval_weights"]["Insert"];

export type AiFeedbackEventFamily =
  | "retrieval"
  | "attribution"
  | "assistant_response"
  | "tool_action"
  | "task_generation"
  | "packet_quality"
  | "document_review"
  | "user_preference"
  | "workflow_outcome"
  | "eval_failure";

export type AiFeedbackSignal =
  | "positive"
  | "negative"
  | "corrected"
  | "accepted"
  | "ignored"
  | "completed"
  | "failed"
  | "needs_review"
  | "stale"
  | "conflicting";

export type AiLearningPromotionStatus =
  | "candidate"
  | "approved"
  | "rejected"
  | "applied"
  | "expired"
  | "superseded";

export type AiLearningPromotionType =
  | "agent_prevention_prompt"
  | "positive_task_example"
  | "user_preference"
  | "project_lesson"
  | "retrieval_weight"
  | "attribution_rule"
  | "packet_rule"
  | "workflow_rule";

export type AiLearningRiskLevel = "low" | "medium" | "high";

export type AiRetrievalOutcome =
  | "helpful"
  | "unhelpful"
  | "wrong_project"
  | "stale"
  | "unsupported"
  | "unknown";

export class AiFeedbackEventError extends Error {
  constructor(
    public readonly table: string,
    public readonly operation: string,
    message: string,
  ) {
    super(`[${table}.${operation}] ${message}`);
    this.name = "AiFeedbackEventError";
  }
}

export interface RecordAiFeedbackEventParams {
  userId?: string | null;
  projectId?: number | null;
  targetId?: string | null;
  sessionId?: string | null;
  sourceTable?: string | null;
  sourceRecordId?: string | null;
  eventType: string;
  eventFamily: AiFeedbackEventFamily;
  surface: string;
  subjectType: string;
  subjectId?: string | null;
  signal: AiFeedbackSignal;
  reasonCategory?: string | null;
  freeText?: string | null;
  beforeSnapshot?: Json;
  afterSnapshot?: Json;
  sourceContext?: Json;
  metadata?: Json;
}

export interface CreateLearningPromotionParams {
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  status?: AiLearningPromotionStatus;
  promotionType: AiLearningPromotionType;
  projectId?: number | null;
  targetId?: string | null;
  sourceEventIds?: string[];
  destinationTable?: string | null;
  destinationRecordId?: string | null;
  confidence?: number;
  riskLevel?: AiLearningRiskLevel;
  proposedLearning: Json;
  reviewNotes?: string | null;
  expiresAt?: string | null;
  supersededBy?: string | null;
}

export interface UpdateLearningPromotionParams {
  promotionId: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  status?: AiLearningPromotionStatus;
  destinationTable?: string | null;
  destinationRecordId?: string | null;
  confidence?: number;
  riskLevel?: AiLearningRiskLevel;
  reviewNotes?: string | null;
  expiresAt?: string | null;
  supersededBy?: string | null;
}

export interface RecordRetrievalFeedbackParams {
  userId?: string | null;
  projectId?: number | null;
  targetId?: string | null;
  sessionId?: string | null;
  toolName: string;
  queryText: string;
  sourceDocumentId?: string | null;
  sourceChunkId?: string | null;
  rank?: number | null;
  score?: number | null;
  cited?: boolean;
  userReferenced?: boolean;
  usedInAnswer?: boolean;
  outcome?: AiRetrievalOutcome;
  metadata?: Json;
}

export interface GenerateRetrievalPromotionCandidatesParams {
  windowDays?: number;
  minHelpfulSignals?: number;
  minProblemSignals?: number;
  limit?: number;
  dryRun?: boolean;
}

export interface RetrievalPromotionCandidatePreview {
  signature: string;
  promotionType: Extract<AiLearningPromotionType, "retrieval_weight">;
  projectId: number | null;
  confidence: number;
  riskLevel: AiLearningRiskLevel;
  destinationTable: "ai_retrieval_feedback";
  destinationRecordId: string | null;
  sourceEventIds: string[];
  proposedLearning: Json;
}

export interface GenerateRetrievalPromotionCandidatesResult {
  inspectedRows: number;
  groupsInspected: number;
  candidatesFound: number;
  candidatesCreated: number;
  candidatesSkipped: number;
  dryRun: boolean;
  candidates: RetrievalPromotionCandidatePreview[];
}

export interface ApplyRetrievalWeightPromotionParams {
  promotionId: string;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
}

export interface ApplyRetrievalWeightPromotionResult {
  promotion: AiLearningPromotionRow;
  retrievalWeight: AiRetrievalWeightRow;
}

export type AiRetrievalWeightStatus = "active" | "paused" | "superseded";

export interface UpdateRetrievalWeightStatusParams {
  promotionId: string;
  status: AiRetrievalWeightStatus;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
}

export interface UpdateRetrievalWeightStatusResult {
  promotion: AiLearningPromotionRow;
  retrievalWeight: AiRetrievalWeightRow;
}

export interface RetrievalWeightImpactPreviewRow {
  retrievalFeedbackId: string;
  sourceDocumentId: string | null;
  sourceChunkId: string | null;
  outcome: AiRetrievalOutcome;
  cited: boolean;
  usedInAnswer: boolean;
  originalScore: number;
  adjustedScore: number;
  originalRank: number;
  adjustedRank: number;
  matchedPromotionSource: boolean;
}

export interface PreviewRetrievalWeightPromotionImpactParams {
  promotionId: string;
  limit?: number;
}

export interface PreviewRetrievalWeightPromotionImpactResult {
  promotion: AiLearningPromotionRow;
  multiplier: number;
  inspectedRows: number;
  matchingRows: number;
  beforeTop: RetrievalWeightImpactPreviewRow[];
  afterTop: RetrievalWeightImpactPreviewRow[];
  matchedRankChange: {
    beforeBestRank: number | null;
    afterBestRank: number | null;
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertNonEmpty(value: string, fieldName: string, table: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AiFeedbackEventError(table, "validate", `${fieldName} is required`);
  }
  return trimmed;
}

function optionalUuid(
  value: string | null | undefined,
  fieldName: string,
  table: string,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!UUID_PATTERN.test(trimmed)) {
    throw new AiFeedbackEventError(
      table,
      "validate",
      `${fieldName} must be a UUID. Received: ${trimmed}`,
    );
  }
  return trimmed;
}

function optionalSessionUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return toSessionUuid(trimmed);
}

function clampConfidence(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function normalizeJson(value: Json | undefined): Json {
  return value ?? {};
}

export async function recordAiFeedbackEvent(
  params: RecordAiFeedbackEventParams,
): Promise<AiFeedbackEventRow> {
  const supabase = createServiceClient();
  const payload: AiFeedbackEventInsert = {
    user_id: optionalUuid(params.userId, "userId", "ai_feedback_events"),
    project_id: params.projectId ?? null,
    target_id: optionalUuid(params.targetId, "targetId", "ai_feedback_events"),
    session_id: optionalSessionUuid(params.sessionId),
    source_table: params.sourceTable ?? null,
    source_record_id: params.sourceRecordId ?? null,
    event_type: assertNonEmpty(params.eventType, "eventType", "ai_feedback_events"),
    event_family: params.eventFamily,
    surface: assertNonEmpty(params.surface, "surface", "ai_feedback_events"),
    subject_type: assertNonEmpty(params.subjectType, "subjectType", "ai_feedback_events"),
    subject_id: params.subjectId ?? null,
    signal: params.signal,
    reason_category: params.reasonCategory ?? null,
    free_text: params.freeText ?? null,
    before_snapshot: normalizeJson(params.beforeSnapshot),
    after_snapshot: normalizeJson(params.afterSnapshot),
    source_context: normalizeJson(params.sourceContext),
    metadata: normalizeJson(params.metadata),
  };

  const { data, error } = await supabase
    .from("ai_feedback_events")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new AiFeedbackEventError(
      "ai_feedback_events",
      "insert",
      error?.message ?? "insert returned no row",
    );
  }

  return data;
}

export async function createLearningPromotion(
  params: CreateLearningPromotionParams,
): Promise<AiLearningPromotionRow> {
  const supabase = createServiceClient();
  const payload: AiLearningPromotionInsert = {
    reviewed_at: params.reviewedAt ?? null,
    reviewed_by: optionalUuid(params.reviewedBy, "reviewedBy", "ai_learning_promotions"),
    status: params.status ?? "candidate",
    promotion_type: params.promotionType,
    project_id: params.projectId ?? null,
    target_id: optionalUuid(params.targetId, "targetId", "ai_learning_promotions"),
    source_event_ids: params.sourceEventIds ?? [],
    destination_table: params.destinationTable ?? null,
    destination_record_id: params.destinationRecordId ?? null,
    confidence: clampConfidence(params.confidence),
    risk_level: params.riskLevel ?? "low",
    proposed_learning: normalizeJson(params.proposedLearning),
    review_notes: params.reviewNotes ?? null,
    expires_at: params.expiresAt ?? null,
    superseded_by: optionalUuid(params.supersededBy, "supersededBy", "ai_learning_promotions"),
  };

  const { data, error } = await supabase
    .from("ai_learning_promotions")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "insert",
      error?.message ?? "insert returned no row",
    );
  }

  return data;
}

export async function updateLearningPromotion(
  params: UpdateLearningPromotionParams,
): Promise<AiLearningPromotionRow> {
  const supabase = createServiceClient();
  const promotionId = optionalUuid(
    params.promotionId,
    "promotionId",
    "ai_learning_promotions",
  );

  if (!promotionId) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "validate",
      "promotionId is required",
    );
  }

  const payload: Tables["ai_learning_promotions"]["Update"] = {
    ...(params.reviewedAt !== undefined ? { reviewed_at: params.reviewedAt } : {}),
    ...(params.reviewedBy !== undefined
      ? {
          reviewed_by: optionalUuid(
            params.reviewedBy,
            "reviewedBy",
            "ai_learning_promotions",
          ),
        }
      : {}),
    ...(params.status !== undefined ? { status: params.status } : {}),
    ...(params.destinationTable !== undefined
      ? { destination_table: params.destinationTable }
      : {}),
    ...(params.destinationRecordId !== undefined
      ? { destination_record_id: params.destinationRecordId }
      : {}),
    ...(params.confidence !== undefined
      ? { confidence: clampConfidence(params.confidence) }
      : {}),
    ...(params.riskLevel !== undefined ? { risk_level: params.riskLevel } : {}),
    ...(params.reviewNotes !== undefined ? { review_notes: params.reviewNotes } : {}),
    ...(params.expiresAt !== undefined ? { expires_at: params.expiresAt } : {}),
    ...(params.supersededBy !== undefined
      ? {
          superseded_by: optionalUuid(
            params.supersededBy,
            "supersededBy",
            "ai_learning_promotions",
          ),
        }
      : {}),
  };

  const { data, error } = await supabase
    .from("ai_learning_promotions")
    .update(payload)
    .eq("id", promotionId)
    .select("*")
    .single();

  if (error || !data) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "update",
      error?.message ?? "update returned no row",
    );
  }

  return data;
}

export async function recordRetrievalFeedback(
  params: RecordRetrievalFeedbackParams,
): Promise<AiRetrievalFeedbackRow> {
  const supabase = createServiceClient();
  const payload: AiRetrievalFeedbackInsert = {
    user_id: optionalUuid(params.userId, "userId", "ai_retrieval_feedback"),
    project_id: params.projectId ?? null,
    target_id: optionalUuid(params.targetId, "targetId", "ai_retrieval_feedback"),
    session_id: optionalSessionUuid(params.sessionId),
    tool_name: assertNonEmpty(params.toolName, "toolName", "ai_retrieval_feedback"),
    query_text: assertNonEmpty(params.queryText, "queryText", "ai_retrieval_feedback"),
    source_document_id: params.sourceDocumentId ?? null,
    source_chunk_id: params.sourceChunkId ?? null,
    rank: params.rank ?? null,
    score: params.score ?? null,
    cited: params.cited ?? false,
    user_referenced: params.userReferenced ?? false,
    used_in_answer: params.usedInAnswer ?? false,
    outcome: params.outcome ?? "unknown",
    metadata: normalizeJson(params.metadata),
  };

  const { data, error } = await supabase
    .from("ai_retrieval_feedback")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new AiFeedbackEventError(
      "ai_retrieval_feedback",
      "insert",
      error?.message ?? "insert returned no row",
    );
  }

  return data;
}

export async function recordRetrievalFeedbackBatch(
  rows: RecordRetrievalFeedbackParams[],
): Promise<AiRetrievalFeedbackRow[]> {
  if (rows.length === 0) return [];

  const supabase = createServiceClient();
  const payload: AiRetrievalFeedbackInsert[] = rows.map((params) => ({
    user_id: optionalUuid(params.userId, "userId", "ai_retrieval_feedback"),
    project_id: params.projectId ?? null,
    target_id: optionalUuid(params.targetId, "targetId", "ai_retrieval_feedback"),
    session_id: optionalSessionUuid(params.sessionId),
    tool_name: assertNonEmpty(params.toolName, "toolName", "ai_retrieval_feedback"),
    query_text: assertNonEmpty(params.queryText, "queryText", "ai_retrieval_feedback"),
    source_document_id: params.sourceDocumentId ?? null,
    source_chunk_id: params.sourceChunkId ?? null,
    rank: params.rank ?? null,
    score: params.score ?? null,
    cited: params.cited ?? false,
    user_referenced: params.userReferenced ?? false,
    used_in_answer: params.usedInAnswer ?? false,
    outcome: params.outcome ?? "unknown",
    metadata: normalizeJson(params.metadata),
  }));

  const { data, error } = await supabase
    .from("ai_retrieval_feedback")
    .insert(payload)
    .select("*");

  if (error || !data) {
    throw new AiFeedbackEventError(
      "ai_retrieval_feedback",
      "insert_batch",
      error?.message ?? "batch insert returned no rows",
    );
  }

  return data;
}

function jsonRecord(value: Json | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function requiredLearningString(
  learning: Record<string, unknown>,
  fieldName: string,
): string {
  const value = learning[fieldName];
  if (typeof value === "string" && value.trim()) return value.trim();
  throw new AiFeedbackEventError(
    "ai_learning_promotions",
    "validate",
    `retrieval_weight promotion proposed_learning.${fieldName} is required`,
  );
}

function optionalLearningString(
  learning: Record<string, unknown>,
  fieldName: string,
): string | null {
  const value = learning[fieldName];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function learningSourceMatchesRetrievalFeedback(
  learning: Record<string, unknown>,
  row: AiRetrievalFeedbackRow,
): boolean {
  const sourceChunkId = optionalLearningString(learning, "sourceChunkId");
  const sourceDocumentId = optionalLearningString(learning, "sourceDocumentId");
  if (sourceChunkId && row.source_chunk_id) {
    return sourceChunkId === row.source_chunk_id;
  }
  if (sourceDocumentId && row.source_document_id) {
    return sourceDocumentId === row.source_document_id;
  }
  return false;
}

function normalizeRetrievalOutcome(value: string): AiRetrievalOutcome {
  if (
    value === "helpful" ||
    value === "unhelpful" ||
    value === "wrong_project" ||
    value === "stale" ||
    value === "unsupported" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function retrievalWeightMultiplier(action: string, confidence: number): number {
  if (action === "boost") {
    return Math.round((1 + Math.min(0.5, confidence * 0.5)) * 100) / 100;
  }
  if (action === "downrank_review") {
    return Math.round((1 - Math.min(0.35, confidence * 0.35)) * 100) / 100;
  }
  throw new AiFeedbackEventError(
    "ai_learning_promotions",
    "validate",
    `Unsupported retrieval weight action: ${action}`,
  );
}

function retrievalWeightStatusSignal(
  status: AiRetrievalWeightStatus,
): AiFeedbackSignal {
  if (status === "active") return "accepted";
  if (status === "paused") return "needs_review";
  return "stale";
}

function normalizeQuerySignature(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 2)
    .slice(0, 10)
    .join(" ");
}

function retrievalPromotionGroupKey(row: AiRetrievalFeedbackRow): string | null {
  const metadata = jsonRecord(row.metadata);
  const sourceKey =
    row.source_chunk_id ??
    row.source_document_id ??
    (typeof metadata.recordId === "string" ? metadata.recordId : null);
  if (!sourceKey) return null;

  return [
    row.tool_name,
    row.project_id ?? "global",
    sourceKey,
    normalizeQuerySignature(row.query_text),
  ].join("|");
}

function retrievalPromotionSignature(groupKey: string, direction: "boost" | "downrank_review"): string {
  return `retrieval_weight:${direction}:${groupKey}`;
}

function retrievalPromotionTitle(params: {
  direction: "boost" | "downrank_review";
  toolName: string;
  sourceTitle?: string | null;
  querySignature: string;
}): string {
  const source = params.sourceTitle?.trim() || "retrieved source";
  const action = params.direction === "boost" ? "Boost" : "Review/down-rank";
  return `${action} ${source} for ${params.toolName}: ${params.querySignature}`;
}

function retrievalPromotionConfidence(params: {
  positiveCount: number;
  problemCount: number;
  totalCount: number;
}): number {
  const signalCount = Math.max(params.positiveCount, params.problemCount);
  const base = signalCount / Math.max(params.totalCount, signalCount);
  const volumeBonus = Math.min(0.2, signalCount * 0.03);
  return Math.min(0.95, Math.max(0.55, base + volumeBonus));
}

async function existingPromotionSignatures(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("ai_learning_promotions")
    .select("proposed_learning")
    .eq("promotion_type", "retrieval_weight")
    .in("status", ["candidate", "approved", "applied"]);

  if (error) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "select",
      error.message,
    );
  }

  return new Set(
    (data ?? [])
      .map((row) => jsonRecord(row.proposed_learning).signature)
      .filter((signature): signature is string => typeof signature === "string"),
  );
}

export async function generateRetrievalPromotionCandidates(
  params: GenerateRetrievalPromotionCandidatesParams = {},
): Promise<GenerateRetrievalPromotionCandidatesResult> {
  const windowDays = Math.min(90, Math.max(1, params.windowDays ?? 30));
  const minHelpfulSignals = Math.min(25, Math.max(2, params.minHelpfulSignals ?? 3));
  const minProblemSignals = Math.min(25, Math.max(2, params.minProblemSignals ?? 2));
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));
  const dryRun = params.dryRun ?? false;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("ai_retrieval_feedback")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2_000);

  if (error) {
    throw new AiFeedbackEventError(
      "ai_retrieval_feedback",
      "select",
      error.message,
    );
  }

  const rows = data ?? [];
  const grouped = new Map<string, AiRetrievalFeedbackRow[]>();
  for (const row of rows) {
    const key = retrievalPromotionGroupKey(row);
    if (!key) continue;
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }

  const existingSignatures = await existingPromotionSignatures(supabase);
  const candidates: RetrievalPromotionCandidatePreview[] = [];

  for (const [groupKey, groupRows] of grouped) {
    if (candidates.length >= limit) break;

    const helpfulRows = groupRows.filter((row) =>
      row.outcome === "helpful" && (row.cited || row.used_in_answer),
    );
    const problemRows = groupRows.filter((row) =>
      row.outcome === "unhelpful" ||
      row.outcome === "wrong_project" ||
      row.outcome === "stale" ||
      row.outcome === "unsupported",
    );

    const direction =
      helpfulRows.length >= minHelpfulSignals && problemRows.length === 0
        ? "boost"
        : problemRows.length >= minProblemSignals
          ? "downrank_review"
          : null;
    if (!direction) continue;

    const sourceRows = direction === "boost" ? helpfulRows : problemRows;
    const representative = sourceRows[0] ?? groupRows[0];
    if (!representative) continue;

    const metadata = jsonRecord(representative.metadata);
    const querySignature = normalizeQuerySignature(representative.query_text);
    const signature = retrievalPromotionSignature(groupKey, direction);
    if (existingSignatures.has(signature)) continue;

    const sourceEventIds = sourceRows.map((row) => row.id);
    const confidence = retrievalPromotionConfidence({
      positiveCount: helpfulRows.length,
      problemCount: problemRows.length,
      totalCount: groupRows.length,
    });
    const proposedLearning: Json = {
      signature,
      ruleKind: "retrieval_weight",
      action: direction,
      title: retrievalPromotionTitle({
        direction,
        toolName: representative.tool_name,
        sourceTitle: typeof metadata.title === "string" ? metadata.title : null,
        querySignature,
      }),
      toolName: representative.tool_name,
      projectId: representative.project_id,
      sourceDocumentId: representative.source_document_id,
      sourceChunkId: representative.source_chunk_id,
      querySignature,
      evidenceWindowDays: windowDays,
      signalCounts: {
        helpful: helpfulRows.length,
        problem: problemRows.length,
        total: groupRows.length,
      },
      rationale:
        direction === "boost"
          ? "Same source/chunk was repeatedly cited or used in helpful answers with no problem signals in the review window."
          : "Same source/chunk repeatedly produced unsupported, stale, wrong-project, or unhelpful retrieval outcomes and needs review before ranking changes.",
    };

    candidates.push({
      signature,
      promotionType: "retrieval_weight",
      projectId: representative.project_id,
      confidence,
      riskLevel: direction === "boost" ? "low" : "medium",
      destinationTable: "ai_retrieval_feedback",
      destinationRecordId: representative.id,
      sourceEventIds,
      proposedLearning,
    });
  }

  if (dryRun || candidates.length === 0) {
    return {
      inspectedRows: rows.length,
      groupsInspected: grouped.size,
      candidatesFound: candidates.length,
      candidatesCreated: 0,
      candidatesSkipped: candidates.length,
      dryRun,
      candidates,
    };
  }

  const payload: AiLearningPromotionInsert[] = candidates.map((candidate) => ({
    status: "candidate",
    promotion_type: candidate.promotionType,
    project_id: candidate.projectId,
    target_id: null,
    source_event_ids: candidate.sourceEventIds,
    destination_table: candidate.destinationTable,
    destination_record_id: candidate.destinationRecordId,
    confidence: candidate.confidence,
    risk_level: candidate.riskLevel,
    proposed_learning: candidate.proposedLearning,
    review_notes: null,
  }));

  const { data: created, error: insertError } = await supabase
    .from("ai_learning_promotions")
    .insert(payload)
    .select("*");

  if (insertError || !created) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "insert_batch",
      insertError?.message ?? "batch insert returned no rows",
    );
  }

  return {
    inspectedRows: rows.length,
    groupsInspected: grouped.size,
    candidatesFound: candidates.length,
    candidatesCreated: created.length,
    candidatesSkipped: candidates.length - created.length,
    dryRun,
    candidates,
  };
}

export async function applyRetrievalWeightPromotion(
  params: ApplyRetrievalWeightPromotionParams,
): Promise<ApplyRetrievalWeightPromotionResult> {
  const supabase = createServiceClient();
  const promotionId = optionalUuid(
    params.promotionId,
    "promotionId",
    "ai_learning_promotions",
  );

  if (!promotionId) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "validate",
      "promotionId is required",
    );
  }

  const { data: promotion, error: promotionError } = await supabase
    .from("ai_learning_promotions")
    .select("*")
    .eq("id", promotionId)
    .single();

  if (promotionError || !promotion) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "select",
      promotionError?.message ?? "promotion was not found",
    );
  }

  if (promotion.promotion_type !== "retrieval_weight") {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "validate",
      `Only retrieval_weight promotions can be applied by this writer. Received: ${promotion.promotion_type}`,
    );
  }

  if (promotion.status !== "approved") {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "validate",
      `Only approved retrieval_weight promotions can be applied. Received: ${promotion.status}`,
    );
  }

  const learning = jsonRecord(promotion.proposed_learning);
  const action = requiredLearningString(learning, "action");
  const querySignature = requiredLearningString(learning, "querySignature");
  const toolName = requiredLearningString(learning, "toolName");
  const payload: AiRetrievalWeightInsert = {
    promotion_id: promotion.id,
    project_id: promotion.project_id,
    tool_name: toolName,
    source_document_id: optionalLearningString(learning, "sourceDocumentId"),
    source_chunk_id: optionalLearningString(learning, "sourceChunkId"),
    query_signature: querySignature,
    action,
    weight_multiplier: retrievalWeightMultiplier(action, promotion.confidence),
    confidence: promotion.confidence,
    status: "active",
    metadata: {
      promotionType: promotion.promotion_type,
      sourceEventIds: promotion.source_event_ids,
      proposedLearning: promotion.proposed_learning,
    },
  };

  const { data: retrievalWeight, error: insertError } = await supabase
    .from("ai_retrieval_weights")
    .upsert(payload, { onConflict: "promotion_id" })
    .select("*")
    .single();

  if (insertError || !retrievalWeight) {
    throw new AiFeedbackEventError(
      "ai_retrieval_weights",
      "upsert",
      insertError?.message ?? "upsert returned no row",
    );
  }

  const { data: updatedPromotion, error: updateError } = await supabase
    .from("ai_learning_promotions")
    .update({
      status: "applied",
      destination_table: "ai_retrieval_weights",
      destination_record_id: retrievalWeight.id,
    })
    .eq("id", promotion.id)
    .select("*")
    .single();

  if (updateError || !updatedPromotion) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "update",
      updateError?.message ?? "promotion status update returned no row",
    );
  }

  await recordAiFeedbackEvent({
    userId: params.reviewedBy,
    projectId: promotion.project_id,
    sourceTable: "ai_learning_promotions",
    sourceRecordId: promotion.id,
    eventType: "retrieval_weight_applied",
    eventFamily: "retrieval",
    surface: "admin_ai_learning_promotions",
    subjectType: "ai_retrieval_weight",
    subjectId: retrievalWeight.id,
    signal: "accepted",
    reasonCategory: "retrieval_weight_apply",
    freeText: params.reviewNotes ?? null,
    beforeSnapshot: {
      status: promotion.status,
      destinationTable: promotion.destination_table,
      destinationRecordId: promotion.destination_record_id,
    },
    afterSnapshot: {
      status: updatedPromotion.status,
      destinationTable: updatedPromotion.destination_table,
      destinationRecordId: updatedPromotion.destination_record_id,
      retrievalWeightStatus: retrievalWeight.status,
      weightMultiplier: retrievalWeight.weight_multiplier,
    },
    sourceContext: {
      promotionId: promotion.id,
      promotionType: promotion.promotion_type,
      proposedLearning: promotion.proposed_learning,
    },
    metadata: {
      action: "apply",
      retrievalWeightId: retrievalWeight.id,
      previousStatus: promotion.status,
      newStatus: updatedPromotion.status,
    },
  });

  return {
    promotion: updatedPromotion,
    retrievalWeight,
  };
}

export async function previewRetrievalWeightPromotionImpact(
  params: PreviewRetrievalWeightPromotionImpactParams,
): Promise<PreviewRetrievalWeightPromotionImpactResult> {
  const supabase = createServiceClient();
  const promotionId = optionalUuid(
    params.promotionId,
    "promotionId",
    "ai_learning_promotions",
  );

  if (!promotionId) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "validate",
      "promotionId is required",
    );
  }

  const { data: promotion, error: promotionError } = await supabase
    .from("ai_learning_promotions")
    .select("*")
    .eq("id", promotionId)
    .single();

  if (promotionError || !promotion) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "select",
      promotionError?.message ?? "promotion was not found",
    );
  }

  if (promotion.promotion_type !== "retrieval_weight") {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "validate",
      `Only retrieval_weight promotions can be previewed by this reader. Received: ${promotion.promotion_type}`,
    );
  }

  const learning = jsonRecord(promotion.proposed_learning);
  const action = requiredLearningString(learning, "action");
  const toolName = requiredLearningString(learning, "toolName");
  const querySignature = requiredLearningString(learning, "querySignature");
  const multiplier = retrievalWeightMultiplier(action, promotion.confidence);
  const previewLimit = Math.min(25, Math.max(5, params.limit ?? 10));

  let query = supabase
    .from("ai_retrieval_feedback")
    .select("*")
    .eq("tool_name", toolName)
    .order("created_at", { ascending: false })
    .limit(500);

  if (promotion.project_id !== null) {
    query = query.eq("project_id", promotion.project_id);
  }

  const { data: rows, error } = await query;
  if (error) {
    throw new AiFeedbackEventError(
      "ai_retrieval_feedback",
      "select",
      error.message,
    );
  }

  const relevantRows = (rows ?? []).filter(
    (row) => normalizeQuerySignature(row.query_text) === querySignature,
  );
  const scoredRows = relevantRows.map((row) => {
    const originalScore = typeof row.score === "number" ? row.score : 0;
    const matchedPromotionSource = learningSourceMatchesRetrievalFeedback(learning, row);
    return {
      row,
      originalScore,
      adjustedScore: matchedPromotionSource
        ? originalScore * multiplier
        : originalScore,
      matchedPromotionSource,
    };
  });

  const beforeSorted = [...scoredRows].sort(
    (a, b) => b.originalScore - a.originalScore,
  );
  const afterSorted = [...scoredRows].sort(
    (a, b) => b.adjustedScore - a.adjustedScore,
  );
  const originalRankById = new Map(
    beforeSorted.map((item, index) => [item.row.id, index + 1]),
  );
  const adjustedRankById = new Map(
    afterSorted.map((item, index) => [item.row.id, index + 1]),
  );

  const toPreviewRow = (
    item: (typeof scoredRows)[number],
  ): RetrievalWeightImpactPreviewRow => ({
    retrievalFeedbackId: item.row.id,
    sourceDocumentId: item.row.source_document_id,
    sourceChunkId: item.row.source_chunk_id,
    outcome: normalizeRetrievalOutcome(item.row.outcome),
    cited: item.row.cited,
    usedInAnswer: item.row.used_in_answer,
    originalScore: item.originalScore,
    adjustedScore: item.adjustedScore,
    originalRank: originalRankById.get(item.row.id) ?? 0,
    adjustedRank: adjustedRankById.get(item.row.id) ?? 0,
    matchedPromotionSource: item.matchedPromotionSource,
  });

  const matchedBeforeRanks = scoredRows
    .filter((item) => item.matchedPromotionSource)
    .map((item) => originalRankById.get(item.row.id))
    .filter((rank): rank is number => typeof rank === "number");
  const matchedAfterRanks = scoredRows
    .filter((item) => item.matchedPromotionSource)
    .map((item) => adjustedRankById.get(item.row.id))
    .filter((rank): rank is number => typeof rank === "number");

  return {
    promotion,
    multiplier,
    inspectedRows: rows?.length ?? 0,
    matchingRows: relevantRows.length,
    beforeTop: beforeSorted.slice(0, previewLimit).map(toPreviewRow),
    afterTop: afterSorted.slice(0, previewLimit).map(toPreviewRow),
    matchedRankChange: {
      beforeBestRank:
        matchedBeforeRanks.length > 0 ? Math.min(...matchedBeforeRanks) : null,
      afterBestRank:
        matchedAfterRanks.length > 0 ? Math.min(...matchedAfterRanks) : null,
    },
  };
}

export async function updateRetrievalWeightStatus(
  params: UpdateRetrievalWeightStatusParams,
): Promise<UpdateRetrievalWeightStatusResult> {
  const supabase = createServiceClient();
  const promotionId = optionalUuid(
    params.promotionId,
    "promotionId",
    "ai_retrieval_weights",
  );

  if (!promotionId) {
    throw new AiFeedbackEventError(
      "ai_retrieval_weights",
      "validate",
      "promotionId is required",
    );
  }

  const { data: promotion, error: promotionError } = await supabase
    .from("ai_learning_promotions")
    .select("*")
    .eq("id", promotionId)
    .single();

  if (promotionError || !promotion) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "select",
      promotionError?.message ?? "promotion was not found",
    );
  }

  if (promotion.promotion_type !== "retrieval_weight") {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "validate",
      `Only retrieval_weight promotions have retrieval weight controls. Received: ${promotion.promotion_type}`,
    );
  }

  if (promotion.status !== "applied" && promotion.status !== "superseded") {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "validate",
      `Only applied or superseded retrieval_weight promotions can be controlled. Received: ${promotion.status}`,
    );
  }

  const { data: previousRetrievalWeight, error: previousWeightError } =
    await supabase
      .from("ai_retrieval_weights")
      .select("*")
      .eq("promotion_id", promotion.id)
      .single();

  if (previousWeightError || !previousRetrievalWeight) {
    throw new AiFeedbackEventError(
      "ai_retrieval_weights",
      "select",
      previousWeightError?.message ?? "retrieval weight was not found",
    );
  }

  const { data: retrievalWeight, error: weightError } = await supabase
    .from("ai_retrieval_weights")
    .update({
      status: params.status,
    })
    .eq("promotion_id", promotion.id)
    .select("*")
    .single();

  if (weightError || !retrievalWeight) {
    throw new AiFeedbackEventError(
      "ai_retrieval_weights",
      "update",
      weightError?.message ?? "retrieval weight update returned no row",
    );
  }

  const promotionStatus: AiLearningPromotionStatus =
    params.status === "superseded" ? "superseded" : "applied";
  const { data: updatedPromotion, error: updateError } = await supabase
    .from("ai_learning_promotions")
    .update({
      status: promotionStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: optionalUuid(
        params.reviewedBy,
        "reviewedBy",
        "ai_learning_promotions",
      ),
      review_notes: params.reviewNotes ?? promotion.review_notes,
    })
    .eq("id", promotion.id)
    .select("*")
    .single();

  if (updateError || !updatedPromotion) {
    throw new AiFeedbackEventError(
      "ai_learning_promotions",
      "update",
      updateError?.message ?? "promotion status update returned no row",
    );
  }

  await recordAiFeedbackEvent({
    userId: params.reviewedBy,
    projectId: promotion.project_id,
    sourceTable: "ai_learning_promotions",
    sourceRecordId: promotion.id,
    eventType: "retrieval_weight_status_changed",
    eventFamily: "retrieval",
    surface: "admin_ai_learning_promotions",
    subjectType: "ai_retrieval_weight",
    subjectId: retrievalWeight.id,
    signal: retrievalWeightStatusSignal(params.status),
    reasonCategory: "retrieval_weight_control",
    freeText: params.reviewNotes ?? null,
    beforeSnapshot: {
      status: previousRetrievalWeight.status,
      promotionStatus: promotion.status,
      weightMultiplier: previousRetrievalWeight.weight_multiplier,
    },
    afterSnapshot: {
      status: retrievalWeight.status,
      promotionStatus: updatedPromotion.status,
      weightMultiplier: retrievalWeight.weight_multiplier,
    },
    sourceContext: {
      promotionId: promotion.id,
      promotionType: promotion.promotion_type,
      proposedLearning: promotion.proposed_learning,
    },
    metadata: {
      action: params.status,
      retrievalWeightId: retrievalWeight.id,
      previousStatus: previousRetrievalWeight.status,
      newStatus: retrievalWeight.status,
    },
  });

  return {
    promotion: updatedPromotion,
    retrievalWeight,
  };
}
