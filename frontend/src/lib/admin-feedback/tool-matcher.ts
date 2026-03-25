/**
 * tool-matcher.ts
 *
 * Matches feedback item text (title + comment) to the most relevant
 * `procore_tools` row using keyword scoring. Runs server-side only.
 */

import { createServiceClient } from "@/lib/supabase/service";

export type MatchedTool = {
  id: number;
  name: string;
  slug: string;
  category: string;
  procore_link: string | null;
  prp_path: string | null;
  description: string | null;
  score: number;
};

/**
 * Keyword aliases that map common user language to tool slugs/names.
 * Extend this as new patterns emerge from feedback submissions.
 */
const KEYWORD_ALIASES: Record<string, string[]> = {
  budget: [
    "budget",
    "forecast",
    "job plan",
    "cost code",
    "auto calculate",
    "manually calculate",
    "projected",
    "project costs",
    "original budget",
    "budget modification",
  ],
  "change-events": [
    "change event",
    "change-event",
    "ce ",
    "rfq",
    "request for quote",
  ],
  "change-orders": [
    "change order",
    "change-order",
    "co ",
    "pco",
    "potential change",
  ],
  commitments: [
    "commitment",
    "subcontract",
    "purchase order",
    "po ",
    "sov",
    "schedule of values",
  ],
  "direct-costs": [
    "direct cost",
    "direct-cost",
    "expense",
    "payroll",
    "invoice direct",
  ],
  invoicing: [
    "invoice",
    "invoicing",
    "billing",
    "payment application",
    "pay app",
    "owner invoice",
    "subcontractor invoice",
  ],
  "prime-contracts": [
    "prime contract",
    "prime-contract",
    "owner contract",
    "general contract",
  ],
  rfis: ["rfi", "request for information"],
  submittals: ["submittal", "submission", "shop drawing"],
  meetings: ["meeting", "minutes", "agenda"],
  drawings: ["drawing", "plan", "blueprint", "sheet"],
  specifications: ["specification", "spec ", "specs"],
  "punch-list": ["punch", "punchlist", "punch list", "deficiency"],
  schedule: ["schedule", "gantt", "milestone", "task"],
  "daily-logs": ["daily log", "daily-log", "field report", "daily report"],
  photos: ["photo", "image", "picture", "gallery"],
  directory: ["directory", "contact", "vendor", "company directory"],
  emails: ["email", "correspondence", "message"],
  transmittals: ["transmittal"],
};

/**
 * Score how well a block of text matches a given tool based on keyword hits.
 */
function scoreText(text: string, toolSlug: string, toolName: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  // Direct slug match (highest signal)
  if (lower.includes(toolSlug.replace(/-/g, " "))) {
    score += 10;
  }

  // Direct name match
  if (lower.includes(toolName.toLowerCase())) {
    score += 8;
  }

  // Alias keyword matches
  const aliases = KEYWORD_ALIASES[toolSlug];
  if (aliases) {
    for (const keyword of aliases) {
      if (lower.includes(keyword.toLowerCase())) {
        score += 5;
      }
    }
  }

  return score;
}

/**
 * Given feedback title and comment, find the best-matching procore_tools row.
 * Returns null if no tool scores above the minimum threshold.
 */
export async function matchFeedbackToTool(
  title: string,
  comment: string,
): Promise<MatchedTool | null> {
  const supabase = createServiceClient();

  const { data: tools, error } = await supabase
    .from("procore_tools")
    .select("id, name, slug, category, procore_link, prp_path, description");

  if (error || !tools || tools.length === 0) {
    console.error("[ToolMatcher] Failed to load procore_tools", error);
    return null;
  }

  const combinedText = `${title} ${comment}`;
  let bestMatch: MatchedTool | null = null;
  let bestScore = 0;

  for (const tool of tools) {
    const score = scoreText(combinedText, tool.slug, tool.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        category: tool.category,
        procore_link: tool.procore_link,
        prp_path: tool.prp_path,
        description: tool.description,
        score,
      };
    }
  }

  // Minimum threshold — avoid false positives
  const MIN_SCORE = 5;
  if (!bestMatch || bestMatch.score < MIN_SCORE) {
    return null;
  }

  return bestMatch;
}

/**
 * Fetch a specific tool by ID for manual assignment.
 */
export async function getToolById(
  toolId: number,
): Promise<MatchedTool | null> {
  const supabase = createServiceClient();

  const { data: tool, error } = await supabase
    .from("procore_tools")
    .select("id, name, slug, category, procore_link, prp_path, description")
    .eq("id", toolId)
    .maybeSingle();

  if (error || !tool) {
    return null;
  }

  return { ...tool, score: 100 };
}

/**
 * Fetch all tools for the assignment dropdown.
 */
export async function listTools(): Promise<
  Pick<MatchedTool, "id" | "name" | "slug" | "category">[]
> {
  const supabase = createServiceClient();

  const { data: tools, error } = await supabase
    .from("procore_tools")
    .select("id, name, slug, category")
    .order("category")
    .order("name");

  if (error || !tools) {
    return [];
  }

  return tools;
}
