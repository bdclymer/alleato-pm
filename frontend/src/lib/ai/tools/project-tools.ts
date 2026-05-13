import { tool } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { createFinancialTools, isMissingBudgetViewError, fetchBudgetRowsForBriefing } from "./financial";
import { createAcumaticaTools } from "./acumatica";
import { createOperationalTools } from "./operational";
import { createScheduleTools } from "./schedule-tools";
import { createAppHelpTools } from "./app-help-tools";
import { createForecastTools } from "./forecast-tools";
import { createOutlookOperationsTools } from "./outlook-operations";
import { createToolGuardrails } from "./guardrails";
import { type ToolTracePayload, asNumber, withTrace as _withTrace } from "./tool-utils";
import type { MeetingIntelligenceWidgetPayload } from "@/lib/ai/assistant-widgets";

// Existing AI tool outputs are heterogeneous Supabase rows from many tables/views.
// Keep this broad row shape until the tool layer is split into typed modules.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

export type CreateProjectToolsOptions = {
  onTrace?: (trace: ToolTracePayload) => void;
  pinnedProjectId?: number;
};

function parseTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseTextList(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return parseTextList(record.text);
    if (typeof record.title === "string") return parseTextList(record.title);
    if (typeof record.summary === "string") return parseTextList(record.summary);
    return Object.values(record).flatMap((item) => parseTextList(item));
  }

  if (typeof value !== "string" || !value.trim()) return [];

  return value
    .split(/\r?\n|;|•|^\s*-\s*/gm)
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter((line) => line.length > 2);
}

function trimText(value: unknown, limit: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
}

function communicationSource(doc: AnyRow): string {
  const raw = `${doc.source_system ?? ""} ${doc.source ?? ""} ${doc.category ?? ""} ${doc.type ?? ""}`.toLowerCase();
  if (raw.includes("teams")) return "Teams";
  if (raw.includes("outlook") || raw.includes("email")) return "Email";
  if (raw.includes("fireflies") || raw.includes("meeting")) return "Meeting";
  if (raw.includes("sharepoint") || raw.includes("onedrive") || raw.includes("drive")) return "Document";
  return "Document";
}

function communicationUrl(doc: AnyRow): string | null {
  return (
    trimText(doc.fireflies_link, 500) ??
    trimText(doc.meeting_link, 500) ??
    trimText(doc.source_web_url, 500) ??
    trimText(doc.url, 500)
  );
}

function communicationSourceRef(doc: AnyRow): string {
  const source = communicationSource(doc);
  const title = trimText(doc.title, 120) ?? "Untitled";
  const date = trimText(doc.date, 30) ?? "undated";
  return `[Source: ${source} - "${title}" - ${date}]`;
}

function extractAssignee(item: string): string | null {
  const ownerMatch = item.match(
    /\b(?:owner|assignee|assigned to|by)\s*[:\-]?\s*([A-Z][A-Za-z.'\-\s]{1,40})\b/i,
  );
  return ownerMatch ? ownerMatch[1].trim() : null;
}

function extractDueDate(item: string): string | null {
  const dueMatch = item.match(
    /\b(?:due|by|before)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|[A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})/i,
  );
  return dueMatch ? dueMatch[1].trim() : null;
}

function lowerStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function isClosedStatus(value: unknown): boolean {
  return ["closed", "complete", "completed", "approved", "void", "rejected"].includes(
    lowerStatus(value),
  );
}

function isApprovedStatus(value: unknown): boolean {
  return ["approved", "executed", "complete", "completed"].includes(lowerStatus(value));
}

function isPendingStatus(value: unknown): boolean {
  const status = lowerStatus(value);
  return Boolean(status) && !isClosedStatus(status);
}

function isDateBeforeToday(value: unknown): boolean {
  if (typeof value !== "string" || !value) return false;
  return value.slice(0, 10) < new Date().toISOString().slice(0, 10);
}

function countByStatus(rows: AnyRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const status = lowerStatus(row.status) || "unknown";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
}

function compactRows(rows: AnyRow[], limit = 8): AnyRow[] {
  return rows.slice(0, limit);
}

function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getLocalIsoDate(timeZone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = lookup.hour === "24" ? "00" : lookup.hour;
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(hour),
    Number(lookup.minute),
    Number(lookup.second),
  );
  return asUtc - date.getTime();
}

function localMidnightUtcIso(dateString: string, timeZone: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return new Date(guess.getTime() - timeZoneOffsetMs(guess, timeZone)).toISOString();
}

