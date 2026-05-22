import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Code2,
  FileText,
  Search,
  Sparkles,
} from "lucide-react";

import { MarkdownRenderer } from "@/components/docs/markdown-renderer";
import { EmptyState } from "@/components/ds";
import { IconBadge } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getHelpActionsForIds } from "@/lib/help-actions";
import {
  getHelpArticleBySlug,
  getHelpArticles,
  type HelpArticle,
} from "@/lib/help-articles";
import {
  filterTechnicalDocs,
  getTechnicalDocBySlug,
  getTechnicalDocCategories,
  getTechnicalDocs,
  type TechnicalDoc,
} from "@/lib/technical-docs";

interface DocPageProps {
  params: Promise<{
    slug?: string[];
  }>;
  searchParams?: Promise<{
    q?: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug?.join("/") ?? "";

  if (!slug) {
    return {
      title: "Documentation",
      description: "Controlled Alleato OS application documentation",
    };
  }

  if (slug.startsWith("technical/")) {
    const technicalDoc = await getTechnicalDocBySlug(slug.replace(/^technical\//, ""));
    if (!technicalDoc) {
      return {
        title: "Documentation",
        description: "Controlled Alleato OS application documentation",
      };
    }

    return {
      title: technicalDoc.title,
      description: technicalDoc.description,
    };
  }

  const article = await getHelpArticleBySlug(slug);
  if (!article) {
    return {
      title: "Documentation",
      description: "Controlled Alleato OS application documentation",
    };
  }

  return {
    title: article.frontmatter.title,
    description: article.frontmatter.description,
  };
}

export default async function DocPage({ params, searchParams }: DocPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug?.join("/") ?? "";

  if (slug) {
    if (slug.startsWith("technical/")) {
      const technicalDoc = await getTechnicalDocBySlug(slug.replace(/^technical\//, ""));
      if (!technicalDoc) {
        notFound();
      }
      return <TechnicalArticlePage doc={technicalDoc} />;
    }

    const article = await getHelpArticleBySlug(slug);
    if (!article) {
      notFound();
    }
    return <ArticlePage article={article} />;
  }

  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim() ?? "";
  const [articles, technicalDocs] = await Promise.all([
    getHelpArticles(),
    getTechnicalDocs(),
  ]);
  const filteredArticles = filterArticles(articles, { query });
  const filteredTechnicalDocs = filterTechnicalDocs(technicalDocs, query);

  return (
    <PageShell
      variant="content"
      title="Documentation"
      titleContent={
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-primary">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              Alleato OS
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Documentation
          </h1>
        </div>
      }
    >
      <div>
        <form action="/docs" className="mb-10 flex flex-col gap-2.5 sm:flex-row">
          <label className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <span className="sr-only">Search documentation</span>
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search documentation..."
              className="h-9 border-border/50 bg-background pl-9 text-sm shadow-none placeholder:text-muted-foreground/50"
            />
          </label>
          <Button
            type="submit"
            variant="outline"
            className="h-9 border-border/50 bg-background px-4 text-sm shadow-none"
          >
            Search
          </Button>
        </form>

        {!query ? <AiOverviewCard /> : null}
        <TechnicalDocumentationSection docs={filteredTechnicalDocs} query={query} />

        {filteredArticles.length === 0 && filteredTechnicalDocs.length === 0 ? (
          <EmptyState
            icon={<BookOpen />}
            title="No documentation found"
            description="Try a broader search phrase."
          />
        ) : (
          <section>
            <ArticleList articles={filteredArticles} />
          </section>
        )}
      </div>
    </PageShell>
  );
}

function TechnicalArticlePage({
  doc,
}: {
  doc: TechnicalDoc & { content: string };
}) {
  const contentWithoutTitle = doc.content.replace(/^#\s+.+\n+/, "");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Documentation
        </Link>
      </div>

      <div className="mb-6 space-y-2 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{doc.category}</span>
          <span>/</span>
          <span>{doc.sourcePath}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {doc.title}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {doc.description}
        </p>
      </div>

      <article>
        <MarkdownRenderer content={contentWithoutTitle} />
      </article>
    </main>
  );
}

function ArticlePage({ article }: { article: HelpArticle }) {
  const actions = getHelpActionsForIds(article.frontmatter.related_actions);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Help Center
        </Link>
      </div>

      <article>
        <MarkdownRenderer content={article.content} />
      </article>

      {actions.length > 0 ? (
        <section className="mt-10 border-t border-border pt-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                AI Action Readiness
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The assistant can use this guide now. Write actions remain
                gated until their preview and confirmation tools are ready.
              </p>
            </div>
            <div className="divide-y divide-border border-y border-border">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-foreground">
                      {action.label}
                    </h3>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      {action.description}
                    </p>
                    {action.unavailableReason ? (
                      <p className="max-w-2xl text-xs text-muted-foreground">
                        {action.unavailableReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                      {formatActionStatus(action.status)}
                    </span>
                    <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                      {formatSafetyLevel(action.safetyLevel)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function formatActionStatus(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSafetyLevel(level: string): string {
  if (level === "admin_confirm") return "Admin confirm";
  if (level === "preview_confirm") return "Preview confirm";
  return "Read only";
}

function AiOverviewCard() {
  return (
    <Link
      href="/docs/ai-overview"
      className="group mb-10 block rounded-xl bg-muted/50 p-6 transition-colors hover:bg-muted sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                How the AI works
              </h2>
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                New
              </span>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              A guided tour of the agents, tools, models, memory, and feedback loops behind the
              assistant. Built for stakeholders.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
          Take the tour
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

function TechnicalDocumentationSection({
  docs,
  query,
}: {
  docs: TechnicalDoc[];
  query: string;
}) {
  if (docs.length === 0) return null;

  const featuredDocs = docs.filter((doc) => doc.featured);
  const categories = getTechnicalDocCategories(docs);

  return (
    <section className="mb-12 space-y-6">
      <div className="space-y-1 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            Technical documentation
          </h2>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Engineering references for architecture, AI tools, APIs, data contracts, design
          standards, and implementation guardrails.
        </p>
      </div>

      {!query && featuredDocs.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
          {featuredDocs.map((doc) => (
            <TechnicalDocLink key={doc.href} doc={doc} featured />
          ))}
        </div>
      ) : null}

      <div className="space-y-8">
        {categories.map((category) => (
          <section key={category.name} className="space-y-3">
            <div className="flex flex-col gap-1 border-b border-border pb-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {category.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {category.description}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {category.docs.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
              {category.docs.map((doc) => (
                <TechnicalDocLink key={doc.href} doc={doc} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function TechnicalDocLink({
  doc,
  featured = false,
}: {
  doc: TechnicalDoc;
  featured?: boolean;
}) {
  return (
    <Link
      href={doc.href}
      className="group -mx-3 flex min-h-12 items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
    >
      <IconBadge size="sm" className="mt-0.5">
        <Code2 className="h-3.5 w-3.5" />
      </IconBadge>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            {doc.title}
          </h3>
          {featured ? (
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">
              Key
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {doc.description}
        </p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground/70">
          {doc.sourcePath}
        </p>
      </div>
      <ChevronRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  );
}

function ArticleList({ articles }: { articles: HelpArticle[] }) {
  const categories = groupArticlesByCategory(articles);

  return (
    <div className="space-y-10">
      {categories.map((category) => (
        <section key={category.name} className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-foreground">
              {category.name}
            </h2>
            <span className="text-xs text-muted-foreground">
              {category.articles.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            {category.articles.map((article) => (
              <Link
                key={article.slug}
                href={article.href}
                className="group -mx-3 flex min-h-12 items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                <IconBadge size="sm" className="mt-0.5">
                  <FileText className="h-3.5 w-3.5" />
                </IconBadge>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {article.frontmatter.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {article.frontmatter.description}
                  </p>
                </div>
                <ChevronRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupArticlesByCategory(articles: HelpArticle[]) {
  const groups = new Map<string, HelpArticle[]>();

  for (const article of articles) {
    const category = article.frontmatter.category;
    groups.set(category, [...(groups.get(category) ?? []), article]);
  }

  return Array.from(groups.entries()).map(([name, groupedArticles]) => ({
    name,
    articles: groupedArticles,
  }));
}

function filterArticles(
  articles: HelpArticle[],
  filters: { query: string },
) {
  const query = filters.query.toLowerCase();
  return articles.filter((article) => {
    if (!query) return true;

    const searchable = [
      article.frontmatter.title,
      article.frontmatter.description,
      article.frontmatter.category,
      article.frontmatter.module,
      article.frontmatter.tags.join(" "),
      article.content,
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });
}
