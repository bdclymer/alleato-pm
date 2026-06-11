"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Settings,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/ds";
import { StatusBadge } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  const [selectedDocument, setSelectedDocument] =
    React.useState<KnowledgeDocument | null>(null);
  const [viewLoading, setViewLoading] = React.useState(false);
  const [canManageSources, setCanManageSources] = React.useState(false);

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

  React.useEffect(() => {
    setCanManageSources(isAdmin);
  }, [isAdmin]);

  async function handleViewDocument() {
    if (!selectedDocument) return;
    setViewLoading(true);
    try {
      const { url } = await apiFetch<{ url: string }>(
        `/api/knowledge/signed-url?id=${encodeURIComponent(selectedDocument.id)}`,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not load document. Try again.");
    } finally {
      setViewLoading(false);
    }
  }

  const headerActions = canManageSources ? (
    <Button asChild variant="outline" size="sm" className="gap-1.5">
      <Link href="/knowledge/manage">
        <Settings className="h-3.5 w-3.5" />
        Manage sources
      </Link>
    </Button>
  ) : undefined;

  return (
    <PageShell
      variant="content"
      title="Knowledge Base"
      description="Find company documents, lessons learned, and reference material used by Ask Alleato."
      actions={headerActions}
    >
      <section className="space-y-3">
        <label
          htmlFor="knowledge-search"
          className="text-sm font-medium text-foreground"
        >
          Search knowledge
        </label>
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            id="knowledge-search"
            placeholder="Search by title, file, or tag"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 bg-card pl-10 pr-10 text-sm shadow-xs placeholder:text-muted-foreground/60"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSearch("")}
              className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 p-0 text-muted-foreground/60 hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
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
          onSelect={setSelectedDocument}
        />
      ) : presentCategories.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
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

      {/* Detail sheet */}
      <Sheet
        open={Boolean(selectedDocument)}
        onOpenChange={(open) => {
          if (!open) setSelectedDocument(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          {selectedDocument && (
            <>
              <SheetHeader className="mb-5 text-left">
                <div className="mb-3 flex items-center gap-2">
                  <StatusBadge status={selectedDocument.status ?? "uploaded"} />
                  <span className="text-xs text-muted-foreground">
                    {getDisplayDate(selectedDocument)}
                  </span>
                </div>
                <SheetTitle className="text-lg font-semibold leading-tight">
                  {selectedDocument.title ??
                    selectedDocument.file_name ??
                    "Untitled"}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-5">
                {selectedDocument.file_path && (
                  <Button
                    onClick={handleViewDocument}
                    disabled={viewLoading}
                    className="w-full gap-2"
                    size="sm"
                  >
                    {viewLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                    {viewLoading ? "Loading…" : "View Document"}
                  </Button>
                )}

                {selectedDocument.tags && (
                  <div>
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Category
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDocument.tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="font-normal"
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {selectedDocument.file_name && (
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      File
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedDocument.file_name}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
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
    <section className="space-y-4">
      <div>
        <SectionRuleHeading label="Browse by category" className="mb-1" />
        <p className="mt-1 text-sm text-muted-foreground">
          Open a category to inspect approved documents.
        </p>
      </div>
      <div className="divide-y divide-border/50">
        {categories.map((cat) => {
          const count = counts[cat] ?? 0;
          return (
            <Button
              key={cat}
              type="button"
              variant="ghost"
              onClick={() => onSelect(cat)}
              className="group h-auto w-full justify-between whitespace-normal rounded-none px-1 py-4 text-left hover:bg-muted/40 focus-visible:bg-muted/40 sm:px-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="text-base font-semibold text-foreground">
                  {cat}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {CATEGORY_DESCRIPTIONS[cat]}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4 pt-0.5 text-xs text-muted-foreground">
                <span>
                  {count} {count === 1 ? "entry" : "entries"}
                </span>
                <span className="hidden items-center gap-1 font-medium text-foreground transition-colors group-hover:text-primary sm:inline-flex">
                  Browse
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </Button>
          );
        })}
      </div>
    </section>
  );
}

function CategoryGridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-muted/60" />
      </div>
      <div className="divide-y divide-border/50">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 py-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-muted/60" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded-md bg-muted/60" />
          </div>
        ))}
      </div>
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
  onSelect,
}: {
  documents: KnowledgeDocument[];
  searchTerm: string;
  activeCategory: Category | null;
  onClearCategory: () => void;
  onClearSearch: () => void;
  onSelect: (doc: KnowledgeDocument) => void;
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
        <DocumentList docs={documents} onSelect={onSelect} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocumentList
// ---------------------------------------------------------------------------

function DocumentList({
  docs,
  onSelect,
}: {
  docs: KnowledgeDocument[];
  onSelect: (doc: KnowledgeDocument) => void;
}) {
  return (
    <div className="divide-y divide-border/50">
      {docs.map((doc) => (
        <Button
          key={doc.id}
          type="button"
          variant="ghost"
          onClick={() => onSelect(doc)}
          className="group h-auto w-full justify-between whitespace-normal rounded-none px-1 py-3.5 text-left hover:bg-muted/40 focus-visible:bg-muted/40 sm:px-3"
        >
          <div className="flex min-w-0 items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                {doc.title ?? doc.file_name ?? "Untitled"}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {doc.date
                    ? new Date(doc.date).toLocaleDateString()
                    : doc.created_at
                      ? new Date(doc.created_at).toLocaleDateString()
                      : ""}
                </span>
                {doc.file_name && doc.file_name !== doc.title && (
                  <span className="truncate text-muted-foreground/60">
                    {doc.file_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Button>
      ))}
    </div>
  );
}
