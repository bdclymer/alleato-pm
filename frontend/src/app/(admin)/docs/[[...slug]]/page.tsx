import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, BookOpen, Search } from "lucide-react";

import { MarkdownRenderer } from "@/components/docs/markdown-renderer";
import { EmptyState } from "@/components/ds";
import { getHelpActionsForIds } from "@/lib/help-actions";
import { canArticleAppearInClientHelpCenter } from "@/lib/help-visibility";
import {
  getHelpArticleBySlug,
  getHelpArticles,
  type HelpArticle,
} from "@/lib/help-articles";

interface DocPageProps {
  params: Promise<{
    slug?: string[];
  }>;
  searchParams?: Promise<{
    q?: string;
    category?: string;
  }>;
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug?.join("/") ?? "";

  if (!slug) {
    return {
      title: "Help Center",
      description: "Controlled Alleato OS help documentation",
    };
  }

  const article = await getHelpArticleBySlug(slug);
  if (!article) {
    return {
      title: "Help Center",
      description: "Controlled Alleato OS help documentation",
    };
  }

  return {
    title: article.frontmatter.title,
    description: article.frontmatter.description,
  };
}

export async function generateStaticParams() {
  const articles = await getHelpArticles({ clientHelpCenterOnly: true });
  return articles.map((article) => ({
    slug: article.slug.split("/"),
  }));
}

export default async function DocPage({ params, searchParams }: DocPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug?.join("/") ?? "";

  if (slug) {
    const article = await getHelpArticleBySlug(slug);
    if (!article || !canArticleAppearInClientHelpCenter(article.frontmatter)) {
      notFound();
    }
    return <ArticlePage article={article} />;
  }

  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim() ?? "";
  const category = resolvedSearchParams?.category?.trim() ?? "";
  const articles = await getHelpArticles({ clientHelpCenterOnly: true });
  const filteredArticles = filterArticles(articles, { query, category });
  const featuredArticles = filteredArticles.filter((article) => article.frontmatter.featured);
  const standardArticles = filteredArticles.filter((article) => !article.frontmatter.featured);
  const categories = Array.from(
    new Set(articles.map((article) => article.frontmatter.category)),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Help Center
        </p>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Alleato OS Help
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Controlled guides for using Alleato OS. Only reviewed, published
            help articles appear here.
          </p>
        </div>
      </header>

      <form action="/docs" className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Search help articles</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="Search help articles"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </label>
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <button
          type="submit"
          className="h-10 rounded-md border border-input px-4 text-sm font-medium transition hover:bg-muted"
        >
          Search
        </button>
      </form>

      {categories.length > 0 ? (
        <nav aria-label="Help categories" className="flex flex-wrap gap-2">
          <CategoryLink label="All" href="/docs" active={!category} />
          {categories.map((item) => (
            <CategoryLink
              key={item}
              label={item}
              href={`/docs?category=${encodeURIComponent(item)}`}
              active={category === item}
            />
          ))}
        </nav>
      ) : null}

      {filteredArticles.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="No help articles found"
          description="Try a different search or category."
        />
      ) : (
        <div className="space-y-8">
          {featuredArticles.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Start here</h2>
              <ArticleList articles={featuredArticles} />
            </section>
          ) : null}

          {standardArticles.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">All guides</h2>
              <ArticleList articles={standardArticles} />
            </section>
          ) : null}
        </div>
      )}
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

function ArticleList({ articles }: { articles: HelpArticle[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {articles.map((article) => (
        <Link
          key={article.slug}
          href={article.href}
          className="block py-4 transition hover:bg-muted/40 sm:px-3"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {article.frontmatter.title}
              </h3>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {article.frontmatter.description}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {article.frontmatter.category}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CategoryLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
          : "rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}

function filterArticles(
  articles: HelpArticle[],
  filters: { query: string; category: string },
) {
  const query = filters.query.toLowerCase();
  return articles.filter((article) => {
    if (filters.category && article.frontmatter.category !== filters.category) {
      return false;
    }

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
