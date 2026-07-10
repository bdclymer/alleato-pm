import "server-only";

import type { CanonicalDailyBriefPacket, DailyBriefSourceRef } from "@/lib/daily-briefs/canonical-packets";
import type { BriefV3, BriefV3Project } from "@/lib/daily-briefs/brief-v3-types";

import type {
  BriefContent,
  BriefDecision,
  BriefFlag,
  BriefLooseEnd,
  BriefProject,
  BriefSourceLink,
} from "./brief-content";

// ─────────────────────────────────────────────────────────────────────────────
// Packet → mb2 content adapter.
//
// Turns the canonical daily-executive-brief packet (structured BriefV3) into the
// shape the mb2 brief design renders, so the design is DATA-DRIVEN: whenever a new
// brief packet is generated, this page shows it. Every cited source is converted
// to an in-app link (the meeting page or the project inbox) using the packet's
// source manifest — never a raw transcript file or Outlook URL.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://projects.alleatogroup.com";

/** alias → in-app link, built from the packet's source manifest (lane + projectId + id). */
function buildAliasLinks(sources: DailyBriefSourceRef[]): Map<string, BriefSourceLink> {
  const links = new Map<string, BriefSourceLink>();
  for (const source of sources) {
    if (!source.alias) continue;
    const pid = source.projectId;
    if (source.lane === "meetings") {
      const href = pid ? `${BASE}/${pid}/meetings/${source.id}` : `${BASE}/meetings/${source.id}`;
      links.set(source.alias, { label: "Meeting", href, kind: "meeting" });
    } else if (source.lane === "emails") {
      const href = pid ? `${BASE}/${pid}/emails` : `${BASE}/emails`;
      links.set(source.alias, { label: "Project inbox", href, kind: "inbox" });
    } else if (pid) {
      links.set(source.alias, { label: "Project inbox", href: `${BASE}/${pid}/emails`, kind: "inbox" });
    }
  }
  return links;
}

/** Strip inline `[S12]` citation tokens from prose. Null-safe. */
function stripCitations(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** The distinct in-app links (Meeting first, then one inbox) for a project's cited sources. */
function projectSources(
  project: BriefV3Project,
  aliasLinks: Map<string, BriefSourceLink>,
): BriefSourceLink[] {
  const aliases = new Set<string>();
  for (const item of project.actionItems) for (const id of item.sourceIds) aliases.add(id);
  const out: BriefSourceLink[] = [];
  let meeting: BriefSourceLink | null = null;
  let inbox: BriefSourceLink | null = null;
  for (const alias of aliases) {
    const link = aliasLinks.get(alias);
    if (!link) continue;
    if (link.kind === "meeting" && !meeting) meeting = link;
    if (link.kind === "inbox" && !inbox) inbox = link;
  }
  if (meeting) out.push(meeting);
  if (inbox) out.push(inbox);
  return out;
}

function flagFor(project: BriefV3Project): { flag: BriefFlag; label: string } {
  if (project.hasOwnerDecision) return { flag: "decision", label: "Decision" };
  if (project.resolvedToday) return { flag: "watch", label: "Resolved" };
  if (project.urgencyRank <= 2) return { flag: "risk", label: "At risk" };
  return { flag: "watch", label: "Watch" };
}

/** Split BriefV3 prose into short points; lead with the owner decision when present. */
function projectPoints(project: BriefV3Project): BriefProject["points"] {
  const sentences = stripCitations(project.context)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  return sentences.map((text, index) => ({ t: text, call: index === 0 && project.hasOwnerDecision }));
}

function weekdayLabel(businessDate: string): { weekday: string; dateLabel: string } {
  const parsed = new Date(`${businessDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return { weekday: "", dateLabel: businessDate };
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(parsed);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
  return { weekday, dateLabel };
}

/**
 * Build the mb2 design's content from the canonical packet. Returns null when the
 * packet has no structured v3 brief, so the caller can fall back to the static
 * snapshot.
 */
export function buildMb2ContentFromPacket(packet: CanonicalDailyBriefPacket): BriefContent | null {
  const brief: BriefV3 | null = packet.brief;
  if (!brief) return null;

  const aliasLinks = buildAliasLinks(packet.sources ?? []);
  const { weekday, dateLabel } = weekdayLabel(brief.businessDate);

  const decisions: BriefDecision[] = brief.callsToday.map((call, index) => ({
    id: `call-${index}`,
    project: call.project,
    text: [{ t: stripCitations(call.question) }],
  }));

  // Show every project the brief covers — the design has no separate "also
  // moving" section, so nothing is hidden. Decision projects sort to the top.
  const ordered = [...brief.projects].sort((a, b) => {
    const aRank = a.hasOwnerDecision ? 0 : 1;
    const bRank = b.hasOwnerDecision ? 0 : 1;
    if (aRank !== bRank) return aRank - bRank;
    return (a.urgencyRank ?? 99) - (b.urgencyRank ?? 99);
  });

  const attentionProjects: BriefProject[] = ordered.map((project) => {
    const { flag, label } = flagFor(project);
    return {
      id: project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
      name: project.name,
      flag,
      flagLabel: label,
      points: projectPoints(project),
      sources: projectSources(project, aliasLinks),
    };
  });

  const looseEnds: BriefLooseEnd[] = brief.looseEnds.map((item, index) => {
    const firstAlias = item.sourceIds.find((id) => aliasLinks.has(id));
    const link = firstAlias ? aliasLinks.get(firstAlias)! : { label: "Email", href: `${BASE}/emails`, kind: "inbox" as const };
    return { id: `loose-${index}`, text: stripCitations(item.text), source: link };
  });

  return {
    weekday,
    dateLabel,
    coverage: [],
    decisions,
    attentionProjects,
    moving: [],
    looseEnds,
    tasks: [],
  };
}
