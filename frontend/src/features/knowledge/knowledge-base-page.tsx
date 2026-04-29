"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  GraduationCap,
  HardHat,
  LineChart,
  PackageCheck,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  Workflow,
  X,
} from "lucide-react";

import { IconBadge } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  KNOWLEDGE_CATEGORIES,
  useKnowledgeArticles,
  type KnowledgeArticle,
  type KnowledgeCategory,
} from "@/hooks/use-company-knowledge";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  system_design: <Workflow className="h-4 w-4" />,
  pricing_intel: <LineChart className="h-4 w-4" />,
  vendor_intel: <Users className="h-4 w-4" />,
  client_education: <GraduationCap className="h-4 w-4" />,
  technical_reference: <FileText className="h-4 w-4" />,
  safety_compliance: <HardHat className="h-4 w-4" />,
  installation_ops: <PackageCheck className="h-4 w-4" />,
  lessons_learned: <Sparkles className="h-4 w-4" />,
  best_practice: <ShieldCheck className="h-4 w-4" />,
  market_intel: <LineChart className="h-4 w-4" />,
  strategy: <BookOpen className="h-4 w-4" />,
  process: <Workflow className="h-4 w-4" />,
  policy: <ShieldCheck className="h-4 w-4" />,
  org_update: <Users className="h-4 w-4" />,
  general: <BookOpen className="h-4 w-4" />,
};

const HERO_CATEGORY_IDS: KnowledgeCategory[] = [
  "process",
  "policy",
  "best_practice",
  "lessons_learned",
  "technical_reference",
  "client_education",
];

const CATEGORY_LABELS = Object.fromEntries(
  KNOWLEDGE_CATEGORIES.map((category) => [category.value, category.label]),
);

const CATEGORY_DESCRIPTIONS = Object.fromEntries(
  KNOWLEDGE_CATEGORIES.map((category) => [
    category.value,
    category.description,
  ]),
);

const ORIGIN_LABELS: Record<string, string> = {
  manual: "Manual",
  meeting_extraction: "Meeting",
  ai_assistant: "AI",
  import: "Imported",
};

