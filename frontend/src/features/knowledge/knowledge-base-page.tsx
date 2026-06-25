"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  HardHat,
  List,
  Receipt,
  Settings,
  Shield,
  Users,
} from "lucide-react";

import { Button, EmptyState, ExpandingSearch } from "@/components/ds";
import { PageShell } from "@/components/layout";
import {
  useKnowledgeDocuments,
  type KnowledgeDocument,
} from "@/hooks/use-knowledge-documents";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER = [
  "Company Policies",
  "HR & Onboarding",
  "Finance & Accounting",
  "Contracts",
  "Field Operations",
  "Meetings",
  "Notion & Tools",
  "Project Management",
  "Templates",
  "Other",
] as const;

type Category = (typeof CATEGORY_ORDER)[number];

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  "Company Policies": <Shield className="h-4 w-4" />,
  "HR & Onboarding": <Users className="h-4 w-4" />,
  "Finance & Accounting": <Receipt className="h-4 w-4" />,
  Contracts: <FileText className="h-4 w-4" />,
  "Field Operations": <HardHat className="h-4 w-4" />,
  Meetings: <CalendarDays className="h-4 w-4" />,
  "Notion & Tools": <Briefcase className="h-4 w-4" />,
  "Project Management": <Building2 className="h-4 w-4" />,
  Templates: <BookOpen className="h-4 w-4" />,
  Other: <FileText className="h-4 w-4" />,
};

const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  "Company Policies": "Policies, safety requirements, compliance notes, and handbook material.",
  "HR & Onboarding": "People operations, onboarding steps, benefits, and internal team guidance.",
  "Finance & Accounting": "Billing, AR/AP, expense policies, and accounting procedures.",
  Contracts: "Agreement templates, subcontract references, NDAs, and contract standards.",
  "Field Operations": "Site procedures, field standards, safety practices, and equipment references.",
  Meetings: "Meeting notes, recurring agendas, decision records, and follow-up references.",
  "Notion & Tools": "Internal tooling guides, workspace notes, and operational SOPs.",
  "Project Management": "Project setup, scheduling, PM workflows, and execution standards.",
  Templates: "Reusable forms, letters, RFI templates, and standard correspondence.",
  Other: "Reference material that does not fit a primary knowledge topic.",
};

const PAGE_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "topics", label: "Topics" },
] as const;

function deriveCategory(doc: KnowledgeDocument): Category {
  if (!doc.tags) return "Other";
  const first = doc.tags.split(",")[0]?.trim();
  return first && (CATEGORY_ORDER as readonly string[]).includes(first)
    ? (first as Category)
    : "Other";
}

