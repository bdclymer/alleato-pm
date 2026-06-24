import { generateText } from "ai";
import { aiTelemetry } from "@/lib/ai/ai-telemetry";
import { getLanguageModel } from "@/lib/ai/providers";
import { formatAIProviderFailure } from "@/lib/ai/provider-config";
import type { BrandonDailyUpdatePacket } from "@/lib/executive/brandon-daily-update";
import { DEFAULT_EXECUTIVE_BRIEFING_SYNTHESIS_MODEL } from "@/lib/executive/brandon-daily-update";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BriefHealthStatus = "on_track" | "watch" | "critical";

export type DecisionApproaching = {
  title: string;
  decisionNeededBy: string;
  impact: string;
};

export type MorningIntelligenceBrief = {
  portfolioName: string;
  healthStatus: BriefHealthStatus;
  executiveSnapshot: string[];
  todaysPriorities: string[];
  watchItems: string[];
  decisionsApproaching: DecisionApproaching[];
  forecast: string;
};

export type EveningIntelligenceBrief = {
  portfolioName: string;
  healthStatus: BriefHealthStatus;
  whatChangedToday: string[];
  decisionsMade: string[];
  risksThatIncreased: string;
  ownerAttentionRequired: string;
  strategicInsight: string;
};

export type ExecutiveIntelligenceBrief = {
  generatedAt: string;
  briefType: "morning" | "evening";
  windowDays: number;
  morning: MorningIntelligenceBrief | null;
  evening: EveningIntelligenceBrief | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectBriefType(): "morning" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  return hour < 13 ? "morning" : "evening";
}

function stripJsonFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function briefingModel(): string {
  const configured = process.env.EXECUTIVE_BRIEFING_SYNTHESIS_MODEL?.trim();
  return (configured || DEFAULT_EXECUTIVE_BRIEFING_SYNTHESIS_MODEL).replace(
    /^openai\//,
    "",
  );
}

function buildSourceSummary(packet: BrandonDailyUpdatePacket): string {
  const allItems = [
    ...packet.sections.needsBrandon,
    ...packet.sections.waitingOnOthers,
    ...packet.sections.importantUpdates,
  ];

  if (allItems.length === 0) {
    return "No source items available for the current window.";
  }

  return allItems
    .map(
      (item, idx) =>
        `[${idx + 1}] ${item.title} | Project: ${item.project} | Source: ${item.source} ${item.date}\n` +
        `  ${item.summary.slice(0, 400)}\n` +
        (item.recommendedAction
          ? `  Action: ${item.recommendedAction}\n`
          : "") +
        (item.whyItMatters ? `  Why: ${item.whyItMatters}\n` : "") +
        (item.tone ? `  Tone: ${item.tone}\n` : ""),
    )
    .join("\n");
}

// ---------------------------------------------------------------------------
// Morning synthesis
// ---------------------------------------------------------------------------

const MORNING_SYSTEM = `You are an executive intelligence officer preparing a morning brief for a construction company owner.

PHILOSOPHY: This is NOT a summary. This is an intelligence brief. Tell them:
- What matters
- Why it matters
- What needs attention

The owner can read the full Project Intelligence page for details. This brief must be readable in 60-90 seconds.

RULES:
- executiveSnapshot: exactly 2-3 bullets maximum. Only the most critical things happening right now.
- todaysPriorities: 2-4 numbered items. What the team is actively working on TODAY.
- watchItems: things that COULD become risks (not current risks). 2-4 items.
- decisionsApproaching: ONLY if there is a real upcoming decision with a deadline. Can be empty array.
- forecast: 2-3 sentences maximum. Forward-looking. Include a "if X is not resolved by Y, then Z" sentence if appropriate.
- healthStatus: "on_track" if things are generally progressing, "watch" if 1-2 items need attention, "critical" if there is an active blocker or financial risk.

NO action items. NO RFI lists. NO meeting summaries. NO noise.

Return ONLY valid JSON.`;

const MORNING_USER_TEMPLATE = `Generate a morning intelligence brief from this source data.

SOURCE ITEMS:
{SOURCE_SUMMARY}

Return JSON exactly like this:
{
  "portfolioName": "Portfolio Overview",
  "healthStatus": "on_track" | "watch" | "critical",
  "executiveSnapshot": ["bullet 1", "bullet 2", "bullet 3"],
  "todaysPriorities": ["priority 1", "priority 2", "priority 3"],
  "watchItems": ["watch item 1", "watch item 2"],
  "decisionsApproaching": [
    { "title": "Decision title", "decisionNeededBy": "Date", "impact": "What is affected" }
  ],
  "forecast": "Two to three forward-looking sentences."
}`;

// ---------------------------------------------------------------------------
// Evening synthesis
// ---------------------------------------------------------------------------

const EVENING_SYSTEM = `You are an executive intelligence officer preparing an evening intelligence report for a construction company owner.

PHILOSOPHY: This is NOT a summary of what happened. This is an intelligence report. Tell them:
- What changed today (not what was discussed — what actually changed)
- What decisions were made
- What risks increased
- What (if anything) requires the owner's attention

The owner already has the full Project Intelligence page. This report must be readable in 60-90 seconds.

RULES:
- whatChangedToday: exactly 2-5 bullets. Only real changes — not meetings, not discussions. If something was APPROVED, CONFIRMED, REVISED, or RESOLVED, that is a change.
- decisionsMade: list only formal decisions made today. Can be empty array.
- risksThatIncreased: describe only if a risk materially increased today. If no risk increased, say "No new risk identified." Do NOT say "No schedule risk" if you don't have evidence — just "No change."
- ownerAttentionRequired: THE MOST IMPORTANT SECTION. Be precise. If nothing is needed, say "None." If something is needed, state exactly what and by when.
- strategicInsight: ONE sentence only. This is where the PM becomes a strategic advisor. Make it insightful.
- healthStatus: same as morning rules.

NO action items. NO noise.

Return ONLY valid JSON.`;

