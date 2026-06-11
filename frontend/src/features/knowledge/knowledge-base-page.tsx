"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  HardHat,
  Receipt,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useKnowledgeDocuments,
  type KnowledgeDocument,
} from "@/hooks/use-knowledge-documents";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

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
  "Company Policies": "Handbooks, code of conduct, safety policies, and compliance documents.",
  "HR & Onboarding": "Hiring checklists, benefits, onboarding guides, and people operations.",
  "Finance & Accounting": "Billing, AR/AP, expense policies, and accounting procedures.",
  Contracts: "Master agreements, subcontracts, NDAs, and standard contract templates.",
  "Field Operations": "Site safety, equipment manuals, and daily field procedures.",
  Meetings: "Recurring meeting notes, decisions log, and shared agendas.",
  "Notion & Tools": "Internal tooling guides, Notion workspace docs, and SOPs.",
  "Project Management": "Methodology, project setup, scheduling, and PM templates.",
  Templates: "Reusable letters, forms, RFI templates, and standard correspondence.",
  Other: "Reference material that doesn't fit a primary category.",
};

function deriveCategory(doc: KnowledgeDocument): Category {
  if (!doc.tags) return "Other";
  const first = doc.tags.split(",")[0].trim();
  return (CATEGORY_ORDER as readonly string[]).includes(first)
    ? (first as Category)
    : "Other";
}

