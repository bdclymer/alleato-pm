import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";

import { getUnknownHelpActionIds } from "./help-actions";
import {
  canArticleAppearInClientHelpCenter,
  canArticleAppearInDefaultAiHelp,
  validateHelpVisibilityPolicy,
} from "./help-visibility";

const repoRoot =
  path.basename(process.cwd()) === "frontend"
    ? path.join(process.cwd(), "..")
    : process.cwd();

export const HELP_ARTICLES_ROOT = path.join(repoRoot, "docs", "help", "articles");

export const HELP_ARTICLE_AUDIENCES = [
  "internal",
  "client",
  "subcontractor",
  "admin",
] as const;

export const HELP_ARTICLE_VISIBILITIES = [
  "draft",
  "published",
  "internal",
  "archived",
] as const;

export type HelpArticleAudience = (typeof HELP_ARTICLE_AUDIENCES)[number];
export type HelpArticleVisibility = (typeof HELP_ARTICLE_VISIBILITIES)[number];

export type HelpArticleFrontmatter = {
  title: string;
  description: string;
  audience: HelpArticleAudience;
  visibility: HelpArticleVisibility;
  module: string;
  category: string;
  tags: string[];
  featured: boolean;
  client_visible: boolean;
  ai_visible: boolean;
  order: number;
  related_routes: string[];
  related_actions: string[];
};

export type HelpArticle = {
  slug: string;
  href: string;
  filePath: string;
  frontmatter: HelpArticleFrontmatter;
  content: string;
};

export type HelpArticleSearchResult = {
  article: HelpArticle;
  score: number;
  excerpt: string;
};

export type HelpArticleValidationResult = {
  valid: boolean;
  articles: HelpArticle[];
  errors: string[];
};

type RawFrontmatter = Record<string, unknown>;

const REQUIRED_FIELDS: Array<keyof HelpArticleFrontmatter> = [
  "title",
  "description",
  "audience",
  "visibility",
  "module",
  "category",
  "tags",
  "featured",
  "client_visible",
  "ai_visible",
  "order",
  "related_routes",
  "related_actions",
];

export async function getHelpArticles(options?: {
  audience?: HelpArticleAudience;
  clientVisibleOnly?: boolean;
  clientHelpCenterOnly?: boolean;
  aiVisibleOnly?: boolean;
  defaultAiHelpOnly?: boolean;
  includeDrafts?: boolean;
  category?: string;
  featuredOnly?: boolean;
}): Promise<HelpArticle[]> {
  const result = await validateHelpArticles();
  if (!result.valid) {
    throw new Error(`Help article validation failed:\n${result.errors.join("\n")}`);
  }

  return result.articles
    .filter((article) => {
      const meta = article.frontmatter;
      if (!options?.includeDrafts && meta.visibility !== "published") return false;
      if (options?.audience && meta.audience !== options.audience) return false;
      if (options?.clientVisibleOnly && !meta.client_visible) return false;
      if (
        options?.clientHelpCenterOnly &&
        !canArticleAppearInClientHelpCenter(meta)
      ) {
        return false;
      }
      if (options?.aiVisibleOnly && !meta.ai_visible) return false;
      if (options?.defaultAiHelpOnly && !canArticleAppearInDefaultAiHelp(meta)) {
        return false;
      }
      if (options?.featuredOnly && !meta.featured) return false;
      if (options?.category && meta.category !== options.category) return false;
      return true;
    })
    .sort((a, b) => {
      const orderDelta = a.frontmatter.order - b.frontmatter.order;
      if (orderDelta !== 0) return orderDelta;
      return a.frontmatter.title.localeCompare(b.frontmatter.title);
    });
}

export async function getHelpArticleBySlug(
  slug: string,
  options?: { includeDrafts?: boolean },
): Promise<HelpArticle | null> {
  const articles = await getHelpArticles({ includeDrafts: options?.includeDrafts });
  return articles.find((article) => article.slug === slug) ?? null;
}

