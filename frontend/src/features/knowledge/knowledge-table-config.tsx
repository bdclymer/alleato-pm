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
import type { ColumnConfig, FilterConfig, TableColumn } from "@/components/tables/unified";
import type { KnowledgeArticle } from "@/hooks/use-company-knowledge";
import { KNOWLEDGE_CATEGORIES } from "@/hooks/use-company-knowledge";

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

const APPROVAL_LABELS: Record<string, string> = {
  approved: "Approved",
  draft: "Draft",
  archived: "Archived",
};

const VISIBILITY_LABELS: Record<string, string> = {
  internal: "Internal",
  admin_only: "Admin only",
  client_visible: "Client visible",
};

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

export const knowledgeColumns: ColumnConfig[] = [
  { id: "title", label: "Title", alwaysVisible: true },
  { id: "content", label: "Content", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "approval_status", label: "Approval", defaultVisible: true },
  { id: "visibility", label: "Visibility", defaultVisible: true },
  { id: "ai_searchable", label: "AI", defaultVisible: true },
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
  {
    id: "approvalStatus",
    label: "Approval",
    type: "select",
    options: [
      { value: "approved", label: "Approved" },
      { value: "draft", label: "Draft" },
      { value: "archived", label: "Archived" },
    ],
  },
  {
    id: "visibility",
    label: "Visibility",
    type: "select",
    options: [
      { value: "internal", label: "Internal" },
      { value: "admin_only", label: "Admin only" },
      { value: "client_visible", label: "Client visible" },
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
        <span className="block max-w-72 truncate font-medium text-foreground">
          {item.title}
        </span>
      ),
      csvValue: (item) => item.title,
    },
    {
      id: "content",
      label: "Content",
      defaultVisible: true,
      render: (item) => (
        <span className="block max-w-xl truncate text-sm text-muted-foreground">
          {item.content.substring(0, 160)}
          {item.content.length > 160 ? "…" : ""}
        </span>
      ),
      csvValue: (item) => item.content,
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
        <div className="flex max-w-48 flex-wrap gap-1">
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
      id: "approval_status",
      label: "Approval",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => item.approval_status,
      render: (item) => (
        <Badge variant={item.approval_status === "approved" ? "secondary" : "outline"} className="text-xs font-normal">
          {APPROVAL_LABELS[item.approval_status] ?? item.approval_status}
        </Badge>
      ),
      csvValue: (item) => APPROVAL_LABELS[item.approval_status] ?? item.approval_status,
    },
    {
      id: "visibility",
      label: "Visibility",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => item.visibility,
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {VISIBILITY_LABELS[item.visibility] ?? item.visibility}
        </span>
      ),
      csvValue: (item) => VISIBILITY_LABELS[item.visibility] ?? item.visibility,
    },
    {
      id: "ai_searchable",
      label: "AI",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => String(item.ai_searchable),
      render: (item) => (
        <Badge variant={item.ai_searchable ? "secondary" : "outline"} className="text-xs font-normal">
          {item.ai_searchable ? "Searchable" : "Off"}
        </Badge>
      ),
      csvValue: (item) => (item.ai_searchable ? "Searchable" : "Off"),
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
              <MoreHorizontal />
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
