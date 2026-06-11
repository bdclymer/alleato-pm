import {
  Archive,
  Circle,
  Loader2,
  PauseCircle,
  ShieldCheck,
} from "lucide-react";
import type {
  DisplayStatus,
  FeedbackInboxTab,
  StatusFilter,
} from "./types";

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Submitted" },
  { value: "in_progress", label: "In Progress" },
  { value: "deferred", label: "Deferred" },
  { value: "resolved", label: "Resolved" },
  { value: "dispatched", label: "Dispatched" },
  { value: "all", label: "All" },
];

export const STATUS_OPTIONS: { value: DisplayStatus; label: string }[] = [
  { value: "open", label: "Submitted" },
  { value: "in_progress", label: "In Progress" },
  { value: "deferred", label: "Deferred" },
  { value: "resolved", label: "Resolved" },
  { value: "archived", label: "Archived" },
];

export const FEEDBACK_INBOX_TABS: { value: FeedbackInboxTab; label: string }[] = [
  { value: "issues", label: "Issues" },
  { value: "feature_requests", label: "Features" },
];

export const STATUS_META: Record<
  DisplayStatus,
  {
    icon: typeof Circle;
    className: string;
    dotClassName: string;
    label: string;
    showInList?: boolean;
  }
> = {
  open: {
    icon: Circle,
    className: "text-status-warning",
    dotClassName: "bg-status-warning",
    label: "Submitted",
  },
  in_progress: {
    icon: Loader2,
    className: "text-status-info",
    dotClassName: "bg-status-info animate-pulse",
    label: "In Progress",
    showInList: true,
  },
  deferred: {
    icon: PauseCircle,
    className: "text-muted-foreground",
    dotClassName: "bg-muted-foreground",
    label: "Deferred",
    showInList: true,
  },
  resolved: {
    icon: ShieldCheck,
    className: "text-status-success",
    dotClassName: "bg-status-success",
    label: "Resolved",
    showInList: true,
  },
  archived: {
    icon: Archive,
    className: "text-muted-foreground",
    dotClassName: "bg-muted-foreground",
    label: "Archived",
    showInList: true,
  },
};

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  change_request: "Change Events",
  copy: "Copy",
  feature_request: "Feature Request",
  question: "Question",
};

export const IN_PROGRESS_STATUSES = new Set([
  "in_progress",
  "triaged",
  "diagnosing",
  "fixing",
  "verifying",
  "in_review",
]);
export const RESOLVED_STATUSES = new Set(["resolved", "closed"]);
export const DEFERRED_STATUSES = new Set(["deferred"]);
export const ARCHIVED_STATUSES = new Set(["archived"]);
export const LIST_SECTION_ORDER: DisplayStatus[] = [
  "in_progress",
  "open",
  "deferred",
  "resolved",
];
