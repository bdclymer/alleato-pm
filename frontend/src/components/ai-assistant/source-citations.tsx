"use client";

import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import { FileTextIcon, FileSpreadsheetIcon, FileIcon } from "lucide-react";

interface SourceItem {
  document_id?: string;
  chunk_index?: number;
  snippet?: string;
  metadata?: {
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

export function SourceCitations({ sources }: SourceCitationsProps) {
  if (!sources || sources.length === 0) return null;

  const items = sources as SourceItem[];
  const validSources = items.filter(
    (s) => s.snippet || s.metadata?.title,
  );

  if (validSources.length === 0) return null;

  // Auto-expand when 3 or fewer sources for better visibility
  const autoExpand = validSources.length <= 3;

  return (
    <Sources defaultOpen={autoExpand}>
      <SourcesTrigger count={validSources.length} />
      <SourcesContent>
        {validSources.map((source, i) => {
          const title =
            source.metadata?.title || `Source ${i + 1}`;
          const snippet = source.snippet
            ? source.snippet.substring(0, 120) + "..."
            : null;
          const docType = source.metadata?.doc_type;
          const IconComponent = getSourceIcon(docType);

          return (
            <div key={source.document_id || i} className="flex flex-col gap-1">
              <Source href="#" title={title}>
                <IconComponent className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-col">
                  <span className="block truncate font-medium text-sm">
                    {title}
                  </span>
                  {(snippet || docType) && (
                    <span className="block truncate text-muted-foreground text-xs">
                      {docType && <span className="capitalize">{docType}</span>}
                      {docType && snippet && " · "}
                      {snippet}
                    </span>
                  )}
                </div>
              </Source>
            </div>
          );
        })}
      </SourcesContent>
    </Sources>
  );
}
