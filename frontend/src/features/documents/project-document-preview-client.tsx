"use client";

import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, StatusBadge } from "@/components/ds";
import { formatDate } from "@/lib/format";
import { useDocument } from "@/hooks/use-documents";
import type { ProjectDocument } from "@/hooks/use-documents";
import { inferProjectDocumentFormat } from "@/features/documents/project-documents-table-config";

type ProjectDocumentPreviewClientProps = {
  projectId: string;
  documentId: string;
};

function fileHref(projectId: string, documentId: string, inline: boolean): string {
  const base = `/api/projects/${projectId}/documents/${documentId}/download`;
  return inline ? `${base}?disposition=inline` : base;
}

function originalSourceHref(document: ProjectDocument): string | null {
  if (document.source_web_url) return document.source_web_url;
  if (document.file_url?.startsWith("http://") || document.file_url?.startsWith("https://")) {
    return document.file_url;
  }
  return null;
}

function DocumentPreviewBody({
  document,
  inlineHref,
}: {
  document: ProjectDocument;
  inlineHref: string;
}) {
  const format = inferProjectDocumentFormat(document).label;

  if (format === "Image") {
    return (
      <div className="flex min-h-96 items-start justify-center bg-muted/30 p-4">
        <img
          src={inlineHref}
          alt={document.title}
          className="max-w-full object-contain"
          style={{ maxHeight: "72vh" }}
        />
      </div>
    );
  }

  if (format === "PDF") {
    return (
      <iframe
        src={inlineHref}
        title={`${document.title} preview`}
        className="w-full bg-background"
        style={{ height: "72vh" }}
      />
    );
  }

  return (
    <div className="min-h-96 bg-muted/30 p-8">
      <EmptyState
        icon={<FileText />}
        title="Preview is not available for this file type"
        description="Download the file or open the original source to view it."
      />
    </div>
  );
}

export function ProjectDocumentPreviewClient({
  projectId,
  documentId,
}: ProjectDocumentPreviewClientProps) {
  const {
    data: document,
    isLoading,
    error,
  } = useDocument(Number(projectId), documentId);

  const backHref = `/${projectId}/documents?view=table`;
  const inlineHref = fileHref(projectId, documentId, true);
  const downloadHref = fileHref(projectId, documentId, false);
  const sourceHref = document ? originalSourceHref(document) : null;

  if (isLoading) {
    return (
      <PageShell
        variant="content"
        title="Document preview"
        actions={
          <Button asChild size="sm" variant="ghost">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Documents
            </Link>
          </Button>
        }
        contentClassName="space-y-4"
      >
        <Skeleton className="h-10 w-80" />
        <Skeleton className="w-full" style={{ height: "72vh" }} />
      </PageShell>
    );
  }

  if (error || !document) {
    return (
      <PageShell
        variant="content"
        title="Document not found"
        actions={
          <Button asChild size="sm" variant="ghost">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Documents
            </Link>
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          This document could not be loaded.
        </p>
      </PageShell>
    );
  }

  const format = inferProjectDocumentFormat(document).label;

  return (
    <PageShell
      variant="content"
      title={document.title}
      description={[document.file_name, document.folder ?? "Root", format]
        .filter(Boolean)
        .join(" - ")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {sourceHref ? (
            <Button asChild size="sm" variant="outline">
              <a href={sourceHref} target="_blank" rel="noopener noreferrer">
                Original
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <a href={downloadHref} download={document.file_name}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Documents
            </Link>
          </Button>
        </div>
      }
      contentClassName="space-y-6"
    >
      <section className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>{format}</span>
        <span>{document.file_size ? `${Math.round(document.file_size / 1024)} KB` : "Size unavailable"}</span>
        <span>Uploaded {formatDate(document.created_at)}</span>
        <StatusBadge status={document.status} />
      </section>

      <section className="overflow-hidden rounded-md border border-border bg-background">
        <DocumentPreviewBody document={document} inlineHref={inlineHref} />
      </section>
    </PageShell>
  );
}
