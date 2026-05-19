// frontend/src/lib/ai/retrieval/system-prompt.ts
import type { RetrievalPlan, RetrievalContext } from "./types";

const MAX_CHUNK_CHARS = 1200;
const MAX_VECTOR_RESULTS = 8;
const MAX_COMPACT_VALUE_CHARS = 1200;
const MAX_PACKET_CARDS = 8;
const MAX_PACKET_LIST_ITEMS = 5;

type SemanticResult = {
  content?: string;
  sourceTable?: string;
  recordId?: string | number;
  similarity?: number;
  finalScore?: number;
  createdAt?: string | null;
  metadata?: Record<string, unknown>;
};

function renderSemanticResults(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const wrapper = raw as { results?: SemanticResult[]; resultCount?: number };
  const results = Array.isArray(wrapper.results) ? wrapper.results : [];
  if (results.length === 0) return "";

  const sliced = results.slice(0, MAX_VECTOR_RESULTS);
  const lines = sliced.map((r, i) => {
    const content = (r.content ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_CHUNK_CHARS);
    const date = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "unknown date";
    const score = typeof r.finalScore === "number" ? r.finalScore.toFixed(2) : "?";
    const source = r.sourceTable ?? "unknown";
    const title =
      (r.metadata?.subject as string | undefined) ??
      (r.metadata?.title as string | undefined) ??
      (r.metadata?.meeting_title as string | undefined) ??
      "";
    const heading = title ? `${source} · ${title}` : source;
    const truncated = (r.content ?? "").trim().replace(/\s+/g, " ").length > MAX_CHUNK_CHARS
      ? " [truncated]"
      : "";
    return `### [${i + 1}] ${heading}\nDate: ${date}; score: ${score}\n${content}${truncated}`;
  });

  return lines.join("\n\n");
}

function compactText(value: unknown, maxChars = MAX_COMPACT_VALUE_CHARS): string | null {
  if (value == null) return null;
  const text = String(value).trim().replace(/\s+/g, " ");
  if (!text) return null;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)} [truncated]`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function renderTitledItems(value: unknown, fields: string[], limit = MAX_PACKET_LIST_ITEMS): string {
  const items = asArray(value)
    .slice(0, limit)
    .map((item) => {
      const record = asRecord(item);
      const title = compactText(record.title, 220);
      if (!title) return null;
      const detail = fields
        .map((field) => compactText(record[field], 320))
        .filter(Boolean)
        .join(" ");
      return detail ? `- ${title}: ${detail}` : `- ${title}`;
    })
    .filter((line): line is string => Boolean(line));
  return items.join("\n");
}

function renderPacketSourceCoverage(packet: Record<string, unknown>): string {
  const coverage = asRecord(packet.sourceCoverage ?? packet.source_coverage);
  const categoryRows = asArray(coverage.categoryCoverage);
  const linkedEvidenceCount = compactText(coverage.linkedEvidenceCount, 80);
  const latestSourceAt = compactText(coverage.latestSourceAt, 120);
  const lines: string[] = [];

  if (linkedEvidenceCount) {
    lines.push(`- linked evidence citations: ${linkedEvidenceCount}`);
  }
  if (latestSourceAt) {
    lines.push(`- latest packet source date: ${latestSourceAt}`);
  }

  for (const row of categoryRows.slice(0, 8)) {
    const record = asRecord(row);
    const label = compactText(record.label ?? record.category, 120);
    if (!label) continue;
    const selected = compactText(record.sourceCount, 40) ?? "0";
    const available = compactText(record.availableCount, 40) ?? "0";
    const latest = compactText(record.latestAt, 120);
    lines.push(
      `- ${label}: ${selected} selected / ${available} available${latest ? `; latest ${latest}` : ""}`,
    );
  }

  const qualityCounts = asRecord(coverage.sourceQualityCounts);
  if (Object.keys(qualityCounts).length > 0) {
    const quality = Object.entries(qualityCounts)
      .map(([key, value]) => `${key}=${compactText(value, 40) ?? "0"}`)
      .join(", ");
    lines.push(`- source quality: ${quality}`);
  }

  if (lines.length === 0) return "";
  return [
    "## Source Coverage",
    ...lines,
    "",
    "If this coverage lists meeting sources, do not claim no meeting transcripts surfaced. Say the packet has meeting coverage, and separately state if a fresh direct transcript lookup was not run or returned no additional rows.",
  ].join("\n");
}

function renderStrategicReport(packet: Record<string, unknown>): string {
  const packetJson = asRecord(packet.packetJson ?? packet.packet_json);
  const report = asRecord(packetJson.strategicReport);
  if (Object.keys(report).length === 0) return "";

  const sections = [
    ["What Changed", renderTitledItems(report.whatChanged, ["impact"])],
    ["Risks", renderTitledItems(report.risks, ["recommendedAction", "severity"])],
    ["Open Decisions", renderTitledItems(report.openDecisions, ["owner", "neededBy"])],
    ["Money Impact", compactText(asRecord(report.moneyImpact).summary, 700)],
    ["Promises Made", renderTitledItems(report.promisesMade, ["owner", "dueDate"])],
    ["Recommended Actions", renderTitledItems(report.recommendedActions, ["reason", "priority"])],
  ].filter(([, body]) => Boolean(body));

  if (sections.length === 0) return "";
  return [
    "## Strategic Report",
    ...sections.map(([title, body]) => `### ${title}\n${body}`),
  ].join("\n\n");
}

