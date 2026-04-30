import type {
  ClientProjectIntelligencePacket,
  InsightCard,
  ResolvedIntelligenceTarget,
} from "./types";
import type { AssistantIntent } from "../intent-router";

function findCard(packet: ClientProjectIntelligencePacket, types: string[]): InsightCard | undefined {
  return packet.cards.find((card) => types.includes(card.cardType));
}

function joinMoves(moves: string[]): string {
  return moves.length ? moves.map((move) => `- ${move}`).join("\n") : "- Verify the latest source evidence before acting.";
}

function formatEvidence(packet: ClientProjectIntelligencePacket): string {
  const coverage = packet.sourceCoverage;
  const parts = [
    `${coverage.documentMetadataRows ?? 0} project document/source rows`,
    `${coverage.aiMemoryRows ?? 0} project memories`,
    `${coverage.projectEmailRows ?? 0} project_emails rows`,
  ];
  const latest = coverage.latestSourceAt ? ` Latest packet source date: ${coverage.latestSourceAt}.` : "";
  const gaps = coverage.gaps?.length ? ` Gaps: ${coverage.gaps.join("; ")}.` : "";
  return `${parts.join(", ")}.${latest}${gaps}`;
}

function formatSourceCitations(packet: ClientProjectIntelligencePacket): string {
  const citations = packet.cards
    .flatMap((card) => card.evidence)
    .map((evidence) => evidence.sourceTitle || evidence.sourceDocumentId || evidence.sourceType)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 3);

  if (citations.length === 0) {
    return "";
  }

  return citations.map((citation) => `[Source: ${citation}]`).join(" ");
}

export function synthesizeMissingPacketResponse(input: {
  target: ResolvedIntelligenceTarget | null;
  query: string;
}): string {
  const targetName = input.target?.name ?? "that project";
  return [
    `I do not have a current intelligence packet for ${targetName} yet.`,
    "",
    "What I can do next: run a direct source lookup across project records, meetings, Teams, email, and documents, but I will label that as live lookup rather than a prepared project read.",
  ].join("\n");
}

export function synthesizeAdvisorResponse(input: {
  target: ResolvedIntelligenceTarget;
  packet: ClientProjectIntelligencePacket;
  intent: AssistantIntent;
  query: string;
}): string {
  const { packet, target } = input;
  const statusCard = findCard(packet, ["project_update"]);
  const financialCard = findCard(packet, ["financial_exposure"]);
  const changeCard = findCard(packet, ["change_management"]);
  const scheduleCard = findCard(packet, ["schedule_risk", "risk"]);
  const decisionCard = findCard(packet, ["decision", "open_question"]);
  const followUpCard = findCard(packet, ["task", "blocker"]);
  const freshnessLabel = packet.freshnessStatus.replace("_", " ");

  const freshnessWarning =
    packet.freshnessStatus === "fresh"
      ? ""
      : `\n\nPacket status: ${freshnessLabel}. Use this as the prepared baseline, not as proof that nothing changed after ${packet.coveredEndAt ?? packet.generatedAt}.`;
  const sourceCitations = formatSourceCitations(packet);

  return [
    `Current read: ${packet.currentStatus ?? statusCard?.summary ?? packet.executiveSummary}`,
    "",
    `What changed recently: ${statusCard?.summary ?? packet.strategicRead ?? "The packet did not include a separate recent-change card."}`,
    "",
    `Financial/change-management exposure: ${financialCard?.summary ?? "Formal financial exposure still needs structured tool verification."} ${changeCard?.summary ?? ""}`.trim(),
    "",
    `Schedule/operational risk: ${scheduleCard?.summary ?? "No separate schedule-risk card is in the packet."}`,
    "",
    `Decisions/open questions/follow-ups: ${[decisionCard?.summary, followUpCard?.summary].filter(Boolean).join(" ") || "No explicit decision/follow-up card is in the packet."}`,
    "",
    `Recommended next action:\n${joinMoves(packet.recommendedNextMoves)}`,
    "",
    `Evidence basis and confidence: ${packet.confidenceSummary.reason ?? "Confidence is based on the current packet cards and linked evidence."} ${formatEvidence(packet)}${sourceCitations ? ` ${sourceCitations}` : ""}`,
    freshnessWarning,
    "",
    `Resolved target: ${target.name} (project ${target.projectId ?? "none"}).`,
  ]
    .filter((part) => part !== "")
    .join("\n");
}
