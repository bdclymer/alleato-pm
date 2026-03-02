"use client";

import { FileText, ExternalLink, Calendar, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PanelSection } from "./panel-section";

export interface Source {
  id: string;
  ref: string;
  type: "meeting_segment" | "decision" | "risk" | "opportunity" | string;
  title?: string;
  description?: string;
  date?: string;
  relevance?: string;
}

interface SourcesListProps {
  sources: Source[];
}

function getSourceTypeColor(type: string): string {
  switch (type) {
    case "meeting_segment":
      return "bg-blue-100 text-blue-800";
    case "decision":
      return "bg-green-100 text-green-800";
    case "risk":
      return "bg-red-100 text-red-800";
    case "opportunity":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-muted text-foreground";
  }
}

function formatSourceType(type: string): string {
  switch (type) {
    case "meeting_segment":
      return "Meeting";
    case "decision":
      return "Decision";
    case "risk":
      return "Risk";
    case "opportunity":
      return "Opportunity";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

export function SourcesList({ sources }: SourcesListProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <PanelSection
      title={`Sources (${sources.length})`}
      icon={<FileText className="h-4 w-4 text-purple-600" />}
    >
      <div className="space-y-2">
        {sources.map((source, idx) => (
          <div
            key={source.id || idx}
            className="p-4 rounded-lg border border-border bg-background hover:border-border transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getSourceTypeColor(source.type)}`}
                  >
                    {formatSourceType(source.type)}
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground">
                    {source.ref}
                  </span>
                </div>

                <p className="text-sm font-medium text-foreground truncate">
                  {source.title || source.description || "Untitled"}
                </p>

                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  {source.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {source.date}
                    </span>
                  )}
                  {source.relevance && (
                    <span className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      {source.relevance}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PanelSection>
  );
}

/**
 * Helper function to extract sources from tool output text.
 * Parses the "Sources:" section from RAG tool responses.
 */
export function extractSourcesFromToolOutput(toolOutput: string): Source[] {
  const sources: Source[] = [];

  // Look for the Sources section
  const sourcesMatch = toolOutput.match(
    /---\s*\n\*\*Sources:\*\*\n([\s\S]*?)(?:\n\n|$)/,
  );
  if (!sourcesMatch) return sources;

  const sourcesText = sourcesMatch[1];
  const sourceLines = sourcesText
    .split("\n")
    .filter((line) => line.trim().startsWith("-"));

  sourceLines.forEach((line, idx) => {
    // Parse lines like: - [Source 1]: Meeting - "Title here" (2024-01-15) - 85% relevance
    const match = line.match(
      /\[Source (\d+)\]:\s*(\w+(?:\s+\w+)?)\s*-\s*"([^"]+)"\s*(?:\(([^)]+)\))?\s*-?\s*(\d+%)?/,
    );
    if (match) {
      const [, sourceNum, type, title, date, relevance] = match;
      sources.push({
        id: `source-${sourceNum}`,
        ref: `[Source ${sourceNum}]`,
        type: type.toLowerCase().replace(/\s+/g, "_"),
        title: title,
        date: date || undefined,
        relevance: relevance || undefined,
      });
    }
  });

  return sources;
}
