import { withApiGuardrails } from "@/lib/guardrails/api";
import { requireAdmin } from "@/app/api/admin/intelligence-compiler/_shared";
import {
  createRagServiceClient,
  createServiceClient,
} from "@/lib/supabase/service";
import { estimateCostWithFallback } from "@/lib/ai/model-pricing";

export const dynamic = "force-dynamic";

const WHERE = "api.admin.ai-system-health#GET";
const SAMPLE_LIMIT = 5000;
const DAYS_BACK = 30;

type MetricsWindow = {
  conversations: number;
  messages: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  feedbackUp: number;
  feedbackDown: number;
};

function emptyWindow(): MetricsWindow {
  return { conversations: 0, messages: 0, inputTokens: 0, outputTokens: 0, cost: 0, feedbackUp: 0, feedbackDown: 0 };
}

function msAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export const GET = withApiGuardrails(WHERE, async () => {
  await requireAdmin(WHERE);
  const supabase = createServiceClient();
  const ragSupabase = createRagServiceClient();
  const generatedAt = new Date().toISOString();
  const since30d = msAgo(24 * DAYS_BACK);

  // Pull all chat_history rows from last 30 days (capped at SAMPLE_LIMIT)
  const { data: rows, error: chatError } = await supabase
    .from("chat_history")
    .select("id, session_id, role, metadata, created_at")
    .gte("created_at", since30d)
    .order("created_at", { ascending: false })
    .limit(SAMPLE_LIMIT);

  if (chatError) throw new Error(`chat_history query failed: ${chatError.message}`);

  const sampleTruncated = (rows?.length ?? 0) === SAMPLE_LIMIT;
  const sampleSize = rows?.length ?? 0;

  const now = Date.now();
  const cutoff24h = now - 24 * 60 * 60 * 1000;
  const cutoff7d = now - 7 * 24 * 60 * 60 * 1000;

  const windows = {
    last24h: emptyWindow(),
    last7d: emptyWindow(),
    last30d: emptyWindow(),
  };

  // 30-day daily series (date → metrics)
  const seriesMap: Record<string, { date: string; messages: number; tokens: number; cost: number }> = {};
  for (let i = 0; i < DAYS_BACK; i++) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    seriesMap[key] = { date: key, messages: 0, tokens: 0, cost: 0 };
  }

  const modelBreakdownMap: Record<
    string,
    { model: string; provider: string; calls: number; inputTokens: number; outputTokens: number; cost: number; estimated: boolean }
  > = {};

  const sessionsSeen24h = new Set<string>();
  const sessionsSeen7d = new Set<string>();
  const sessionsSeen30d = new Set<string>();

  let totalToolCalls = 0;
  let messagesWithToolTrace = 0;
  let messagesWithUnknownModel = 0;
  let assistantMessages30d = 0;

  for (const row of rows ?? []) {
    const ts = new Date(row.created_at as string).getTime();
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const sid = row.session_id as string;

    // Feedback rows
    if (row.role === "system" && meta.type === "feedback") {
      const fb = meta.feedback as string | undefined;
      if (fb === "up" || fb === "down") {
        const bump = (w: MetricsWindow) => { if (fb === "up") w.feedbackUp++; else w.feedbackDown++; };
        if (ts >= cutoff24h) bump(windows.last24h);
        if (ts >= cutoff7d) bump(windows.last7d);
        bump(windows.last30d);
      }
      continue;
    }

    // Only assistant messages carry usage/model data
    if (row.role !== "assistant") continue;

    assistantMessages30d++;

    const usage = meta.usage as { inputTokens?: number; outputTokens?: number } | null | undefined;
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;
    const modelId = (meta.modelId as string | undefined) ?? "";

    const { cost, pricing, matchedModel } = estimateCostWithFallback(modelId, inputTokens, outputTokens);
    if (!matchedModel) messagesWithUnknownModel++;

    const tokens = inputTokens + outputTokens;
    const dayKey = new Date(ts).toISOString().slice(0, 10);
    if (seriesMap[dayKey]) {
      seriesMap[dayKey].messages++;
      seriesMap[dayKey].tokens += tokens;
      seriesMap[dayKey].cost += cost;
    }

    const bump = (w: MetricsWindow, sessions: Set<string>) => {
      w.messages++;
      w.inputTokens += inputTokens;
      w.outputTokens += outputTokens;
      w.cost += cost;
      if (sid) sessions.add(sid);
    };
    if (ts >= cutoff24h) bump(windows.last24h, sessionsSeen24h);
    if (ts >= cutoff7d) bump(windows.last7d, sessionsSeen7d);
    bump(windows.last30d, sessionsSeen30d);

    // Per-model breakdown
    const mKey = modelId || "unknown";
    if (!modelBreakdownMap[mKey]) {
      modelBreakdownMap[mKey] = {
        model: mKey,
        provider: pricing.provider,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        estimated: pricing.estimated ?? false,
      };
    }
    modelBreakdownMap[mKey].calls++;
    modelBreakdownMap[mKey].inputTokens += inputTokens;
    modelBreakdownMap[mKey].outputTokens += outputTokens;
    modelBreakdownMap[mKey].cost += cost;

    // Tool calls
    const toolTrace = meta.tool_trace as unknown[] | null | undefined;
    if (Array.isArray(toolTrace) && toolTrace.length > 0) {
      totalToolCalls += toolTrace.length;
      messagesWithToolTrace++;
    }
  }

  windows.last24h.conversations = sessionsSeen24h.size;
  windows.last7d.conversations = sessionsSeen7d.size;
  windows.last30d.conversations = sessionsSeen30d.size;

  const series = Object.values(seriesMap).sort((a, b) => a.date.localeCompare(b.date));

  const totalCost30d = windows.last30d.cost;
  const modelBreakdown = Object.values(modelBreakdownMap)
    .map((m) => ({
      ...m,
      share: totalCost30d > 0 ? m.cost / totalCost30d : 0,
    }))
    .sort((a, b) => b.cost - a.cost);

  const quality = {
    totalToolCalls,
    messagesWithToolTrace,
    avgToolCallsPerMessage: assistantMessages30d > 0 ? totalToolCalls / assistantMessages30d : 0,
    telemetryCoverage: assistantMessages30d > 0 ? messagesWithToolTrace / assistantMessages30d : 0,
    messagesWithUnknownModel,
  };

  // Self-learning counts
  const [feedbackResult, candidateResult, activeResult] = await Promise.all([
    supabase.from("ai_feedback_events").select("id", { count: "exact", head: true }).gte("created_at", msAgo(7 * 24)),
    supabase.from("ai_learning_promotions").select("id", { count: "exact", head: true }).eq("status", "candidate"),
    supabase.from("ai_learning_promotions").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  if (feedbackResult.error) throw new Error(`ai_feedback_events query failed: ${feedbackResult.error.message}`);
  if (candidateResult.error) throw new Error(`ai_learning_promotions(candidate) query failed: ${candidateResult.error.message}`);
  if (activeResult.error) throw new Error(`ai_learning_promotions(active) query failed: ${activeResult.error.message}`);

  const feedbackEvents7d = feedbackResult.count ?? 0;
  const candidateLearnings = candidateResult.count ?? 0;
  const activeLearnings = activeResult.count ?? 0;

  // Pipeline health: last 24h sync runs
  const since24h = msAgo(24);
  const { data: syncRuns, error: syncError } = await ragSupabase
    .from("source_sync_runs")
    .select("source, stage, status, finished_at, error_message")
    .gte("finished_at", since24h)
    .order("finished_at", { ascending: false })
    .limit(200);

  if (syncError) throw new Error(`source_sync_runs query failed: ${syncError.message}`);

  const succeeded = syncRuns?.filter((r) => r.status === "succeeded").length ?? 0;
  const failed = syncRuns?.filter((r) => r.status === "failed").length ?? 0;
  const lastFailures = (syncRuns ?? [])
    .filter((r) => r.status === "failed")
    .slice(0, 5)
    .map((r) => ({
      source: r.source,
      stage: r.stage,
      finishedAt: r.finished_at,
      errorMessage: r.error_message,
    }));

  return Response.json({
    generatedAt,
    windows,
    series,
    modelBreakdown,
    quality,
    learning: {
      feedbackEvents7d,
      candidateLearnings,
      activeLearnings,
    },
    pipeline: {
      succeeded,
      failed,
      total: succeeded + failed,
      lastFailures,
    },
    flags: { sampleTruncated, sampleSize },
  });
});