function getDisplayDate(doc: KnowledgeDocument): string {
  const value = doc.date ?? doc.created_at;
  if (!value) return "No date";
  return new Date(value).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KnowledgeBasePage() {
  const { data: documents = [], isLoading } = useKnowledgeDocuments();
  const { profile } = useCurrentUserProfile();
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<Category | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = React.useState<string | null>(null);

  const isAdmin = profile?.isAdmin === true;
  const searchTerm = search.trim().toLowerCase();
  const hasFilter = Boolean(searchTerm || activeCategory);

  const filteredDocuments = React.useMemo(() => {
    let docs = documents;
    if (activeCategory) {
      docs = docs.filter((d) => deriveCategory(d) === activeCategory);
    }
    if (searchTerm) {
      docs = docs.filter((doc) => {
        const haystack = [doc.title ?? "", doc.file_name ?? "", doc.tags ?? ""]
          .join(" ")
          .toLowerCase();
        return haystack.includes(searchTerm);
      });
    }
    return docs;
  }, [documents, activeCategory, searchTerm]);

  const categoryCounts = React.useMemo(() => {
    const counts: Partial<Record<Category, number>> = {};
    for (const doc of documents) {
      const cat = deriveCategory(doc);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [documents]);

  const presentCategories = CATEGORY_ORDER.filter(
    (c) => (categoryCounts[c] ?? 0) > 0,
  );

  async function handleOpenDocument(document: KnowledgeDocument) {
    if (!document.file_path) {
      toast.error("Document has no associated file.");
      return;
    }

    setOpeningDocumentId(document.id);
    try {
      const { url } = await apiFetch<{ url: string }>(
        `/api/knowledge/signed-url?id=${encodeURIComponent(document.id)}`,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not load document. Try again.");
    } finally {
      setOpeningDocumentId(null);
    }
  }

  return (
    <PageShell variant="detail" title="Knowledge Base" showHeader={false}>
      {/* Hero panel */}
      <section className="relative overflow-hidden rounded-2xl bg-muted/40 px-6 py-14 sm:px-12 sm:py-16">
        {isAdmin && (
          <Link
            href="/knowledge/manage"
            className="absolute right-5 top-5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings className="h-3.5 w-3.5" />
            Manage sources
          </Link>
        )}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Knowledge Base
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Browse company documents, lessons learned, and reference material
            that Ask Alleato can use.
          </p>
          <div className="relative mx-auto mt-8 max-w-lg">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="Search company knowledge…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 bg-background pl-11 pr-10 text-sm shadow-xs placeholder:text-muted-foreground/60"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 p-0 text-muted-foreground/60 hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Body */}
      {isLoading ? (
        <CategoryGridSkeleton />
      ) : hasFilter ? (
        <FilteredResults
          documents={filteredDocuments}
          searchTerm={searchTerm}
          activeCategory={activeCategory}
          onClearCategory={() => setActiveCategory(null)}
          onClearSearch={() => setSearch("")}
          onOpenDocument={handleOpenDocument}
          openingDocumentId={openingDocumentId}
        />
      ) : presentCategories.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="No knowledge entries yet"
          description="Admins can add approved knowledge from the source manager."
        />
      ) : (
        <CategoryGrid
          categories={presentCategories}
          counts={categoryCounts}
          onSelect={setActiveCategory}
        />
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// CategoryGrid
// ---------------------------------------------------------------------------

function CategoryGrid({
  categories,
  counts,
  onSelect,
}: {
  categories: readonly Category[];
  counts: Partial<Record<Category, number>>;
  onSelect: (cat: Category) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => {
        const count = counts[cat] ?? 0;
        return (
          <div
            key={cat}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(cat)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(cat);
              }
            }}
            className="group relative flex cursor-pointer flex-col items-start gap-4 rounded-2xl bg-card p-6 text-left shadow-xs transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground/70 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              {CATEGORY_ICONS[cat]}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="text-base font-semibold text-foreground">
                {cat}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {CATEGORY_DESCRIPTIONS[cat]}
              </p>
            </div>
            <div className="flex w-full items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                {count} {count === 1 ? "entry" : "entries"}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground transition-colors group-hover:text-primary">
                Browse
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-2xl bg-muted/40"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilteredResults
// ---------------------------------------------------------------------------

function FilteredResults({
  documents,
  searchTerm,
  activeCategory,
  onClearCategory,
  onClearSearch,
  onOpenDocument,
  openingDocumentId,
}: {
  documents: KnowledgeDocument[];
  searchTerm: string;
  activeCategory: Category | null;
  onClearCategory: () => void;
  onClearSearch: () => void;
  onOpenDocument: (doc: KnowledgeDocument) => void;
  openingDocumentId: string | null;
}) {
  const hint = activeCategory
    ? CATEGORY_DESCRIPTIONS[activeCategory]
    : `Showing entries matching "${searchTerm}".`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-base font-semibold text-foreground">
            {activeCategory ?? "Search results"}
          </div>
          <p className="text-xs text-muted-foreground">
            {documents.length} {documents.length === 1 ? "entry" : "entries"}
            {" · "}
            {hint}
          </p>
        </div>
        {activeCategory && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearCategory}
            className="h-8 gap-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All categories
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No entries found"
          description="Try a broader phrase or clear the current filter."
          action={
            searchTerm ? (
              <Button size="sm" variant="secondary" onClick={onClearSearch}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DocumentList
          docs={documents}
          onOpenDocument={onOpenDocument}
          openingDocumentId={openingDocumentId}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocumentList
// ---------------------------------------------------------------------------

function DocumentList({
  docs,
  onOpenDocument,
  openingDocumentId,
}: {
  docs: KnowledgeDocument[];
  onOpenDocument: (doc: KnowledgeDocument) => void;
  openingDocumentId: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-xs">
      {docs.map((doc, idx) => (
        <div
          key={doc.id}
          role="button"
          tabIndex={0}
          aria-busy={openingDocumentId === doc.id}
          onClick={() => onOpenDocument(doc)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenDocument(doc);
            }
          }}
          className={
            "group flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none" +
            (idx > 0 ? " border-t border-muted" : "")
          }
        >
          <div className="flex min-w-0 items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                {doc.title ?? doc.file_name ?? "Untitled"}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {getDisplayDate(doc)}
                </span>
                {doc.file_name && doc.file_name !== doc.title && (
                  <span className="truncate text-muted-foreground/60">
                    {doc.file_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
            {openingDocumentId === doc.id ? "Opening" : "Open"}
            <ArrowUpRight className="h-4 w-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      ))}
    </div>
  );
}
