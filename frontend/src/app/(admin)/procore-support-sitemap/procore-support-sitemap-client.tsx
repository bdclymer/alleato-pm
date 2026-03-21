"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Link2, Search } from "lucide-react";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ProcoreSupportSitemapEntry {
  url: string;
  pathname: string;
  title: string;
  section: string;
  lastModified: string | null;
}

interface ProcoreSupportSitemapClientProps {
  entries: ProcoreSupportSitemapEntry[];
  errorMessage: string | null;
  sitemapUrl: string;
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  Home: "Landing pages and sitemap roots.",
  FAQs: "Short answer support articles and common questions.",
  "Product Manuals": "Detailed product documentation and feature-specific manuals.",
  "Process Guides": "Workflow-driven guides for setup, usage, and operations.",
  Reference: "Reference material, field definitions, and lookup content.",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getSectionDescription(section: string) {
  return SECTION_DESCRIPTIONS[section] ?? "Support content grouped from the sitemap.";
}

export function ProcoreSupportSitemapClient({
  entries,
  errorMessage,
  sitemapUrl,
}: ProcoreSupportSitemapClientProps) {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("Overview");

  const sectionSummaries = useMemo(() => {
    const counts = new Map<string, number>();

    for (const entry of entries) {
      counts.set(entry.section, (counts.get(entry.section) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([section, count]) => ({
        section,
        count,
        description: getSectionDescription(section),
      }))
      .sort((left, right) => right.count - left.count);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesSection =
        activeSection === "Overview" ? true : entry.section === activeSection;

      if (!matchesSection) {
        return false;
      }

      if (!normalizedQuery) {
        return activeSection === "Overview" ? false : true;
      }

      const haystack = `${entry.title} ${entry.pathname} ${entry.url} ${entry.section}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeSection, entries, query]);

  const filteredCount = filteredEntries.length;

  return (
    <>
      <ProjectPageHeader
        title="Procore Support Sitemap"
        description="Browsable index of the live support sitemap from v2.support.procore.com"
        actions={(
          <Button asChild size="sm" variant="outline">
            <a href={sitemapUrl} target="_blank" rel="noreferrer">
              Open XML
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        )}
      />
      <PageContainer className="space-y-8">
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Total Links
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {entries.length.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Sections
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {sectionSummaries.length}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Search
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Query titles, paths, or full URLs across the sitemap.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the Procore support sitemap"
                className="pl-9"
              />
            </div>
            {(activeSection !== "Overview" || query) && (
              <p className="text-sm text-muted-foreground">
                {filteredCount.toLocaleString()} result{filteredCount === 1 ? "" : "s"}
                {activeSection !== "Overview" ? ` in ${activeSection}` : ""}
              </p>
            )}
          </div>
        </section>

        {errorMessage ? (
          <section className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4">
            <h2 className="text-sm font-semibold text-foreground">Unable to load sitemap</h2>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveSection("Overview")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                activeSection === "Overview"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              Overview
            </button>
            {sectionSummaries.map((summary) => (
              <button
                key={summary.section}
                type="button"
                onClick={() => setActiveSection(summary.section)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  activeSection === summary.section
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {summary.section}
                <Badge
                  variant={activeSection === summary.section ? "secondary" : "outline"}
                  className="rounded-full"
                >
                  {summary.count}
                </Badge>
              </button>
            ))}
          </div>

          {activeSection === "Overview" && !query ? (
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <div className="grid gap-0">
                {sectionSummaries.map((summary) => (
                  <button
                    key={summary.section}
                    type="button"
                    onClick={() => setActiveSection(summary.section)}
                    className="grid gap-2 border-b border-border px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-foreground">{summary.section}</h2>
                        <Badge variant="outline" className="rounded-full">
                          {summary.count.toLocaleString()} links
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{summary.description}</p>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      View section
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-4 border-b border-border bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <div>Title</div>
                <div>Path</div>
                <div className="text-right">Updated</div>
              </div>
              <div className="max-h-screen overflow-y-auto">
                {filteredEntries.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-muted-foreground">
                    No sitemap links matched this filter.
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <a
                      key={entry.url}
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer"
                      className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-4 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/30"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium text-foreground">
                            {entry.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{entry.section}</p>
                      </div>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {entry.pathname}
                      </p>
                      <p className="text-right text-xs text-muted-foreground">
                        {formatDate(entry.lastModified)}
                      </p>
                    </a>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </PageContainer>
    </>
  );
}
