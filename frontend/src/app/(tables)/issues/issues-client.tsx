"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LinearIssueTable,
  groupIssuesByStatus,
  type LinearIssue,
  type LinearIssueGroup,
  type IssueStatus,
} from "@/components/ui/linear-issue-table";
import { SlidersHorizontal, LayoutGrid, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface IssuesClientPageProps {
  data: Record<string, unknown>[];
}

/** Map tasks.status string → IssueStatus */
function normalizeTaskStatus(raw: unknown): IssueStatus {
  const s = String(raw ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  const map: Record<string, IssueStatus> = {
    open: "open",
    todo: "todo",
    in_progress: "in_progress",
    in_review: "in_review",
    done: "done",
    resolved: "resolved",
    closed: "closed",
    backlog: "backlog",
    cancelled: "cancelled",
    pending: "todo",
    completed: "done",
    not_started: "backlog",
  };
  return map[s] ?? "open";
}

/** Map tasks.priority string → IssuePriority */
function normalizeTaskPriority(
  raw: unknown
): LinearIssue["priority"] | undefined {
  if (!raw) return undefined;
  const p = String(raw).toLowerCase();
  const map: Record<string, LinearIssue["priority"]> = {
    urgent: "urgent",
    high: "high",
    medium: "medium",
    low: "low",
    none: "none",
  };
  return map[p];
}

/** Transform a tasks row into the LinearIssue shape */
function transformTaskToLinearIssue(row: Record<string, unknown>): LinearIssue {
  const assigneeName = row.assignee_name as string | null;
  return {
    id: row.id as string,
    identifier: `TSK-${String(row.id).slice(0, 6).toUpperCase()}`,
    title: (row.description as string) || "Untitled",
    status: normalizeTaskStatus(row.status),
    priority: normalizeTaskPriority(row.priority),
    category: row.source_system as string | undefined,
    assignee: assigneeName
      ? { id: String(row.id), name: assigneeName }
      : undefined,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
    dateReported: (row.due_date as string | undefined) ?? (row.created_at as string | undefined),
  };
}

type Tab = "all" | "active" | "backlog";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All issues" },
  { id: "active", label: "Active" },
  { id: "backlog", label: "Backlog" },
];

const ACTIVE_STATUSES = new Set(["in_progress", "in_review", "todo", "open"]);
const BACKLOG_STATUSES = new Set(["backlog"]);

function filterGroupsByTab(
  groups: LinearIssueGroup[],
  tab: Tab
): LinearIssueGroup[] {
  if (tab === "all") return groups;
  const allowed = tab === "active" ? ACTIVE_STATUSES : BACKLOG_STATUSES;
  return groups
    .map((g) => ({ ...g, issues: g.issues.filter(() => allowed.has(g.status)) }))
    .filter((g) => allowed.has(g.status) && g.issues.length > 0);
}

export function IssuesClientPage({ data }: IssuesClientPageProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");

  const issues: LinearIssue[] = data.map(transformTaskToLinearIssue);
  const allGroups = groupIssuesByStatus(issues);
  const groups = filterGroupsByTab(allGroups, tab);

  const totalActive = allGroups
    .filter((g) => ACTIVE_STATUSES.has(g.status))
    .reduce((acc, g) => acc + g.issues.length, 0);

  const handleIssueClick = (issue: LinearIssue) => {
    router.push(`/issues/${issue.id}`);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/60 bg-background px-1">
        <div className="flex items-center">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative px-3 py-2.5 text-sm transition-colors select-none",
                tab === t.id
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {t.id === "all" && issues.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                  {issues.length}
                </span>
              )}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Right controls ── */}
        <div className="flex items-center gap-0.5 pr-2">
          <button className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Issues list ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground">
            No issues found
          </div>
        ) : (
          <LinearIssueTable
            groups={groups}
            onIssueClick={handleIssueClick}
          />
        )}
      </div>
    </div>
  );
}
