"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ds";
import type { KnowledgeDocument } from "@/hooks/use-knowledge-documents";

interface KnowledgeDetailPanelProps {
  document: KnowledgeDocument;
  onClose: () => void;
}

export function KnowledgeDetailPanel({
  document: doc,
  onClose,
}: KnowledgeDetailPanelProps) {
  const displayDate = (() => {
    const value = doc.date ?? doc.created_at;
    if (!value) return null;
    return new Date(value).toLocaleDateString();
  })();

  const tagList = doc.tags
    ? doc.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0 flex-1">
          {/* eslint-disable-next-line design-system/no-raw-heading */}
          <h3 className="text-sm font-semibold text-foreground leading-tight">
            {doc.title ?? doc.file_name ?? "Untitled"}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={doc.status ?? "uploaded"} />
            {displayDate && (
              <span className="text-xs text-muted-foreground">{displayDate}</span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Separator />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {doc.file_name && (
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              File
            </div>
            <p className="text-sm text-muted-foreground">{doc.file_name}</p>
          </div>
        )}

        {/* Tags */}
        {tagList.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Tags
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tagList.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Details
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-xs">
            {doc.created_at && (
              <>
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