export async function searchHelpArticles(
  query: string,
  options?: {
    aiVisibleOnly?: boolean;
    clientVisibleOnly?: boolean;
    clientHelpCenterOnly?: boolean;
    defaultAiHelpOnly?: boolean;
    category?: string;
    limit?: number;
  },
): Promise<HelpArticleSearchResult[]> {
  const normalizedQuery = normalizeSearchText(query);
  const queryTerms = normalizedQuery.split(" ").filter((term) => term.length > 1);
  const articles = await getHelpArticles({
    aiVisibleOnly: options?.aiVisibleOnly,
    clientVisibleOnly: options?.clientVisibleOnly,
    clientHelpCenterOnly: options?.clientHelpCenterOnly,
    defaultAiHelpOnly: options?.defaultAiHelpOnly,
    category: options?.category,
  });

  if (queryTerms.length === 0) {
    return articles.slice(0, options?.limit ?? 5).map((article) => ({
      article,
      score: 0,
      excerpt: createHelpArticleExcerpt(article.content, []),
    }));
  }

  return articles
    .map((article) => {
      const score = scoreHelpArticle(article, queryTerms, normalizedQuery);
      return {
        article,
        score,
        excerpt: createHelpArticleExcerpt(article.content, queryTerms),
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => {
      const scoreDelta = b.score - a.score;
      if (scoreDelta !== 0) return scoreDelta;
      return a.article.frontmatter.order - b.article.frontmatter.order;
    })
    .slice(0, options?.limit ?? 5);
}

export async function validateHelpArticles(): Promise<HelpArticleValidationResult> {
  const errors: string[] = [];
  const articles: HelpArticle[] = [];

  const files = await getMarkdownFiles(HELP_ARTICLES_ROOT);

  for (const filePath of files) {
    const relativePath = path.relative(HELP_ARTICLES_ROOT, filePath).replace(/\\/g, "/");
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = parseFrontmatter(raw);

    if (!parsed) {
      errors.push(`${relativePath}: missing required frontmatter block`);
      continue;
    }

    const meta = normalizeFrontmatter(parsed.frontmatter, relativePath, errors);
    if (!meta) continue;

    const slug = relativePath.replace(/\.mdx?$/i, "");
    articles.push({
      slug,
      href: `/docs/${slug}`,
      filePath,
      frontmatter: meta,
      content: stripNonRenderingMarkers(parsed.content).trim(),
    });
  }

  return {
    valid: errors.length === 0,
    articles,
    errors,
  };
}

async function getMarkdownFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function recurse(dir: string) {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await recurse(fullPath);
      } else if (/\.mdx?$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  await recurse(root);
  return files;
}

function stripNonRenderingMarkers(content: string): string {
  return content.replace(/<!--\s*allow-outside-documentation\s*-->\s*/g, "");
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_#[\](){}:;,.!?'"|/\\>-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreHelpArticle(
  article: HelpArticle,
  queryTerms: string[],
  normalizedQuery: string,
): number {
  const { frontmatter } = article;
  const title = normalizeSearchText(frontmatter.title);
  const description = normalizeSearchText(frontmatter.description);
  const module = normalizeSearchText(frontmatter.module);
  const category = normalizeSearchText(frontmatter.category);
  const tags = normalizeSearchText(frontmatter.tags.join(" "));
  const routes = normalizeSearchText(frontmatter.related_routes.join(" "));
  const actions = normalizeSearchText(frontmatter.related_actions.join(" "));
  const content = normalizeSearchText(article.content);

  let score = 0;
  if (title.includes(normalizedQuery)) score += 20;
  if (description.includes(normalizedQuery)) score += 12;
  if (actions.includes(normalizedQuery)) score += 10;
  if (routes.includes(normalizedQuery)) score += 8;
  if (content.includes(normalizedQuery)) score += 6;

  for (const term of queryTerms) {
    if (title.includes(term)) score += 8;
    if (description.includes(term)) score += 5;
    if (actions.includes(term)) score += 5;
    if (routes.includes(term)) score += 4;
    if (tags.includes(term)) score += 4;
    if (module.includes(term)) score += 3;
    if (category.includes(term)) score += 2;
    if (content.includes(term)) score += 1;
  }

  return score;
}

function createHelpArticleExcerpt(content: string, queryTerms: string[]): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";

  const lower = plain.toLowerCase();
  const firstMatch = queryTerms
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const start = firstMatch === undefined ? 0 : Math.max(0, firstMatch - 120);
  const excerpt = plain.slice(start, start + 420).trim();
  return start > 0 ? `...${excerpt}` : excerpt;
}

function parseFrontmatter(raw: string): { frontmatter: RawFrontmatter; content: string } | null {
  if (!raw.startsWith("---\n")) return null;
  const closeIndex = raw.indexOf("\n---", 4);
  if (closeIndex === -1) return null;

  const frontmatterSource = raw.slice(4, closeIndex).trim();
  const content = raw.slice(closeIndex + 4);
  return {
    frontmatter: parseSimpleYaml(frontmatterSource),
    content,
  };
}

function parseSimpleYaml(source: string): RawFrontmatter {
  const result: RawFrontmatter = {};
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const match = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) continue;

    const key = match[1];
    const rawValue = match[2] ?? "";

    if (rawValue === "") {
      const items: string[] = [];
      while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
        i += 1;
        items.push(unquote(lines[i].replace(/^\s+-\s+/, "").trim()));
      }
      result[key] = items;
      continue;
    }

    result[key] = parseScalar(rawValue.trim());
  }

  return result;
}

