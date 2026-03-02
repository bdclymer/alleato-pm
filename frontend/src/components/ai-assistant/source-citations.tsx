"use client";

import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import { FileTextIcon } from "lucide-react";

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

export function SourceCitations({ sources }: SourceCitationsProps) {
  if (!sources || sources.length === 0) return null;

  const items = sources as SourceItem[];
  const validSources = items.filter(
    (s) => s.snippet || s.metadata?.title,
  );

  if (validSources.length === 0) return null;

  return (
    <Sources>
      <SourcesTrigger count={validSources.length} />
      <SourcesContent>
        {validSources.map((source, i) => {
          const title =
            source.metadata?.title || `Source ${i + 1}`;
          const snippet = source.snippet
            ? source.snippet.substring(0, 120) + "..."
            : null;

          return (
            <div key={source.document_id || i} className="flex flex-col gap-1">
              <Source href="#" title={title}>
                <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="block font-medium text-sm">
                    {title}
                  </span>
                  {snippet && (
                    <span className="block text-muted-foreground text-xs">
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
