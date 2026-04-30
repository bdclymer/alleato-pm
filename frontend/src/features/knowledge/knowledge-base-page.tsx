"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  FileText,
  Search,
  Settings,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

import { IconBadge, EmptyState } from "@/components/ds";
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

function getDisplayDate(doc: KnowledgeDocument): string {
  const value = doc.date ?? doc.created_at;
  if (!value) return "No date";
  return new Date(value).toLocaleDateString();
}

export function KnowledgeBasePage() {
  const { data: documents = [], isLoading } = useKnowledgeDocuments();
  const { profile } = useCurrentUserProfile();
  const [search, setSearch] = React.useState("");
  const [selectedDocument, setSelectedDocument] =
    React.useState<KnowledgeDocument | null>(null);

  const isAdmin = profile?.isAdmin === true;
  const searchTerm = search.trim().toLowerCase();

  const filteredDocuments = React.useMemo(() => {
    if (!searchTerm) return documents;
    return documents.filter((doc) => {
      const haystack = [
        doc.title ?? "",
        doc.file_name ?? "",
        doc.tags ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [documents, searchTerm]);

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
        <div className="mb-8 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Search company knowledge..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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

        {/* Document list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-lg bg-muted/30" />
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon={searchTerm ? <FileText className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
            title={searchTerm ? "No entries found" : "No knowledge entries yet"}
            description={
              searchTerm
                ? "Try a broader phrase."
                : "Admins can add approved knowledge from the source manager."
            }
          />
        ) : (
          <div className="space-y-px overflow-hidden rounded-lg bg-card">
            {filteredDocuments.map((doc) => (
              <Button
                key={doc.id}
                type="button"
                variant="ghost"
                onClick={() => setSelectedDocument(doc)}
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
                        {getDisplayDate(doc)}
                      </span>
                      {doc.file_name && doc.file_name !== doc.title && (
                        <span className="text-xs text-muted-foreground/60">
                          {doc.file_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="ml-4 h-3.5 w-3.5 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet
        open={Boolean(selectedDocument)}
        onOpenChange={(open) => {
          if (!open) setSelectedDocument(null);
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedDocument && (
            <>
              <SheetHeader className="mb-5 text-left">
                <div className="mb-3 flex items-center gap-2">
                  <StatusBadge status={selectedDocument.status ?? "uploaded"} />
                  <span className="text-xs text-muted-foreground">
                    {getDisplayDate(selectedDocument)}
                  </span>
                </div>
                <SheetTitle className="text-xl font-semibold leading-tight">
                  {selectedDocument.title ?? selectedDocument.file_name ?? "Untitled"}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
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

                {selectedDocument.tags && (
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" />
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDocument.tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((tag) => (
                          <Badge key={tag} variant="outline" className="font-normal">
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                  {isAdmin && (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/knowledge/manage">Manage sources</Link>
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
