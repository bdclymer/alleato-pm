"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Circle,
  CircleDot,
  CircleDashed,
  CheckCircle2,
  ChevronRight,
  GripVertical,
  GitPullRequest,
  Plus,
} from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */

export type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "cancelled"
  | "open"
  | "resolved"
  | "closed";

export type IssuePriority = "urgent" | "high" | "medium" | "low" | "none";
export type IssueSeverity = "critical" | "high" | "medium" | "low";

export type IssueLabel = {
  id: string;
  name: string;
  color:
    | "red"
    | "orange"
    | "yellow"
    | "green"
    | "blue"
    | "purple"
    | "pink"
    | "gray";
};

export interface LinearIssue {
  id: string | number;
  identifier?: string;
  title: string;
  status: IssueStatus;
  priority?: IssuePriority;
  severity?: IssueSeverity;
  category?: string;
  labels?: IssueLabel[];
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  reportedBy?: string;
  pullRequest?: {
    number: number;
    state: "open" | "merged" | "closed";
  };
  estimate?: number;
  totalCost?: number;
  createdAt?: string;
  updatedAt?: string;
  dateReported?: string;
}

export interface LinearIssueGroup {
  status: IssueStatus;
  label: string;
  issues: LinearIssue[];
}

/* ============================================================
   STATUS CONFIG
   ============================================================ */

const STATUS_CONFIG: Record<
  IssueStatus,
  { icon: React.ElementType; label: string; colorClass: string }
> = {
  backlog: {
    icon: CircleDashed,
    label: "Backlog",
    colorClass: "text-muted-foreground",
  },
  todo: { icon: Circle, label: "Todo", colorClass: "text-muted-foreground" },
  open: {
    icon: Circle,
    label: "Open",
    colorClass: "text-destructive",
  },
  in_progress: {
    icon: CircleDot,
    label: "In Progress",
    colorClass: "text-yellow-500",
  },
  in_review: {
    icon: CircleDot,
    label: "In Review",
    colorClass: "text-blue-500",
  },
  resolved: {
    icon: CheckCircle2,
    label: "Resolved",
    colorClass: "text-green-500",
  },
  done: { icon: CheckCircle2, label: "Done", colorClass: "text-green-500" },
  closed: {
    icon: CheckCircle2,
    label: "Closed",
    colorClass: "text-muted-foreground",
  },
  cancelled: {
    icon: Circle,
    label: "Cancelled",
    colorClass: "text-muted-foreground/50",
  },
};

const LABEL_COLORS: Record<IssueLabel["color"], string> = {
  red: "bg-red-500/15 text-red-600 dark:text-red-400",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  yellow: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  green: "bg-green-500/15 text-green-600 dark:text-green-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  pink: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  gray: "bg-muted text-muted-foreground",
};

const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  critical: "bg-red-500/15 text-red-600 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  medium: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  low: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

const CATEGORY_COLORS: Record<string, string> = {
  safety: "bg-red-500/15 text-red-600 dark:text-red-400",
  quality: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  schedule: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  cost: "bg-green-500/15 text-green-600 dark:text-green-400",
  technical: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  other: "bg-muted text-muted-foreground",
};

/* ============================================================
   LINEAR ISSUE TABLE CONTAINER
   ============================================================ */

interface LinearIssueTableProps {
  groups: LinearIssueGroup[];
  onIssueClick?: (issue: LinearIssue) => void;
  onAddIssue?: (status: IssueStatus) => void;
  className?: string;
}

export function LinearIssueTable({
  groups,
  onIssueClick,
  onAddIssue,
  className,
}: LinearIssueTableProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {groups.map((group) => (
        <LinearIssueGroupSection
          key={group.status}
          group={group}
          onIssueClick={onIssueClick}
          onAddIssue={onAddIssue}
        />
      ))}
    </div>
  );
}

/* ============================================================
   ISSUE GROUP SECTION (Collapsible)
   ============================================================ */

interface LinearIssueGroupSectionProps {
  group: LinearIssueGroup;
  onIssueClick?: (issue: LinearIssue) => void;
  onAddIssue?: (status: IssueStatus) => void;
}

