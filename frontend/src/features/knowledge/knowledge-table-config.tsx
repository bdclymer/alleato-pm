import * as React from "react";
import type { ReactNode } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnConfig, FilterConfig } from "@/components/tables/unified";
import type { KnowledgeArticle } from "@/hooks/use-company-knowledge";
import { KNOWLEDGE_CATEGORIES } from "@/hooks/use-company-knowledge";
import type { TableColumn } from "@/components/tables/unified/unified-table-page";

// ---------------------------------------------------------------------------
// Category display helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  KNOWLEDGE_CATEGORIES.map((c) => [c.value, c.label]),
);

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

const ORIGIN_LABELS: Record<string, string> = {
  manual: "Manual",
  meeting_extraction: "From Meeting",
  ai_assistant: "AI Generated",
  import: "Imported",
};

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

export const knowledgeColumns: ColumnConfig[] = [
  { id: "title", label: "Title", alwaysVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "tags", label: "Tags", defaultVisible: true },
  { id: "origin", label: "Source", defaultVisible: true },
  { id: "updated_at", label: "Updated", defaultVisible: true },
  { id: "created_at", label: "Created", defaultVisible: false },
];

export const knowledgeDefaultVisibleColumns = knowledgeColumns
  .filter((c) => c.alwaysVisible || c.defaultVisible)
  .map((c) => c.id);

// ---------------------------------------------------------------------------
// Filter definitions
// ---------------------------------------------------------------------------

export const knowledgeFilters: FilterConfig[] = [
  {
    id: "category",
    label: "Category",
    type: "select",
    options: KNOWLEDGE_CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
    })),
  },
  {
    id: "origin",
    label: "Source",
    type: "select",
    options: [
      { value: "manual", label: "Manual" },
      { value: "meeting_extraction", label: "From Meeting" },
      { value: "ai_assistant", label: "AI Generated" },
      { value: "import", label: "Imported" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Table column builders
// ---------------------------------------------------------------------------

export function buildKnowledgeTableColumns(options: {
  onEdit: (item: KnowledgeArticle) => void;
  onDelete: (item: KnowledgeArticle) => void;
}): TableColumn<KnowledgeArticle>[] {
  return [
    {
      id: "title",
      label: "Title",
      alwaysVisible: true,
      sortable: true,
      sortValue: (item) => item.title,
      render: (item) => (
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate max-w-[400px]">
            {item.title}
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-[400px] mt-0.5">
            {item.content.substring(0, 120)}
            {item.content.length > 120 ? "…" : ""}
          </div>
        </div>
      ),
      csvValue: (item) => item.title,
    },
    {
      id: "category",
      label: "Category",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => getCategoryLabel(item.category),
      render: (item) => (
        <Badge variant="secondary" className="text-xs font-normal">
          {getCategoryLabel(item.category)}
        </Badge>
      ),
      csvValue: (item) => getCategoryLabel(item.category),
    },
    {
      id: "tags",
      label: "Tags",
      defaultVisible: true,
      render: (item) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {(item.tags ?? []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs font-normal">
              {tag}
            </Badge>
          ))}
          {(item.tags ?? []).length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{(item.tags ?? []).length - 3}
            </span>
          )}
        </div>
      ),
      csvValue: (item) => (item.tags ?? []).join(", "),
    },
    {
      id: "origin",
      label: "Source",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => item.origin,
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {ORIGIN_LABELS[item.origin] ?? item.origin}
        </span>
      ),
      csvValue: (item) => ORIGIN_LABELS[item.origin] ?? item.origin,
    },
    {
      id: "updated_at",
      label: "Updated",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => item.updated_at,
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {new Date(item.updated_at).toLocaleDateString()}
        </span>
      ),
      csvValue: (item) => new Date(item.updated_at).toLocaleDateString(),
    },
    {
      id: "created_at",
      label: "Created",
      defaultVisible: false,
      sortable: true,
      sortValue: (item) => item.created_at,
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      ),
      csvValue: (item) => new Date(item.created_at).toLocaleDateString(),
    },
    {
      id: "actions",
      label: "",
      defaultVisible: true,
      render: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => options.onEdit(item)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => options.onDelete(item)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
