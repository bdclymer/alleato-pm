import type { DailyBriefSourceRef } from "./canonical-packets";

// Prefixes the compiler bakes into source titles ("Email: …", "Teams DM
// Conversation: …"). We strip them so a cited source reads as its subject line,
// not its plumbing.
const TITLE_PREFIXES = [
  /^Email:\s*/i,
  /^Teams DM Conversation:\s*/i,
  /^Teams:\s*/i,
  /^Meeting:\s*/i,
  /^Document:\s*/i,
];

// A citation token the model shortened, e.g. `01KWYW…` (trailing) or
// `outlook_AAMkADI0…AALgMchlAAA=` (interior). Split into prefix + suffix.
const ELLIPSIS_SPLIT = /…|\.{3,}/;

// Friendly label when a source has no human subject line (e.g. a Teams DM whose
// title is just the raw conversation id).
const LANE_LABEL: Record<string, string> = {
  meetings: "Meeting",
  emails: "Email",
  teams: "Teams message",
  documents: "Document",
};

/** A title that is really an opaque id (Teams conversation id, long token). */
function looksLikeOpaqueId(value: string): boolean {
  return /^19:/.test(value) || (!/\s/.test(value) && value.length > 24);
}

/** Human-readable label for a cited source — its subject, prefix stripped. */
export function cleanSourceTitle(ref: DailyBriefSourceRef): string {
  let title = ref.title.trim();
  for (const prefix of TITLE_PREFIXES) title = title.replace(prefix, "");
  title = title.trim();
  if (!title || looksLikeOpaqueId(title)) {
    return LANE_LABEL[ref.lane] ?? title ?? ref.id;
  }
  return title;
}

export interface DailyBriefSourceIndex {
  /**
   * Resolve a citation token from the brief markdown to its source. Handles
   * ids the model truncated with a trailing ellipsis by falling back to a
   * UNIQUE prefix match — an ambiguous prefix resolves to null so we never
   * link to the wrong record.
   */
  resolve(token: string): DailyBriefSourceRef | null;
  size: number;
}

export function buildSourceIndex(
  sources: DailyBriefSourceRef[],
): DailyBriefSourceIndex {
  const byId = new Map<string, DailyBriefSourceRef>();
  for (const source of sources) {
    if (!byId.has(source.id)) byId.set(source.id, source);
  }
  const ids = [...byId.keys()];
  const cache = new Map<string, DailyBriefSourceRef | null>();

  function resolve(rawToken: string): DailyBriefSourceRef | null {
    const token = rawToken.trim();
    if (!token) return null;
    if (cache.has(token)) return cache.get(token) ?? null;

    let result = byId.get(token) ?? null;
    // Citations the model shortened won't match exactly. Split on the ellipsis
    // into a prefix and (optional) suffix, then accept ONLY a unique match so we
    // never link an ambiguous prefix to the wrong record.
    if (!result && ELLIPSIS_SPLIT.test(token)) {
      const [prefix, suffix = ""] = token
        .split(ELLIPSIS_SPLIT)
        .map((part) => part.trim());
      if (prefix.length >= 6) {
        const matches = ids.filter(
          (id) =>
            id.startsWith(prefix) && (suffix === "" || id.endsWith(suffix)),
        );
        result = matches.length === 1 ? (byId.get(matches[0]) ?? null) : null;
      }
    }
    cache.set(token, result);
    return result;
  }

  return { resolve, size: byId.size };
}
