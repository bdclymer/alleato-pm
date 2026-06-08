/**
 * Lightweight matcher that scores an inbox item against the learned
 * `project_attribution_rules`. This is the read-side mirror of the backend
 * ProjectAssigner's rule strategy — it lets the Assignment Inbox surface a
 * suggestion for items that have no `document_attribution_candidates` row
 * (notably emails), powered by the rules the learning loop creates from past
 * manual assignments.
 */

export type AttributionRuleType =
  | "domain"
  | "email"
  | "title_keyword"
  | "keyword"
  | "phrase";

export interface ActiveAttributionRule {
  projectId: number;
  ruleType: string;
  patternNormalized: string;
  confidence: number;
  priority: number;
}

export interface RuleMatchInput {
  fromEmail: string | null;
  title: string | null;
}

export interface RuleMatch {
  projectId: number;
  confidence: number;
  ruleType: string;
  pattern: string;
}

/** Precedence when multiple rule types match — lower wins (most specific first). */
const RULE_TYPE_RANK: Record<string, number> = {
  email: 0,
  domain: 1,
  phrase: 2,
  keyword: 3,
  title_keyword: 3,
};

function ruleTypeRank(ruleType: string): number {
  return RULE_TYPE_RANK[ruleType] ?? 5;
}

export function extractEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || !domain.includes(".")) return null;
  return domain;
}

function normalizeTitle(title: string): string {
  return ` ${title.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

function ruleMatchesInput(
  rule: ActiveAttributionRule,
  email: string | null,
  domain: string | null,
  normalizedTitle: string | null,
): boolean {
  const pattern = rule.patternNormalized;
  if (!pattern) return false;

  switch (rule.ruleType) {
    case "email":
      return email != null && email === pattern;
    case "domain":
      return domain != null && domain === pattern;
    case "title_keyword":
    case "keyword":
    case "phrase":
      return normalizedTitle != null && normalizedTitle.includes(` ${pattern} `);
    default:
      return false;
  }
}

/**
 * Returns the best matching rule for an item, or null. "Best" = most specific
 * rule type, then highest priority (lowest value), then highest confidence.
 */
export function matchAttributionRule(
  input: RuleMatchInput,
  rules: ActiveAttributionRule[],
): RuleMatch | null {
  if (rules.length === 0) return null;

  const email = input.fromEmail?.trim().toLowerCase() || null;
  const domain = extractEmailDomain(email);
  const normalizedTitle = input.title ? normalizeTitle(input.title) : null;

  let best: ActiveAttributionRule | null = null;
  for (const rule of rules) {
    if (!ruleMatchesInput(rule, email, domain, normalizedTitle)) continue;
    if (best == null) {
      best = rule;
      continue;
    }
    const rankDelta = ruleTypeRank(rule.ruleType) - ruleTypeRank(best.ruleType);
    if (rankDelta < 0) {
      best = rule;
    } else if (rankDelta === 0) {
      if (rule.priority < best.priority) best = rule;
      else if (rule.priority === best.priority && rule.confidence > best.confidence) {
        best = rule;
      }
    }
  }

  if (!best) return null;
  return {
    projectId: best.projectId,
    confidence: best.confidence,
    ruleType: best.ruleType,
    pattern: best.patternNormalized,
  };
}