function renderIntelligencePacket(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const packet = raw as Record<string, unknown>;
  const lines: string[] = [];

  // Staleness warning — packets older than the freshness window may misrepresent
  // current state. Tell the model so it doesn't assert stale facts.
  const isStale = packet.isStale === true;
  const ageHours = typeof packet.ageHours === "number" ? packet.ageHours : null;
  if (isStale && ageHours !== null) {
    const ageDisplay =
      ageHours >= 48
        ? `${Math.round(ageHours / 24)} days`
        : `${Math.round(ageHours)} hours`;
    lines.push(
      [
        "## ⚠️ STALE PACKET WARNING",
        `This intelligence packet was generated ${ageDisplay} ago and may be out of date.`,
        "Treat it as background context only — confirm critical claims by calling fresh tools (getProjectBriefingSnapshot, getMeetingsByDate, getRecentEmails) before stating numbers, dates, or decisions to the user.",
      ].join("\n"),
    );
  }

  const summary = compactText(packet.executiveSummary ?? packet.executive_summary);
  if (summary) {
    lines.push(`## Executive Summary\n${summary}`);
  }

  const currentStatus = compactText(packet.currentStatus ?? packet.current_status);
  if (currentStatus) {
    lines.push(`## Current Status\n${currentStatus}`);
  }

  const strategicRead = compactText(packet.strategicRead ?? packet.strategic_read);
  if (strategicRead) {
    lines.push(`## Strategic Read\n${strategicRead}`);
  }

  const recommendedMoves = asArray(packet.recommendedNextMoves ?? packet.recommended_next_moves)
    .map((move) => compactText(move, 260))
    .filter((move): move is string => Boolean(move))
    .slice(0, MAX_PACKET_LIST_ITEMS);
  if (recommendedMoves.length > 0) {
    lines.push(`## Recommended Next Moves\n${recommendedMoves.map((move) => `- ${move}`).join("\n")}`);
  }

  const sourceCoverage = renderPacketSourceCoverage(packet);
  if (sourceCoverage) {
    lines.push(sourceCoverage);
  }

  const strategicReport = renderStrategicReport(packet);
  if (strategicReport) {
    lines.push(strategicReport);
  }

  const cards = Array.isArray(packet.cards) ? packet.cards.slice(0, MAX_PACKET_CARDS) : [];
  if (cards.length > 0) {
    const renderedCards = cards
      .map((card, index) => {
        if (!card || typeof card !== "object") return null;
        const cardRecord = card as Record<string, unknown>;
        const title = compactText(cardRecord.title, 160) ?? `Card ${index + 1}`;
        const cardSummary = compactText(
          cardRecord.summary ?? cardRecord.description ?? cardRecord.recommendation,
        );
        return cardSummary
          ? `### ${title}\n${cardSummary}`
          : `### ${title}`;
      })
      .filter((value): value is string => Boolean(value));
    if (renderedCards.length > 0) {
      lines.push(`## Cards\n${renderedCards.join("\n\n")}`);
    }
  }

  const status = compactText(packet.status ?? packet.health ?? packet.riskLevel, 240);
  if (status) {
    lines.push(`## Status\n${status}`);
  }

  if (lines.length === 0) {
    const id = compactText(packet.id ?? packet.targetId ?? packet.target_id, 240);
    if (id) {
      lines.push(`Packet ID: ${id}`);
    }
  }

  return lines.join("\n\n");
}