function LinearIssueGroupSection({
  group,
  onIssueClick,
  onAddIssue,
}: LinearIssueGroupSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const statusConfig = STATUS_CONFIG[group.status] || STATUS_CONFIG.open;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors group"
      >
        <ChevronRight
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
        <StatusIcon className={cn("w-4 h-4", statusConfig.colorClass)} />
        <span className="text-sm font-medium text-foreground">
          {group.label}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {group.issues.length}
        </span>
        <div className="flex-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddIssue?.(group.status);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          title="Add issue"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </button>

      {/* Issues */}
      {isExpanded && (
        <div className="flex flex-col">
          {group.issues.map((issue) => (
            <LinearIssueRow
              key={issue.id}
              issue={issue}
              onClick={() => onIssueClick?.(issue)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ISSUE ROW
   ============================================================ */

interface LinearIssueRowProps {
  issue: LinearIssue;
  onClick?: () => void;
}

function LinearIssueRow({ issue, onClick }: LinearIssueRowProps) {
  const [isChecked, setIsChecked] = React.useState(false);
  const statusConfig = STATUS_CONFIG[issue.status] || STATUS_CONFIG.open;
  const StatusIcon = statusConfig.icon;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-1.5 hover:bg-muted/50 cursor-pointer group transition-colors"
    >
      {/* Drag Handle */}
      <div className="opacity-0 group-hover:opacity-100 text-muted-foreground cursor-grab transition-opacity">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsChecked(!isChecked);
        }}
        className={cn(
          "w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors flex-shrink-0",
          isChecked
            ? "bg-primary border-primary"
            : "border-border hover:border-foreground/50"
        )}
      >
        {isChecked && (
          <svg
            className="w-2.5 h-2.5 text-primary-foreground"
            viewBox="0 0 10 10"
            fill="none"
          >
            <path
              d="M2 5L4 7L8 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Issue ID */}
      {issue.identifier && (
        <span className="text-xs text-muted-foreground font-mono w-16 flex-shrink-0">
          {issue.identifier}
        </span>
      )}

      {/* Status Icon */}
      <StatusIcon className={cn("w-4 h-4 flex-shrink-0", statusConfig.colorClass)} />

      {/* Title */}
      <span className="text-sm text-foreground truncate flex-1 min-w-0">
        {issue.title}
      </span>

      {/* Category Badge */}
      {issue.category && (
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
            CATEGORY_COLORS[issue.category.toLowerCase()] || CATEGORY_COLORS.other
          )}
        >
          {issue.category}
        </span>
      )}

      {/* Severity Badge */}
      {issue.severity && (
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
            SEVERITY_COLORS[issue.severity]
          )}
        >
          {issue.severity}
        </span>
      )}

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {issue.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                LABEL_COLORS[label.color]
              )}
            >
              {label.name}
            </span>
          ))}
          {issue.labels.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{issue.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {/* PR Link */}
      {issue.pullRequest && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs flex-shrink-0",
            issue.pullRequest.state === "merged"
              ? "text-purple-500"
              : issue.pullRequest.state === "open"
                ? "text-green-500"
                : "text-muted-foreground"
          )}
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          <span>#{issue.pullRequest.number}</span>
        </div>
      )}

      {/* Total Cost */}
      {issue.totalCost !== undefined && issue.totalCost > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
          ${issue.totalCost.toLocaleString()}
        </span>
      )}

      {/* Assignee / Reported By */}
      <div className="w-6 h-6 flex-shrink-0">
        {issue.assignee ? (
          issue.assignee.avatar ? (
            <img
              src={issue.assignee.avatar}
              alt={issue.assignee.name}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-[10px] font-medium text-primary">
                {issue.assignee.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )
        ) : issue.reportedBy ? (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-[10px] font-medium text-muted-foreground">
              {issue.reportedBy.charAt(0).toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border border-dashed border-border opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Date */}
      <span className="text-xs text-muted-foreground w-16 text-right flex-shrink-0">
        {formatDate(issue.dateReported || issue.updatedAt || issue.createdAt)}
      </span>
    </div>
  );
}

/* ============================================================
   FILTER BAR
   ============================================================ */

interface LinearFilterBarProps {
  totalIssues: number;
  onFilterClick?: () => void;
  className?: string;
}

export function LinearFilterBar({
  totalIssues,
  onFilterClick,
  className,
}: LinearFilterBarProps) {
  return (
    <div className={cn("flex items-center gap-4 px-4 py-2", className)}>
      <h1 className="text-base font-semibold text-foreground">Active issues</h1>
      <span className="text-sm text-muted-foreground tabular-nums">
        {totalIssues}
      </span>
      <button
        onClick={onFilterClick}
        className="ml-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded border border-border/50 transition-colors"
      >
        + Filter
      </button>
    </div>
  );
}

/* ============================================================
   UTILITIES
   ============================================================ */

function formatDate(dateString?: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ============================================================
   HELPER: Transform DB data to LinearIssue format
   ============================================================ */

function normalizeStatus(raw: unknown): IssueStatus {
  const s = String(raw ?? "").toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, IssueStatus> = {
    open: "open",
    in_progress: "in_progress",
    resolved: "resolved",
    pending_verification: "in_review",
    in_review: "in_review",
    closed: "closed",
    backlog: "backlog",
    todo: "todo",
    done: "done",
    cancelled: "cancelled",
  };
  return map[s] ?? "open";
}

export function transformToLinearIssue(
  dbIssue: Record<string, unknown>
): LinearIssue {
  return {
    id: dbIssue.id as string | number,
    identifier: `ISS-${dbIssue.id}`,
    title: (dbIssue.title as string) || "Untitled",
    status: normalizeStatus(dbIssue.status),
    severity: dbIssue.severity as IssueSeverity | undefined,
    category: dbIssue.category as string | undefined,
    reportedBy: dbIssue.reported_by as string | undefined,
    totalCost: dbIssue.total_cost as number | undefined,
    createdAt: dbIssue.created_at as string | undefined,
    updatedAt: dbIssue.updated_at as string | undefined,
    dateReported: dbIssue.date_reported as string | undefined,
  };
}

export function groupIssuesByStatus(
  issues: LinearIssue[]
): LinearIssueGroup[] {
  const statusOrder: IssueStatus[] = [
    "open",
    "in_progress",
    "in_review",
    "resolved",
    "closed",
    "backlog",
    "todo",
    "done",
    "cancelled",
  ];

  const groups: Map<IssueStatus, LinearIssue[]> = new Map();

  // Initialize groups
  statusOrder.forEach((status) => {
    groups.set(status, []);
  });

  // Group issues
  issues.forEach((issue) => {
    const existing = groups.get(issue.status) || [];
    existing.push(issue);
    groups.set(issue.status, existing);
  });

  // Convert to array and filter empty groups
  return statusOrder
    .map((status) => ({
      status,
      label: STATUS_CONFIG[status]?.label || status,
      issues: groups.get(status) || [],
    }))
    .filter((group) => group.issues.length > 0);
}
