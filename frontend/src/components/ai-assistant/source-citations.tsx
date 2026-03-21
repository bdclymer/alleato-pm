"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileTextIcon, FileSpreadsheetIcon, FileIcon } from "lucide-react";
import { useState } from "react";

interface SourceItem {
  document_id?: string;
  chunk_index?: number;
  snippet?: string;
  metadata?: {
    id?: string;
    meeting_id?: string;
    metadata_id?: string;
    file_id?: string;
    project_id?: number | string;
    type?: string;
    category?: string;
    source?: string;
    url?: string;
    fireflies_link?: string;
    title?: string;
    captured_at?: string;
    doc_type?: string;
  };
}

interface SourceCitationsProps {
  sources: unknown[] | null;
}

function getSourceIcon(docType?: string) {
  switch (docType?.toLowerCase()) {
    case "spreadsheet":
    case "excel":
    case "csv":
      return FileSpreadsheetIcon;
    case "document":
    case "pdf":
    case "report":
      return FileTextIcon;
    default:
      return FileIcon;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getSourceHref(source: SourceItem): string {
  const metadata = asRecord(source.metadata);
  const title = String(metadata.title ?? "").toLowerCase();
  const docType = String(
    metadata.doc_type ?? metadata.type ?? metadata.category ?? "",
  ).toLowerCase();
  const sourceName = String(metadata.source ?? "").toLowerCase();

  const meetingLike =
    docType.includes("meeting") ||
    title.includes("meeting") ||
    sourceName.includes("fireflies") ||
    Boolean(metadata.meeting_id);

  if (meetingLike) {
    const meetingIdCandidate = [
      metadata.meeting_id,
      metadata.metadata_id,
      metadata.file_id,
      metadata.id,
      source.document_id,
    ]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .find(Boolean);

    if (meetingIdCandidate) {
      return `/meetings/${meetingIdCandidate}`;
    }
  }

  const externalLink = [metadata.url, metadata.fireflies_link]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find((value) => Boolean(value && /^https?:\/\//.test(value)));

  return externalLink || "#";
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  const items = sources as SourceItem[];
  const validSources = items.filter(
    (s) => s.snippet || s.metadata?.title,
  );

  if (validSources.length === 0) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mt-3 border-t border-border/60 pt-2"
    >
      <CollapsibleTrigger className="text-xs font-medium text-muted-foreground hover:text-foreground">
        Sources ({validSources.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 grid gap-2">
        {validSources.map((source, i) => {
          const title = source.metadata?.title || `Source ${i + 1}`;
          const snippet = source.snippet
            ? source.snippet.substring(0, 120) + "..."
            : null;
          const docType = source.metadata?.doc_type;
          const IconComponent = getSourceIcon(docType);
          const href = getSourceHref(source);

          return (
            <a
              key={source.document_id || i}
              href={href}
              className="flex min-w-0 items-start gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 no-underline transition-colors hover:bg-muted/60"
            >
              <IconComponent className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {title}
                </span>
                {(snippet || docType) && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {docType && <span className="capitalize">{docType}</span>}
                    {docType && snippet && " · "}
                    {snippet}
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
