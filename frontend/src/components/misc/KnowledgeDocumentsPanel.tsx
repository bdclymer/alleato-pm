import clsx from "clsx";

import { Button } from "@/components/ui/button";
import type { KnowledgeDocument } from "../../hooks/useKnowledgeDocuments";
import type { CitationRecord } from "../../hooks/useThreadCitations";

type KnowledgeDocumentsPanelProps = {
  documents: KnowledgeDocument[];
  activeDocumentIds: Set<string>;
  citations: CitationRecord[];
  loadingDocuments: boolean;
  loadingCitations: boolean;
  documentsError: string | null;
  citationsError: string | null;
  onSelectDocument: (document: KnowledgeDocument) => void;
};

export function KnowledgeDocumentsPanel({
  documents,
  activeDocumentIds,
  citations,
  loadingDocuments,
  loadingCitations,
  documentsError,
  citationsError,
  onSelectDocument,
}: KnowledgeDocumentsPanelProps) {
  const statusMessage = getStatusMessage({
    loadingCitations,
    citationsError,
    activeCount: activeDocumentIds.size,
  });

  return (
    <div className="flex h-full flex-col rounded-xl bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Knowledge library
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Browse your configured knowledge sources. Documents cited in the
              latest assistant response are highlighted.
            </p>
          </div>
          <span className="rounded-full bg-muted px-4 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {loadingDocuments ? "Loading…" : `${documents.length} files`}
          </span>
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {statusMessage}
        </p>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {documentsError ? (
          <ErrorState message={documentsError} />
        ) : (
          <DocumentGrid
            documents={documents}
            loading={loadingDocuments}
            activeDocumentIds={activeDocumentIds}
            onSelectDocument={onSelectDocument}
          />
        )}
      </div>

      {citations.length > 0 ? (
        <aside className="border-t border-border bg-muted/60 px-6 py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Latest sources
          </p>
          <ul className="mt-2 space-y-1">
            {citations.map((citation) => (
              <li
                key={`${citation.document_id}-${citation.annotation_index ?? "na"}`}
                className="flex flex-wrap items-baseline gap-2"
              >
                <span className="font-medium text-foreground">
                  {citation.title}
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {citation.filename}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  );
}

function getStatusMessage({
  loadingCitations,
  citationsError,
  activeCount,
}: {
  loadingCitations: boolean;
  citationsError: string | null;
  activeCount: number;
}) {
  if (loadingCitations) {
    return "Updating citations…";
  }
  if (citationsError) {
    return citationsError;
  }
  if (activeCount > 0) {
    return `${activeCount} source${activeCount === 1 ? "" : "s"} cited in the latest response.`;
  }
  return "No sources cited yet.";
}

function DocumentGrid({
  documents,
  loading,
  activeDocumentIds,
  onSelectDocument,
}: {
  documents: KnowledgeDocument[];
  loading: boolean;
  activeDocumentIds: Set<string>;
  onSelectDocument: (document: KnowledgeDocument) => void;
}) {
  if (loading) {
    return (
      <div className="grid h-full place-items-center bg-muted/30 text-muted-foreground">
        <span className="text-sm font-medium">Loading documents…</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="grid h-full place-items-center bg-muted/20 text-sm text-muted-foreground">
        No documents available.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        style={{ gridAutoRows: "1fr" }}
      >
        {documents.map((document) => {
          const active = activeDocumentIds.has(document.id);
          const fileVariant = getFileVariant(document.filename);
          return (
            <Button
              type="button"
              key={document.id}
              variant="ghost"
              className={clsx(
                "group flex h-full min-h-[260px] flex-col justify-between overflow-hidden rounded-xl !bg-card p-4 text-left shadow-sm transition-all duration-200 hover:!bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                active
                  ? "border-primary/70 ring-2 ring-primary/30"
                  : "border-border",
              )}
              onClick={() => onSelectDocument(document)}
            >
              <div className="flex flex-col gap-4">
                <div className="space-y-1">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                      fileVariant.badge,
                    )}
                  >
                    {fileVariant.label}
                  </span>
                  <p className="break-words text-xs font-medium text-muted-foreground">
                    {document.filename}
                  </p>
                </div>
                <div className="flex flex-1 flex-col space-y-2">
                  <h3 className="break-words text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {document.title}
                  </h3>
                  {document.description ? (
                    <p
                      className="line-clamp-3 break-words text-sm leading-snug text-muted-foreground"
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 3,
                        overflow: "hidden",
                      }}
                    >
                      {document.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <span
                className={clsx(
                  "mt-6 inline-flex w-fit items-center self-start rounded-full px-4 py-1 text-xs font-medium",
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {active ? "Cited in latest response" : "Not yet cited"}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-red-50/70 px-6 text-center text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
      <span className="font-semibold">Unable to load documents</span>
      <span>{message}</span>
    </div>
  );
}

type FileVariant = "pdf" | "html" | "default";

function getFileVariant(filename: string): {
  variant: FileVariant;
  label: string;
  badge: string;
} {
  const lower = filename.toLowerCase();
  let variant: FileVariant = "default";
  if (lower.endsWith(".pdf")) variant = "pdf";
  else if (lower.endsWith(".html")) variant = "html";

  const styles: Record<FileVariant, { label: string; badge: string }> = {
    pdf: {
      label: "PDF",
      badge: "bg-status-warning/10 text-status-warning",
    },
    html: {
      label: "HTML",
      badge: "bg-status-info/10 text-status-info",
    },
    default: {
      label: "FILE",
      badge: "bg-muted text-muted-foreground",
    },
  };

  const style = styles[variant];
  return { variant, ...style };
}
