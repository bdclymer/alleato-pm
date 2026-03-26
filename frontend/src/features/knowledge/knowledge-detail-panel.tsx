"use client";

import { Pencil, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { KnowledgeArticle } from "@/hooks/use-company-knowledge";
import { KNOWLEDGE_CATEGORIES } from "@/hooks/use-company-knowledge";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  KNOWLEDGE_CATEGORIES.map((c) => [c.value, c.label]),
);

const ORIGIN_LABELS: Record<string, string> = {
  manual: "Manual Entry",
  meeting_extraction: "Extracted from Meeting",
  ai_assistant: "AI Generated",
  import: "Imported",
};

interface KnowledgeDetailPanelProps {
  article: KnowledgeArticle;
  onEdit: () => void;
  onClose: () => void;
}

export function KnowledgeDetailPanel({
  article,
  onEdit,
  onClose,
}: KnowledgeDetailPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-tight">
            {article.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="secondary" className="text-xs font-normal">
              {CATEGORY_LABELS[article.category] ?? article.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {ORIGIN_LABELS[article.origin] ?? article.origin}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {article.content}
        </div>

        {/* Tags */}
        {(article.tags ?? []).length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Tags
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(article.tags ?? []).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Source */}
        {article.source && (
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Source
            </div>
            <p className="text-sm text-muted-foreground">{article.source}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Details
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Created</span>
            <span className="text-foreground">
              {new Date(article.created_at).toLocaleDateString()}
            </span>
            <span className="text-muted-foreground">Updated</span>
            <span className="text-foreground">
              {new Date(article.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
