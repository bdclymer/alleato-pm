/**
 * buildExecutorDeps — wires the ExecutorDeps interface to the real loader
 * functions used by the existing chat route.
 *
 * Call this once per request, passing the Supabase client and the authenticated
 * userId. The returned object satisfies ExecutorDeps and can be passed directly
 * to executeRetrievalPlan().
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

import {
  loadCurrentIntelligencePacket,
  resolveIntelligenceTarget,
} from "@/lib/ai/intelligence/packet-service";
import { createProjectTools } from "@/lib/ai/tools/project-tools";
import { createOperationalTools } from "@/lib/ai/tools/operational";
import { createToolGuardrails } from "@/lib/ai/tools/guardrails";
import { createServiceClient } from "@/lib/supabase/service";
import { generateDailyBrief } from "@/lib/executive/daily-brief";
import type { SourceSpecificRagKind } from "@/lib/ai/detect-rag-request";
import { buildSourceSpecificRagAnswer } from "@/lib/ai/retrieval/source-specific-rag";
import { loadReusableBriefingContext } from "@/lib/ai/retrieval/reusable-briefing";
import { fetchDeepAgentAppExpert } from "@/lib/ai/deep-agent-bridge";
import { buildSkillInjectionContext } from "@/lib/ai/services/skill-injection-service";

import type { ExecutorDeps } from "./executor";
import type { ExternalSource } from "./types";

// Minimal ToolExecutionOptions satisfying the AI SDK execute() signature when
// called outside of a live LLM tool-calling context (direct server-side calls).
const DIRECT_EXEC_OPTIONS = { toolCallId: "direct", messages: [] as never[] };

// ---------------------------------------------------------------------------
// Synthetic SourceSpecificRagRequest builder
//
// The executor calls runSourceSpecificRag(kind, _message). The underlying
// buildSourceSpecificRagAnswer expects a SourceSpecificRagRequest with a
// label, optional date window, and limit. We derive these from the kind alone
// (the message is not needed to hydrate the request shape for any current kind).
// ---------------------------------------------------------------------------
function buildSyntheticRagRequest(kind: SourceSpecificRagKind, message?: string) {
  const now = new Date();
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);

  switch (kind) {
    case "meetings_on_date": {
      // Default to most recent Friday when no date is inferable from message
      const date = isoDate(now);
      return { kind, label: "Meeting transcripts", date, limit: 20 } as const;
    }
    case "recent_meetings":
      return { kind, label: "Recent meeting transcripts", limit: 10 } as const;
    case "recent_emails":
      return { kind, label: "Recent emails", limit: 5 } as const;
    case "recent_onedrive_documents":
      return { kind, label: "Recent OneDrive documents", limit: 5 } as const;
    case "recent_teams_discussions": {
      const end = isoDate(now);
      const start = isoDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      return {
        kind,
        label: "Recent Teams discussions",
        query: message,
        startDate: start,
        endDate: end,
        limit: 10,
      } as const;
    }
  }
}

function projectNameCandidatesFromQuery(query: string): string[] {
  const candidates = new Set<string>();
  const normalized = query.trim();
  const relationMatch = normalized.match(
    /\b(?:for|on|about)\s+([A-Za-z0-9][A-Za-z0-9 '&.-]{2,80}?)(?:,|\bincluding\b|\bwith\b|\band\b|[?.]|$)/i,
  );
  if (relationMatch?.[1]) candidates.add(relationMatch[1].trim());

  for (const quoted of normalized.matchAll(/["“]([^"”]{3,80})["”]/g)) {
    candidates.add(quoted[1].trim());
  }

  const ignored = new Set([
    "give",
    "current",
    "executive",
    "project",
    "update",
    "including",
    "hard",
    "facts",
    "open",
    "risks",
    "recommended",
    "next",
    "actions",
    "status",
    "latest",
  ]);
  for (const token of normalized.match(/\b[A-Za-z][A-Za-z0-9'&.-]{2,}\b/g) ?? []) {
    const lower = token.toLowerCase();
    if (!ignored.has(lower)) candidates.add(token);
  }

  return [...candidates]
    .map((candidate) => candidate.replace(/\s+/g, " ").trim())
    .filter((candidate) => candidate.length >= 3)
    .sort((a, b) => b.length - a.length)
    .slice(0, 6);
}

async function resolveProjectFromProjectsTable(params: {
  supabase: SupabaseClient<Database>;
  guardrails: ReturnType<typeof createToolGuardrails>;
  query: string;
}): Promise<{ projectId: number } | null> {
  const scopedProjectIds = await params.guardrails.getScopedProjectIds();
  if (scopedProjectIds.length === 0) return null;

  for (const candidate of projectNameCandidatesFromQuery(params.query)) {
    const { data, error } = await params.supabase
      .from("projects")
      .select("id,name")
      .eq("archived", false)
      .in("id", scopedProjectIds)
      .ilike("name", `%${candidate}%`)
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error && typeof data?.id === "number") {
      return { projectId: data.id };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type BuildExecutorDepsInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  sessionId?: string | null;
};

export function buildExecutorDeps({ supabase, userId, sessionId }: BuildExecutorDepsInput): ExecutorDeps {
  // Lazy-initialized tool factories — createServiceClient() inside each factory
  // uses the module-level service client singleton, so calling them multiple times
  // is safe. We create them once per request inside the closure.
  const projectTools = createProjectTools(userId);
  const operationalTools = createOperationalTools(userId);
  const guardrails = createToolGuardrails(userId);

  // 1. loadIntelligencePacket
  //    Resolves the intelligence target for the projectId then loads the current packet.
  const loadIntelligencePacket = async (projectId: number): Promise<unknown> => {
    const target = await resolveIntelligenceTarget({
      query: String(projectId),
      selectedProjectId: projectId,
      supabase,
    });
    if (!target) return null;
    return loadCurrentIntelligencePacket({
      targetId: target.id,
      supabase,
      projectId: target.projectId,
    });
  };

  // 2. loadProjectSnapshot
  //    Delegates to the getProjectBriefingSnapshot tool which performs all the
  //    heavy Supabase queries. createProjectTools uses createServiceClient()
  //    internally, so the passed supabase client is not needed here.
  const loadProjectSnapshot = async (projectId: number): Promise<unknown> => {
    const tool = projectTools.getProjectBriefingSnapshot;
    if (!tool?.execute) return null;
    return tool.execute({ projectId }, DIRECT_EXEC_OPTIONS);
  };

  // 3. runSemanticSearch
  //    Delegates to the semanticSearch tool from createOperationalTools.
  const runSemanticSearch = async (query: string): Promise<unknown> => {
    const tool = operationalTools.semanticSearch;
    if (!tool?.execute) return null;
    return tool.execute(
      { query, matchCount: 8, threshold: 0.2, skipRerank: true },
      DIRECT_EXEC_OPTIONS,
    );
  };

  // 4. runExternalSourceSearch
  //    Dispatches to the appropriate meeting / Teams / email / OneDrive tool.
  const runExternalSourceSearch = async (
    source: ExternalSource,
    query: string,
    projectId?: number,
  ): Promise<unknown> => {
    switch (source) {
      case "meetings": {
        const tool = operationalTools.searchMeetingsByTopic;
        if (!tool?.execute) return null;
        return tool.execute({ topic: query, projectId, maxResults: 6 }, DIRECT_EXEC_OPTIONS);
      }
      case "teams": {
        const tool = operationalTools.searchTeamsMessages;
        if (!tool?.execute) return null;
        return tool.execute({ query, matchCount: 6 }, DIRECT_EXEC_OPTIONS);
      }
      case "email": {
        const tool = operationalTools.searchEmails;
        if (!tool?.execute) return null;
        return tool.execute({ query, matchCount: 6 }, DIRECT_EXEC_OPTIONS);
      }
      case "onedrive": {
        const tool = operationalTools.searchExternalDocuments;
        if (!tool?.execute) return null;
        return tool.execute({ query, matchCount: 6 }, DIRECT_EXEC_OPTIONS);
      }
    }
  };

  // 5. loadReusableBriefing
  //    Looks up the session's most recent assistant message that contains a
  //    cached project briefing snapshot.
  const loadReusableBriefing = async (sessionId: string): Promise<unknown> => {
    return loadReusableBriefingContext({ supabase, sessionId });
  };

  // 6. runRecentEmails
  //    Uses the structured Outlook intake table path. This is deliberately
  //    separate from source-specific RAG so inbox/date questions cannot be
  //    answered from stale embeddings or document_metadata rows.
  const runRecentEmails = async (input: {
    daysBack: number;
    limit: number;
    message: string;
  }): Promise<unknown> => {
    const tool = operationalTools.getRecentEmails;
    if (!tool?.execute) return null;
    return tool.execute(
      {
        daysBack: input.daysBack,
        direction: "mailbox",
        limit: input.limit,
        groupByThread: true,
        timeZone: "America/New_York",
      },
      DIRECT_EXEC_OPTIONS,
    );
  };

  // 7. runSourceSpecificRag
  //    Runs the source-specific retrieval path (meetings, emails, Teams, OneDrive)
  //    for the given kind string. Builds a synthetic request from the kind and
  //    resolves the user's scope via guardrails.
  const runSourceSpecificRag = async (kind: string, _message: string): Promise<unknown> => {
    const scope = await guardrails.getScope();
    const serviceSupabase = createServiceClient();
    const request = buildSyntheticRagRequest(kind as SourceSpecificRagKind, _message);
    return buildSourceSpecificRagAnswer({
      supabase: serviceSupabase,
      request,
      scope,
    });
  };

  // 8. buildBrandonDaily
  //    Compatibility executor name for the Brandon preset of the canonical Daily Brief.
  const buildBrandonDaily = async (): Promise<unknown> => {
    return generateDailyBrief({ windowDays: 2, preset: "brandon" });
  };

  // 9. runAppExpert
  //    Calls the backend read-only App Expert Deep Agents module for questions
  //    about application navigation, feature status, permissions, and route/code
  //    ownership. This keeps app expertise in the curated docs/sitemap corpus
  //    instead of relying on generic model memory.
  const runAppExpert = async (input: {
    question: string;
    currentRoute?: string | null;
    projectId?: number | null;
  }): Promise<unknown> => {
    let approvedSkillContext = "";
    try {
      const skillContext = await buildSkillInjectionContext({
        userId,
        messageText: input.question,
        selectedProjectId: input.projectId ?? undefined,
        surface: "app_expert",
        allowedCategories: ["app_help"],
        limit: 3,
      });
      approvedSkillContext = skillContext.block;
    } catch (error) {
      console.error("[app-expert] failed to load approved app-help skills", {
        message: error instanceof Error ? error.message : "Unknown skill context error",
      });
    }

    return fetchDeepAgentAppExpert({
      userId,
      sessionId,
      question: input.question,
      currentRoute: input.currentRoute ?? undefined,
      projectId: input.projectId ?? undefined,
      approvedSkillContext: approvedSkillContext || undefined,
    });
  };

  // 10. resolveProjectFromQuery
  //    When the planner emits project-scoped retrieval but no selectedProjectId
  //    was provided (e.g. user typed "What's the status of Vermillion Rise?"
  //    without selecting it from the dropdown), resolve the project from the
  //    message text using the existing intelligence target resolver.
  const resolveProjectFromQuery = async (
    query: string,
  ): Promise<{ projectId: number } | null> => {
    if (!query.trim()) return null;
    const target = await resolveIntelligenceTarget({ query, supabase });
    if (target?.projectId) return { projectId: target.projectId };
    return resolveProjectFromProjectsTable({ supabase, guardrails, query });
  };

  return {
    loadIntelligencePacket,
    loadProjectSnapshot,
    runSemanticSearch,
    runExternalSourceSearch,
    runRecentEmails,
    loadReusableBriefing,
    runSourceSpecificRag,
    buildBrandonDaily,
    runAppExpert,
    resolveProjectFromQuery,
  };
}
