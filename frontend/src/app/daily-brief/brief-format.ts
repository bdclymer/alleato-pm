// Pure, DOM-free formatting + identity helpers for the Daily Executive Brief.
//
// These were previously embedded in the HTML string builder (build-brief.ts).
// The brief is now rendered from real React components, but the SAME helpers are
// reused so that:
//   - `itemKey` stays byte-identical to the historical implementation — carryover
//     matching (yesterday↔today) and the feedback subject id both depend on it
//     being stable across days and across the two code paths.
//   - prose cleaning, source-link resolution, and severity mapping stay in one
//     tested place instead of being re-derived per component.

import type { BrandonBriefItem, BriefCitation } from "@/lib/executive/brandon-daily-update";

// ── dates ─────────────────────────────────────────────────────────────────────

/**
 * Parse a packet date string into a Date anchored so it never drifts a calendar
 * day when later formatted in Eastern time on a UTC host. Date-only strings
 * (`YYYY-MM-DD`) and human strings without a time-of-day ("Jul 8, 2026") are
 * re-anchored to noon UTC; ISO datetimes with a real time pass through.
 */
export function parseBriefDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const isoDate = new Date(`${value}T12:00:00Z`);
    return Number.isNaN(isoDate.getTime()) ? null : isoDate;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const hasTimeComponent = /\d{1,2}:\d{2}/.test(value) || /T\d{2}/.test(value);
  if (!hasTimeComponent) {
    return new Date(
      Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12),
    );
  }
  return parsed;
}

export function fmtShortDate(value: string | null | undefined): string {
  const date = parseBriefDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

export function fmtWeekday(value: string | null | undefined): string {
  const date = parseBriefDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  }).format(date);
}

export function fmtLongDate(value: string | null | undefined): string {
  const date = parseBriefDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

export function fmtTime(value: string | null | undefined): string {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = parseBriefDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(date);
}

// ── numbers + text ──────────────────────────────────────────────────────────

export function money(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

export function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

// Deep-read candidates carry hardcoded pipeline metadata ("Derived from Daily
// Deep Read section: …") and inline source tokens (`S12`, `outlook_…`) that are
// bookkeeping, not content. Strip them so prose reads cleanly; the real sources
// are rendered separately as linked chips.
const SOURCE_TOKEN_RE =
  /`\s*(?:S\d+|(?:teamsdm|teams|outlook|email|meeting|document|doc)_[^`]*|[0-9A-HJKMNP-TV-Z]{20,})\s*`/gi;

export function cleanProse(text: string | null | undefined): string {
  return (text ?? "")
    .replace(SOURCE_TOKEN_RE, "")
    .replace(/Derived from Daily Deep Read section:[^.]*\.?/gi, "")
    .replace(/Review candidate and decide whether to promote into project intelligence\.?/gi, "")
    .replace(/Review and either assign as a task or reject\.?/gi, "")
    .replace(/[([{]\s*[,;·|/&\s]*\s*[)\]}]/g, "")
    .replace(/\s+([.,;:)])/g, "$1")
    .replace(/\(\s*[,;]\s*/g, "(")
    .replace(/([:;,])\s*\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s:;,]+$/, "")
    .trim();
}

const PLACEHOLDER_WHY = /^Derived from Daily Deep Read section:/i;
const PLACEHOLDER_ACTIONS = new Set([
  "Review candidate and decide whether to promote into project intelligence.",
  "Review and either assign as a task or reject.",
]);

export function realWhy(text: string | null | undefined): string {
  const value = (text ?? "").trim();
  return value && !PLACEHOLDER_WHY.test(value) ? value : "";
}

export function realAction(text: string | null | undefined): string {
  const value = (text ?? "").trim();
  return value && !PLACEHOLDER_ACTIONS.has(value) ? value : "";
}

// ── severity ──────────────────────────────────────────────────────────────────

export type BriefSeverity = "crit" | "amber" | "info";

export function severity(tone: string | null | undefined): BriefSeverity {
  const value = String(tone ?? "").toLowerCase();
  if (/crit|block|risk|urgent|overdue/.test(value)) return "crit";
  if (/watch|warn|pending|amber|delay/.test(value)) return "amber";
  return "info";
}

// ── source links ──────────────────────────────────────────────────────────────

export type CitationLike = {
  source: BrandonBriefItem["source"];
  sourceDetail?: string;
  sourceUrl?: string;
  sourceId?: string;
  date?: string;
};

/**
 * Resolve a citation to a real, openable link: an external transcript/email/doc
 * URL, or the in-app meeting page. Returns null when neither exists — we never
 * fabricate a link.
 */
export function resolveHref(
  citation: CitationLike,
  projectInternalId: number | null | undefined,
): string | null {
  if (citation.sourceUrl && /^https?:\/\//i.test(citation.sourceUrl)) {
    return citation.sourceUrl;
  }
  if (citation.sourceId && /meeting|transcript/i.test(String(citation.source))) {
    const id = encodeURIComponent(citation.sourceId);
    return projectInternalId ? `/${projectInternalId}/meetings/${id}` : `/meetings/${id}`;
  }
  return null;
}

export function citationLabel(citation: CitationLike): string {
  const detail = citation.sourceDetail
    ? truncate(citation.sourceDetail, 48)
    : String(citation.source);
  const date = fmtShortDate(citation.date);
  return date ? `${detail} · ${date}` : detail;
}

export function dedupeCitations(citations: BriefCitation[]): BriefCitation[] {
  const seen = new Set<string>();
  const out: BriefCitation[] = [];
  for (const citation of citations) {
    const key = (
      citation.sourceUrl ||
      citation.sourceId ||
      `${citation.source}:${citation.sourceDetail}`
    ).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(citation);
  }
  return out;
}

/**
 * A `document_metadata` id usable as a task's `metadata_id` FK, or null. Meeting
 * / document / email sources are ingested into `document_metadata`, so their
 * `sourceId` is a valid UUID we can anchor a task to. Channel-prefixed ids
 * (`outlook_…`, `teamsdm_…`) and short aliases are NOT document rows → null.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function resolveSourceDocumentId(
  item: Pick<BrandonBriefItem, "sourceId" | "citations" | "sourceRefs">,
): string | null {
  const candidates: Array<string | null | undefined> = [
    item.sourceId,
    ...(item.citations ?? []).map((c) => c.sourceId),
    ...(item.sourceRefs ?? []).map((ref) =>
      typeof ref === "object" && ref && "sourceId" in ref
        ? (ref as { sourceId?: string }).sourceId
        : undefined,
    ),
  ];
  for (const value of candidates) {
    if (value && UUID_RE.test(value)) return value;
  }
  return null;
}

// ── stable item key (kept byte-identical to the legacy build-brief.ts) ──────────

function hashKey(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

export function itemKey(
  item: Pick<
    BrandonBriefItem,
    "title" | "project" | "projectInternalId" | "sourceId"
  >,
): string {
  const identity = [
    item.projectInternalId ?? (item.project || "").trim().toLowerCase(),
    (item.title || "").trim().toLowerCase(),
    item.sourceId || "",
  ].join("|");
  return hashKey(identity);
}
