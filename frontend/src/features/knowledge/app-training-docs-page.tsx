"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bot,
  ChevronRight,
  ExternalLink,
  List,
  Menu,
  MoreVertical,
  Search,
  X,
} from "lucide-react";

import { SectionRuleHeading } from "@/components/layout";
import { ExpandableSearch } from "@/components/tables/unified/table-toolbar";
import { Button } from "@/components/ui/button";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { getPublishedTrainingDocUrl } from "@/lib/training-docs/constants";
import type { PublishedTrainingDoc } from "@/lib/training-docs/docs-site";
import { cn } from "@/lib/utils";
import {
  APP_KNOWLEDGE_TOOL_CATEGORIES,
  getAppKnowledgeToolHref,
  getTrainingDocsForToolCategory,
} from "./app-knowledge";

export function AppTrainingDocsPage({
  activeCategorySlug,
  trainingDocs,
}: {
  activeCategorySlug?: string;
  trainingDocs: PublishedTrainingDoc[];
}) {
  const { profile } = useCurrentUserProfile();
  const [search, setSearch] = React.useState("");
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const isAdmin = profile?.isAdmin === true;
  const activeCategory =
    APP_KNOWLEDGE_TOOL_CATEGORIES.find(
      (category) => category.slug === activeCategorySlug,
    ) ?? null;
  const searchTerm = search.trim().toLowerCase();

  const categoryCounts = React.useMemo(() => {
    return Object.fromEntries(
      APP_KNOWLEDGE_TOOL_CATEGORIES.map((category) => [
        category.slug,
        getTrainingDocsForToolCategory(trainingDocs, category).length,
      ]),
    );
  }, [trainingDocs]);

  const visibleCategories = React.useMemo(() => {
    if (!searchTerm) return APP_KNOWLEDGE_TOOL_CATEGORIES;

    return APP_KNOWLEDGE_TOOL_CATEGORIES.filter((category) => {
      if (
        category.title.toLowerCase().includes(searchTerm) ||
        category.description.toLowerCase().includes(searchTerm)
      ) {
        return true;
      }

      return getTrainingDocsForToolCategory(trainingDocs, category).some((doc) =>
        [doc.title, doc.summary, doc.sourceRoute]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm),
      );
    });
  }, [searchTerm, trainingDocs]);

  const selectedDocs = React.useMemo(() => {
    if (!activeCategory) return [];

    return getTrainingDocsForToolCategory(trainingDocs, activeCategory).filter(
      (doc) => {
        if (!searchTerm) return true;
        return [doc.title, doc.summary, doc.sourceRoute]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);
      },
    );
  }, [activeCategory, searchTerm, trainingDocs]);

  const title = activeCategory ? activeCategory.title : "Training Docs";
  const description = activeCategory
    ? activeCategory.description
    : "Step-by-step app documentation organized by tool.";

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-background text-foreground">
      <DocsHeader
        isAdmin={isAdmin}
        search={search}
        onSearchChange={setSearch}
      />
      <MobileBreadcrumb
        activeCategoryTitle={activeCategory?.title}
        onOpenMenu={() => setMobileNavOpen(true)}
      />
      <MobileNavDrawer
        activeCategorySlug={activeCategorySlug}
        categories={visibleCategories}
        counts={categoryCounts}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="mx-auto grid max-w-screen-2xl gap-10 px-6 py-10 lg:grid-cols-[18rem_minmax(0,52rem)_16rem] lg:px-10 xl:gap-14">
        <DocsSidebar
          activeCategorySlug={activeCategorySlug}
          categories={visibleCategories}
          counts={categoryCounts}
        />

        <main className="min-w-0 space-y-10">
          <header id="overview" className="space-y-4 pt-4 lg:pt-0">
            <p className="text-sm font-semibold text-primary">App</p>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-normal text-foreground">
                {title}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                {description}
              </p>
            </div>
          </header>

          {activeCategory ? (
            <TrainingDocList docs={selectedDocs} title="Published training docs" />
          ) : (
            <ToolCategoryIndex
              categories={visibleCategories}
              counts={categoryCounts}
            />
          )}

          {isAdmin ? (
            <section id="create-docs" className="space-y-3">
              <SectionRuleHeading label="Create docs" />
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Draft screenshot-backed training docs from the existing AI workflow,
                then publish them into the correct tool category.
              </p>
              <Button asChild variant="outline" size="sm" className="w-fit gap-1.5">
                <Link href="/training-docs">
                  <Bot className="h-4 w-4" />
                  Create training doc
                </Link>
              </Button>
            </section>
          ) : null}
        </main>

        <DocsOnThisPage hasActiveCategory={Boolean(activeCategory)} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function DocsHeader({
  isAdmin,
  search,
  onSearchChange,
}: {
  isAdmin: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <header className="hidden border-b border-border/70 lg:block">
      <div className="mx-auto max-w-screen-2xl px-6 lg:px-10">
        <div className="flex h-24 items-center gap-6 lg:h-16">
          <Link
            href="/knowledge/app"
            className="flex h-12 w-12 items-center justify-center text-4xl font-semibold tracking-normal text-foreground lg:h-9 lg:w-9 lg:text-2xl"
            aria-label="Training docs home"
          >
            A
          </Link>
          <div className="hidden flex-1 justify-center md:flex">
            <ExpandableSearch
              ariaLabel="Search training docs"
              defaultExpanded
              placeholder="Search..."
              value={search}
              onChange={onSearchChange}
            />
          </div>
          <nav aria-label="Docs links" className="ml-auto hidden items-center gap-5 text-sm lg:flex">
            <Link href="/knowledge/app" className="font-medium text-foreground">
              App
            </Link>
            {isAdmin ? (
              <Link
                href="/training-docs"
                className="text-muted-foreground hover:text-foreground"
              >
                Create
              </Link>
            ) : null}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-muted-foreground lg:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Search training docs"
            >
              <Search className="h-6 w-6" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="More training doc actions"
            >
              <MoreVertical className="h-6 w-6" />
            </Button>
          </div>
        </div>
        <nav aria-label="Documentation sections" className="hidden gap-7 text-sm font-medium lg:flex">
          <Link
            href="/knowledge/app"
            className="border-b-2 border-primary px-0 py-4 text-foreground"
          >
            App Training
          </Link>
          <Link
            href="/knowledge/company"
            className="border-b-2 border-transparent px-0 py-4 text-muted-foreground hover:text-foreground"
          >
            Company Knowledge
          </Link>
        </nav>
      </div>
    </header>
  );
}

