"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import {
  appHelpToolGroups,
  getAppHelpArticleUrl,
  type AppHelpArticle,
} from "./app-help-content";

export function AppHelpPage() {
  return (
    <PageShell
      variant="content"
      title="How to Use the App"
      description="Find app instructions by tool."
      contentClassName="max-w-5xl"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/knowledge">
            <ArrowLeft className="h-4 w-4" />
            Knowledge
          </Link>
        </Button>
      }
    >
      <div className="space-y-8">
        {appHelpToolGroups.map((group) => (
          <section
            key={group.title}
            className="space-y-3"
            aria-label={group.title}
          >
            <SectionRuleHeading
              label={group.title}
              actions={
                <span className="text-sm tabular-nums text-muted-foreground">
                  {group.articles.length}
                </span>
              }
            />
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {group.description}
            </p>
            <div className="divide-y divide-border">
              {group.articles.map((article) => (
                <AppHelpArticleRow
                  key={`${group.title}-${article.slug}`}
                  article={article}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}

function AppHelpArticleRow({ article }: { article: AppHelpArticle }) {
  return (
    <Link
      href={getAppHelpArticleUrl(article.slug)}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col gap-2 py-3 text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="min-w-0 space-y-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
            {article.title}
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
        </span>
        <span className="block max-w-3xl text-sm leading-6 text-muted-foreground">
          {article.description}
        </span>
      </span>
      <span className="text-xs text-muted-foreground sm:max-w-56 sm:text-right">
        {article.routes.join(", ")}
      </span>
    </Link>
  );
}
