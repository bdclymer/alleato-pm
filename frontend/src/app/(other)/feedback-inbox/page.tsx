"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackItem = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  project_id: number | null;
  page_url: string;
  page_path: string;
  page_title: string | null;
  target_id: string | null;
  target_selector: string;
  target_text: string | null;
  target_tag: string | null;
  dom_path: string | null;
  target_rect: { x: number; y: number; width: number; height: number } | null;
  title: string;
  comment: string;
  request_type: string;
  severity: string | null;
  status: string;
  screenshot_url: string | null;
  screenshot_path: string | null;
  github_issue_number: number | null;
  github_issue_url: string | null;
  github_issue_state: string | null;
  metadata: Record<string, unknown>;
};

type StatusFilter = "open" | "submitted" | "closed" | "all";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "submitted", label: "Submitted" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const STATUS_META: Record<string, { icon: typeof Circle; className: string; dotClassName: string; label: string }> = {
  open: {
    icon: Circle,
    className: "text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500",
    label: "Open",
  },
  submitted: {
    icon: ArrowUpRight,
    className: "text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500",
    label: "Submitted",
  },
  github_failed: {
    icon: XCircle,
    className: "text-red-600 dark:text-red-400",
    dotClassName: "bg-red-500",
    label: "GitHub failed",
  },
  closed: {
    icon: CheckCircle2,
    className: "text-green-600 dark:text-green-400",
    dotClassName: "bg-green-500",
    label: "Closed",
  },
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  change_request: "Change request",
  copy: "Copy",
  question: "Question",
};

const SEVERITY_COLORS: Record<string, string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeedbackInboxPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  // ---- Fetch ----
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set(
          "status",
          filter === "open" ? "open,github_failed" : filter,
        );
      }
      const res = await fetch(`/api/admin/feedback?${params.toString()}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load feedback items");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ---- Update status ----
  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(`Marked as ${status}`);
      fetchItems();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  // ---- Stats ----
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---- Top bar ---- */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">Feedback</h1>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">{total}</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ---- Left: list panel ---- */}
        <div className="flex w-full flex-col border-r border-border lg:w-[420px] lg:min-w-[360px]">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 border-b border-border px-4 py-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setFilter(f.value);
                  setSelectedId(null);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === f.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  No feedback items
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {filter === "open"
                    ? "All clear! No open items."
                    : `No ${filter} items found.`}
                </p>
              </div>
            )}

            {!loading &&
              items.map((item) => {
                const meta = STATUS_META[item.status] ?? STATUS_META.open;
                const isSelected = selectedId === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setSelectedId(isSelected ? null : item.id)
                    }
                    className={cn(
                      "group flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors",
                      isSelected
                        ? "bg-muted/60"
                        : "hover:bg-muted/30",
                    )}
                  >
                    {/* Status dot */}
                    <div
                      className={cn(
                        "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                        meta.dotClassName,
                      )}
                    />

                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        {item.severity === "high" && (
                          <span className="flex-shrink-0 text-[10px] font-semibold text-red-600 dark:text-red-400">
                            HIGH
                          </span>
                        )}
                      </div>

                      {/* Meta row */}
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {REQUEST_TYPE_LABELS[item.request_type] ?? item.request_type}
                        </span>
                        <span className="text-border">|</span>
                        <span className="truncate font-mono text-[11px]">
                          {item.page_path}
                        </span>
                      </div>

                      {/* Comment preview */}
                      {item.comment && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {item.comment}
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="flex-shrink-0 pt-0.5 text-[10px] text-muted-foreground">
                      {relativeTime(item.created_at)}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* ---- Right: detail panel ---- */}
        <div className="hidden flex-1 overflow-y-auto lg:block">
          {!selected && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Select an item to view details
              </p>
            </div>
          )}

          {selected && (
            <div className="mx-auto max-w-2xl space-y-6 px-8 py-6">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {selected.title}
                  </h2>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selected.github_issue_url && (
                      <a
                        href={selected.github_issue_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        #{selected.github_issue_number}
                      </a>
                    )}
                  </div>
                </div>

                {/* Meta badges */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px]",
                      STATUS_META[selected.status]?.className,
                    )}
                  >
                    {STATUS_META[selected.status]?.label ?? selected.status}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {REQUEST_TYPE_LABELS[selected.request_type] ?? selected.request_type}
                  </Badge>
                  {selected.severity && (
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        SEVERITY_COLORS[selected.severity],
                      )}
                    >
                      {selected.severity.charAt(0).toUpperCase() + selected.severity.slice(1)} severity
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {new Date(selected.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Comment */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Description
                </p>
                <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selected.comment}
                  </p>
                </div>
              </div>

              {/* Screenshot */}
              {selected.screenshot_url && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Screenshot
                  </p>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <img
                      src={selected.screenshot_url}
                      alt="Feedback screenshot"
                      className="w-full object-cover object-top"
                      style={{ maxHeight: 300 }}
                    />
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Location
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-16 flex-shrink-0">Page</span>
                    <a
                      href={selected.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-mono text-[11px] text-foreground hover:underline"
                    >
                      {selected.page_path}
                    </a>
                  </div>
                  {selected.page_title && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-16 flex-shrink-0">Title</span>
                      <span className="text-foreground">{selected.page_title}</span>
                    </div>
                  )}
                  {selected.target_text && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-16 flex-shrink-0">Element</span>
                      <span className="truncate text-foreground">{selected.target_text}</span>
                    </div>
                  )}
                  {selected.target_selector && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-16 flex-shrink-0">Selector</span>
                      <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                        {selected.target_selector}
                      </code>
                    </div>
                  )}
                  {selected.project_id && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-16 flex-shrink-0">Project</span>
                      <span className="text-foreground">#{selected.project_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 border-t border-border pt-4">
                {(selected.status === "open" || selected.status === "github_failed") && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(selected.id, "closed")}
                    disabled={updatingId === selected.id}
                  >
                    {updatingId === selected.id ? "Updating..." : "Close"}
                  </Button>
                )}
                {selected.status === "submitted" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(selected.id, "closed")}
                    disabled={updatingId === selected.id}
                  >
                    {updatingId === selected.id ? "Updating..." : "Close"}
                  </Button>
                )}
                {selected.status === "closed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(selected.id, "open")}
                    disabled={updatingId === selected.id}
                  >
                    {updatingId === selected.id ? "Updating..." : "Re-open"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
