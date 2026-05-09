export const EXECUTIVE_BRIEF_MIN_BULLETS = 3;
export const EXECUTIVE_BRIEF_MAX_BULLETS = 5;

export type ExecutiveBriefBulletInput = {
  summary?: string | null;
  bullets?: readonly (string | null | undefined)[];
  evidenceFacts?: readonly (string | null | undefined)[];
  recommendedAction?: string | null;
  whyItMatters?: string | null;
  status?: string | null;
  citations?: readonly { evidence?: string | null }[];
};

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\n\r\t ]+/g, " ")
    .trim();
}

function compactCompleteText(value: string, maxLength = 220): string {
  const text = normalizeText(value)
    .replace(/^\s*(?:[-*]|\d+[.)])\s+/, "")
    .trim();
  if (text.length <= maxLength) return text;

  const clipped = text.slice(0, maxLength);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("?"),
    clipped.lastIndexOf("!"),
  );
  if (sentenceEnd >= Math.min(80, maxLength - 1)) {
    return clipped.slice(0, sentenceEnd + 1).trim();
  }

  const lastSpace = clipped.lastIndexOf(" ");
  return clipped.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim();
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function splitSentences(value: string): string[] {
  return normalizeText(value).match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
}

function normalizeDeadlineOpening(value: string): string {
  const normalized = normalizeText(value).replace(/^the\s+/i, "");
  const deadlineMatch = normalized.match(
    /^tight\s+(.+?)\s+deadline\s+of\s+(.+?)([.!?])?$/i,
  );
  if (!deadlineMatch) return capitalize(normalized);

  const subject = deadlineMatch[1].trim();
  const date = deadlineMatch[2].trim();
  if (/permit drawing/i.test(subject)) {
    return `Permit drawings are due ${date}.`;
  }

  return `${capitalize(subject)} deadline is ${date}.`;
}

function removeMeetingProseLead(value: string): string {
  return normalizeText(value)
    .replace(
      /^(?:the\s+)?meeting\s+(?:focused|centered|covered)\s+(?:on\s+)?(?:critical\s+areas\s+affecting\s+project\s+progress,\s*)?(?:particularly\s+)?/i,
      "",
    )
    .replace(/^the\s+meeting\s+(?:was|is)\s+about\s+/i, "")
    .trim();
}

function cleanSentence(value: string): string {
  const withoutLead = removeMeetingProseLead(value);
  return compactCompleteText(normalizeDeadlineOpening(withoutLead), 240);
}

function hasDeadlineOrDate(value: string): boolean {
  return /\b(?:due|deadline|targeted|approval|approvals|by|before|after|late|early|June|July|August|September|October|November|December|January|February|March|April|May)\b|\b\d{1,2}(?:st|nd|rd|th)?\b/i.test(
    value,
  );
}

function hasBlockerOrDecision(value: string): boolean {
  return /\b(?:block|blocked|blocker|decision|approval|approve|concern|delay|pause|rework|depends|waiting|risk|affect|financing)\b/i.test(
    value,
  );
}

function splitParagraphIntoBullets(value: string): string[] {
  const sentences = splitSentences(value).map(cleanSentence).filter(Boolean);
  if (sentences.length <= 1) return sentences;

  const bullets: string[] = [];
  for (let index = 0; index < sentences.length; index += 1) {
    const current = sentences[index];
    const next = sentences[index + 1];
    if (
      next &&
      bullets.length === 0 &&
      hasDeadlineOrDate(current) &&
      hasBlockerOrDecision(next)
    ) {
      bullets.push(`${current.replace(/[.!?]$/, "")}; ${next}`);
      index += 1;
      continue;
    }

    bullets.push(current);
  }

  return bullets;
}

function pushUnique(target: string[], values: readonly string[]) {
  for (const value of values) {
    const normalized = compactCompleteText(value, 240);
    if (!normalized) continue;

    const key = normalized.toLowerCase().replace(/[.!?]$/, "");
    const exists = target.some(
      (existing) => existing.toLowerCase().replace(/[.!?]$/, "") === key,
    );
    if (!exists) target.push(normalized);
    if (target.length >= EXECUTIVE_BRIEF_MAX_BULLETS) return;
  }
}

function expandCandidate(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  const sentences = splitSentences(normalized);
  if (sentences.length > 1 || normalized.length > 260) {
    return splitParagraphIntoBullets(normalized);
  }
  return [cleanSentence(normalized)];
}

export function getExecutiveBriefBullets(
  input: ExecutiveBriefBulletInput,
): string[] {
  const bullets: string[] = [];

  pushUnique(bullets, (input.bullets ?? []).flatMap((value) =>
    value ? expandCandidate(value) : [],
  ));
  pushUnique(bullets, (input.evidenceFacts ?? []).flatMap((value) =>
    value ? expandCandidate(value) : [],
  ));

  if (bullets.length < EXECUTIVE_BRIEF_MIN_BULLETS && input.summary) {
    pushUnique(bullets, expandCandidate(input.summary));
  }

  if (bullets.length < EXECUTIVE_BRIEF_MIN_BULLETS && input.recommendedAction) {
    pushUnique(bullets, [`Decision needed: ${input.recommendedAction}`]);
  }

  if (bullets.length < EXECUTIVE_BRIEF_MIN_BULLETS && input.whyItMatters) {
    pushUnique(bullets, [`Business impact: ${input.whyItMatters}`]);
  }

  if (bullets.length < EXECUTIVE_BRIEF_MIN_BULLETS && input.status) {
    pushUnique(bullets, [`Status: ${input.status}`]);
  }

  if (bullets.length < EXECUTIVE_BRIEF_MIN_BULLETS) {
    pushUnique(
      bullets,
      (input.citations ?? []).flatMap((citation) =>
        citation.evidence ? expandCandidate(citation.evidence) : [],
      ),
    );
  }

  return bullets.slice(0, EXECUTIVE_BRIEF_MAX_BULLETS);
}