const EVENING_USER_TEMPLATE = `Generate an evening intelligence report from this source data.

SOURCE ITEMS:
{SOURCE_SUMMARY}

Return JSON exactly like this:
{
  "portfolioName": "Portfolio Overview",
  "healthStatus": "on_track" | "watch" | "critical",
  "whatChangedToday": ["change 1", "change 2"],
  "decisionsMade": ["Decision: description"],
  "risksThatIncreased": "Description or 'No change.'",
  "ownerAttentionRequired": "Specific ask or 'None.'",
  "strategicInsight": "One strategic sentence."
}`;

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------

function fallbackMorningBrief(
  packet: BrandonDailyUpdatePacket,
): MorningIntelligenceBrief {
  const allItems = [
    ...packet.sections.needsBrandon,
    ...packet.sections.waitingOnOthers,
    ...packet.sections.importantUpdates,
  ];

  const hasRisk = allItems.some((item) => item.tone === "risk");
  const hasWatch = allItems.some((item) => item.tone === "watch");

  return {
    portfolioName: "Portfolio Overview",
    healthStatus: hasRisk ? "critical" : hasWatch ? "watch" : "on_track",
    executiveSnapshot: allItems
      .slice(0, 3)
      .map((item) => `${item.project}: ${item.title}`),
    todaysPriorities: packet.operatingBrief?.recommendedMoves.slice(0, 3) ?? [],
    watchItems: packet.sections.waitingOnOthers
      .slice(0, 3)
      .map((item) => item.title),
    decisionsApproaching: [],
    forecast:
      "Review project intelligence pages for current status on active items.",
  };
}

function fallbackEveningBrief(
  packet: BrandonDailyUpdatePacket,
): EveningIntelligenceBrief {
  const allItems = [
    ...packet.sections.needsBrandon,
    ...packet.sections.importantUpdates,
  ];

  const hasRisk = allItems.some((item) => item.tone === "risk");
  const hasWatch = allItems.some((item) => item.tone === "watch");

  return {
    portfolioName: "Portfolio Overview",
    healthStatus: hasRisk ? "critical" : hasWatch ? "watch" : "on_track",
    whatChangedToday: allItems
      .slice(0, 5)
      .map((item) => `${item.project}: ${item.title}`),
    decisionsMade: [],
    risksThatIncreased: "No change.",
    ownerAttentionRequired:
      packet.sections.needsBrandon.length > 0
        ? (packet.sections.needsBrandon[0].recommendedAction ??
          "Review critical items.")
        : "None.",
    strategicInsight:
      packet.operatingBrief?.importantBusinessSignals[0] ??
      "No strategic signal surfaced today.",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateExecutiveIntelligenceBrief(
  packet: BrandonDailyUpdatePacket,
  options: { forceBriefType?: "morning" | "evening" } = {},
): Promise<ExecutiveIntelligenceBrief> {
  const briefType = options.forceBriefType ?? detectBriefType();
  const model = briefingModel();
  const sourceSummary = buildSourceSummary(packet);

  const isMorning = briefType === "morning";
  const system = isMorning ? MORNING_SYSTEM : EVENING_SYSTEM;
  const userPrompt = (
    isMorning ? MORNING_USER_TEMPLATE : EVENING_USER_TEMPLATE
  ).replace("{SOURCE_SUMMARY}", sourceSummary);

  try {
    const result = await generateText({
      model: getLanguageModel(model),
      temperature: 0.15,
      system,
      messages: [{ role: "user", content: userPrompt }],
      experimental_telemetry: aiTelemetry({
        functionId: "executive-daily-brief.intelligence-synthesis",
        metadata: {
          workflow: "executive_daily_brief",
          briefType,
          windowDays: packet.windowDays,
          needsBrandonItemCount: packet.sections.needsBrandon.length,
          waitingOnOthersItemCount: packet.sections.waitingOnOthers.length,
          importantUpdatesItemCount: packet.sections.importantUpdates.length,
        },
      }),
    });

    const raw = result.text.trim();
    if (!raw)
      throw new Error("Empty response from intelligence brief synthesis.");

    const parsed = JSON.parse(stripJsonFence(raw));

    if (isMorning) {
      const morning = parsed as MorningIntelligenceBrief;
      return {
        generatedAt: new Date().toISOString(),
        briefType,
        windowDays: packet.windowDays,
        morning,
        evening: null,
      };
    }

    const evening = parsed as EveningIntelligenceBrief;
    return {
      generatedAt: new Date().toISOString(),
      briefType,
      windowDays: packet.windowDays,
      morning: null,
      evening,
    };
  } catch (error) {
    const message = formatAIProviderFailure(
      error,
      "Intelligence brief synthesis",
    );
    console.error(`[intelligence-brief] synthesis failed: ${message}`);

    return {
      generatedAt: new Date().toISOString(),
      briefType,
      windowDays: packet.windowDays,
      morning: isMorning ? fallbackMorningBrief(packet) : null,
      evening: isMorning ? null : fallbackEveningBrief(packet),
    };
  }
}
