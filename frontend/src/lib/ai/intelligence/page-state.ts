import type { ClientProjectIntelligencePacket } from "./types";

type IntelligenceBriefing = {
  title: string;
  body: string;
};

export type IntelligencePageState = {
  briefing: IntelligenceBriefing;
  warnings: string[];
  limitations: string[];
};

function cleanText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\[message:[^\]]+\]/gi, "")
    .replace(/\[\d{4}-\d{2}-\d{2}[^\]]+\]/g, "")
    .replace(/(?:^|\s)#{1,6}\s+/gm, " ")
    .replace(/\*{1,3}([^*]*)\*{1,3}/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function cleanUnknown(value: unknown): string {
  return cleanText(typeof value === "string" || typeof value === "number" ? String(value) : "");
}

function isLowSignalText(value: string | null | undefined): boolean {
  const text = cleanText(value).toLowerCase();
  if (!text) return true;
  const emailCount = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/g)?.length ?? 0;
  const dateCount = text.match(/\b(?:mon|tue|wed|thu|fri|sat|sun)\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g)?.length ?? 0;
  const spacedLetters = text.match(/\b(?:[a-z]\s){4,}[a-z]\b/g)?.length ?? 0;

  return (
    text.length < 24 ||
    text === "this source contains project-relevant language that should be reviewed before it is trusted in a current intelligence packet." ||
    text === "review the source attribution and extracted signal, then promote or reject it." ||
    (text.includes(" duration:") && text.includes(" participants:")) ||
    (text.includes(" date:") && text.includes(" participants:") && emailCount >= 2) ||
    text.startsWith("subject:") ||
    (text.includes("active intelligence card") && text.includes("top signal")) ||
    text.includes("no clean synthesis has been compiled") ||
    emailCount >= 5 ||
    dateCount >= 8 ||
    spacedLetters > 0
  );
}

function firstStrategicText(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const text = cleanText(value);
    if (text && !isLowSignalText(text)) return text;
  }
  return "";
}

function summarizeText(value: string, maxLength = 360): string {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSentence = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("?"),
    truncated.lastIndexOf("!"),
  );
  if (lastSentence > 180) return truncated.slice(0, lastSentence + 1);
  return `${truncated.trim()}...`;
}

function strategicReport(packet: ClientProjectIntelligencePacket): Record<string, unknown> {
  return asRecord(asRecord(packet.packetJson).strategicReport);
}

function hasStrategicReport(packet: ClientProjectIntelligencePacket): boolean {
  return Object.keys(strategicReport(packet)).length > 0;
}

function packetEvidence(packet: ClientProjectIntelligencePacket) {
  return packet.cards.flatMap((card) => card.evidence);
}

function qualityWarnings(packet: ClientProjectIntelligencePacket): string[] {
  const warnings = new Set<string>();

  const lowSignalCards = packet.cards.filter((card) =>
    !firstStrategicText(card.summary, card.currentStatus, card.whyItMatters, card.nextAction)
  );

  if (lowSignalCards.length > 0 && !hasStrategicReport(packet)) {
    warnings.add(`${lowSignalCards.length} cards contain raw source text or metadata instead of usable synthesis.`);
  }

  const qualityGate = asRecord(packet.sourceCoverage.qualityGate);
  if (qualityGate.status && qualityGate.status !== "passed") {
    warnings.add(cleanUnknown(qualityGate.reason) || "The packet source quality gate did not pass.");
  }

  if (packet.isStale) {
    warnings.add("The packet is older than the expected refresh window.");
  }

  if (packetEvidence(packet).length === 0) {
    warnings.add("No linked citations are attached to the current packet.");
  }

  return Array.from(warnings).slice(0, 5);
}

function evidenceLimitations(packet: ClientProjectIntelligencePacket): string[] {
  const gaps = packet.sourceCoverage.gaps?.filter((gap): gap is string => typeof gap === "string") ?? [];
  return gaps.map(cleanText).filter(Boolean).slice(0, 5);
}

function briefingStatus(packet: ClientProjectIntelligencePacket): IntelligenceBriefing {
  const cleanRead = firstStrategicText(
    packet.executiveSummary,
    packet.currentStatus,
    packet.strategicRead,
    packet.whyItMatters,
  );
  const warnings = qualityWarnings(packet);

  if (!cleanRead) {
    return {
      title: "Daily intelligence could not produce a usable strategic read.",
      body:
        "The page found source-backed signals, but the current packet did not produce a synthesized operating read. This should be refreshed before a human or AI agent treats it as an operating report.",
    };
  }

  if (warnings.length > 0) {
    return {
      title: "Daily intelligence failed source-quality checks.",
      body:
        "The page found source-backed signals, but the current packet has a stale, uncited, or failed quality-gate condition. The evidence limits below are separate from this failure state.",
    };
  }

  return {
    title: "Daily project intelligence, synthesized from the sources that changed the job.",
    body: summarizeText(firstStrategicText(packet.currentStatus, packet.strategicRead, cleanRead), 520),
  };
}

export function buildIntelligencePageState(packet: ClientProjectIntelligencePacket): IntelligencePageState {
  return {
    briefing: briefingStatus(packet),
    warnings: qualityWarnings(packet),
    limitations: evidenceLimitations(packet),
  };
}