function MobileBreadcrumb({
  activeCategoryTitle,
  onOpenMenu,
}: {
  activeCategoryTitle?: string;
  onOpenMenu: () => void;
}) {
  return (
    <div className="lg:hidden">
      <div className="flex h-20 items-center gap-4 px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open training docs menu"
          onClick={onOpenMenu}
          className="text-muted-foreground"
        >
          <Menu className="h-7 w-7" />
        </Button>
        <div className="flex min-w-0 items-center gap-3 text-lg">
          <span className="truncate text-muted-foreground">App Training</span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="truncate font-semibold text-foreground">
            {activeCategoryTitle ?? "Training Docs"}
          </span>
        </div>
      </div>
    </div>
  );
}

function MobileNavDrawer({
  activeCategorySlug,
  categories,
  counts,
  isOpen,
  onClose,
}: {
  activeCategorySlug?: string;
  categories: typeof APP_KNOWLEDGE_TOOL_CATEGORIES;
  counts: Record<string, number>;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/25 lg:hidden">
      <aside className="h-full w-10/12 max-w-xl overflow-y-auto bg-background px-6 py-8 shadow-xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/knowledge/app"
            className="flex h-12 w-12 items-center justify-center text-4xl font-semibold tracking-normal text-foreground"
            aria-label="Training docs home"
            onClick={onClose}
          >
            A
          </Link>
        </div>
        <nav aria-label="Mobile training doc tools" className="space-y-6">
          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-lg text-foreground">
            App Training
          </div>
          <div className="space-y-5">
            <p className="text-lg font-semibold text-foreground">App Training</p>
            <div className="space-y-1 text-lg">
              <MobileNavLink
                href="/knowledge/app"
                isActive={!activeCategorySlug}
                label="All tools"
                onClose={onClose}
              />
              {categories.map((category) => (
                <MobileNavLink
                  key={category.slug}
                  count={counts[category.slug] ?? 0}
                  href={getAppKnowledgeToolHref(category)}
                  isActive={activeCategorySlug === category.slug}
                  label={category.title}
                  onClose={onClose}
                />
              ))}
            </div>
          </div>
        </nav>
      </aside>
      <div className="relative min-w-14 flex-1 bg-muted/70">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close training docs menu"
          onClick={onClose}
          className="absolute right-5 top-8 h-12 w-12 rounded-full bg-background text-muted-foreground shadow-sm"
        >
          <X className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}

function MobileNavLink({
  count,
  href,
  isActive,
  label,
  onClose,
}: {
  count?: number;
  href: string;
  isActive: boolean;
  label: string;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-start justify-between gap-3 rounded-2xl px-5 py-3 transition-colors",
        isActive
          ? "bg-primary/10 font-semibold text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className="text-sm tabular-nums">{count}</span>
      ) : null}
    </Link>
  );
}