export function KnowledgeBasePage() {
  const { data: documents = [], isLoading } = useKnowledgeDocuments();
  const { profile } = useCurrentUserProfile();
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<Category | null>(null);

  const isAdmin = profile?.isAdmin === true;
  const searchTerm = search.trim().toLowerCase();

  const categoryCounts = React.useMemo(() => {
    const counts: Partial<Record<Category, number>> = {};
    for (const doc of documents) {
      const category = deriveCategory(doc);
      counts[category] = (counts[category] ?? 0) + 1;
    }
    return counts;
  }, [documents]);

  const visibleCategories = React.useMemo(
    () => CATEGORY_ORDER.filter((category) => (categoryCounts[category] ?? 0) > 0),
    [categoryCounts],
  );

  const displayCategories = React.useMemo(() => {
    if (!searchTerm) return visibleCategories;

    return visibleCategories.filter((category) => {
      if (
        category.toLowerCase().includes(searchTerm) ||
        CATEGORY_DESCRIPTIONS[category].toLowerCase().includes(searchTerm)
      ) {
        return true;
      }

      return documents.some((doc) => {
        if (deriveCategory(doc) !== category) return false;
        const haystack = [
          doc.title ?? "",
          doc.file_name ?? "",
          doc.tags ?? "",
          doc.category ?? "",
          doc.source ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(searchTerm);
      });
    });
  }, [documents, searchTerm, visibleCategories]);

  return (
    <PageShell
      variant="detailWide"
      title="Knowledge Base"
      showHeader={false}
      contentClassName="max-w-screen-2xl"
    >
      <div className="space-y-6">
        <DocsTopBar isAdmin={isAdmin} search={search} onSearchChange={setSearch} />

        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[15rem_minmax(0,48rem)_13rem] xl:gap-16">
          <KnowledgeTopicNav
            categories={visibleCategories}
            counts={categoryCounts}
            activeCategory={activeCategory}
            totalCount={documents.length}
            onSelect={setActiveCategory}
          />

          <main className="min-w-0 space-y-10">
            <section id="overview" className="scroll-mt-24 space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-primary">Product knowledge</p>
                <h1 className="text-3xl font-semibold leading-tight tracking-normal text-foreground md:text-4xl">
                  Alleato Knowledge Base
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Search approved internal sources, browse by topic, and open the
                  documents Ask Alleato can cite when it answers operational questions.
                </p>
              </div>
            </section>

            <MobileTopicNav
              categories={visibleCategories}
              counts={categoryCounts}
              activeCategory={activeCategory}
              totalCount={documents.length}
              onSelect={setActiveCategory}
            />

            {isLoading ? (
              <KnowledgeDocsSkeleton />
            ) : documents.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-5 w-5" />}
                title="No knowledge entries yet"
                description="Admins can add approved knowledge from the source manager."
              />
            ) : (
              <>
                <TopicCards
                  categories={displayCategories}
                  counts={categoryCounts}
                  activeCategory={activeCategory}
                  onSelect={setActiveCategory}
                  onClearFilters={() => {
                    setSearch("");
                    setActiveCategory(null);
                  }}
                  hasFilter={Boolean(searchTerm || activeCategory)}
                />
              </>
            )}
          </main>

          <OnThisPage isAdmin={isAdmin} />
        </div>
      </div>
    </PageShell>
  );
}

