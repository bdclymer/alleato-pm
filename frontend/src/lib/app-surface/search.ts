// Find-a-page search over the generated app-surface index.
//
// The index (app-surface.generated.json) is produced by `npm run map:project`
// from every page's PageShell title/description and every AI tool's description.
// This is deliberately NOT a vector/RAG search: the corpus is ~400 short,
// structured records, so a deterministic keyword + substring scorer over good
// descriptions is faster, cheaper, and debuggable. Quality depends on pages
// having descriptions — pages without one cannot be found here by design.

import surface from "./app-surface.generated.json";

export type AppSurfaceKind = "page" | "tool";

export interface AppSurfaceResult {
  kind: AppSurfaceKind;
  /** Route URL for pages, tool name for tools. */
  ref: string;
  title: string | null;
  description: string | null;
  score: number;
}

interface IndexedEntry {
  kind: AppSurfaceKind;
  ref: string;
  title: string | null;
  description: string | null;
  /** Pre-lowercased searchable text, weighted fields kept separate. */
  titleText: string;
  bodyText: string;
  refText: string;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "to", "of", "for", "in", "on", "is", "do", "i",
  "how", "where", "what", "page", "screen", "view", "can", "me", "my",
  "show", "find", "go", "get", "see", "with", "and", "or",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function buildIndex(): IndexedEntry[] {
  const entries: IndexedEntry[] = [];
  for (const p of surface.pages) {
    entries.push({
      kind: "page",
      ref: p.url,
      title: p.title,
      description: p.description,
      titleText: (p.title ?? "").toLowerCase(),
      bodyText: (p.description ?? "").toLowerCase(),
      refText: p.url.toLowerCase().replace(/[/[\]-]+/g, " "),
    });
  }
  for (const t of surface.tools) {
    entries.push({
      kind: "tool",
      ref: t.name,
      title: t.name,
      description: t.description,
      // Tool names are camelCase — split into words so "create order" matches createOrder.
      titleText: t.name
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase(),
      bodyText: (t.description ?? "").toLowerCase(),
      refText: t.name.toLowerCase(),
    });
  }
  return entries;
}

const INDEX = buildIndex();

function scoreEntry(entry: IndexedEntry, tokens: string[], rawQuery: string): number {
  let score = 0;

  // Whole-phrase substring hit is a strong signal.
  if (rawQuery.length > 2) {
    if (entry.titleText.includes(rawQuery)) score += 12;
    if (entry.bodyText.includes(rawQuery)) score += 8;
  }

  for (const token of tokens) {
    const wordRe = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (wordRe.test(entry.titleText)) score += 6;
    else if (entry.titleText.includes(token)) score += 3;

    if (wordRe.test(entry.bodyText)) score += 4;
    else if (entry.bodyText.includes(token)) score += 2;

    if (entry.refText.includes(token)) score += 1;
  }

  return score;
}

export interface SearchOptions {
  limit?: number;
  /** Restrict to pages or tools. Defaults to both. */
  kinds?: AppSurfaceKind[];
}

export function searchAppSurface(
  query: string,
  options: SearchOptions = {},
): AppSurfaceResult[] {
  const limit = options.limit ?? 8;
  const kinds = options.kinds ?? ["page", "tool"];
  const rawQuery = query.trim().toLowerCase();
  const tokens = tokenize(query);
  if (tokens.length === 0 && rawQuery.length < 3) return [];

  return INDEX.filter((e) => kinds.includes(e.kind))
    .map((e) => ({
      kind: e.kind,
      ref: e.ref,
      title: e.title,
      description: e.description,
      score: scoreEntry(e, tokens, rawQuery),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.ref.localeCompare(b.ref))
    .slice(0, limit);
}

/** Total counts — useful for the tool to report coverage honestly. */
export function appSurfaceStats() {
  const pages = surface.pages.length;
  const describedPages = surface.pages.filter((p) => p.description).length;
  return { pages, describedPages, tools: surface.tools.length };
}
