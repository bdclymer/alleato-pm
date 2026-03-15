/**
 * Local runner for meeting segment enrichment + risk snapshots
 * Uses frontend node_modules and .env.local
 *
 * Usage:
 *   node scripts/run-enrichment.mjs [--segments] [--snapshots] [--both]
 *   (defaults to --both)
 */

import { createClient } from "../frontend/node_modules/@supabase/supabase-js/dist/index.mjs";
import OpenAI from "../frontend/node_modules/openai/index.mjs";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = path.join(__dirname, "../frontend/.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = val;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ENRICHMENT_MODEL = "gpt-4o-mini";
const BATCH_SIZE = 50; // larger for local run
const MAX_SEGMENT_LENGTH = 2000;

// ─── Segment Enrichment ───────────────────────────────────────────────────────

function buildClassificationPrompt(segment) {
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

async function runSegmentEnrichment() {
  console.log("\n[enrichment] fetching unenriched segments...");
  const { data: segments, error } = await supabase
    .from("meeting_segments")
    .select("id, title, summary, decisions, risks, tasks")
    .is("enriched_at", null)
    .not("summary", "is", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !segments?.length) {
    console.log("[enrichment] no unenriched segments:", error?.message ?? "none found");
    return { enriched: 0, errors: 0 };
  }

  console.log(`[enrichment] processing ${segments.length} segments...`);

  let enriched = 0;
  let errors = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    process.stdout.write(`  [${i + 1}/${segments.length}] segment ${segment.id}...`);

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
      const classification = JSON.parse(raw);

      if (!Array.isArray(classification.data_class)) {
        throw new Error("Invalid classification: missing data_class");
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
        console.log(` ✗ update failed: ${updateError.message}`);
        errors++;
      } else {
        console.log(` ✓ [${classification.data_class.join(",")}] ${classification.sentiment}`);
        enriched++;
      }
    } catch (e) {
      console.log(` ✗ ${e.message}`);
      errors++;
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

  console.log(`\n[enrichment] done — enriched: ${enriched}, errors: ${errors}`);
  return { enriched, errors };
}

// ─── Risk Snapshots ───────────────────────────────────────────────────────────

async function gatherRiskSignals(projectId) {
  const rfiCutoff = new Date();
  rfiCutoff.setDate(rfiCutoff.getDate() - 14);

  const [risksResult, issuesResult, tasksResult, rfisResult, insightsResult] =
    await Promise.all([
      supabase.from("project_insights").select("id, severity").eq("project_id", projectId),
      supabase.from("issues").select("id").eq("project_id", projectId).eq("status", "open"),
      supabase
        .from("schedule_tasks")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "in_progress")
        .lt("end_date", new Date().toISOString()),
      supabase
        .from("rfis")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "open")
        .lt("created_at", rfiCutoff.toISOString()),
      supabase.from("ai_insights").select("id").eq("project_id", projectId).eq("status", "open"),
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
    risk_score: 0,
  };
}

function computeRiskScore(signals) {
  const score =
    signals.critical_risks * 15 +
    signals.unresolved_insights * 8 +
    signals.open_risks * 5 +
    signals.aging_rfis * 4 +
    signals.overdue_tasks * 2 +
    signals.open_issues * 3;
  return Math.min(100, Math.round(score));
}

async function computeTrend(projectId, currentScore, today) {
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

async function generateRiskNarrative(projectName, signals, trend) {
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

async function runRiskSnapshots() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n[snapshots] snapshotting all projects for ${today}...`);

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name")
    .not("phase", "eq", "closed");

  if (error || !projects?.length) {
    console.log("[snapshots] no projects:", error?.message);
    return { snapshotted: 0, errors: 0 };
  }

  console.log(`[snapshots] processing ${projects.length} projects...`);
  let snapshotted = 0;
  let errors = 0;

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    process.stdout.write(`  [${i + 1}/${projects.length}] ${project.name}...`);

    try {
      const signals = await gatherRiskSignals(project.id);
      const riskScore = computeRiskScore(signals);
      const trend = await computeTrend(project.id, riskScore, today);

      let riskNarrative = null;
      if (trend === "deteriorating" || riskScore > 60) {
        riskNarrative = await generateRiskNarrative(project.name, signals, trend);
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
        console.log(` ✗ ${insertError.message}`);
        errors++;
      } else {
        const narrative = riskNarrative ? ` — "${riskNarrative}"` : "";
        console.log(` ✓ score=${riskScore} trend=${trend}${narrative}`);
        snapshotted++;
      }
    } catch (e) {
      console.log(` ✗ ${e.message}`);
      errors++;
    }
  }

  console.log(`\n[snapshots] done — snapshotted: ${snapshotted}, errors: ${errors}`);
  return { snapshotted, errors };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const runSegments = args.includes("--segments") || args.includes("--both") || args.length === 0;
const runSnapshots = args.includes("--snapshots") || args.includes("--both") || args.length === 0;

console.log("╔══════════════════════════════════════════════╗");
console.log("║  Council Mode — Enrichment Runner            ║");
console.log("╚══════════════════════════════════════════════╝");

if (runSegments) await runSegmentEnrichment();
if (runSnapshots) await runRiskSnapshots();

console.log("\n✅ Done.\n");