function DocsTopBar({
  isAdmin,
  search,
  onSearchChange,
}: {
  isAdmin: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <header className="flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BookOpen className="h-4 w-4 text-primary" />
          Knowledge
        </div>
        <nav aria-label="Knowledge views" className="hidden items-center gap-5 text-sm md:flex">
          <span className="font-medium text-foreground">Product</span>
          <Link href="/knowledge/manage" className="text-muted-foreground hover:text-foreground">
            Sources
          </Link>
        </nav>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ExpandingSearch
          placeholder="Search knowledge..."
          value={search}
          onChange={onSearchChange}
          defaultExpanded
          className="w-full sm:w-80 [&_input]:h-11 [&_input]:w-full [&_input]:rounded-lg sm:[&_input]:h-9"
        />
        {isAdmin && (
          <Button asChild variant="ghost" size="sm" className="justify-start gap-1.5">
            <Link href="/knowledge/manage">
              <Settings className="h-4 w-4" />
              Add knowledge
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}

function KnowledgeTopicNav({
  categories,
  counts,
  activeCategory,
  totalCount,
  onSelect,
}: {
  categories: readonly Category[];
  counts: Partial<Record<Category, number>>;
  activeCategory: Category | null;
  totalCount: number;
  onSelect: (category: Category | null) => void;
}) {
  return (
    <aside className="hidden lg:block">
      <nav aria-label="Knowledge topics" className="sticky top-6 space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Product</p>
          <TopicButton
            label="All knowledge"
            count={totalCount}
            isActive={activeCategory === null}
            onClick={() => onSelect(null)}
          />
          {categories.map((category) => (
            <TopicButton
              key={category}
              label={category}
              count={counts[category] ?? 0}
              isActive={activeCategory === category}
              onClick={() => onSelect(category)}
              icon={CATEGORY_ICONS[category]}
            />
          ))}
        </div>
      </nav>
    </aside>
  );
}

function MobileTopicNav({
  categories,
  counts,
  activeCategory,
  totalCount,
  onSelect,
}: {
  categories: readonly Category[];
  counts: Partial<Record<Category, number>>;
  activeCategory: Category | null;
  totalCount: number;
  onSelect: (category: Category | null) => void;
}) {
  return (
    <nav aria-label="Knowledge topic shortcuts" className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
      <TopicPill
        label="All"
        count={totalCount}
        isActive={activeCategory === null}
        onClick={() => onSelect(null)}
      />
      {categories.map((category) => (
        <TopicPill
          key={category}
          label={category}
          count={counts[category] ?? 0}
          isActive={activeCategory === category}
          onClick={() => onSelect(category)}
        />
      ))}
    </nav>
  );
}

function TopicButton({
  label,
  count,
  isActive,
  onClick,
  icon,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "flex h-auto min-h-10 w-full justify-between gap-3 whitespace-normal rounded-md px-3 py-2 text-left text-sm transition-colors",
        isActive
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 text-xs tabular-nums">{count}</span>
    </Button>
  );
}

function TopicPill({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "inline-flex h-auto min-h-11 shrink-0 gap-2 whitespace-nowrap rounded-md px-3 text-sm transition-colors",
        isActive
          ? "bg-primary/10 font-medium text-primary"
          : "bg-muted/60 text-muted-foreground hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span className="text-xs tabular-nums">{count}</span>
    </Button>
  );
}

function TopicCards({
  categories,
  counts,
  activeCategory,
  onSelect,
  onClearFilters,
  hasFilter,
}: {
  categories: readonly Category[];
  counts: Partial<Record<Category, number>>;
  activeCategory: Category | null;
  onSelect: (category: Category) => void;
  onClearFilters: () => void;
  hasFilter: boolean;
}) {
  return (
    <section id="topics" className="scroll-mt-24 space-y-4">
      {categories.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="No matching topics"
          description="Try a broader phrase or clear the current filter."
          action={
            hasFilter ? (
              <Button size="sm" variant="secondary" onClick={onClearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <Button
            key={category}
            type="button"
            variant="ghost"
            onClick={() => onSelect(category)}
            className={cn(
              "group flex h-auto min-h-36 w-full items-start justify-between gap-5 whitespace-normal rounded-lg px-5 py-5 text-left transition-colors",
              activeCategory === category
                ? "bg-primary/10 text-primary hover:bg-primary/10"
                : "bg-muted/45 text-foreground hover:bg-muted/70",
            )}
          >
            <span className="flex min-w-0 gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background/80 text-muted-foreground group-hover:text-primary",
                  activeCategory === category && "text-primary",
                )}
              >
                {CATEGORY_ICONS[category]}
              </span>
              <span className="space-y-1">
                <span
                  className={cn(
                    "block text-base font-semibold text-foreground group-hover:text-primary",
                    activeCategory === category && "text-primary",
                  )}
                >
                  {category}
                </span>
                <span className="block max-w-2xl text-sm leading-6 text-muted-foreground">
                  {CATEGORY_DESCRIPTIONS[category]}
                </span>
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-background/80 px-2 py-1 text-sm tabular-nums text-muted-foreground">
              {counts[category] ?? 0}
            </span>
          </Button>
        ))}
        </div>
      )}
    </section>
  );
}

function OnThisPage({ isAdmin }: { isAdmin: boolean }) {
  return (
    <aside className="hidden xl:block">
      <nav aria-label="On this page" className="sticky top-6 space-y-3 text-sm">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <List className="h-4 w-4 text-muted-foreground" />
          On this page
        </div>
        <div className="space-y-2">
          {PAGE_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="block text-muted-foreground hover:text-primary"
            >
              {section.label}
            </a>
          ))}
          {isAdmin && (
            <Link href="/knowledge/manage" className="block pt-2 text-primary">
              Add knowledge
            </Link>
          )}
        </div>
      </nav>
    </aside>
  );
}

function KnowledgeDocsSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading knowledge">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="min-h-36 space-y-4 rounded-lg bg-muted/45 p-5">
            <div className="h-9 w-9 animate-pulse rounded-md bg-background/80" />
            <div className="space-y-2">
              <div className="h-5 w-2/3 animate-pulse rounded-md bg-background/80" />
              <div className="h-4 w-full animate-pulse rounded-md bg-background/80" />
              <div className="h-4 w-3/4 animate-pulse rounded-md bg-background/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
