import type { ColumnConfig, FilterConfig } from "@/components/tables/unified";
import type { InboxContentType, InboxProject } from "./load-inbox-items";

export const CONTENT_TYPE_META: Record<
  InboxContentType,
  { label: string; plural: string }
> = {
  meeting: { label: "Meeting", plural: "Meetings" },
  email: { label: "Email", plural: "Emails" },
  teams: { label: "Teams", plural: "Teams messages" },
  document: { label: "Document", plural: "Documents" },
};

export const CONTENT_TYPE_ORDER: InboxContentType[] = [
  "meeting",
  "email",
  "teams",
  "document",
];

export const INBOX_COLUMNS: ColumnConfig[] = [
  { id: "type", label: "Type", alwaysVisible: true },
  { id: "title", label: "Item", alwaysVisible: true },
  { id: "from", label: "From", defaultVisible: true },
  { id: "occurredAt", label: "Date", defaultVisible: true },
  { id: "suggestion", label: "AI suggestion", defaultVisible: true },
  { id: "assign", label: "Assign to project", alwaysVisible: true },
];

export const INBOX_DEFAULT_VISIBLE_COLUMNS = INBOX_COLUMNS.filter(
  (column) => column.alwaysVisible || column.defaultVisible,
).map((column) => column.id);

export function buildInboxFilters(projects: InboxProject[]): FilterConfig[] {
  return [
    {
      id: "type",
      label: "Type",
      type: "multiSelect",
      options: CONTENT_TYPE_ORDER.map((type) => ({
        value: type,
        label: CONTENT_TYPE_META[type].plural,
      })),
    },
    {
      id: "suggestion",
      label: "AI suggestion",
      type: "select",
      options: [
        { value: "has", label: "Has suggestion" },
        { value: "none", label: "No suggestion" },
      ],
    },
    {
      id: "suggested_project",
      label: "Suggested project",
      type: "select",
      options: projects.map((project) => ({
        value: String(project.id),
        label: project.name,
      })),
    },
  ];
}

export function formatConfidence(confidence: number | null): string | null {
  if (confidence == null || Number.isNaN(confidence)) return null;
  return `${Math.round(confidence * 100)}%`;
}

/** Map a confidence score to a semantic StatusBadge status string. */
export function confidenceStatus(
  confidence: number | null,
): "success" | "warning" | "neutral" {
  if (confidence == null) return "neutral";
  if (confidence >= 0.85) return "success";
  if (confidence >= 0.6) return "warning";
  return "neutral";
}
