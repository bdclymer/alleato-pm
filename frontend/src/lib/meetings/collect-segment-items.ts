interface SegmentLike {
  tasks?: unknown;
  risks?: unknown;
  decisions?: unknown;
  opportunities?: unknown;
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "at", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "may", "might", "could", "would", "should", "can", "will", "shall",
  "that", "this", "these", "those", "it", "its",
  "potential", "potentially", "possible", "possibly",
  "due", "if", "not",
]);

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return intersection / union;
}

const SIMILARITY_THRESHOLD = 0.6;

function dedupeSemantically(items: string[]): string[] {
  const result: { text: string; tokens: Set<string> }[] = [];
  for (const raw of items) {
    const text = raw.trim();
    if (!text) continue;
    const tokens = tokenize(text);
    const duplicate = result.find(
      (entry) => jaccard(entry.tokens, tokens) >= SIMILARITY_THRESHOLD
    );
    if (duplicate) {
      if (text.length > duplicate.text.length) {
        duplicate.text = text;
        duplicate.tokens = tokens;
      }
      continue;
    }
    result.push({ text, tokens });
  }
  return result.map((entry) => entry.text);
}

function extractText(item: unknown): string | null {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const description = (item as Record<string, unknown>).description;
    if (typeof description === "string") return description;
  }
  return null;
}

export interface CollectedSegmentItems {
  tasks: string[];
  risks: string[];
  decisions: string[];
  opportunities: string[];
}

export function collectSegmentItems(
  segments: SegmentLike[]
): CollectedSegmentItems {
  const tasks: string[] = [];
  const risks: string[] = [];
  const decisions: string[] = [];
  const opportunities: string[] = [];

  for (const segment of segments) {
    const sources: Array<[unknown, string[]]> = [
      [segment.tasks, tasks],
      [segment.risks, risks],
      [segment.decisions, decisions],
      [segment.opportunities, opportunities],
    ];
    for (const [source, target] of sources) {
      if (!Array.isArray(source)) continue;
      for (const item of source as unknown[]) {
        const text = extractText(item);
        if (text) target.push(text);
      }
    }
  }

  return {
    tasks: dedupeSemantically(tasks),
    risks: dedupeSemantically(risks),
    decisions: dedupeSemantically(decisions),
    opportunities: dedupeSemantically(opportunities),
  };
}