function localDayRange(timeZone: string, date = new Date()): {
  dateLabel: string;
  startIso: string;
  endIso: string;
} {
  const dateString = getLocalIsoDate(timeZone, date);
  const nextDate = new Date(`${dateString}T12:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextDateString = getLocalIsoDate(timeZone, nextDate);
  return {
    dateLabel: dateString,
    startIso: localMidnightUtcIso(dateString, timeZone),
    endIso: localMidnightUtcIso(nextDateString, timeZone),
  };
}

function windowFromInput(input: {
  startDate?: string;
  endDate?: string;
  relativeWindow?: "today" | "yesterday" | "last_7_days" | "last_30_days" | "last_60_days";
  timeZone?: string;
}): { dateLabel: string; startIso: string; endIso: string } {
  const timeZone = input.timeZone || "America/New_York";
  if (input.startDate && input.endDate) {
    return {
      dateLabel: input.startDate === input.endDate ? input.startDate : `${input.startDate} to ${input.endDate}`,
      startIso: `${input.startDate}T00:00:00.000Z`,
      endIso: `${input.endDate}T23:59:59.999Z`,
    };
  }

  if (input.relativeWindow === "today" || !input.relativeWindow) {
    return localDayRange(timeZone);
  }

  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const start = new Date(end);
  if (input.relativeWindow === "yesterday") {
    start.setUTCDate(end.getUTCDate() - 2);
    end.setUTCDate(end.getUTCDate() - 1);
  } else if (input.relativeWindow === "last_7_days") {
    start.setUTCDate(end.getUTCDate() - 7);
  } else if (input.relativeWindow === "last_30_days") {
    start.setUTCDate(end.getUTCDate() - 30);
  } else {
    start.setUTCDate(end.getUTCDate() - 60);
  }

  return {
    dateLabel: `${isoDateOnly(start)} to ${isoDateOnly(new Date(end.getTime() - 1))}`,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function extractSentences(content: unknown, terms: RegExp, limit: number): string[] {
  const text = String(content ?? "").replace(/\s+/g, " ").trim();
  if (!text) return [];
  return [
    ...new Set(
      text
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length > 8 && terms.test(sentence)),
    ),
  ].slice(0, limit);
}

function buildMeetingIntelligenceFromRows(params: {
  rows: AnyRow[];
  insights: AnyRow[];
  dateLabel: string;
  intent: "completed" | "insights" | "risks" | "decisions" | "actions" | "summary";
  limit: number;
  retrievalNote?: string;
}): MeetingIntelligenceWidgetPayload {
  const insightsByMeeting = new Map<string, AnyRow[]>();
  for (const insight of params.insights) {
    const id = String(insight.metadata_id ?? "");
    if (!id) continue;
    const rows = insightsByMeeting.get(id) ?? [];
    rows.push(insight);
    insightsByMeeting.set(id, rows);
  }

  const meetings = params.rows.slice(0, params.limit).map((row) => {
    const meetingInsights = insightsByMeeting.get(String(row.id)) ?? [];
    const riskInsights = meetingInsights.filter((insight) => lowerStatus(insight.type) === "risk");
    const decisionInsights = meetingInsights.filter((insight) => lowerStatus(insight.type) === "decision");
    const criticalRisks = [
      ...riskInsights.map((insight) => trimText(insight.description, 240)).filter((value): value is string => Boolean(value)),
      ...extractSentences(
        `${row.summary ?? ""} ${row.overview ?? ""} ${row.content ?? ""}`,
        /\b(risk|critical|blocked|delay|delayed|issue|concern|exposure|problem|missing|late|overdue)\b/i,
        3,
      ),
    ].slice(0, 4);
    const decisions = [
      ...parseTextList(row.decisions),
      ...decisionInsights.map((insight) => trimText(insight.description, 240)).filter((value): value is string => Boolean(value)),
      ...extractSentences(
        `${row.summary ?? ""} ${row.overview ?? ""} ${row.content ?? ""}`,
        /\b(decided|decision|approved|rejected|agreed|confirmed|selected)\b/i,
        3,
      ),
    ].slice(0, 4);
    const actionItems = [
      ...parseTextList(row.action_items),
      ...extractSentences(
        `${row.summary ?? ""} ${row.overview ?? ""} ${row.content ?? ""}`,
        /\b(action item|follow up|follow-up|needs to|must|assigned|owner|due|by friday|by monday)\b/i,
        3,
      ),
    ].slice(0, 5);
    const projectId = asNumber(row.project_id) || null;
    const id = String(row.id);

    return {
      id,
      title: trimText(row.title, 160) ?? "Untitled meeting",
      projectId,
      projectName: trimText(row.project, 120),
      date: trimText(row.date ?? row.created_at, 40),
      source: trimText(row.source ?? row.source_system ?? row.category ?? row.type, 80),
      summary: trimText(row.summary ?? row.overview ?? row.content, 260),
      criticalRisks,
      decisions,
      actionItems,
      href: projectId ? `/${projectId}/meetings/${id}` : `/meetings/${id}`,
    };
  });

  const criticalRiskCount = meetings.reduce((sum, meeting) => sum + meeting.criticalRisks.length, 0);
  const decisionCount = meetings.reduce((sum, meeting) => sum + meeting.decisions.length, 0);
  const actionItemCount = meetings.reduce((sum, meeting) => sum + meeting.actionItems.length, 0);
  const focus =
    params.intent === "risks"
      ? "Critical risks"
      : params.intent === "decisions"
        ? "Decisions"
        : params.intent === "actions"
          ? "Action items"
          : params.intent === "insights"
            ? "Meeting insights"
            : "Meeting summary";

  return {
    type: "meeting_intelligence",
    id: "meeting-intelligence",
    title: focus,
    subtitle: "Structured readout from meeting records, extracted insights, and transcript summaries",
    dateLabel: params.dateLabel,
    meetingCount: meetings.length,
    criticalRiskCount,
    decisionCount,
    actionItemCount,
    topInsights: [
      meetings.length > 0
        ? `${meetings.length} meeting record${meetings.length === 1 ? "" : "s"} matched this window.`
        : "No meeting records matched this window.",
      ...(params.retrievalNote ? [params.retrievalNote] : []),
      criticalRiskCount > 0
        ? `${criticalRiskCount} risk signal${criticalRiskCount === 1 ? "" : "s"} found across the matched meetings.`
        : "No risk signals were found in the matched meetings.",
      decisionCount > 0
        ? `${decisionCount} decision signal${decisionCount === 1 ? "" : "s"} found across the matched meetings.`
        : "No decision signals were found in the matched meetings.",
    ],
    recommendedNextActions:
      meetings.length === 0
        ? ["Check meeting ingestion/source-sync health before using this window for an owner-ready update."]
        : [
            "Open the meeting cards with risk or action badges first.",
            "Convert verified ownership items into Tasks page records.",
            "Use the linked meeting records as the evidence trail before sending an owner update.",
          ],
    emptyState: "No meeting rows matched this request.",
    meetings,
  };
}

function withTrace<TInput extends Record<string, unknown>, TResult>(
  name: string,
  options: CreateProjectToolsOptions,
  execute: (input: TInput) => Promise<TResult>,
) {
  return _withTrace(
    name,
    options,
    execute,
    "This data source failed during retrieval. Tell the user exactly what could not be checked, then continue with any other successful sources instead of ending the response.",
  );
}

export function createProjectTools(
  _userId: string,
  options: CreateProjectToolsOptions = {},
) {
  const supabase = createServiceClient();
  const guardrails = createToolGuardrails(_userId, {
    pinnedProjectId: options.pinnedProjectId,
  });

  // Financial tools (commitments, COs, direct costs, budget lines, trends, margin)
  const financialTools = createFinancialTools(_userId, options);

  // Acumatica ERP tools (live AP/AR aging, cash position, vendor spend, POs)
  const acumaticaTools = createAcumaticaTools(_userId, options);

  // Operational tools (people, vendors, RFIs, submittals, cross-project, trends, semantic search)
  const operationalTools = createOperationalTools(_userId, options);

  // Domain-specific tool groups extracted from operationalTools for clarity
  const scheduleTools = createScheduleTools(_userId, options);
  const appHelpTools = createAppHelpTools(options);
  const forecastTools = createForecastTools(_userId, options);
  const outlookOperationsTools = createOutlookOperationsTools(_userId, options);

  return {
    ...financialTools,
    ...acumaticaTools,
    ...operationalTools,
    ...scheduleTools,
    ...appHelpTools,
    ...forecastTools,
    ...outlookOperationsTools,

    getMeetingIntelligence: tool({
      description:
        "Return structured meeting intelligence for completed meetings, risks, decisions, action items, and meeting insights. " +
        "Use this for prompts like 'tell me about the meetings completed today', 'what insights did you gain from meetings', " +
        "'were any critical risks identified in meetings', or 'what decisions/action items came out of meetings'. " +
        "The output is designed for generative UI rendering as meeting intelligence cards.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Optional project ID to scope the meeting lookup"),
        projectName: z.string().optional().describe("Optional project name to resolve if projectId is unknown"),
        startDate: z.string().optional().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().optional().describe("End date in YYYY-MM-DD format"),
        relativeWindow: z
          .enum(["today", "yesterday", "last_7_days", "last_30_days", "last_60_days"])
          .optional()
          .default("today")
          .describe("Common date window when explicit dates are not provided"),
        intent: z
          .enum(["completed", "insights", "risks", "decisions", "actions", "summary"])
          .optional()
          .default("summary")
          .describe("The meeting intelligence angle requested by the user"),
        limit: z.number().optional().default(10).describe("Maximum number of meetings to return"),
        timeZone: z.string().optional().default("America/New_York").describe("User timezone for relative windows"),
      }),
      execute: withTrace(
        "getMeetingIntelligence",
        options,
        async ({ projectId, projectName, startDate, endDate, relativeWindow, intent, limit, timeZone }) => {
          const scopedProjectIds = await guardrails.getScopedProjectIds(projectId);
          if (scopedProjectIds.length === 0) {
            return {
              ...buildMeetingIntelligenceFromRows({
                rows: [],
                insights: [],
                dateLabel: startDate && endDate ? `${startDate} to ${endDate}` : "No accessible project scope",
                intent: intent ?? "summary",
                limit: limit ?? 10,
              }),
              error:
                "You do not have access to that project or no project scope is available for this meeting lookup.",
            };
          }

          let resolvedProjectId = projectId;
          if (!resolvedProjectId && projectName) {
            const resolved = await guardrails.getScopedProjectIds();
            const { data } = await supabase
              .from("projects")
              .select("id")
              .in("id", resolved)
              .ilike("name", `%${projectName}%`)
              .limit(1)
              .maybeSingle();
            resolvedProjectId = typeof data?.id === "number" ? data.id : undefined;
          }

          const window = windowFromInput({ startDate, endDate, relativeWindow, timeZone });
          const targetLimit = Math.min(Math.max(limit ?? 10, 1), 25);
          const selectFields =
            "id,title,source,source_system,category,type,date,created_at,content,summary,overview,action_items,decisions,bullet_points,project,project_id";
          const buildMeetingQuery = (dateColumn: "date" | "created_at") => {
            let meetingQuery = supabase
              .from("document_metadata")
              .select(selectFields)
              .or("source.eq.fireflies,source.eq.Zapier,type.eq.meeting,type.eq.meeting_transcript,category.eq.meeting")
              .gte(dateColumn, window.startIso)
              .lte(dateColumn, window.endIso)
              .order(dateColumn, { ascending: false })
              .limit(targetLimit);

            if (typeof resolvedProjectId === "number") {
              meetingQuery = meetingQuery.eq("project_id", resolvedProjectId);
            } else {
              meetingQuery = meetingQuery.or(
                `project_id.in.(${scopedProjectIds.join(",")}),project_id.is.null`,
              );
            }

            return meetingQuery;
          };

          const { data: primaryMeetingRows, error } = await buildMeetingQuery("date");
          if (error) {
            throw new Error(`Meeting intelligence lookup failed: ${error.message}`);
          }

          let meetingRows = (primaryMeetingRows ?? []) as AnyRow[];
          let retrievalNote: string | undefined;
          if (meetingRows.length === 0) {
            const { data: createdAtMeetingRows, error: createdAtError } =
              await buildMeetingQuery("created_at");
            if (createdAtError) {
              throw new Error(`Meeting intelligence created_at fallback failed: ${createdAtError.message}`);
            }
            meetingRows = (createdAtMeetingRows ?? []) as AnyRow[];
            if (meetingRows.length > 0) {
              retrievalNote =
                "The primary meeting date field was empty for this window, so results were recovered from ingestion timestamps instead of returning a blank answer.";
            }
          }

          const ids = meetingRows.map((row) => String(row.id)).filter(Boolean);
          const { data: insightRows, error: insightError } = ids.length > 0
            ? await supabase
                .from("insights")
                .select("metadata_id,type,description,owner_name,status,details,created_at")
                .in("metadata_id", ids)
            : { data: [], error: null };
          if (insightError) {
            throw new Error(`Meeting insight lookup failed: ${insightError.message}`);
          }

          return buildMeetingIntelligenceFromRows({
            rows: meetingRows,
            insights: (insightRows ?? []) as AnyRow[],
            dateLabel: window.dateLabel,
            intent: intent ?? "summary",
            limit: targetLimit,
            retrievalNote,
          });
        },
      ),
    }),

    getProjectBriefingSnapshot: tool({
      description:
        "Canonical broad project update snapshot for elite PM/CEO/owner briefings. " +
        "Use this FIRST for questions like 'latest on project', 'project status', " +
        "'what should I worry about', 'owner update', 'CEO briefing', or broad project health. " +
        "Returns hard facts first: budget, forecast/over-under, commitments, change orders, " +
        "RFIs, submittals, schedule, open notifications/actions, recent movement, risk signals, " +
        "data gaps, and recommended operator questions.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z.string().optional().describe("Project name to resolve if projectId is unknown"),
      }),
      execute: withTrace(
        "getProjectBriefingSnapshot",
        options,
        async ({ projectId, projectName }) => {
          const scopedProjectIds = await guardrails.getScopedProjectIds(projectId);
          if (scopedProjectIds.length === 0) {
            return {
              error:
                "You do not have access to that project. Choose a project you are assigned to.",
            };
          }

          let project: AnyRow | null = null;
          if (typeof projectId === "number" && Number.isFinite(projectId)) {
            const { data, error } = await supabase
              .from("projects")
              .select("*")
              .eq("id", projectId)
              .in("id", scopedProjectIds)
              .single();
            if (error || !data) return { error: `Project ${projectId} not found or not accessible.` };
            project = data as AnyRow;
          } else if (projectName) {
            const { data, error } = await supabase
              .from("projects")
              .select("*")
              .in("id", scopedProjectIds)
              .ilike("name", `%${projectName}%`)
              .limit(1)
              .single();
            if (error || !data) return { error: `No project found matching "${projectName}".` };
            project = data as AnyRow;
          } else if (scopedProjectIds.length === 1) {
            const { data, error } = await supabase
              .from("projects")
              .select("*")
              .eq("id", scopedProjectIds[0])
              .single();
            if (error || !data) return { error: "Project not found." };
            project = data as AnyRow;
          } else {
            return {
              error:
                "A project update needs a project name or projectId. List candidate projects instead of asking generically.",
            };
          }

          const resolvedProjectId = asNumber(project.id);
          const today = new Date().toISOString().slice(0, 10);
          const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString();

          const [
            budgetRes,
            contractSummaryRes,
            ceRes,
            pccoRes,
            ccoRes,
            rfiRes,
            submittalRes,
            scheduleRes,
            commitmentRes,
            notificationRes,
            recentDocsRes,
          ] = await Promise.all([
            fetchBudgetRowsForBriefing(supabase, resolvedProjectId),
            supabase
              .from("prime_contract_financial_summary")
              .select("*")
              .eq("project_id", resolvedProjectId),
            supabase
              .from("change_events")
              .select("id, number, title, status, type, scope, reason, created_at, updated_at, expecting_revenue")
              .eq("project_id", resolvedProjectId)
              .is("deleted_at", null)
              .order("updated_at", { ascending: false })
              .limit(25),
            supabase
              .from("prime_contract_change_orders")
              .select("id, pcco_number, title, status, total_amount, due_date, approved_at, submitted_at, created_at")
              .eq("project_id", resolvedProjectId)
              .order("created_at", { ascending: false })
              .limit(25),
            supabase
              .from("contract_change_orders")
              .select("id, change_order_number, title, description, status, amount, due_date, approved_date, requested_date, created_at")
              .eq("project_id", resolvedProjectId)
              .order("created_at", { ascending: false })
              .limit(25),
            supabase
              .from("rfis")
              .select("id, number, subject, status, due_date, ball_in_court, schedule_impact, cost_impact, updated_at")
              .eq("project_id", resolvedProjectId)
              .order("due_date", { ascending: true })
              .limit(80),
            supabase
              .from("submittals")
              .select("id, submittal_number, title, status, final_due_date, required_approval_date, required_on_site_date, ball_in_court, lead_time, priority, updated_at")
              .eq("project_id", resolvedProjectId)
              .is("deleted_at", null)
              .order("final_due_date", { ascending: true })
              .limit(80),
            supabase
              .from("schedule_tasks")
              .select("id, name, status, start_date, finish_date, percent_complete, is_milestone, constraint_date, constraint_type")
              .eq("project_id", resolvedProjectId)
              .order("finish_date", { ascending: true })
              .limit(150),
            supabase
              .from("commitments_unified")
              .select("id, title, commitment_type, contract_number, status, executed, contract_date, issued_on_date, updated_at")
              .eq("project_id", resolvedProjectId)
              .is("deleted_at", null)
              .order("updated_at", { ascending: false })
              .limit(100),
            supabase
              .from("collaboration_notifications")
              .select("id, title, body, kind, entity_type, entity_id, read_at, created_at")
              .eq("project_id", resolvedProjectId)
              .eq("user_id", _userId)
              .is("deleted_at", null)
              .order("created_at", { ascending: false })
              .limit(20),
            supabase
              .from("document_metadata")
              .select(
                "id, title, date, summary, overview, notes, action_items, bullet_points, decisions, key_topics, topics_discussed, keywords, sentiment, source, source_system, category, type, fireflies_link, meeting_link, source_web_url, url",
              )
              .eq("project_id", resolvedProjectId)
              .gte("date", since)
              .order("date", { ascending: false })
              .limit(12),
          ]);

          const budgetRows = budgetRes.data ?? [];
          const contracts = (contractSummaryRes.data ?? []) as AnyRow[];
          const changeEvents = (ceRes.data ?? []) as AnyRow[];
          const pccos = (pccoRes.data ?? []) as AnyRow[];
          const ccos = (ccoRes.data ?? []) as AnyRow[];
          const rfis = (rfiRes.data ?? []) as AnyRow[];
          const submittals = (submittalRes.data ?? []) as AnyRow[];
          const scheduleTasks = (scheduleRes.data ?? []) as AnyRow[];
          const commitments = (commitmentRes.data ?? []) as AnyRow[];
          const notifications = (notificationRes.data ?? []) as AnyRow[];
          const recentDocs = (recentDocsRes.data ?? []) as AnyRow[];

          const originalBudget = budgetRows.reduce((sum, row) => sum + asNumber(row.original_amount), 0);
          const revisedBudget = budgetRows.reduce((sum, row) => sum + asNumber(row.revised_budget), 0);
          const approvedBudgetChanges = budgetRows.reduce((sum, row) => sum + asNumber(row.approved_co_total), 0);
          const originalContractValue = contracts.reduce((sum, row) => sum + asNumber(row.original_contract_amount), 0);
          const revisedContractValue = contracts.reduce((sum, row) => sum + asNumber(row.revised_contract_amount), 0);
          const invoicedAmount = contracts.reduce((sum, row) => sum + asNumber(row.invoiced_amount), 0);
          const paymentsReceived = contracts.reduce((sum, row) => sum + asNumber(row.payments_received), 0);
          const pendingContractChanges = contracts.reduce((sum, row) => sum + asNumber(row.pending_change_orders), 0);
          const approvedContractChanges = contracts.reduce((sum, row) => sum + asNumber(row.approved_change_orders), 0);

          const allChangeOrders = [...pccos, ...ccos];
          const pendingChangeOrders = allChangeOrders.filter((row) => isPendingStatus(row.status));
          const approvedChangeOrders = allChangeOrders.filter((row) => isApprovedStatus(row.status));
          const pendingChangeOrderAmount = pendingChangeOrders.reduce(
            (sum, row) => sum + asNumber(row.total_amount ?? row.amount),
            0,
          );
          const approvedChangeOrderAmount = approvedChangeOrders.reduce(
            (sum, row) => sum + asNumber(row.total_amount ?? row.amount),
            0,
          );

          const openRfis = rfis.filter((row) => !isClosedStatus(row.status));
          const overdueRfis = openRfis.filter((row) => isDateBeforeToday(row.due_date));
          const scheduleSensitiveRfis = openRfis.filter((row) => {
            const value = `${row.schedule_impact ?? ""} ${row.subject ?? ""}`.toLowerCase();
            return value.includes("yes") || value.includes("schedule") || value.includes("delay");
          });

          const openSubmittals = submittals.filter((row) => !isClosedStatus(row.status));
          const overdueSubmittals = openSubmittals.filter((row) =>
            isDateBeforeToday(row.final_due_date ?? row.required_approval_date),
          );
          const longLeadSubmittals = openSubmittals.filter((row) => asNumber(row.lead_time) >= 21);

          const incompleteTasks = scheduleTasks.filter(
            (task) => lowerStatus(task.status) !== "completed" && asNumber(task.percent_complete) < 100,
          );
          const overdueTasks = incompleteTasks.filter((task) => isDateBeforeToday(task.finish_date));
          const upcomingMilestones = scheduleTasks.filter(
            (task) =>
              task.is_milestone &&
              !isClosedStatus(task.status) &&
              typeof task.finish_date === "string" &&
              task.finish_date.slice(0, 10) >= today,
          );

          const openNotifications = notifications.filter((row) => !row.read_at);
          const unexecutedCommitments = commitments.filter((row) => !row.executed);
          const sourceCoverage = recentDocs.reduce<Record<string, number>>((acc, doc) => {
            const source = communicationSource(doc);
            acc[source] = (acc[source] ?? 0) + 1;
            return acc;
          }, {});

          const budgetDelta = revisedBudget - originalBudget;
          const forecastVariance =
            revisedBudget > 0 && revisedContractValue > 0 ? revisedContractValue - revisedBudget : null;

          const riskSignals = [
            pendingChangeOrders.length > 0
              ? `${pendingChangeOrders.length} pending change order(s) need pricing/approval discipline.`
              : null,
            overdueRfis.length > 0
              ? `${overdueRfis.length} overdue RFI(s), including ${scheduleSensitiveRfis.length} schedule-sensitive item(s).`
              : null,
            overdueSubmittals.length > 0
              ? `${overdueSubmittals.length} overdue submittal(s); ${longLeadSubmittals.length} open long-lead item(s).`
              : null,
            overdueTasks.length > 0
              ? `${overdueTasks.length} incomplete schedule task(s) have finish dates before today.`
              : null,
            unexecutedCommitments.length > 0
              ? `${unexecutedCommitments.length} commitment(s) are not executed.`
              : null,
            openNotifications.length > 0
              ? `${openNotifications.length} unread/open notification(s) need review.`
              : null,
          ].filter((value): value is string => Boolean(value));

          const recommendedQuestions = [
            "What budget number has leadership committed to: original budget, revised budget, or latest forecast?",
            "Which pending change orders need owner approval, pricing backup, or a go/no-go decision this week?",
            "Which RFIs or submittals can move the schedule if they sit another week?",
            "What long-lead/procurement items are not bought out or fully released?",
            "What decision can the CEO, owner, or PM make now that would reduce risk fastest?",
            "What open actions have no clear owner or due date?",
          ];

          const dataGaps = [
            budgetRows.length === 0 ? "No budget line rows were found for this project." : null,
            budgetRes.source === "budget_lines"
              ? "Budget lines came from the budget_lines fallback because v_budget_lines is unavailable."
              : null,
            contracts.length === 0 ? "No prime contract financial summary rows were found." : null,
            scheduleTasks.length === 0 ? "No schedule task rows were found." : null,
            recentDocs.length === 0 ? "No recent meeting/document context found in the last 90 days." : null,
            budgetRes.error ? `Budget query failed: ${budgetRes.error.message}` : null,
            contractSummaryRes.error ? `Contract summary query failed: ${contractSummaryRes.error.message}` : null,
            ceRes.error ? `Change event query failed: ${ceRes.error.message}` : null,
            rfiRes.error ? `RFI query failed: ${rfiRes.error.message}` : null,
            submittalRes.error ? `Submittal query failed: ${submittalRes.error.message}` : null,
            scheduleRes.error ? `Schedule query failed: ${scheduleRes.error.message}` : null,
          ].filter((value): value is string => Boolean(value));

          return {
            sourceRef: `[Source: Project Briefing Snapshot - ${project.name}]`,
            project: {
              id: resolvedProjectId,
              name: project.name,
              projectNumber: project.project_number,
              client: project.client,
              phase: project.phase ?? project.current_phase,
              healthStatus: project.health_status,
              completionPct: project.completion_percentage,
              summary: project.summary,
            },
            hardFacts: {
              budget: {
                originalBudget,
                revisedBudget,
                budgetDelta,
                approvedBudgetChanges,
                forecastVariance,
                status:
                  forecastVariance == null
                    ? "unknown"
                    : forecastVariance > 0
                      ? "over budget"
                      : forecastVariance < 0
                        ? "under budget"
                        : "on budget",
              },
              contract: {
                originalContractValue,
                revisedContractValue,
                approvedContractChanges,
                pendingContractChanges,
                invoicedAmount,
                paymentsReceived,
              },
              changeOrders: {
                recentCount: allChangeOrders.length,
                pendingCount: pendingChangeOrders.length,
                approvedCount: approvedChangeOrders.length,
                pendingAmount: pendingChangeOrderAmount,
                approvedAmount: approvedChangeOrderAmount,
                statusBreakdown: countByStatus(allChangeOrders),
                recent: compactRows(allChangeOrders).map((row) => ({
                  number: row.pcco_number ?? row.change_order_number,
                  title: row.title ?? row.description,
                  status: row.status,
                  amount: row.total_amount ?? row.amount,
                  dueDate: row.due_date,
                })),
              },
              changeEvents: {
                openCount: changeEvents.filter((row) => !isClosedStatus(row.status)).length,
                statusBreakdown: countByStatus(changeEvents),
                recent: compactRows(changeEvents).map((row) => ({
                  number: row.number,
                  title: row.title,
                  status: row.status,
                  type: row.type,
                  updatedAt: row.updated_at,
                })),
              },
              rfis: {
                openCount: openRfis.length,
                overdueCount: overdueRfis.length,
                scheduleSensitiveCount: scheduleSensitiveRfis.length,
                statusBreakdown: countByStatus(rfis),
                open: compactRows(openRfis).map((row) => ({
                  number: row.number,
                  subject: row.subject,
                  status: row.status,
                  dueDate: row.due_date,
                  ballInCourt: row.ball_in_court,
                  scheduleImpact: row.schedule_impact,
                })),
              },
              submittals: {
                openCount: openSubmittals.length,
                overdueCount: overdueSubmittals.length,
                longLeadOpenCount: longLeadSubmittals.length,
                statusBreakdown: countByStatus(submittals),
                open: compactRows(openSubmittals).map((row) => ({
                  number: row.submittal_number,
                  title: row.title,
                  status: row.status,
                  dueDate: row.final_due_date ?? row.required_approval_date,
                  requiredOnSiteDate: row.required_on_site_date,
                  ballInCourt: row.ball_in_court,
                  leadTime: row.lead_time,
                })),
              },
              schedule: {
                totalTasks: scheduleTasks.length,
                incompleteCount: incompleteTasks.length,
                overdueCount: overdueTasks.length,
                upcomingMilestoneCount: upcomingMilestones.length,
                upcomingMilestones: compactRows(upcomingMilestones).map((task) => ({
                  name: task.name,
                  finishDate: task.finish_date,
                  status: task.status,
                  percentComplete: task.percent_complete,
                })),
                overdueTasks: compactRows(overdueTasks).map((task) => ({
                  name: task.name,
                  finishDate: task.finish_date,
                  status: task.status,
                  percentComplete: task.percent_complete,
                })),
              },
              commitments: {
                totalCount: commitments.length,
                unexecutedCount: unexecutedCommitments.length,
                statusBreakdown: countByStatus(commitments),
                unexecuted: compactRows(unexecutedCommitments).map((row) => ({
                  title: row.title,
                  type: row.commitment_type,
                  contractNumber: row.contract_number,
                  status: row.status,
                })),
              },
              notifications: {
                openCount: openNotifications.length,
                open: compactRows(openNotifications, 5).map((row) => ({
                  title: row.title,
                  kind: row.kind,
                  entityType: row.entity_type,
                  createdAt: row.created_at,
                })),
              },
            },
            recentMovement: recentDocs.map((doc) => ({
              sourceRef: communicationSourceRef(doc),
              sourceType: communicationSource(doc),
              sourceUrl: communicationUrl(doc),
              title: doc.title,
              date: doc.date,
              summary: trimText(doc.summary ?? doc.overview, 900),
              notes: trimText(doc.notes, 1200),
              actionItems: parseTextList(doc.action_items).slice(0, 8),
              bulletPoints: parseTextList(doc.bullet_points).slice(0, 8),
              decisions: parseTextList(doc.decisions).slice(0, 8),
              keyTopics: parseTextList(doc.key_topics).slice(0, 8),
              topicsDiscussed: parseTextList(doc.topics_discussed).slice(0, 8),
              keywords: parseTextList(doc.keywords).slice(0, 12),
              sentiment: doc.sentiment,
            })),
            sourceCoverage,
            riskSignals,
            recommendedQuestions,
            responseContract: {
              order: [
                "Hard Facts",
                "What Changed",
                "Insider Analysis",
                "Recommended Actions",
                "Confidence and Data Gaps",
                "Next Step",
              ],
              hardFactsFirst: true,
              alwaysEndWithForwardMotion: true,
            },
            dataGaps,
          };
        },
      ),
    }),

    getPortfolioOverview: tool({
      description:
        "Get a strategic overview of the project portfolio. By default shows only CURRENT-phase " +
        "projects (the active ones). Pulls contracts, change events, recent meeting activity, " +
        "and action items. Use this FIRST when the user asks about projects or portfolio status. " +
        "The richest data is in meeting transcripts and action items — lead with those insights.",
      inputSchema: z.object({
        phase: z
          .string()
          .optional()
          .default("Current")
          .describe(
            "Project phase filter: 'Current' (default), 'Complete', 'Estimating', 'Planning', or 'all'",
          ),
      }),
      execute: withTrace(
        "getPortfolioOverview",
        options,
        async ({ phase }) => {
        const scopedProjectIds = await guardrails.getScopedProjectIds();
        if (scopedProjectIds.length === 0) {
          return {
            error:
              "No accessible projects found for your account. Ask an admin to assign you to at least one project.",
          };
        }

        // Fetch projects filtered by phase
        let projectQuery = supabase
          .from("projects")
          .select("*")
          .eq("archived", false)
          .in("id", scopedProjectIds)
          .order("name", { ascending: true })
          .limit(50);

        if (phase && phase !== "all") {
          projectQuery = projectQuery.eq("phase", phase);
        }

        const { data: projectRows, error } = await projectQuery;
        if (error) return { error: error.message };
        const projects = (projectRows ?? []) as AnyRow[];
        const projectIds = projects.map((p) => p.id);

        // Parallel fetch: contracts, change events, issues, meetings
        const [financialRes, ceRes, issueRes, meetingRes, healthRes] =
          await Promise.all([
            supabase
              .from("prime_contract_financial_summary")
              .select("*")
              .in("project_id", projectIds),
            supabase
              .from("change_events_summary")
              .select("*")
              .in("project_id", projectIds),
            supabase
              .from("project_issue_summary")
              .select("*")
              .in("project_id", projectIds),
            supabase
              .from("document_metadata")
              .select(
                "id, title, date, project_id, project, summary, overview, participants, duration_minutes",
              )
              .in("project_id", projectIds)
              .or("type.eq.meeting,category.eq.meeting")
              .order("date", { ascending: false })
              .limit(100),
            supabase
              .from("project_health_dashboard")
              .select("*")
              .in("id", projectIds),
          ]);

        const financials = (financialRes.data ?? []) as AnyRow[];
        const changeEvents = (ceRes.data ?? []) as AnyRow[];
        const issues = (issueRes.data ?? []) as AnyRow[];
        const meetings = (meetingRes.data ?? []) as AnyRow[];
        const health = (healthRes.data ?? []) as AnyRow[];

        // Index lookups
        const nameMap = new Map<number, string>();
        projects.forEach((p) => nameMap.set(p.id, p.name));

        const financialsByProject = new Map<number, AnyRow[]>();
        financials.forEach((f) => {
          if (!f.project_id) return;
          const arr = financialsByProject.get(f.project_id) || [];
          arr.push(f);
          financialsByProject.set(f.project_id, arr);
        });

        const ceByProject = new Map<number, AnyRow[]>();
        changeEvents.forEach((ce) => {
          if (!ce.project_id) return;
          const arr = ceByProject.get(ce.project_id) || [];
          arr.push(ce);
          ceByProject.set(ce.project_id, arr);
        });

        const issuesByProject = new Map<number, AnyRow>();
        issues.forEach((i) => {
          if (i.project_id) issuesByProject.set(i.project_id, i);
        });

        const healthByProject = new Map<number, AnyRow>();
        health.forEach((h) => {
          if (h.id) healthByProject.set(h.id, h);
        });

        // Meeting activity per project
        const meetingsByProject = new Map<number, AnyRow[]>();
        meetings.forEach((m) => {
          if (!m.project_id) return;
          const arr = meetingsByProject.get(m.project_id) || [];
          arr.push(m);
          meetingsByProject.set(m.project_id, arr);
        });

        // Recent meeting insights (summaries and overviews are the richest data)
        const recentMeetingInsights: AnyRow[] = [];
        meetings.forEach((m) => {
          const overview = m.summary || m.overview;
          if (!overview) return;
          recentMeetingInsights.push({
            sourceRef: `[Source: Meeting - "${m.title}" - ${m.date}]`,
            meeting: m.title,
            date: m.date,
            project: nameMap.get(m.project_id) ?? m.project,
            keyPoints: overview.substring(0, 800),
          });
        });

        // Build enriched project list
        const enrichedProjects = projects.map((p) => {
          const h = healthByProject.get(p.id);
          const iss = issuesByProject.get(p.id);
          const fins = financialsByProject.get(p.id) || [];
          const ces = ceByProject.get(p.id) || [];
          const pMeetings = meetingsByProject.get(p.id) || [];

          const totalContractValue = fins.reduce(
            (sum: number, f: AnyRow) =>
              sum +
              (f.revised_contract_amount ?? f.original_contract_amount ?? 0),
            0,
          );
          const openCEs = ces.filter(
            (ce) => ce.status !== "closed" && ce.status !== "void",
          );

          return {
            id: p.id,
            name: p.name,
            projectNumber: p.project_number,
            client: p.client,
            phase: p.phase,
            state: p.state,
            summary: p.summary,
            totalContractValue,
            openChangeEvents: openCEs.length,
            totalIssues: iss?.total_issues ?? 0,
            meetingCount: pMeetings.length,
            lastMeetingDate: pMeetings[0]?.date ?? null,
            lastMeetingTitle: pMeetings[0]?.title ?? null,
            healthStatus: p.health_status,
            healthScore: p.health_score,
            openCriticalItems: h?.open_critical_items ?? 0,
          };
        });

        // Sort by activity (meetings) descending
        enrichedProjects.sort((a, b) => b.meetingCount - a.meetingCount);

        // Portfolio-level contract totals
        const totalContractValue = financials.reduce(
          (s, f) =>
            s +
            (f.revised_contract_amount ?? f.original_contract_amount ?? 0),
          0,
        );

        // Build a quick-reference list for disambiguation
        const projectList = enrichedProjects.map((p, i) => {
          const val = p.totalContractValue
            ? `$${(p.totalContractValue / 1_000_000).toFixed(1)}M contract`
            : "no contract data";
          return `${i + 1}. **${p.name}** — ${val}, phase: ${p.phase ?? "N/A"}`;
        }).join("\n");

        return {
          sourceRef: `[Source: Portfolio Overview - ${phase ?? "All"} Projects]`,
          _disambiguationHint: enrichedProjects.length > 1
            ? `IMPORTANT: If the user has NOT specified a project name, you MUST present this numbered list and ask them to pick one. Do NOT guess:\n\n${projectList}\n\nSay: "Which project would you like me to analyze?" after listing them.`
            : null,
          portfolioSummary: {
            phase,
            totalProjects: enrichedProjects.length,
            projectsWithContracts: financials.length,
            totalContractValue,
            openChangeEvents: changeEvents.filter(
              (ce) => ce.status !== "closed" && ce.status !== "void",
            ).length,
            totalMeetingsRecorded: meetings.length,
            meetingsWithInsights: recentMeetingInsights.length,
          },
          projects: enrichedProjects,
          recentMeetingInsights: recentMeetingInsights.slice(0, 15),
          recentMeetings: meetings.slice(0, 10).map((m) => ({
            sourceRef: `[Source: Meeting - "${m.title}" - ${m.date}]`,
            title: m.title,
            date: m.date,
            project: nameMap.get(m.project_id) ?? m.project,
            summary: (m.summary || m.overview || "").substring(0, 800),
            participants: m.participants,
          })),
        };
        },
      ),
    }),

    getProjectsWithRisks: tool({
      description:
        "Portfolio-wide risk radar. Returns which projects currently have risks " +
        "using structured risk records, unresolved AI insights, issue summaries, " +
        "and critical health flags. Use this FIRST for questions like " +
        "'what projects have risks?' or 'which jobs are most at risk?'.",
      inputSchema: z.object({
        phase: z
          .string()
          .optional()
          .default("Current")
          .describe(
            "Project phase filter: 'Current' (default), 'Complete', 'Estimating', 'Planning', or 'all'",
          ),
        maxProjects: z
          .number()
          .optional()
          .default(25)
          .describe("Max number of risky projects to return"),
      }),
      execute: withTrace(
        "getProjectsWithRisks",
        options,
        async ({ phase, maxProjects }) => {
          const scopedProjectIds = await guardrails.getScopedProjectIds();
          if (scopedProjectIds.length === 0) {
            return {
              error:
                "No accessible projects found for your account. Ask an admin to assign you to at least one project.",
            };
          }

          let projectQuery = supabase
            .from("projects")
            .select("id, name, phase, health_status, health_score")
            .eq("archived", false)
            .in("id", scopedProjectIds)
            .order("name", { ascending: true })
            .limit(200);

          if (phase && phase !== "all") {
            projectQuery = projectQuery.eq("phase", phase);
          }

          const { data: projectRows, error: projectError } = await projectQuery;
          if (projectError) return { error: projectError.message };

          const projects = (projectRows ?? []) as AnyRow[];
          const projectIds = projects
            .map((p) => Number(p.id))
            .filter((id) => Number.isFinite(id));

          if (projectIds.length === 0) {
            return {
              sourceRef: `[Source: Project Risk Radar - ${phase ?? "all"} projects]`,
              summary: {
                phase: phase ?? "all",
                totalProjectsChecked: 0,
                riskyProjects: 0,
              },
              projects: [],
              message: "No projects found for the selected phase.",
            };
          }

          const [risksRes, insightsRes, issueRes, healthRes, meetingRes] =
            await Promise.all([
               
              supabase
                .from("risks" as never)
                .select(
                  "id, project_id, status, category, likelihood, impact, description, owner_name, metadata_id, created_at",
                )
                .in("project_id", projectIds)
                .order("created_at", { ascending: false })
                .limit(2000) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: unknown }>,
              supabase
                .from("ai_insights")
                .select(
                  "id, project_id, project_name, title, description, severity, insight_type, resolved, created_at",
                )
                .in("project_id", projectIds)
                .order("created_at", { ascending: false })
                .limit(2000),
              supabase
                .from("project_issue_summary")
                .select("project_id, total_issues, total_cost")
                .in("project_id", projectIds),
              supabase
                .from("project_health_dashboard")
                .select("id, open_critical_items, health_status, health_score")
                .in("id", projectIds),
              supabase
                .from("document_metadata")
                .select("project_id, title, date, summary, overview")
                .in("project_id", projectIds)
                .or("type.eq.meeting,category.eq.meeting")
                .order("date", { ascending: false })
                .limit(300),
            ]);

          const risks = (risksRes.data ?? []) as AnyRow[];
          const insights = (insightsRes.data ?? []) as AnyRow[];
          const issueRows = (issueRes.data ?? []) as AnyRow[];
          const healthRows = (healthRes.data ?? []) as AnyRow[];
          const meetings = (meetingRes.data ?? []) as AnyRow[];

          const issuesByProject = new Map<number, AnyRow>();
          issueRows.forEach((row) => {
            if (typeof row.project_id === "number") {
              issuesByProject.set(row.project_id, row);
            }
          });

          const healthByProject = new Map<number, AnyRow>();
          healthRows.forEach((row) => {
            if (typeof row.id === "number") {
              healthByProject.set(row.id, row);
            }
          });

          const latestMeetingByProject = new Map<number, AnyRow>();
          meetings.forEach((row) => {
            const projectIdValue =
              typeof row.project_id === "number" ? row.project_id : null;
            if (!projectIdValue || latestMeetingByProject.has(projectIdValue)) return;
            latestMeetingByProject.set(projectIdValue, row);
          });

          const riskByProject = new Map<number, AnyRow[]>();
          risks.forEach((row) => {
            if (typeof row.project_id !== "number") return;
            const status = String(row.status ?? "").toLowerCase();
            if (status === "closed" || status === "resolved" || status === "mitigated") {
              return;
            }
            const arr = riskByProject.get(row.project_id) ?? [];
            arr.push(row);
            riskByProject.set(row.project_id, arr);
          });

          const insightsByProject = new Map<number, AnyRow[]>();
          insights.forEach((row) => {
            if (typeof row.project_id !== "number") return;
            const resolved = Number(row.resolved ?? 0) === 1;
            if (resolved) return;
            const arr = insightsByProject.get(row.project_id) ?? [];
            arr.push(row);
            insightsByProject.set(row.project_id, arr);
          });

          const riskyProjects = projects
            .map((project) => {
              const pid = Number(project.id);
              const projectRisks = riskByProject.get(pid) ?? [];
              const projectInsights = insightsByProject.get(pid) ?? [];
              const issueSummary = issuesByProject.get(pid);
              const health = healthByProject.get(pid);
              const latestMeeting = latestMeetingByProject.get(pid);

              const criticalInsightCount = projectInsights.filter((i) => {
                const sev = String(i.severity ?? "").toLowerCase();
                return sev === "critical" || sev === "high";
              }).length;

              const openRiskCount = projectRisks.length;
              const openIssueCount = Number(issueSummary?.total_issues ?? 0);
              const openCriticalItems = Number(health?.open_critical_items ?? 0);

              const riskScore =
                openRiskCount * 5 +
                criticalInsightCount * 4 +
                openCriticalItems * 3 +
                openIssueCount;

              const topSignals: string[] = [];
              if (openRiskCount > 0) {
                topSignals.push(`${openRiskCount} open structured risk(s)`);
              }
              if (criticalInsightCount > 0) {
                topSignals.push(`${criticalInsightCount} high/critical AI insight(s)`);
              }
              if (openCriticalItems > 0) {
                topSignals.push(`${openCriticalItems} critical health item(s)`);
              }
              if (openIssueCount > 0) {
                topSignals.push(`${openIssueCount} tracked issue(s)`);
              }

              return {
                id: pid,
                name: project.name,
                phase: project.phase,
                healthStatus:
                  health?.health_status ?? project.health_status ?? null,
                healthScore: health?.health_score ?? project.health_score ?? null,
                riskScore,
                openRiskCount,
                criticalInsightCount,
                openCriticalItems,
                openIssueCount,
                topSignals,
                sourceRef: latestMeeting
                  ? `[Source: Meeting - "${latestMeeting.title}" - ${latestMeeting.date}]`
                  : null,
                latestMeeting: latestMeeting
                  ? {
                      title: latestMeeting.title,
                      date: latestMeeting.date,
                      summary: String(
                        latestMeeting.summary || latestMeeting.overview || "",
                      ).substring(0, 600),
                    }
                  : null,
              };
            })
            .filter(
              (p) =>
                p.openRiskCount > 0 ||
                p.criticalInsightCount > 0 ||
                p.openCriticalItems > 0 ||
                p.openIssueCount > 0,
            )
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, maxProjects ?? 25);

          return {
            sourceRef: `[Source: Project Risk Radar - ${phase ?? "all"} projects]`,
            summary: {
              phase: phase ?? "all",
              totalProjectsChecked: projects.length,
              riskyProjects: riskyProjects.length,
              projectsWithStructuredRisks: riskyProjects.filter((p) => p.openRiskCount > 0)
                .length,
              projectsWithCriticalItems: riskyProjects.filter((p) => p.openCriticalItems > 0)
                .length,
            },
            projects: riskyProjects,
            message:
              riskyProjects.length === 0
                ? "No active project risks were detected for the selected phase."
                : undefined,
          };
        },
      ),
    }),

    getProjectRiskAnalysis: tool({
      description:
        "Deep risk analysis for a specific project. Pulls AI-identified risks, " +
        "change order exposure, overdue RFIs, schedule slippage, budget data, and " +
        "recent meeting insights. Use when assessing a project's risk profile.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
      }),
      execute: withTrace(
        "getProjectRiskAnalysis",
        options,
        async ({ projectId, projectName }) => {
        const scopedProjectIds = await guardrails.getScopedProjectIds(projectId);
        if (scopedProjectIds.length === 0) {
          return {
            error:
              "You do not have access to that project. Choose a project you are assigned to.",
          };
        }

        let resolvedId =
          typeof projectId === "number" && Number.isFinite(projectId)
            ? projectId
            : scopedProjectIds.length === 1
              ? scopedProjectIds[0]
              : undefined;
        let resolvedName = projectName;

        if (!resolvedId && projectName) {
          const { data } = await supabase
            .from("projects")
            .select("id, name")
            .in("id", scopedProjectIds)
            .ilike("name", `%${projectName}%`)
            .limit(1)
            .single();
          if (data) {
            resolvedId = data.id;
            resolvedName = data.name ?? undefined;
          } else {
            return { error: `No project found matching "${projectName}"` };
          }
        }

        if (!resolvedId) {
          return { error: "Provide projectId or projectName" };
        }

        const accessCheck = await guardrails.enforceProjectAccess(resolvedId);
        if (!accessCheck.ok) {
          return { error: accessCheck.error };
        }

        const [
          insightsRes,
          changeOrdersRes,
          rfisRes,
          scheduleRes,
          projectRes,
          budgetRes,
          meetingsRes,
        ] = await Promise.all([
          supabase
            .from("ai_insights")
            .select("*")
            .eq("project_id", resolvedId)
            .in("resolved", [0])
            .order("severity", { ascending: true })
            .limit(20),
          supabase
            .from("prime_contract_change_orders")
            .select("id, title, total_amount, status, due_date, description")
            .eq("project_id", resolvedId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("rfis")
            .select("*")
            .eq("project_id", resolvedId)
            .neq("status", "closed")
            .order("due_date", { ascending: true })
            .limit(20),
          supabase
            .from("schedule_tasks")
            .select("*")
            .eq("project_id", resolvedId)
            .order("finish_date", { ascending: true })
            .limit(50),
          supabase
            .from("projects")
            .select("*")
            .eq("id", resolvedId)
            .single(),
           
          supabase
            .from("v_budget_lines" as never)
            .select(
              "id, description, original_amount, revised_budget, approved_co_total",
            )
            .eq("project_id", resolvedId) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: unknown }>,
          supabase
            .from("document_metadata")
            .select("title, date, summary, overview, participants")
            .eq("project_id", resolvedId)
            .or("type.eq.meeting,category.eq.meeting")
            .order("date", { ascending: false })
            .limit(10),
        ]);

        const project = projectRes.data as AnyRow | null;
        const insights = (insightsRes.data ?? []) as AnyRow[];
        const changeOrders = (changeOrdersRes.data ?? []) as AnyRow[];
        const rfis = (rfisRes.data ?? []) as AnyRow[];
        const tasks = (scheduleRes.data ?? []) as AnyRow[];
        const budgetLines = (budgetRes.data ?? []) as AnyRow[];
        const recentMeetings = (meetingsRes.data ?? []) as AnyRow[];

        const now = new Date().toISOString().split("T")[0];
        const overdueTasks = tasks.filter(
          (t) =>
            t.finish_date &&
            t.finish_date < now &&
            t.status !== "completed" &&
            (t.percent_complete ?? 0) < 100,
        );
        const milestonesAtRisk = tasks.filter(
          (t) =>
            t.is_milestone &&
            t.finish_date &&
            t.finish_date < now &&
            t.status !== "completed",
        );

        const pendingCOAmount = changeOrders
          .filter(
            (co) => co.status !== "approved" && co.status !== "rejected",
          )
          .reduce((s, co) => s + (co.total_amount ?? 0), 0);
        const approvedCOAmount = changeOrders
          .filter((co) => co.status === "approved")
          .reduce((s, co) => s + (co.total_amount ?? 0), 0);

        const totalOriginalBudget = budgetLines.reduce(
          (s, b) => s + (b.original_amount ?? 0),
          0,
        );
        const totalRevisedBudget = budgetLines.reduce(
          (s, b) => s + (b.revised_budget ?? 0),
          0,
        );
        const budgetGrowthPct =
          totalOriginalBudget > 0
            ? Math.round(
                ((totalRevisedBudget - totalOriginalBudget) /
                  totalOriginalBudget) *
                  100,
              )
            : 0;

        const overdueRFIs = rfis.filter(
          (r) => r.due_date && r.due_date < now,
        );
        const criticalInsights = insights.filter(
          (i) => i.severity === "critical" || i.severity === "high",
        );

        return {
          sourceRef: `[Source: Risk Analysis - ${resolvedName ?? project?.name ?? `Project ${resolvedId}`}]`,
          project: {
            id: resolvedId,
            name: resolvedName ?? project?.name,
            phase: project?.phase,
            healthStatus: project?.health_status,
            healthScore: project?.health_score,
            completionPct: project?.completion_percentage,
            budget: project?.budget,
            budgetUsed: project?.budget_used,
          },
          riskSummary: {
            overallRiskLevel:
              criticalInsights.length > 3 || overdueRFIs.length > 5
                ? "HIGH"
                : criticalInsights.length > 0 || overdueRFIs.length > 2
                  ? "MEDIUM"
                  : "LOW",
            criticalInsightCount: criticalInsights.length,
            totalOpenInsights: insights.length,
            overdueTaskCount: overdueTasks.length,
            milestonesAtRisk: milestonesAtRisk.length,
            overdueRFICount: overdueRFIs.length,
            pendingChangeOrderExposure: pendingCOAmount,
            approvedChangeOrderTotal: approvedCOAmount,
            budgetGrowthPct,
          },
          criticalInsights: criticalInsights.slice(0, 10).map((i) => ({
            title: i.title,
            description: i.description,
            severity: i.severity,
            type: i.insight_type,
            financialImpact: i.financial_impact,
            timelineImpactDays: i.timeline_impact_days,
            businessImpact: i.business_impact,
          })),
          overdueItems: {
            tasks: overdueTasks.slice(0, 10).map((t) => ({
              name: t.name,
              finishDate: t.finish_date,
              percentComplete: t.percent_complete,
              isMilestone: t.is_milestone,
            })),
            rfis: overdueRFIs.slice(0, 10).map((r) => ({
              number: r.number,
              subject: r.subject,
              dueDate: r.due_date,
              ballInCourt: r.ball_in_court,
            })),
          },
          changeOrderExposure: {
            totalPending: pendingCOAmount,
            totalApproved: approvedCOAmount,
            count: changeOrders.length,
          },
          budgetAnalysis: {
            originalBudget: totalOriginalBudget,
            revisedBudget: totalRevisedBudget,
            budgetGrowthPct,
            lineCount: budgetLines.length,
          },
          recentMeetings: recentMeetings.slice(0, 5).map((m) => ({
            sourceRef: `[Source: Meeting - "${m.title}" - ${m.date}]`,
            title: m.title,
            date: m.date,
            keyPoints: (m.summary || m.overview || "").substring(0, 800),
            participants: m.participants,
          })),
        };
        },
      ),
    }),

    getFinancialAnalysis: tool({
      description:
        "Detailed financial analysis across current projects or a specific project. " +
        "Computes contract values, change order trends, and flags financial concerns. " +
        "Use when asked about money, budgets, contracts, costs, or profitability.",
      inputSchema: z.object({
        projectId: z
          .number()
          .optional()
          .describe("Optional project ID to scope the analysis"),
      }),
      execute: withTrace(
        "getFinancialAnalysis",
        options,
        async ({ projectId }) => {
        const scopedProjectIds = await guardrails.getScopedProjectIds(projectId);
        if (scopedProjectIds.length === 0) {
          return {
            error:
              "You do not have access to that project. Choose a project you are assigned to.",
          };
        }

        const financialQuery = supabase
          .from("prime_contract_financial_summary")
          .select("*")
          .in("project_id", scopedProjectIds);
        const { data: financialRows } = await financialQuery;
        const financials = (financialRows ?? []) as AnyRow[];

        const ceQuery = supabase
          .from("change_events_summary")
          .select("*")
          .in("project_id", scopedProjectIds);
        const { data: ceRows } = await ceQuery;
        const changeEvents = (ceRows ?? []) as AnyRow[];

        // Get project names for context
        const projIds = Array.from(
          new Set(financials.map((f) => f.project_id).filter(Boolean)),
        );
        const { data: projRows } = await supabase
          .from("projects")
          .select("id, name, phase")
          .in("id", projIds.length > 0 ? projIds : [0]);
        const projMap = new Map<number, AnyRow>();
        (projRows ?? []).forEach((p: AnyRow) => projMap.set(p.id, p));

        const totalOriginalContracts = financials.reduce(
          (s, f) => s + (f.original_contract_amount ?? 0),
          0,
        );
        const totalRevisedContracts = financials.reduce(
          (s, f) => s + (f.revised_contract_amount ?? 0),
          0,
        );
        const totalInvoiced = financials.reduce(
          (s, f) => s + (f.invoiced_amount ?? 0),
          0,
        );
        const totalPayments = financials.reduce(
          (s, f) => s + (f.payments_received ?? 0),
          0,
        );
        const totalPendingCOs = financials.reduce(
          (s, f) => s + (f.pending_change_orders ?? 0),
          0,
        );
        const totalApprovedCOs = financials.reduce(
          (s, f) => s + (f.approved_change_orders ?? 0),
          0,
        );

        const contractGrowthPct =
          totalOriginalContracts > 0
            ? Math.round(
                ((totalRevisedContracts - totalOriginalContracts) /
                  totalOriginalContracts) *
                  100,
              )
            : 0;

        const openCEs = changeEvents.filter(
          (ce) => ce.status !== "closed" && ce.status !== "void",
        );

        const financialConcerns: string[] = [];
        if (contractGrowthPct > 10) {
          financialConcerns.push(
            `Contract values have grown ${contractGrowthPct}% from original amounts`,
          );
        }
        if (
          totalPendingCOs > 0 &&
          totalPendingCOs > totalOriginalContracts * 0.05
        ) {
          financialConcerns.push(
            `Pending change orders ($${totalPendingCOs.toLocaleString()}) exceed 5% of original contract value`,
          );
        }
        if (totalInvoiced > 0 && totalPayments / totalInvoiced < 0.8) {
          financialConcerns.push(
            `Collection rate is ${Math.round((totalPayments / totalInvoiced) * 100)}% — review receivables`,
          );
        }

        return {
          sourceRef: scopedProjectIds.length === 1
            ? `[Source: Financial Analysis - Project ${scopedProjectIds[0]}]`
            : "[Source: Financial Analysis - Portfolio]",
          summary: {
            totalOriginalContractValue: totalOriginalContracts,
            totalRevisedContractValue: totalRevisedContracts,
            contractGrowthPct,
            totalInvoiced,
            totalPaymentsReceived: totalPayments,
            collectionRate:
              totalInvoiced > 0
                ? Math.round((totalPayments / totalInvoiced) * 100)
                : 0,
            totalApprovedChangeOrders: totalApprovedCOs,
            totalPendingChangeOrders: totalPendingCOs,
            openChangeEvents: openCEs.length,
          },
          financialConcerns,
          contracts: financials.map((f) => ({
            title: f.title,
            projectName: projMap.get(f.project_id)?.name,
            projectPhase: projMap.get(f.project_id)?.phase,
            originalAmount: f.original_contract_amount,
            revisedAmount: f.revised_contract_amount,
            invoiced: f.invoiced_amount,
            paymentsReceived: f.payments_received,
            remainingBalance: f.remaining_balance,
            percentPaid: f.percent_paid,
            pendingCOs: f.pending_change_orders,
            approvedCOs: f.approved_change_orders,
            status: f.status,
          })),
        };
        },
      ),
    }),

    getProjectBudgetSummary: tool({
      description:
        "Get a true project budget summary from budget line data (NOT contract value). " +
        "Use this FIRST for questions like 'total budget', 'budget amount', or 'budget status' " +
        "for a specific project.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to resolve if projectId is unknown"),
      }),
      execute: withTrace(
        "getProjectBudgetSummary",
        options,
        async ({ projectId, projectName }) => {
          const scopedProjectIds = await guardrails.getScopedProjectIds(projectId);
          if (scopedProjectIds.length === 0) {
            return {
              error:
                "You do not have access to that project. Choose a project you are assigned to.",
            };
          }

          let resolvedId =
            typeof projectId === "number" && Number.isFinite(projectId)
              ? projectId
              : scopedProjectIds.length === 1
                ? scopedProjectIds[0]
                : undefined;
          let resolvedProject: AnyRow | null = null;

          if (!resolvedId && projectName) {
            const { data, error } = await supabase
              .from("projects")
              .select("id, name, phase")
              .in("id", scopedProjectIds)
              .ilike("name", `%${projectName}%`)
              .limit(1)
              .single();
            if (error || !data) {
              return { error: `No project found matching "${projectName}"` };
            }
            resolvedId = data.id;
            resolvedProject = data;
          }

          if (!resolvedId) {
            return { error: "Provide projectId or projectName" };
          }

          const accessCheck = await guardrails.enforceProjectAccess(resolvedId);
          if (!accessCheck.ok) {
            return { error: accessCheck.error };
          }

          if (!resolvedProject) {
            const { data } = await supabase
              .from("projects")
              .select("id, name, phase")
              .eq("id", resolvedId)
              .single();
            resolvedProject = data ?? null;
          }

          const [budgetRes, contractRes] = await Promise.all([
             
            supabase
              .from("v_budget_lines" as never)
              .select(
                "id, original_amount, revised_budget, approved_co_total, budget_mod_total",
              )
              .eq("project_id", resolvedId) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: unknown }>,
            supabase
              .from("prime_contract_financial_summary")
              .select(
                "title, original_contract_amount, revised_contract_amount, approved_change_orders, pending_change_orders, invoiced_amount, payments_received",
              )
              .eq("project_id", resolvedId),
          ]);

          const budgetLines = (budgetRes.data ?? []) as AnyRow[];
          const contractRows = (contractRes.data ?? []) as AnyRow[];

          const totalOriginalBudget = budgetLines.reduce(
            (sum, row) => sum + asNumber(row.original_amount),
            0,
          );
          const totalRevisedBudget = budgetLines.reduce(
            (sum, row) => sum + asNumber(row.revised_budget),
            0,
          );
          const totalApprovedBudgetChanges = budgetLines.reduce(
            (sum, row) => sum + asNumber(row.approved_co_total),
            0,
          );
          const totalBudgetModifications = budgetLines.reduce(
            (sum, row) => sum + asNumber(row.budget_mod_total),
            0,
          );
          const budgetDelta = totalRevisedBudget - totalOriginalBudget;
          const budgetGrowthPct =
            totalOriginalBudget > 0
              ? Math.round((budgetDelta / totalOriginalBudget) * 100)
              : 0;

          const contractTotals = {
            originalContractValue: contractRows.reduce(
              (sum, row) => sum + asNumber(row.original_contract_amount),
              0,
            ),
            revisedContractValue: contractRows.reduce(
              (sum, row) => sum + asNumber(row.revised_contract_amount),
              0,
            ),
            approvedChangeOrders: contractRows.reduce(
              (sum, row) => sum + asNumber(row.approved_change_orders),
              0,
            ),
            pendingChangeOrders: contractRows.reduce(
              (sum, row) => sum + asNumber(row.pending_change_orders),
              0,
            ),
            invoicedAmount: contractRows.reduce(
              (sum, row) => sum + asNumber(row.invoiced_amount),
              0,
            ),
            paymentsReceived: contractRows.reduce(
              (sum, row) => sum + asNumber(row.payments_received),
              0,
            ),
          };

          return {
            sourceRef: `[Source: Budget Summary - ${resolvedProject?.name ?? projectName ?? `Project ${resolvedId}`}]`,
            project: {
              id: resolvedId,
              name: resolvedProject?.name ?? projectName ?? null,
              phase: resolvedProject?.phase ?? null,
            },
            budgetSummary: {
              totalOriginalBudget,
              totalRevisedBudget,
              totalApprovedBudgetChanges,
              totalBudgetModifications,
              budgetDelta,
              budgetGrowthPct,
              budgetLineCount: budgetLines.length,
            },
            contractContext: contractTotals,
            dataNotes: [
              "Budget totals are from v_budget_lines (budget data).",
              "Contract totals are provided separately for context.",
            ],
          };
        },
      ),
    }),

    getActionItemsAndInsights: tool({
      description:
        "Get open tasks, priority action items from recent meetings, unresolved AI-surfaced " +
        "insights, and overdue RFIs. This is the PRIMARY tool for understanding " +
        "what needs attention NOW and what action items are outstanding. " +
        "Use when asked: 'what are my tasks', 'what do I need to do', 'what should I be working on', " +
        "'show me my action items', 'what's on my plate', 'what's open', 'what's urgent', " +
        "'what needs attention', or any question about to-do items, open items, or follow-ups. " +
        "Also use for person-specific task questions: 'what are Brandon's tasks', " +
        "'show tasks assigned to Brandon', 'what does Brandon need to do', " +
        "'tasks for [person name]', 'what is [person] working on'. " +
        "Pass the person's first or last name as assigneeName.",
      inputSchema: z.object({
        projectId: z
          .number()
          .optional()
          .describe("Optional project ID to filter by"),
        assigneeName: z
          .string()
          .optional()
          .describe("Optional person name to filter tasks by assignee (e.g. 'Brandon', 'Megan'). When provided, returns tasks assigned to or mentioning this person across all projects."),
        maxResults: z
          .number()
          .optional()
          .default(20)
          .describe("Max results to return"),
      }),
      execute: withTrace(
        "getActionItemsAndInsights",
        options,
        async ({ projectId, assigneeName, maxResults }) => {
        const scopedProjectIds = await guardrails.getScopedProjectIds(projectId);
        if (scopedProjectIds.length === 0) {
          return {
            error:
              "You do not have access to that project. Choose a project you are assigned to.",
          };
        }

        const insightQuery = supabase
          .from("ai_insights")
          .select("*")
          .in("project_id", scopedProjectIds)
          .order("created_at", { ascending: false })
          .limit((maxResults ?? 20) * 3); // fetch extra to account for JS-side resolved filter

        const sourceErrors: string[] = [];
        const { data: insightRows, error: insightError } = await insightQuery;
        if (insightError) {
          sourceErrors.push(`ai_insights lookup failed: ${insightError.message}`);
        }
        // Filter unresolved in JS — handles boolean false, integer 0, and null
        const insights = ((insightRows ?? []) as AnyRow[]).filter((row) => {
          const r = row.resolved;
          return r === null || r === undefined || r === false || r === 0 || r === "0";
        }).slice(0, maxResults ?? 20);

        // Meeting summaries and structured action items are the richest signal.
        const docQuery = supabase
          .from("document_metadata")
          .select("title, date, project, project_id, summary, overview, participants, action_items, bullet_points")
          .in("project_id", scopedProjectIds)
          .or("type.eq.meeting,category.eq.meeting")
          .order("date", { ascending: false })
          .limit(Math.max(20, (maxResults ?? 20) * 2));
        const { data: docRows, error: docError } = await docQuery;
        if (docError) {
          sourceErrors.push(`meeting action item lookup failed: ${docError.message}`);
        }
        const docs = ((docRows ?? []) as AnyRow[]).filter(
          (d) => d.summary || d.overview || d.action_items || d.bullet_points,
        );

        const now = new Date().toISOString().split("T")[0];
        const rfiQuery = supabase
          .from("rfis")
          .select("id, number, subject, status, due_date, ball_in_court")
          .in("project_id", scopedProjectIds)
          .neq("status", "closed")
          .lt("due_date", now)
          .order("due_date", { ascending: true })
          .limit(10);
        const { data: rfiRows, error: rfiError } = await rfiQuery;
        if (rfiError) {
          sourceErrors.push(`overdue RFI lookup failed: ${rfiError.message}`);
        }
        const overdueRFIs = (rfiRows ?? []) as AnyRow[];

        // Query the tasks table directly — these are AI-extracted action items
        // from meetings/emails that have been compiled into trackable records
        let tasksQuery = supabase
          .from("tasks")
          .select("id, title, description, status, priority, due_date, assignee_name, assignee_email, assigned_by, source_system, project_id")
          .neq("status", "completed")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(maxResults ?? 20);

        if (assigneeName) {
          const pattern = `%${assigneeName}%`;
          tasksQuery = tasksQuery.or(
            `assignee_name.ilike.${pattern},assignee_email.ilike.${pattern},assigned_by.ilike.${pattern},description.ilike.${pattern}`,
          );
        } else {
          tasksQuery = tasksQuery.in("project_id", scopedProjectIds);
        }
        const { data: taskRows, error: tasksError } = await tasksQuery;
        if (tasksError) {
          sourceErrors.push(`tasks lookup failed: ${tasksError.message}`);
        }
        const openTasks = ((taskRows ?? []) as AnyRow[]).map((t) => ({
          id: t.id,
          title: t.title ?? t.description?.substring(0, 100),
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.due_date,
          assignee: t.assignee_name ?? t.assignee_email,
          assignedBy: t.assigned_by,
          projectId: t.project_id,
          sourceSystem: t.source_system,
          overdue: t.due_date ? t.due_date < now : false,
        }));

        const structuredActionItems = docs
          .flatMap((d) => {
            const meeting = String(d.title ?? "Meeting");
            const project = String(d.project ?? "Unknown Project");
            const date = String(d.date ?? "");
            const candidates = [
              ...parseTextList(d.action_items),
              ...parseTextList(d.bullet_points),
            ];
            return candidates.map((item) => {
              const dueDate = extractDueDate(item);
              const overdue =
                dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
                  ? dueDate < now
                  : false;
              return {
                title: item.substring(0, 160),
                detail: item,
                assignee: extractAssignee(item),
                dueDate,
                overdue,
                project,
                meeting,
                date,
                sourceRef: `[Source: Meeting - "${meeting}" - ${date}]`,
              };
            });
          })
          .slice(0, (maxResults ?? 20) * 3);

        const prioritizedMeetingActions = structuredActionItems
          .map((item) => {
            let priority = 50;
            if (item.overdue) priority += 35;
            if (/(critical|urgent|asap|immediately)/i.test(item.detail)) priority += 20;
            if (item.assignee) priority += 5;
            return { ...item, priority };
          })
          .sort((a, b) => b.priority - a.priority)
          .slice(0, maxResults ?? 20);

        const prioritizedInsights = insights
          .map((i) => {
            const severity = String(i.severity ?? "").toLowerCase();
            const severityWeight =
              severity === "critical" ? 100 : severity === "high" ? 80 : severity === "medium" ? 60 : 40;
            return {
              title: i.title,
              description: i.description,
              type: i.insight_type,
              severity: i.severity,
              daysUntilDue: i.days_until_due,
              dueDate: i.due_date,
              assignee: i.assignee,
              priority: severityWeight,
            };
          })
          .sort((a, b) => b.priority - a.priority)
          .slice(0, maxResults ?? 20);

        return {
          sourceRef: "[Source: Action Items & Insights]",
          openTasks,
          priorityItems: prioritizedInsights,
          structuredActionItems: prioritizedMeetingActions,
          unresolvedInsights: insights.map((i) => ({
            title: i.title,
            description: i.description,
            type: i.insight_type,
            severity: i.severity,
            financialImpact: i.financial_impact,
            timelineImpactDays: i.timeline_impact_days,
            projectName: i.project_name,
            businessImpact: i.business_impact,
          })),
          meetingInsights: docs.map((d) => ({
            sourceRef: `[Source: Meeting - "${d.title}" - ${d.date}]`,
            meeting: d.title,
            date: d.date,
            project: d.project,
            keyPoints: (d.summary || d.overview || "").substring(0, 800),
          })),
          overdueRFIs: overdueRFIs.map((r) => ({
            number: r.number,
            subject: r.subject,
            status: r.status,
            dueDate: r.due_date,
            ballInCourt: r.ball_in_court,
          })),
          summary: {
            openTaskCount: openTasks.length,
            overdueTaskCount: openTasks.filter((t) => t.overdue).length,
            insightCount: insights.length,
            structuredActionItemCount: structuredActionItems.length,
            overdueRFICount: overdueRFIs.length,
            sourceErrorCount: sourceErrors.length,
          },
          sourceErrors,
        };
        },
      ),
    }),

    getMeetingsByDate: tool({
      description:
        "Get meetings for a specific date or date range. Use this for temporal " +
        "queries like 'today meetings', 'yesterday', or 'meetings this week'. " +
        "Returns only meeting records.",
      inputSchema: z.object({
        projectId: z
          .number()
          .optional()
          .describe("Optional project ID to filter by"),
        projectName: z
          .string()
          .optional()
          .describe("Optional project name to resolve and filter by"),
        date: z
          .string()
          .optional()
          .describe("Exact date in YYYY-MM-DD format; defaults to today if no range is provided"),
        startDate: z
          .string()
          .optional()
          .describe("Range start in YYYY-MM-DD format"),
        endDate: z
          .string()
          .optional()
          .describe("Range end in YYYY-MM-DD format"),
        maxResults: z
          .number()
          .optional()
          .default(25)
          .describe("Max meetings to return"),
      }),
      execute: withTrace(
        "getMeetingsByDate",
        options,
        async ({ projectId, projectName, date, startDate, endDate, maxResults }) => {
          const scopedProjectIds = await guardrails.getScopedProjectIds(projectId);
          if (scopedProjectIds.length === 0) {
            return {
              error:
                "You do not have access to that project. Choose a project you are assigned to.",
            };
          }

          let resolvedProjectId =
            typeof projectId === "number" && Number.isFinite(projectId)
              ? projectId
              : scopedProjectIds.length === 1
                ? scopedProjectIds[0]
                : undefined;
          let resolvedProjectName: string | null = null;

          if (!resolvedProjectId && projectName) {
            const { data: projectRow } = await supabase
              .from("projects")
              .select("id, name")
              .in("id", scopedProjectIds)
              .ilike("name", `%${projectName}%`)
              .order("name", { ascending: true })
              .limit(1)
              .maybeSingle();

            if (!projectRow?.id) {
              return { error: `No project found matching "${projectName}"` };
            }
            resolvedProjectId = projectRow.id;
            resolvedProjectName = projectRow.name ?? null;
          }

          const today = new Date().toISOString().split("T")[0];
          const effectiveDate =
            !startDate && !endDate ? (date || today) : null;

          const buildMeetingsByDateQuery = (dateColumn: "date" | "created_at") => {
            let meetingsQuery = supabase
              .from("document_metadata")
              .select(
                "id, title, date, created_at, project, project_id, summary, overview, participants, action_items, bullet_points, category, type",
              )
              .or("type.eq.meeting,category.eq.meeting")
              .order(dateColumn, { ascending: false })
              .limit(maxResults ?? 25);

            if (resolvedProjectId) {
              meetingsQuery = meetingsQuery.eq("project_id", resolvedProjectId);
            } else {
              // Cross-portfolio queries include both meetings tagged to one of
              // the user's accessible projects AND meetings with NULL project_id
              // (Fireflies ingests meetings before the auto-tagger has run, so
              // recent meetings can be untagged during the same window).
              const scopedIdsCsv = scopedProjectIds.join(",");
              meetingsQuery = meetingsQuery.or(
                `project_id.in.(${scopedIdsCsv}),project_id.is.null`,
              );
            }

            if (effectiveDate) {
              meetingsQuery = meetingsQuery
                .gte(dateColumn, `${effectiveDate}T00:00:00`)
                .lt(dateColumn, `${effectiveDate}T23:59:59.999`);
            } else {
              if (startDate)
                meetingsQuery = meetingsQuery.gte(dateColumn, `${startDate}T00:00:00`);
              if (endDate)
                meetingsQuery = meetingsQuery.lte(dateColumn, `${endDate}T23:59:59.999`);
            }

            return meetingsQuery;
          };

          const { data: primaryMeetingRows, error } = await buildMeetingsByDateQuery("date");
          if (error) return { error: error.message };

          let meetings = (primaryMeetingRows ?? []) as AnyRow[];
          let usedCreatedAtFallback = false;
          if (meetings.length === 0) {
            const { data: createdAtMeetingRows, error: createdAtError } =
              await buildMeetingsByDateQuery("created_at");
            if (createdAtError) return { error: createdAtError.message };
            meetings = (createdAtMeetingRows ?? []) as AnyRow[];
            usedCreatedAtFallback = meetings.length > 0;
          }
          const windowLabel = effectiveDate
            ? effectiveDate
            : `${startDate || "start"} to ${endDate || "today"}`;

          return {
            sourceRef: "[Source: Meetings By Date]",
            window: {
              date: effectiveDate,
              startDate: startDate ?? null,
              endDate: endDate ?? null,
              today,
            },
            project: {
              id: resolvedProjectId ?? null,
              name: resolvedProjectName ?? projectName ?? null,
            },
            totalMeetings: meetings.length,
            meetings: meetings.map((m) => ({
              sourceRef: `[Source: Meeting - "${m.title}" - ${m.date}]`,
              id: m.id,
              title: m.title,
              date: m.date,
              project: m.project,
              projectId: m.project_id,
              summary: (m.summary || m.overview || "").substring(0, 1200),
              participants: m.participants,
              actionItems: m.action_items,
              bulletPoints: m.bullet_points,
            })),
            message:
              meetings.length === 0
                ? `No meetings found for ${windowLabel}.`
                : usedCreatedAtFallback
                  ? `No meetings matched the primary date field for ${windowLabel}; returned meetings recovered from created_at instead.`
                : undefined,
          };
        },
      ),
    }),

    searchDocuments: tool({
      description:
        "Search meeting transcripts, notes, and project documents by keyword. " +
        "Works across ALL projects by default — no project filter needed. " +
        "Optionally filter by project name or ID. " +
        "Use when investigating specific topics, decisions, or looking for " +
        "context on a particular issue discussed in meetings.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("Search keywords or phrases to find in documents"),
        projectId: z
          .number()
          .optional()
          .describe("Optional project ID to scope the search"),
        projectName: z
          .string()
          .optional()
          .describe("Optional project name to resolve and filter by (e.g. 'Uniqlo', 'Cedar Park')"),
        maxResults: z
          .number()
          .optional()
          .default(10)
          .describe("Max results to return"),
      }),
      execute: withTrace(
        "searchDocuments",
        options,
        async ({ query, projectId, projectName, maxResults }) => {
        const scopedProjectIds = await guardrails.getScopedProjectIds(projectId);
        if (scopedProjectIds.length === 0) {
          return {
            error:
              "You do not have access to that project. Choose a project you are assigned to.",
          };
        }

        // Resolve project name to ID if provided
        let resolvedProjectId =
          typeof projectId === "number" && Number.isFinite(projectId)
            ? projectId
            : scopedProjectIds.length === 1
              ? scopedProjectIds[0]
              : undefined;
        let resolvedProjectName: string | null = null;
        if (!resolvedProjectId && projectName) {
          const { data: projectRow } = await supabase
            .from("projects")
            .select("id, name")
            .in("id", scopedProjectIds)
            .ilike("name", `%${projectName}%`)
            .order("name", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (projectRow?.id) {
            resolvedProjectId = projectRow.id;
            resolvedProjectName = projectRow.name ?? null;
          }
          // If project name doesn't resolve, still search across all projects
        }

        if (resolvedProjectId) {
          const { data: docRows } = await supabase
            .from("document_metadata")
            .select("*")
            .eq("project_id", resolvedProjectId)
            .or("type.eq.meeting,category.eq.meeting")
            .textSearch("content", query.split(" ").join(" & "))
            .order("date", { ascending: false })
            .limit(maxResults ?? 10);
          const docs = (docRows ?? []) as AnyRow[];

          if (docs.length) {
            return {
              project: { id: resolvedProjectId, name: resolvedProjectName ?? projectName ?? null },
              results: docs.map((d) => ({
                sourceRef: `[Source: ${d.category === "meeting" ? "Meeting" : "Document"} - "${d.title}" - ${d.date}]`,
                id: d.id,
                title: d.title,
                date: d.date,
                projectId: d.project_id,
                projectName: d.project,
                participants: d.participants,
                category: d.category,
                summary: d.summary ?? d.overview,
                actionItems: d.action_items,
                bulletPoints: d.bullet_points,
              })),
            };
          }
        }

        // Cross-project full-text search, scoped to allowed projects
        const { data, error } = await supabase.rpc(
          "full_text_search_meetings",
          {
            search_query: query,
            match_count: Math.max((maxResults ?? 10) * 2, 25),
          },
        );

        if (error) return { error: error.message };
        const results = ((data ?? []) as AnyRow[]).filter((r) =>
          scopedProjectIds.includes(Number(r.project_id)),
        );
        if (!results.length) {
          return {
            results: [],
            message: `No documents found matching "${query}". Try broader keywords or use semanticSearch for meaning-based results.`,
          };
        }

        return {
          searchScope: resolvedProjectId ? `Project: ${resolvedProjectName ?? resolvedProjectId}` : "All projects",
          results: results.map((r) => ({
            sourceRef: `[Source: ${r.category === "meeting" ? "Meeting" : "Document"} - "${r.title}" - ${r.date}]`,
            id: r.id,
            title: r.title,
            date: r.date,
            projectId: r.project_id,
            projectName: r.project,
            category: r.category,
            participants: r.participants,
            content: r.content?.substring(0, 1000),
          })),
        };
        },
      ),
    }),

    getProjectDetails: tool({
      description:
        "Get comprehensive details for a specific project including contracts, " +
        "schedule, RFIs, and recent meeting activity with action items. " +
        "Use when diving deep into a single project.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for (partial match)"),
      }),
      execute: withTrace(
        "getProjectDetails",
        options,
        async ({ projectId, projectName }) => {
        const scopedProjectIds = await guardrails.getScopedProjectIds(projectId);
        if (scopedProjectIds.length === 0) {
          return {
            error:
              "You do not have access to that project. Choose a project you are assigned to.",
          };
        }

        let project: AnyRow | null = null;

        if (projectId) {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .in("id", scopedProjectIds)
            .single();
          if (error) return { error: error.message };
          project = data as AnyRow;
        } else if (projectName) {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .in("id", scopedProjectIds)
            .ilike("name", `%${projectName}%`)
            .limit(1)
            .single();
          if (error)
            return { error: `No project found matching "${projectName}"` };
          project = data as AnyRow;
        } else if (scopedProjectIds.length === 1) {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("id", scopedProjectIds[0])
            .single();
          if (error) return { error: error.message };
          project = data as AnyRow;
        } else {
          return { error: "Provide either projectId or projectName" };
        }

        if (!project) return { error: "Project not found" };

        const [contractsRes, tasksRes, rfisRes, recentDocsRes] =
          await Promise.all([
            supabase
              .from("prime_contracts")
              .select("id, title, status, original_contract_value, executed_at")
              .eq("project_id", project.id)
              .limit(10),
            supabase
              .from("schedule_tasks")
              .select("*")
              .eq("project_id", project.id)
              .order("start_date", { ascending: true })
              .limit(30),
            supabase
              .from("rfis")
              .select("id, number, subject, status, due_date")
              .eq("project_id", project.id)
              .neq("status", "closed")
              .neq("status", "Closed")
              .order("due_date", { ascending: true })
              .limit(10),
            supabase
              .from("document_metadata")
              .select(
                "title, date, summary, overview, participants, category",
              )
              .eq("project_id", project.id)
              .or("type.eq.meeting,category.eq.meeting")
              .order("date", { ascending: false })
              .limit(10),
          ]);

        const tasks = (tasksRes.data ?? []) as AnyRow[];
        const recentDocs = (recentDocsRes.data ?? []) as AnyRow[];

        return {
          sourceRef: `[Source: Project Details - ${project.name}]`,
          project: {
            id: project.id,
            name: project.name,
            projectNumber: project.project_number,
            client: project.client,
            phase: project.phase ?? project.current_phase,
            state: project.state,
            address: project.address,
            budget: project.budget,
            budgetUsed: project.budget_used,
            healthStatus: project.health_status,
            completionPct: project.completion_percentage,
            deliveryMethod: project.delivery_method,
            workScope: project.work_scope,
            summary: project.summary,
            startDate: project["start date"],
            estCompletion: project["est completion"],
          },
          contracts: contractsRes.data ?? [],
          scheduleTasks: tasks.map((t) => ({
            name: t.name,
            status: t.status,
            startDate: t.start_date,
            finishDate: t.finish_date,
            percentComplete: t.percent_complete,
            isMilestone: t.is_milestone,
          })),
          openRFIs: (rfisRes.data ?? []).map((r) => ({
            number: r.number,
            subject: r.subject,
            status: r.status,
            dueDate: r.due_date,
          })),
          recentMeetings: recentDocs.map((d) => ({
            sourceRef: `[Source: Meeting - "${d.title}" - ${d.date}]`,
            title: d.title,
            date: d.date,
            keyPoints: (d.summary || d.overview || "").substring(0, 800),
            participants: d.participants,
          })),
        };
        },
      ),
    }),
  };
}
