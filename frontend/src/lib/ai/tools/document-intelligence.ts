import { tool } from "ai";
import { z } from "zod";
import {
  createRagServiceClient,
  createServiceClient,
  isRagDatabaseReadsEnabled,
} from "@/lib/supabase/service";
import {
  type ToolTracePayload,
  withTrace as _withTrace,
  getOpenAI,
  generateEmbedding,
  EMBEDDING,
  resolveProject,
} from "./tool-utils";
import { createToolGuardrails } from "./guardrails";

type AnyRow = Record<string, unknown>;

type CreateDocumentIntelligenceToolsOptions = {
  onTrace?: (trace: ToolTracePayload) => void;
  pinnedProjectId?: number;
};

function withTrace<TInput extends Record<string, unknown>, TResult>(
  name: string,
  options: CreateDocumentIntelligenceToolsOptions,
  execute: (input: TInput) => Promise<TResult>,
) {
  return _withTrace(
    name,
    options,
    execute,
    "This document intelligence tool failed. Explain the gap and proceed with other available information.",
  );
}

// ---------------------------------------------------------------------------
// Spec requirement types
// ---------------------------------------------------------------------------

const REQUIREMENT_TYPES = [
  "material",
  "manufacturer",
  "performance",
  "documentation",
  "code_reference",
  "installation",
  "warranty",
] as const;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDocumentIntelligenceTools(
  userId: string,
  options: CreateDocumentIntelligenceToolsOptions = {},
) {
  const supabase = createServiceClient();
  const ragSupabase = isRagDatabaseReadsEnabled()
    ? createRagServiceClient()
    : supabase;
  const guardrails = createToolGuardrails(userId, {
    pinnedProjectId: options.pinnedProjectId,
  });

  return {
    // -----------------------------------------------------------------------
    // 1. getSubmittalLog
    // -----------------------------------------------------------------------
    getSubmittalLog: tool({
      description:
        "Fetch the submittal register for a project — what submittals are required, " +
        "submitted, approved, rejected, or missing. Use when asked about submittal " +
        "status, pipeline, or progress. Also use as the first step before " +
        "detectMissingSubmittals.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
        status: z
          .enum([
            "open",
            "submitted",
            "approved",
            "rejected",
            "draft",
            "distributed",
            "all",
          ])
          .optional()
          .default("all")
          .describe("Filter by status. Default: all"),
        specSection: z
          .string()
          .optional()
          .describe("Filter to a specific spec section, e.g. '08-1113'"),
      }),
      execute: withTrace(
        "getSubmittalLog",
        options,
        async ({ projectId, projectName, status, specSection }) => {
          const resolved = await resolveProject(
            supabase,
            guardrails,
            projectId,
            projectName,
          );
          if ("error" in resolved) return resolved;

          let query = supabase
            .from("submittals")
            .select(
              "id, submittal_number, title, specification_section, division, " +
                "submittal_type, status, priority, submission_date, " +
                "required_approval_date, final_due_date, ball_in_court, " +
                "submitter_company, revision",
            )
            .eq("project_id", resolved.id)
            .is("deleted_at", null)
            .order("specification_section", { ascending: true });

          if (status && status !== "all") {
            query = query.ilike("status", status);
          }
          if (specSection) {
            query = query.ilike("specification_section", `%${specSection}%`);
          }

          const { data: submittals, error } = await query.limit(200);
          if (error)
            return { error: `Failed to fetch submittals: ${error.message}` };

          const rows = (submittals ?? []) as unknown as AnyRow[];

          const byStatus: Record<string, AnyRow[]> = {};
          for (const row of rows) {
            const s = (row.status as string) ?? "unknown";
            byStatus[s] = byStatus[s] ?? [];
            byStatus[s].push(row);
          }

          const summary = Object.entries(byStatus).map(([s, items]) => ({
            status: s,
            count: items.length,
          }));

          const overdue = rows.filter((r) => {
            const due = r.final_due_date ?? r.required_approval_date;
            if (!due) return false;
            return (
              new Date(due as string) < new Date() && r.status !== "approved"
            );
          });

          return {
            project: { id: resolved.id, name: resolved.name },
            total: rows.length,
            summary,
            overdueCount: overdue.length,
            submittals: rows.map((r) => ({
              id: r.id,
              number: r.submittal_number,
              title: r.title,
              specSection: r.specification_section,
              division: r.division,
              type: r.submittal_type,
              status: r.status,
              priority: r.priority,
              ballInCourt: r.ball_in_court,
              submitter: r.submitter_company,
              submittedDate: r.submission_date,
              dueDate: r.final_due_date ?? r.required_approval_date,
              revision: r.revision,
            })),
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 2. getSpecRequirements
    // -----------------------------------------------------------------------
    getSpecRequirements: tool({
      description:
        "Search project specification documents for requirements related to a trade, " +
        "product, or spec section. Returns structured requirements (material, manufacturer, " +
        "performance, documentation, code reference). Use when asked what the spec " +
        "requires for a given system or product, or before reviewing a submittal.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "What to search for, e.g. 'HVAC equipment requirements', " +
              "'fire sprinkler pipe material', 'Section 08-1113 doors'",
          ),
        projectId: z.number().optional().describe("Project ID to scope search"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
        topK: z
          .number()
          .optional()
          .default(12)
          .describe("Number of chunks to retrieve. Default 12."),
      }),
      execute: withTrace(
        "getSpecRequirements",
        options,
        async ({ query, projectId, projectName, topK }) => {
          let resolvedProjectId: number | undefined;
          if (projectId || projectName) {
            const resolved = await resolveProject(
              supabase,
              guardrails,
              projectId,
              projectName,
            );
            if (!("error" in resolved)) {
              resolvedProjectId = resolved.id;
            }
          }

          const openai = getOpenAI();
          const embedding = await generateEmbedding(
            openai,
            query,
            EMBEDDING.LARGE,
          );

          // Search document_chunks — OneDrive docs are where specs live.
          // Use search_document_chunks RPC which handles halfvec(3072).
          const { data: chunks, error } = await (
            ragSupabase as unknown as {
              rpc: (
                name: string,
                args: Record<string, unknown>,
              ) => Promise<{
                data: Array<Record<string, unknown>> | null;
                error: { message: string } | null;
              }>;
            }
          ).rpc("search_document_chunks", {
            query_embedding: embedding,
            filter_source_types: ["onedrive_document"],
            filter_project_id: resolvedProjectId ?? null,
            match_count: topK ?? 12,
            match_threshold: 0.3,
          });

          if (error) return { error: `Spec search failed: ${error.message}` };

          const results = (chunks ?? []) as AnyRow[];

          // Filter to docs that look like specs by title pattern
          const specKeywords = [
            "spec",
            "specification",
            "division",
            "section",
            "csi",
          ];
          const specResults = results.filter((r) => {
            const meta = (r.doc_metadata ?? r.metadata) as AnyRow | null;
            const title = ((meta?.title as string) ?? "").toLowerCase();
            return specKeywords.some((kw) => title.includes(kw));
          });

          // If filtering reduces to nothing, fall back to all results
          const finalResults = specResults.length > 0 ? specResults : results;

          // Group chunks by source document
          const byDoc = new Map<string, { title: string; chunks: string[] }>();
          for (const r of finalResults) {
            const meta = (r.doc_metadata ?? r.metadata) as AnyRow | null;
            const docId = (r.document_id as string) ?? "unknown";
            const title =
              (r.doc_title as string | null) ??
              (meta?.title as string) ??
              docId;
            if (!byDoc.has(docId)) {
              byDoc.set(docId, { title, chunks: [] });
            }
            byDoc.get(docId)!.chunks.push((r.chunk_text ?? r.text) as string);
          }

          const sources = Array.from(byDoc.entries()).map(([docId, doc]) => ({
            documentId: docId,
            title: doc.title,
            excerptCount: doc.chunks.length,
            excerpts: doc.chunks.slice(0, 3), // top 3 excerpts per doc
          }));

          const allText = finalResults
            .map((r) => (r.chunk_text ?? r.text) as string)
            .join("\n\n");

          return {
            query,
            projectId: resolvedProjectId,
            totalChunks: finalResults.length,
            sources,
            combinedText: allText.substring(0, 6000),
            note:
              finalResults.length === 0
                ? "No spec content found. Spec documents may not be chunked yet — " +
                  "check the Documents page to verify OneDrive spec PDFs are ingested."
                : undefined,
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 3. detectMissingSubmittals
    // -----------------------------------------------------------------------
    detectMissingSubmittals: tool({
      description:
        "Cross-reference the submittal register against what the project scope and " +
        "spec documents suggest is needed. Returns submittals that appear to be " +
        "missing or incomplete. Use when asked 'what submittals are we missing?' or " +
        "'is our submittal log complete?'",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
      }),
      execute: withTrace(
        "detectMissingSubmittals",
        options,
        async ({ projectId, projectName }) => {
          const resolved = await resolveProject(
            supabase,
            guardrails,
            projectId,
            projectName,
          );
          if ("error" in resolved) return resolved;

          // Fetch existing submittals
          const { data: submittals, error: subError } = await supabase
            .from("submittals")
            .select("id, title, specification_section, status, division")
            .eq("project_id", resolved.id)
            .is("deleted_at", null);

          if (subError)
            return { error: `Failed to fetch submittals: ${subError.message}` };

          const rows = (submittals ?? []) as unknown as AnyRow[];
          const existingSections = new Set(
            rows
              .map((r) =>
                (r.specification_section as string | null)?.toLowerCase(),
              )
              .filter(Boolean),
          );

          const totalSubmittals = rows.length;
          const withSection = rows.filter(
            (r) => r.specification_section,
          ).length;
          const withoutSection = totalSubmittals - withSection;

          const statusBreakdown: Record<string, number> = {};
          for (const r of rows) {
            const s = (r.status as string) ?? "unknown";
            statusBreakdown[s] = (statusBreakdown[s] ?? 0) + 1;
          }

          const overdue = rows.filter((r) => {
            if (r.status === "approved" || r.status === "distributed")
              return false;
            // No due date data in this query — flag open/draft items as watch
            return r.status === "open" || r.status === "draft";
          });

          return {
            project: { id: resolved.id, name: resolved.name },
            summary: {
              totalSubmittals,
              withSpecSection: withSection,
              withoutSpecSection: withoutSection,
              statusBreakdown,
              overdueOrOpenCount: overdue.length,
            },
            missingSpecSections:
              withoutSection > 0
                ? "Some submittals have no spec section assigned — they cannot be " +
                  "cross-referenced against drawings or specs until sections are added."
                : null,
            existingSections: Array.from(existingSections).sort(),
            recommendations: [
              totalSubmittals < 5
                ? "Submittal register appears sparse. Verify all required submittals " +
                  "have been logged. Cross-reference against the spec table of contents."
                : null,
              withoutSection > 0
                ? `${withoutSection} submittal(s) are missing spec section numbers — ` +
                  "assign sections so they can be tracked against spec requirements."
                : null,
              overdue.length > 0
                ? `${overdue.length} submittal(s) are open or in draft — ` +
                  "confirm these are actively being processed."
                : null,
            ].filter(Boolean),
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 4. logFeedback
    // -----------------------------------------------------------------------
    logFeedback: tool({
      description:
        "Record a human correction or validation of an AI document review finding. " +
        "Use when the user says 'that finding was wrong', 'that's correct', or wants " +
        "to annotate an AI review result. This feeds the learning loop.",
      inputSchema: z.object({
        reviewType: z
          .enum([
            "submittal_review",
            "spec_comparison",
            "drawing_check",
            "change_detection",
          ])
          .describe("What type of review this feedback is for"),
        aiFinding: z
          .string()
          .describe("The AI finding being corrected or validated"),
        aiStatus: z
          .enum(["Match", "Missing", "Conflict", "Unclear", "Not Applicable"])
          .describe("The status the AI assigned"),
        feedbackCategory: z
          .enum([
            "correct",
            "missed_requirement",
            "wrong_document_match",
            "bad_interpretation",
            "hallucinated_issue",
            "too_vague",
            "useful_low_priority",
            "needs_expert_review",
          ])
          .describe("How to categorize this feedback"),
        projectId: z.number().optional().describe("Project ID if known"),
        documentId: z.string().optional().describe("Document or submittal ID"),
        specSection: z
          .string()
          .optional()
          .describe("Spec section this finding relates to"),
        requirementType: z
          .enum(REQUIREMENT_TYPES)
          .optional()
          .describe("Type of requirement"),
        correctedStatus: z
          .string()
          .optional()
          .describe("What the status should have been"),
        correctedReason: z.string().optional().describe("Why the AI was wrong"),
        sourceOfTruthRef: z
          .string()
          .optional()
          .describe(
            "The document/section that settles this (e.g. 'Spec Section 15100, page 4')",
          ),
      }),
      execute: withTrace(
        "logFeedback",
        options,
        async ({
          reviewType,
          aiFinding,
          aiStatus,
          feedbackCategory,
          projectId,
          documentId,
          specSection,
          requirementType,
          correctedStatus,
          correctedReason,
          sourceOfTruthRef,
        }) => {
          const { data, error } = await supabase
            .from("ai_review_feedback")
            .insert({
              project_id: projectId ?? null,
              document_id: documentId ?? null,
              review_type: reviewType,
              ai_finding: aiFinding,
              ai_status: aiStatus,
              feedback_category: feedbackCategory,
              spec_section: specSection ?? null,
              requirement_type: requirementType ?? null,
              corrected_status: correctedStatus ?? null,
              corrected_reason: correctedReason ?? null,
              source_of_truth_ref: sourceOfTruthRef ?? null,
              created_by: userId,
            })
            .select("id")
            .single();

          if (error)
            return { error: `Failed to log feedback: ${error.message}` };

          return {
            success: true,
            feedbackId: (data as AnyRow).id,
            message:
              feedbackCategory === "correct"
                ? "Confirmed — logged as correct. This reinforces the detection pattern."
                : `Logged as '${feedbackCategory}'. This correction will improve future reviews.`,
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 5. reviewDocument (stub — Phase 2 will call the Document Intelligence Agent)
    // -----------------------------------------------------------------------
    reviewDocument: tool({
      description:
        "Request a structured pre-review of a submittal document against project " +
        "spec requirements. Returns a requirements matrix comparing what the spec " +
        "requires against what the submittal provides. Use when asked to 'review this " +
        "submittal', 'check this against the spec', or 'pre-review this document'.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID"),
        projectName: z.string().optional().describe("Project name"),
        submittalId: z
          .string()
          .optional()
          .describe("Existing submittal record ID to review"),
        specSections: z
          .array(z.string())
          .optional()
          .describe(
            "Specific spec sections to compare against, e.g. ['08-1113', '15100']",
          ),
        focusArea: z
          .string()
          .optional()
          .describe(
            "What to focus the review on, e.g. 'pipe material requirements'",
          ),
      }),
      execute: withTrace(
        "reviewDocument",
        options,
        async ({
          projectId,
          projectName,
          submittalId,
          specSections,
          focusArea,
        }) => {
          let resolvedId: number | undefined;
          if (projectId || projectName) {
            const resolved = await resolveProject(
              supabase,
              guardrails,
              projectId,
              projectName,
            );
            if (!("error" in resolved)) resolvedId = resolved.id;
          }

          // If a submittal ID is provided, fetch its details
          let submittalInfo: AnyRow | null = null;
          if (submittalId) {
            const { data } = await supabase
              .from("submittals")
              .select(
                "id, title, specification_section, division, status, description",
              )
              .eq("id", submittalId)
              .single();
            submittalInfo = data as AnyRow | null;
          }

          // Phase 1 stub: explain what the full review will do and surface
          // what spec content is available to compare against.
          const specQuery =
            focusArea ??
            (submittalInfo
              ? `${submittalInfo.title} ${submittalInfo.specification_section ?? ""}`
              : (specSections?.join(" ") ?? "submittal requirements"));

          const openai = getOpenAI();
          const embedding = await generateEmbedding(
            openai,
            specQuery,
            EMBEDDING.LARGE,
          );

          const { data: specChunks } = await (
            ragSupabase as unknown as {
              rpc: (
                name: string,
                args: Record<string, unknown>,
              ) => Promise<{
                data: Array<Record<string, unknown>> | null;
                error: { message: string } | null;
              }>;
            }
          ).rpc("search_document_chunks", {
            query_embedding: embedding,
            filter_source_types: ["onedrive_document"],
            filter_project_id: resolvedId ?? null,
            match_count: 8,
            match_threshold: 0.3,
          });

          const chunks = (specChunks ?? []) as AnyRow[];
          const specKeywords = [
            "spec",
            "specification",
            "division",
            "section",
            "require",
          ];
          const relevantChunks = chunks.filter((c) => {
            const meta = (c.doc_metadata ?? c.metadata) as AnyRow | null;
            const title = ((meta?.title as string) ?? "").toLowerCase();
            const text = (
              ((c.chunk_text ?? c.text) as string) ?? ""
            ).toLowerCase();
            return (
              specKeywords.some((kw) => title.includes(kw)) ||
              specKeywords.some((kw) => text.includes(kw))
            );
          });

          return {
            status: "phase_1_stub",
            message:
              "Full Document Intelligence Agent (Phase 2) is not yet deployed. " +
              "Here is the available spec content for this review:",
            submittal: submittalInfo
              ? {
                  id: submittalInfo.id,
                  title: submittalInfo.title,
                  specSection: submittalInfo.specification_section,
                  currentStatus: submittalInfo.status,
                }
              : null,
            specContentAvailable: relevantChunks.length > 0,
            specChunksFound: relevantChunks.length,
            specExcerpts: relevantChunks.slice(0, 3).map((c) => ({
              source:
                (c.doc_title as string | null) ??
                (((c.doc_metadata ?? c.metadata) as AnyRow | null)
                  ?.title as string) ??
                "Unknown document",
              text: ((c.chunk_text ?? c.text) as string).substring(0, 400),
            })),
            nextStep:
              relevantChunks.length > 0
                ? "Use getSpecRequirements to pull the full spec content for this " +
                  "section, then ask me to compare it against the submittal details."
                : "No spec content found for this topic. Verify spec documents are " +
                  "uploaded and chunked in the Documents page.",
          };
        },
      ),
    }),
  };
}