function DocsSidebar({
  activeCategorySlug,
  categories,
  counts,
}: {
  activeCategorySlug?: string;
  categories: typeof APP_KNOWLEDGE_TOOL_CATEGORIES;
  counts: Record<string, number>;
}) {
  return (
    <aside className="hidden lg:block">
      <nav aria-label="Training doc tools" className="sticky top-6 space-y-5">
        <p className="text-sm font-semibold text-foreground">App Training</p>
        <div className="space-y-1">
          <Link
            href="/knowledge/app"
            className={cn(
              "block rounded-xl px-4 py-2.5 text-sm transition-colors",
              !activeCategorySlug
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            All tools
          </Link>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={getAppKnowledgeToolHref(category)}
              className={cn(
                "flex items-start justify-between gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors",
                activeCategorySlug === category.slug
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span>{category.title}</span>
              <span className="text-xs tabular-nums">{counts[category.slug] ?? 0}</span>
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}

function ToolCategoryIndex({
  categories,
  counts,
}: {
  categories: typeof APP_KNOWLEDGE_TOOL_CATEGORIES;
  counts: Record<string, number>;
}) {
  return (
    <section id="tools" className="space-y-5">
      <SectionRuleHeading label="Tools" />
      <div className="divide-y divide-border">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={getAppKnowledgeToolHref(category)}
            className="group flex flex-col gap-2 py-4 transition-colors sm:flex-row sm:items-start sm:justify-between"
          >
            <span className="space-y-1">
              <span className="block text-base font-semibold text-foreground group-hover:text-primary">
                {category.title}
              </span>
              <span className="block max-w-3xl text-sm leading-6 text-muted-foreground">
                {category.description}
              </span>
            </span>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {counts[category.slug] ?? 0}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TrainingDocList({
  docs,
  title,
}: {
  docs: PublishedTrainingDoc[];
  title: string;
}) {
  return (
    <section id="published-docs" className="space-y-5">
      <SectionRuleHeading label={title} />
      {docs.length === 0 ? (
        <p className="text-base leading-7 text-muted-foreground">
          No published training docs are available for this tool yet.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {docs.map((doc) => {
            const href = getPublishedTrainingDocUrl(doc.publishedDocPath);
            return (
              <Link
                key={doc.slug}
                href={href ?? "#"}
                target={href ? "_blank" : undefined}
                rel={href ? "noreferrer" : undefined}
                className="group flex flex-col gap-2 py-4 transition-colors sm:flex-row sm:items-start sm:justify-between"
              >
                <span className="space-y-1">
                  <span className="flex items-center gap-2 text-base font-semibold text-foreground group-hover:text-primary">
                    {doc.title}
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                  </span>
                  <span className="block max-w-3xl text-sm leading-6 text-muted-foreground">
                    {doc.summary?.trim() ||
                      "Training doc published from the Alleato review workflow."}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground sm:text-right">
                  {doc.sourceRoute ?? "Training Docs"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DocsOnThisPage({
  hasActiveCategory,
  isAdmin,
}: {
  hasActiveCategory: boolean;
  isAdmin: boolean;
}) {
  return (
    <aside className="hidden xl:block">
      <nav aria-label="On this page" className="sticky top-6 space-y-3 text-sm">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <List className="h-4 w-4 text-muted-foreground" />
          On this page
        </div>
        <div className="space-y-2">
          <a href="#overview" className="block text-primary">
            Overview
          </a>
          <a
            href={hasActiveCategory ? "#published-docs" : "#tools"}
            className="block text-muted-foreground hover:text-primary"
          >
            {hasActiveCategory ? "Published training docs" : "Tools"}
          </a>
          {isAdmin ? (
            <a
              href="#create-docs"
              className="block text-muted-foreground hover:text-primary"
            >
              Create docs
            </a>
          ) : null}
        </div>
      </nav>
    </aside>
  );
}