function renderCompactRecord(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const entries = Object.entries(raw as Record<string, unknown>)
    .filter(([, value]) => value != null)
    .slice(0, 16)
    .map(([key, value]) => `- ${key}: ${compactText(value, 500) ?? ""}`);
  return entries.join("\n");
}

function renderRecentEmailInbox(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const record = raw as Record<string, unknown>;
  const lines: string[] = [];

  for (const key of [
    "summary",
    "dataCutoffNote",
    "latestAvailableFallback",
    "requestedWindowEmpty",
    "latestAvailableReceivedAt",
    "count",
    "threadCount",
  ]) {
    const value = compactText(record[key], 700);
    if (value) lines.push(`- ${key}: ${value}`);
  }

  const threads = Array.isArray(record.threads) ? record.threads.slice(0, 12) : [];
  if (threads.length > 0) {
    lines.push("## Threads");
    threads.forEach((thread, index) => {
      if (!thread || typeof thread !== "object") return;
      const threadRecord = thread as Record<string, unknown>;
      const subject = compactText(threadRecord.latestSubject, 180) ?? `Thread ${index + 1}`;
      const receivedAt = compactText(threadRecord.latestReceivedAt, 80) ?? "unknown time";
      const senders = Array.isArray(threadRecord.senders)
        ? threadRecord.senders.join(", ")
        : compactText(threadRecord.senders, 240);
      const preview = compactText(threadRecord.latestPreview, 500);
      const messageCount = compactText(threadRecord.messageCount, 40);
      const attachmentNote = threadRecord.hasAttachments === true ? "; has attachments" : "";
      lines.push(
        [
          `${index + 1}. ${subject}`,
          `   received: ${receivedAt}${messageCount ? `; messages: ${messageCount}` : ""}${attachmentNote}`,
          senders ? `   senders: ${senders}` : null,
          preview ? `   preview: ${preview}` : null,
        ].filter((line): line is string => Boolean(line)).join("\n"),
      );
    });
  }

  if (lines.length > 0) return lines.join("\n");
  return renderCompactRecord(raw);
}