function getCategoryIcon(category: string): React.ReactNode {
  return CATEGORY_ICONS[category] ?? <BookOpen className="h-4 w-4" />;
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

function getCategoryDescription(category: string): string {
  return CATEGORY_DESCRIPTIONS[category] ?? "Browse related company knowledge.";
}

function getUpdatedDate(article: KnowledgeArticle): string {
  const value = article.updated_at ?? article.created_at;
  if (!value) return "No date";
  return new Date(value).toLocaleDateString();
}

function getExcerpt(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 170
    ? `${normalized.slice(0, 170).trim()}...`
    : normalized;
}

export function KnowledgeBasePage() {
  const { data: articles = [], isLoading } = useKnowledgeArticles();
  const { profile } = useCurrentUserProfile();
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null,
  );
  const [comboOpen, setComboOpen] = React.useState(false);
  const [selectedArticle, setSelectedArticle] =
    React.useState<KnowledgeArticle | null>(null);

  const isAdmin = profile?.isAdmin === true;
  const searchTerm = search.trim().toLowerCase();

  const activeCategories = React.useMemo(() => {
    const categoryIds = new Set(articles.map((article) => article.category));
    return KNOWLEDGE_CATEGORIES.filter((category) =>
      categoryIds.has(category.value),
    );
  }, [articles]);

  const heroCategories = React.useMemo(() => {
    const activeIds = new Set(activeCategories.map((category) => category.value));
    const preferred = HERO_CATEGORY_IDS.filter((category) =>
      activeIds.has(category),
    );
    const fallback = activeCategories
      .map((category) => category.value)
      .filter((category) => !preferred.includes(category));
    return [...preferred, ...fallback].slice(0, 6);
  }, [activeCategories]);

  const secondaryCategories = React.useMemo(() => {
    const heroSet = new Set(heroCategories);
    return activeCategories
      .map((category) => category.value)
      .filter((category) => !heroSet.has(category));
  }, [activeCategories, heroCategories]);

  const filteredArticles = React.useMemo(() => {
    return articles.filter((article) => {
      if (selectedCategory && article.category !== selectedCategory) {
        return false;
      }
      if (!searchTerm) return true;
      const haystack = [
        article.title,
        article.content,
        article.source ?? "",
        ...(article.tags ?? []),
        getCategoryLabel(article.category),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [articles, searchTerm, selectedCategory]);

  const groupedArticles = React.useMemo(() => {
    return filteredArticles.reduce<Record<string, KnowledgeArticle[]>>(
      (groups, article) => {
        const category = article.category || "general";
        groups[category] = groups[category] ?? [];
        groups[category].push(article);
        return groups;
      },
      {},
    );
  }, [filteredArticles]);

  const showHero = !selectedCategory && !searchTerm;

  function selectCategory(category: string | null) {
    setSelectedCategory(category);
    setSearch("");
    setComboOpen(false);
  }

  return (
    <PageShell
      variant="content"
      title="Knowledge Base"
      titleContent={
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              Company knowledge
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Knowledge Base
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Search approved company standards, lessons learned, operating
            processes, and reference material that Ask Alleato can use.
          </p>
        </div>
      }
      actions={
        isAdmin ? (
          <Button asChild className="h-9 gap-2">
            <Link href="/knowledge/manage">
              <Settings />
              Manage Sources
            </Link>
          </Button>
        ) : null
      }
    >
      <div>
        <div className="mb-8 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Search company knowledge..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (event.target.value) setSelectedCategory(null);
              }}
              className="h-9 border-border/50 bg-card pl-9 text-sm shadow-none placeholder:text-muted-foreground/50"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 h-6 w-6 -translate-y-1/2 p-0 text-muted-foreground/50 hover:text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboOpen}
                className="h-9 w-52 justify-between border-border/50 bg-card text-sm font-normal shadow-none"
              >
                <span
                  className={cn(
                    "truncate",
                    !selectedCategory && "text-muted-foreground/70",
                  )}
                >
                  {selectedCategory
                    ? getCategoryLabel(selectedCategory)
                    : "All categories"}
                </span>
                <ChevronsUpDown className="shrink-0 text-muted-foreground/50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start">
              <Command>
                <CommandInput placeholder="Filter categories..." />
                <CommandList>
                  <CommandEmpty>No categories found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all-categories"
                      onSelect={() => selectCategory(null)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          !selectedCategory ? "opacity-100" : "opacity-0",
                        )}
                      />
                      All categories
                    </CommandItem>
                    {activeCategories.map((category) => (
                      <CommandItem
                        key={category.value}
                        value={category.value}
                        onSelect={() => selectCategory(category.value)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            selectedCategory === category.value
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <span className="mr-2 text-muted-foreground/70">
                          {getCategoryIcon(category.value)}
                        </span>
                        {category.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-lg bg-muted/30" />
            ))}
          </div>
        ) : showHero ? (
          <>
            {heroCategories.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {heroCategories.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant="ghost"
                    onClick={() => selectCategory(category)}
                    className="group relative flex h-auto flex-col items-start rounded-lg border border-border/50 bg-background p-5 text-left whitespace-normal transition-all hover:border-border hover:bg-muted"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <IconBadge size="md">{getCategoryIcon(category)}</IconBadge>
                      <h3 className="text-sm font-semibold text-foreground">
                        {getCategoryLabel(category)}
                      </h3>
                    </div>
                    <p className="w-full text-xs leading-relaxed text-muted-foreground">
                      {getCategoryDescription(category)}
                    </p>
                    <ChevronRight className="absolute right-4 top-5 h-4 w-4 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </Button>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <IconBadge size="xl" className="mx-auto mb-4 rounded-full">
                  <BookOpen className="h-5 w-5" />
                </IconBadge>
                <p className="mb-1 text-sm font-medium text-foreground">
                  No knowledge entries yet
                </p>
                <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Admins can add approved company knowledge from the source
                  manager.
                </p>
              </div>
            )}

            {secondaryCategories.length > 0 && (
              <div className="mt-12">
                <h2 className="mb-6 text-lg font-semibold text-foreground">
                  More categories
                </h2>
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                  {secondaryCategories.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant="ghost"
                      onClick={() => selectCategory(category)}
                      className="group flex h-auto items-start justify-start gap-3 text-left"
                    >
                      <IconBadge size="sm" className="mt-0.5">
                        {getCategoryIcon(category)}
                      </IconBadge>
                      <div>
                        <h3 className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                          {getCategoryLabel(category)}
                        </h3>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {getCategoryDescription(category)}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedCategory && (
                  <IconBadge size="sm">{getCategoryIcon(selectedCategory)}</IconBadge>
                )}
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {searchTerm
                      ? `Results for "${search.trim()}"`
                      : selectedCategory
                        ? getCategoryLabel(selectedCategory)
                        : "Company knowledge"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredArticles.length}{" "}
                    {filteredArticles.length === 1 ? "entry" : "entries"}
                  </p>
                </div>
              </div>
              {(selectedCategory || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearch("");
                  }}
                  className="text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>

            {filteredArticles.length === 0 ? (
              <div className="py-16 text-center">
                <IconBadge size="xl" className="mx-auto mb-4 rounded-full">
                  <FileText className="h-5 w-5" />
                </IconBadge>
                <p className="mb-1 text-sm font-medium text-foreground">
                  No entries found
                </p>
                <p className="text-xs text-muted-foreground">
                  Try a broader phrase or browse by category.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedArticles).map(
                  ([category, groupArticles]) => (
                    <div key={category}>
                      {Object.keys(groupedArticles).length > 1 && (
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                          {getCategoryLabel(category)}
                        </p>
                      )}
                      <div className="space-y-px overflow-hidden rounded-lg bg-card">
                        {groupArticles.map((article) => (
                          <button
                            key={article.id}
                            type="button"
                            onClick={() => setSelectedArticle(article)}
                            className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted"
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary" />
                              <div className="min-w-0">
                                <p className="truncate text-sm text-foreground transition-colors group-hover:text-primary">
                                  {article.title}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                  {getExcerpt(article.content)}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="ml-4 h-3.5 w-3.5 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Sheet
        open={Boolean(selectedArticle)}
        onOpenChange={(open) => {
          if (!open) setSelectedArticle(null);
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedArticle && (
            <>
              <SheetHeader className="mb-5 text-left">
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {getCategoryLabel(selectedArticle.category)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Updated {getUpdatedDate(selectedArticle)}
                  </span>
                </div>
                <SheetTitle className="text-xl font-semibold leading-tight">
                  {selectedArticle.title}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {selectedArticle.content}
                </div>

                {(selectedArticle.tags ?? []).length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" />
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedArticle.tags ?? []).map((tag) => (
                        <Badge key={tag} variant="outline" className="font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedArticle.source && (
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Source
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedArticle.source}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                  <Badge variant="outline" className="font-normal">
                    {ORIGIN_LABELS[selectedArticle.origin] ??
                      selectedArticle.origin}
                  </Badge>
                  {isAdmin && (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/knowledge/manage">Manage entry</Link>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