function parseScalar(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => unquote(item.trim()));
  }
  return unquote(value);
}

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function normalizeFrontmatter(
  frontmatter: RawFrontmatter,
  relativePath: string,
  errors: string[],
): HelpArticleFrontmatter | null {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in frontmatter)) {
      errors.push(`${relativePath}: missing required field "${field}"`);
    }
  }

  const title = requireString(frontmatter.title, relativePath, "title", errors);
  const description = requireString(
    frontmatter.description,
    relativePath,
    "description",
    errors,
  );
  const audience = requireEnum(
    frontmatter.audience,
    HELP_ARTICLE_AUDIENCES,
    relativePath,
    "audience",
    errors,
  );
  const visibility = requireEnum(
    frontmatter.visibility,
    HELP_ARTICLE_VISIBILITIES,
    relativePath,
    "visibility",
    errors,
  );
  const module = requireString(frontmatter.module, relativePath, "module", errors);
  const category = requireString(frontmatter.category, relativePath, "category", errors);
  const tags = requireStringArray(frontmatter.tags, relativePath, "tags", errors);
  const featured = requireBoolean(frontmatter.featured, relativePath, "featured", errors);
  const clientVisible = requireBoolean(
    frontmatter.client_visible,
    relativePath,
    "client_visible",
    errors,
  );
  const aiVisible = requireBoolean(frontmatter.ai_visible, relativePath, "ai_visible", errors);
  const order = requireNumber(frontmatter.order, relativePath, "order", errors);
  const relatedRoutes = requireStringArray(
    frontmatter.related_routes,
    relativePath,
    "related_routes",
    errors,
  );
  const relatedActions = requireStringArray(
    frontmatter.related_actions,
    relativePath,
    "related_actions",
    errors,
  );

  if (
    !title ||
    !description ||
    !audience ||
    !visibility ||
    !module ||
    !category ||
    !tags ||
    featured === null ||
    clientVisible === null ||
    aiVisible === null ||
    order === null ||
    !relatedRoutes ||
    !relatedActions
  ) {
    return null;
  }

  if (visibility !== "published" && clientVisible) {
    errors.push(`${relativePath}: only published articles can set client_visible: true`);
  }

  if (visibility !== "published" && aiVisible) {
    errors.push(`${relativePath}: only published articles can set ai_visible: true`);
  }

  errors.push(...validateHelpVisibilityPolicy({
    title,
    description,
    audience,
    visibility,
    module,
    category,
    tags,
    featured,
    client_visible: clientVisible,
    ai_visible: aiVisible,
    order,
    related_routes: relatedRoutes,
    related_actions: relatedActions,
  }, relativePath));

  const unknownActionIds = getUnknownHelpActionIds(relatedActions);
  if (unknownActionIds.length > 0) {
    errors.push(
      `${relativePath}: unknown related_actions value(s): ${unknownActionIds.join(", ")}`,
    );
  }

  return {
    title,
    description,
    audience,
    visibility,
    module,
    category,
    tags,
    featured,
    client_visible: clientVisible,
    ai_visible: aiVisible,
    order,
    related_routes: relatedRoutes,
    related_actions: relatedActions,
  };
}

function requireString(
  value: unknown,
  relativePath: string,
  field: string,
  errors: string[],
): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  errors.push(`${relativePath}: "${field}" must be a non-empty string`);
  return null;
}

function requireBoolean(
  value: unknown,
  relativePath: string,
  field: string,
  errors: string[],
): boolean | null {
  if (typeof value === "boolean") return value;
  errors.push(`${relativePath}: "${field}" must be true or false`);
  return null;
}

function requireNumber(
  value: unknown,
  relativePath: string,
  field: string,
  errors: string[],
): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  errors.push(`${relativePath}: "${field}" must be an integer`);
  return null;
}

function requireStringArray(
  value: unknown,
  relativePath: string,
  field: string,
  errors: string[],
): string[] | null {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  errors.push(`${relativePath}: "${field}" must be a string array`);
  return null;
}

function requireEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  relativePath: string,
  field: string,
  errors: string[],
): T[number] | null {
  if (typeof value === "string" && allowed.includes(value)) return value;
  errors.push(`${relativePath}: "${field}" must be one of ${allowed.join(", ")}`);
  return null;
}