export function assembleSystemPromptFromContext(
  plan: RetrievalPlan,
  ctx: RetrievalContext,
  basePrompt: string,
): string {
  const parts: string[] = [];

  if (ctx.intelligencePacket) {
    const packet = renderIntelligencePacket(ctx.intelligencePacket);
    if (packet) {
      parts.push(
        `# Current Project Intelligence Packet\n\nA pre-rendered intelligence packet is available below. Use it as your primary evidence. Layer your own analysis, recommendations, and follow-up questions on top.\n\n${packet}`,
      );
    }
  }

  if (ctx.projectSnapshot) {
    const snapshot = renderCompactRecord(ctx.projectSnapshot);
    if (snapshot) {
      parts.push(
        `# Project Briefing Snapshot\n\n${snapshot}`,
      );
    }
  }

  if (ctx.semanticVectorResults) {
    const rendered = renderSemanticResults(ctx.semanticVectorResults);
    if (rendered) {
      parts.push(
        `# Vector Search Results\n\nThe following passages were retrieved from meeting transcripts, emails, Teams messages, OneDrive docs, and the company knowledge base. Cite by source/date when answering. If the evidence does not cover the question, say so explicitly.\n\n${rendered}`,
      );
    }
  }

  if (ctx.executiveBriefingRetrieval) {
    const briefing = renderCompactRecord(ctx.executiveBriefingRetrieval);
    if (briefing) {
      parts.push(
        `# Recent Communication Signals\n\n${briefing}`,
      );
    }
  }

  if (ctx.recentEmailInbox) {
    const recentEmailInbox = renderRecentEmailInbox(ctx.recentEmailInbox);
    if (recentEmailInbox) {
      parts.push(
        [
          "# Structured Outlook Inbox Result",
          "",
          "This came from the structured outlook_email_intake path, not semantic RAG. Use it to answer inbox/date/importance questions. If it contains an error, say which Outlook lookup failed and do not pretend the inbox was checked.",
          "",
          recentEmailInbox,
        ].join("\n"),
      );
    }
  }

  if (ctx.sourceSpecificRagAnswer) {
    const content = compactText(ctx.sourceSpecificRagAnswer.content, 2500);
    if (content) {
      parts.push(`# Source-Specific RAG Result\n\n${content}`);
    } else {
      // Pre-fetch was attempted but returned no rows. Tell the model to use
      // its runtime tools rather than saying "no data found."
      const kind = plan.sources.sourceSpecificRag?.kind ?? "data";
      parts.push(
        [
          `# Pre-fetch Returned No Results (${kind})`,
          "",
          "The server-side retrieval for this query found no matching records.",
          "Do NOT say 'no data available'. Instead, use your available tools to answer the question directly.",
          "Call the most relevant tool (e.g. getMeetingIntelligence, getMeetingsByDate, getActionItemsAndInsights, consultMicrosoftExecutiveAssistant) and report what you find.",
        ].join("\n"),
      );
    }
  }

  if (ctx.warnings.length > 0) {
    const lines = ctx.warnings.map((w) => `- ${w.source}: ${w.message}`).join("\n");
    parts.push(
      `# Sources Unavailable\nThe following sources were attempted and did not return in time. Acknowledge this gap in your answer and proceed with what you have.\n${lines}`,
    );
  }

  void plan;

  if (parts.length === 0) {
    // No retrieval context was pre-loaded. Tell the model to reach for its
    // runtime tools rather than confabulating or refusing.
    const noDataBlock = [
      "# No Pre-fetched Context",
      "",
      "Nothing was pre-loaded for this query — no packet, snapshot, emails, or meetings.",
      "Use your available tools to answer. Do NOT invent facts about projects, people, budgets, schedules, or communications.",
      "",
      "## Tool routing for the most common owner questions",
      "",
      "**Project FACTS** (address, client, phase, manager, project number, OneDrive link, budget, completion %):",
      "  → call `getProjectDetails(projectName | projectId)`. These are STRUCTURED columns; do NOT semantic-search for them.",
      "",
      "**Find a specific DOCUMENT/FILE** (the permit, the contract, the latest drawings, the certificate of occupancy):",
      "  → call `findProjectDocuments(projectId|projectName, category, titleKeyword)`.",
      "  Categories: contract, permit, drawing, specification, submittal, rfi, daily_report, change_order, certificate, insurance, financial_document.",
      "",
      "**Search CONTENT inside documents** (e.g. 'what does the spec say about fire ratings'):",
      "  → call `searchDocuments(query, projectName?)`. This is vector search — use for topic / concept questions.",
      "",
      "**Risks / blockers / decisions on a project**:",
      "  → call `getProjectsWithRisks` for portfolio rollup, or `getProjectRiskAnalysis(projectId)` for a single project deep dive.",
      "",
      "**Microsoft operator work** (Outlook inbox/date triage, email replies, Teams escalation, Microsoft calendar/files):",
      "  → call `consultMicrosoftExecutiveAssistant`. The Strategist delegates this work instead of using direct Outlook/Teams tools.",
      "**Specialist analysis** (financial / operational / risk / people / BD / marketing):",
      "  → `consultCFO`, `consultCOO`, `consultCRO`, `consultCHRO`, `consultVPBD`, `consultCMO`.",
      "",
      "If the user has not specified a project, ask which one they mean before calling project-scoped tools.",
    ].join("\n");
    return `${noDataBlock}\n\n---\n\n${basePrompt}`;
  }

  return `${parts.join("\n\n---\n\n")}\n\n---\n\n${basePrompt}`;
}
