"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ExternalLink,
  FileText,
  HardHat,
  Loader2,
  Receipt,
  Search,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/ds";
import { StatusBadge } from "@/components/ds";
import { PageShell } from "@/components/layout";
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

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  "Company Policies": <Shield className="h-3.5 w-3.5" />,
  "HR & Onboarding": <Users className="h-3.5 w-3.5" />,
  "Finance & Accounting": <Receipt className="h-3.5 w-3.5" />,
  Contracts: <FileText className="h-3.5 w-3.5" />,
  "Field Operations": <HardHat className="h-3.5 w-3.5" />,
  Meetings: <CalendarDays className="h-3.5 w-3.5" />,
  "Notion & Tools": <Briefcase className="h-3.5 w-3.5" />,
  "Project Management": <Building2 className="h-3.5 w-3.5" />,
  Templates: <BookOpen className="h-3.5 w-3.5" />,
  Other: <FileText className="h-3.5 w-3.5" />,
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

  const isAdmin = profile?.isAdmin === true;
  const searchTerm = search.trim().toLowerCase();

  // Filter documents
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

  // Build category counts from all docs (not filtered by category)
  const categoryCounts = React.useMemo(() => {
    const counts: Partial<Record<Category, number>> = {};
    for (const doc of documents) {
      const cat = deriveCategory(doc);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [documents]);

  // Categories present in the data
  const presentCategories = CATEGORY_ORDER.filter(
    (c) => (categoryCounts[c] ?? 0) > 0,
  );

  // Group by category when no search term and no category filter
  const grouped = React.useMemo(() => {
    if (searchTerm || activeCategory) return null;
    const map = new Map<Category, KnowledgeDocument[]>();
    for (const cat of CATEGORY_ORDER) {
      const docs = filteredDocuments.filter((d) => deriveCategory(d) === cat);
      if (docs.length > 0) map.set(cat, docs);
    }
    return map;
  }, [filteredDocuments, searchTerm, activeCategory]);

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
            Browse company documents, lessons learned, and reference material
            that Ask Alleato can use.
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
        {/* Search */}
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Search company knowledge..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
        </div>

        {/* Category filter chips */}
        {!isLoading && presentCategories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-1.5">
            {presentCategories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <Button
                  key={cat}
                  type="button"
                  variant={isActive ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setActiveCategory(isActive ? null : cat)}
                  className="h-7 gap-1.5 rounded-full px-3 text-xs font-medium"
                >
                  {CATEGORY_ICONS[cat]}
                  {cat}
                  <span
                    className={
                      isActive
                        ? "opacity-70"
                        : "opacity-50"
                    }
                  >
                    {categoryCounts[cat]}
                  </span>
                </Button>
              );
            })}
          </div>
        )}

        {/* Document list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-muted/30"
              />
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon={
              searchTerm ? (
                <FileText className="h-5 w-5" />
              ) : (
                <BookOpen className="h-5 w-5" />
              )
            }
            title={
              searchTerm ? "No entries found" : "No knowledge entries yet"
            }
            description={
              searchTerm
                ? "Try a broader phrase."
                : "Admins can add approved knowledge from the source manager."
            }
          />
        ) : grouped ? (
          // Grouped view: category sections
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([cat, docs]) => (
              <div key={cat}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-muted-foreground/60">
                    {CATEGORY_ICONS[cat]}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {cat}
                  </span>
                  <span className="text-xs text-muted-foreground/50">
                    ({docs.length})
                  </span>
                </div>
                <DocumentList
                  docs={docs}
                  onSelect={setSelectedDocument}
                />
              </div>
            ))}
          </div>
        ) : (
          // Flat view: search results or single-category filter
          <DocumentList
            docs={filteredDocuments}
            onSelect={setSelectedDocument}
          />
        )}
      </div>

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
                {/* View button */}
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

                {/* Category */}
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

                {/* File name */}
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

                {/* Admin link */}
                {isAdmin && (
                  <div className="border-t pt-4">
                    <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                      <Link href="/knowledge/manage">Manage sources</Link>
                    </Button>
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
// DocumentList — shared between grouped and flat views
// ---------------------------------------------------------------------------

function DocumentList({
  docs,
  onSelect,
}: {
  docs: KnowledgeDocument[];
  onSelect: (doc: KnowledgeDocument) => void;
}) {
  return (
    <div className="space-y-px overflow-hidden rounded-lg bg-card">
      {docs.map((doc) => (
        <Button
          key={doc.id}
          type="button"
          variant="ghost"
          onClick={() => onSelect(doc)}
          className="group flex h-auto w-full items-center justify-between rounded-none px-4 py-3 text-left whitespace-normal hover:bg-muted"
        >
          <div className="flex min-w-0 items-start gap-3">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground transition-colors group-hover:text-primary">
                {doc.title ?? doc.file_name ?? "Untitled"}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {doc.date
                    ? new Date(doc.date).toLocaleDateString()
                    : doc.created_at
                      ? new Date(doc.created_at).toLocaleDateString()
                      : ""}
                </span>
                {doc.file_name && doc.file_name !== doc.title && (
                  <span className="truncate text-xs text-muted-foreground/50">
                    {doc.file_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="ml-4 shrink-0 text-xs text-muted-foreground/30 transition-all group-hover:text-muted-foreground">
            ›
          </span>
        </Button>
      ))}
    </div>
  );
}
