/**
 * Meeting Segment Enrichment Worker
 *
 * Runs as a Cloudflare Worker cron (daily) and on-demand.
 *
 * Two jobs in one worker:
 *
 * 1. SEGMENT ENRICHMENT — classifies existing/new meeting_segments with:
 *    - data_class[]  (decision, risk_signal, financial_event, etc.)
 *    - sentiment     (positive, neutral, negative, escalation)
 *    - project_impact[] (schedule, cost, quality, relationship, safety, scope)
 *    - mentioned_people[]
 *
 * 2. RISK SNAPSHOTS — writes one project_risk_snapshots row per active project
 *    daily, with trend derived from prior day's snapshot.
 *
 * Why this matters for Council Mode:
 *   - CFO/COO/CRO/CHRO/VP BD agents query by data_class + sentiment to form
 *     strong opinions rather than retrieving generic content.
 *   - CRO can say "Goodwill Tremont has been deteriorating for 6 weeks" because
 *     risk_trajectory data exists.
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import type { Env } from "../shared/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ENRICHMENT_MODEL = "gpt-4o-mini"; // fast + cheap for classification
const BATCH_SIZE = 20; // segments to enrich per run
const MAX_SEGMENT_LENGTH = 2000; // chars sent to classifier (truncate long segments)

// ─── Types ────────────────────────────────────────────────────────────────────

interface SegmentEnrichment {
  data_class: string[];
  sentiment: "positive" | "neutral" | "negative" | "escalation";
  project_impact: string[];
  mentioned_people: string[];
}

interface RiskSignals {
  project_id: number;
  risk_score: number;
  open_risks: number;
  critical_risks: number;
  open_issues: number;
  overdue_tasks: number;
  aging_rfis: number;
  unresolved_insights: number;
}

// ─── Enrichment prompt ────────────────────────────────────────────────────────

function buildClassificationPrompt(segment: {
  title: string | null;
  summary: string | null;
  decisions: unknown;
  risks: unknown;
  tasks: unknown;
}): string {
  const content = [
    segment.title ? `Title: ${segment.title}` : null,
    segment.summary ? `Summary: ${segment.summary.slice(0, MAX_SEGMENT_LENGTH)}` : null,
    Array.isArray(segment.decisions) && segment.decisions.length > 0
      ? `Decisions: ${JSON.stringify(segment.decisions).slice(0, 500)}`
      : null,
    Array.isArray(segment.risks) && segment.risks.length > 0
      ? `Risks: ${JSON.stringify(segment.risks).slice(0, 500)}`
      : null,
    Array.isArray(segment.tasks) && segment.tasks.length > 0
      ? `Tasks: ${JSON.stringify(segment.tasks).slice(0, 300)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a construction project management data classifier. Analyze this meeting segment and return a JSON object with exactly these fields:

{
  "data_class": string[],       // subset of: ["decision","risk_signal","financial_event","action_item","relationship_signal","lesson_learned","schedule_event","change_event"]
  "sentiment": string,           // exactly one of: "positive","neutral","negative","escalation"
  "project_impact": string[],   // subset of: ["schedule","cost","quality","relationship","safety","scope"]
  "mentioned_people": string[]  // first names or full names of people explicitly mentioned or speaking
}

Rules:
- data_class must contain at least one value
- "escalation" sentiment = disputes, raised concerns, owner dissatisfaction, threats to claim or stop work
- "negative" = problems flagged without escalation
- Only include project_impact dimensions that are explicitly relevant
- mentioned_people = only names clearly present in the text, no guessing

Meeting segment:
${content}

Return ONLY the JSON object, no explanation.`;
}

// ─── Job 1: Segment Enrichment ────────────────────────────────────────────────

async function runSegmentEnrichment(
  supabase: ReturnType<typeof createClient>,
  openai: OpenAI,
): Promise<{ enriched: number; errors: number }> {
  // Fetch unenriched segments
  const { data: segments, error } = await supabase
    .from("meeting_segments")
    .select("id, title, summary, decisions, risks, tasks")
    .is("enriched_at", null)
    .not("summary", "is", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !segments?.length) {
    console.log("[enrichment] no unenriched segments found or error:", error?.message);
    return { enriched: 0, errors: 0 };
  }

  console.log(`[enrichment] processing ${segments.length} segments`);

  let enriched = 0;
  let errors = 0;

  for (const segment of segments) {
    try {
      const prompt = buildClassificationPrompt(segment);

      const response = await openai.chat.completions.create({
        model: ENRICHMENT_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 300,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const classification = JSON.parse(raw) as SegmentEnrichment;

      // Validate the response has expected shape
      if (!Array.isArray(classification.data_class)) {
        throw new Error("Invalid classification response: missing data_class");
      }

      const { error: updateError } = await supabase
        .from("meeting_segments")
        .update({
          data_class: classification.data_class,
          sentiment: classification.sentiment ?? "neutral",
          project_impact: classification.project_impact ?? [],
          mentioned_people: classification.mentioned_people ?? [],
          enriched_at: new Date().toISOString(),
          enrichment_model: ENRICHMENT_MODEL,
        })
        .eq("id", segment.id);

      if (updateError) {
        console.error(`[enrichment] update failed for ${segment.id}:`, updateError.message);
        errors++;
      } else {
        enriched++;
      }
    } catch (e) {
      console.error(`[enrichment] segment ${segment.id} failed:`, e);
      errors++;

      // Mark as enriched with empty values so we don't retry bad segments forever
      // (retry logic: if enriched_at is set but data_class is empty, it's a failed enrichment)
      await supabase
        .from("meeting_segments")
        .update({
          data_class: [],
          enriched_at: new Date().toISOString(),
          enrichment_model: `${ENRICHMENT_MODEL}:error`,
        })
        .eq("id", segment.id);
    }
  }

  console.log(`[enrichment] done — enriched: ${enriched}, errors: ${errors}`);
  return { enriched, errors };
}

// ─── Job 2: Risk Snapshots ────────────────────────────────────────────────────

async function runRiskSnapshots(
  supabase: ReturnType<typeof createClient>,
  openai: OpenAI,
): Promise<{ snapshotted: number; errors: number }> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Get all active projects
  const { data: projects, error: projError } = await supabase
    .from("projects")
    .select("id, name")
    .not("phase", "eq", "closed");

  if (projError || !projects?.length) {
    console.log("[snapshots] no active projects or error:", projError?.message);
    return { snapshotted: 0, errors: 0 };
  }

  let snapshotted = 0;
  let errors = 0;

  for (const project of projects) {
    try {
      const signals = await gatherRiskSignals(supabase, project.id);

      // Compute composite risk score (0–100)
      const riskScore = computeRiskScore(signals);

      // Determine trend vs yesterday
      const trend = await computeTrend(supabase, project.id, riskScore, today);

      // Generate narrative for significant changes
      let riskNarrative: string | null = null;
      if (trend === "deteriorating" || riskScore > 60) {
        riskNarrative = await generateRiskNarrative(openai, project.name, signals, trend);
      }

      const { error: insertError } = await supabase
        .from("project_risk_snapshots")
        .upsert(
          {
            project_id: project.id,
            snapshot_date: today,
            risk_score: riskScore,
            open_risks: signals.open_risks,
            critical_risks: signals.critical_risks,
            open_issues: signals.open_issues,
            overdue_tasks: signals.overdue_tasks,
            aging_rfis: signals.aging_rfis,
            unresolved_insights: signals.unresolved_insights,
            trend,
            risk_narrative: riskNarrative,
          },
          { onConflict: "project_id,snapshot_date" },
        );

      if (insertError) {
        console.error(`[snapshots] upsert failed for project ${project.id}:`, insertError.message);
        errors++;
      } else {
        snapshotted++;
      }
    } catch (e) {
      console.error(`[snapshots] project ${project.id} failed:`, e);
      errors++;
    }
  }

  console.log(`[snapshots] done — snapshotted: ${snapshotted}, errors: ${errors}`);
  return { snapshotted, errors };
}

// ─── Risk signal gathering ────────────────────────────────────────────────────

async function gatherRiskSignals(
  supabase: ReturnType<typeof createClient>,
  projectId: number,
): Promise<RiskSignals> {
  const rfiCutoff = new Date();
  rfiCutoff.setDate(rfiCutoff.getDate() - 14);

  const [risksResult, issuesResult, tasksResult, rfisResult, insightsResult] =
    await Promise.all([
      // Open risks from project_insights
      supabase
        .from("project_insights")
        .select("id, severity")
        .eq("project_id", projectId),

      // Open issues
      supabase
        .from("issues")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "open"),

      // Overdue tasks
      supabase
        .from("schedule_tasks")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "in_progress")
        .lt("end_date", new Date().toISOString()),

      // Aging RFIs (open > 14 days)
      supabase
        .from("rfis")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "open")
        .lt("created_at", rfiCutoff.toISOString()),

      // Unresolved AI insights
      supabase
        .from("ai_insights")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "open"),
    ]);

  const risks = risksResult.data ?? [];
  const criticalRisks = risks.filter(
    (r) => r.severity === "critical" || r.severity === "high",
  ).length;

  return {
    project_id: projectId,
    open_risks: risks.length,
    critical_risks: criticalRisks,
    open_issues: issuesResult.data?.length ?? 0,
    overdue_tasks: tasksResult.data?.length ?? 0,
    aging_rfis: rfisResult.data?.length ?? 0,
    unresolved_insights: insightsResult.data?.length ?? 0,
    // risk_score computed separately
    risk_score: 0,
  };
}

function computeRiskScore(signals: RiskSignals): number {
  // Weighted composite: critical risks weigh most, then insights, then operational
  const score =
    signals.critical_risks * 15 +
    signals.unresolved_insights * 8 +
    signals.open_risks * 5 +
    signals.aging_rfis * 4 +
    signals.overdue_tasks * 2 +
    signals.open_issues * 3;

  return Math.min(100, Math.round(score));
}

async function computeTrend(
  supabase: ReturnType<typeof createClient>,
  projectId: number,
  currentScore: number,
  today: string,
): Promise<"improving" | "stable" | "deteriorating" | "new"> {
  const { data: prior } = await supabase
    .from("project_risk_snapshots")
    .select("risk_score")
    .eq("project_id", projectId)
    .lt("snapshot_date", today)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  if (!prior) return "new";

  const delta = currentScore - prior.risk_score;
  if (delta > 8) return "deteriorating";
  if (delta < -8) return "improving";
  return "stable";
}

async function generateRiskNarrative(
  openai: OpenAI,
  projectName: string,
  signals: RiskSignals,
  trend: string,
): Promise<string> {
  const prompt = `Write ONE sentence (max 20 words) summarizing the dominant risk for "${projectName}" this week. Be specific, not generic.

Data: ${signals.critical_risks} critical risks, ${signals.overdue_tasks} overdue tasks, ${signals.aging_rfis} aging RFIs, ${signals.unresolved_insights} unresolved AI insights. Trend: ${trend}.

Return only the sentence, no quotes.`;

  const response = await openai.chat.completions.create({
    model: ENRICHMENT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 60,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

// ─── Worker entry point ───────────────────────────────────────────────────────

export default {
  // Cron: runs daily at 2am UTC
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    console.log("[enrich-worker] starting scheduled run");

    const [enrichResult, snapshotResult] = await Promise.all([
      runSegmentEnrichment(supabase, openai),
      runRiskSnapshots(supabase, openai),
    ]);

    console.log("[enrich-worker] complete", { enrichResult, snapshotResult });
  },

  // HTTP: trigger on-demand (e.g. after a new meeting is ingested)
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    if (url.pathname === "/enrich-segments") {
      const result = await runSegmentEnrichment(supabase, openai);
      return Response.json(result);
    }

    if (url.pathname === "/snapshot-risks") {
      const result = await runRiskSnapshots(supabase, openai);
      return Response.json(result);
    }

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    return new Response("Not found", { status: 404 });
  },
};
