"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, ExternalLink, MessageSquare, RefreshCw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

type AgentTarget = "codex" | "claude_code";
type StatusFilter = "all" | "open" | "in_progress" | "resolved";
type AssigneeFilter = "all" | AgentTarget | "unassigned";

type VerificationChecklist = {
  rootCause: boolean;
  tests: boolean;
  evidence: boolean;
};

type DispatchHistoryEntry = {
  target: AgentTarget;
  at: string;
  by: string;
  status: string;
  annotationId: string | null;
};

type FeedbackItem = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  comment: string;
  page_url: string;
  page_path: string;
  severity: string | null;
  status: string;
  target_selector: string;
  metadata: Record<string, unknown> | null;
};

type FeedbackComment = {
  id: string;
  body: string;
  created_at: string;
  author: {
    full_name: string | null;
    email: string;
  };
};

const OPEN_STATES = new Set(["open", "submitted", "github_failed"]);
const IN_PROGRESS_STATES = new Set(["in_progress", "triaged", "diagnosing", "fixing", "verifying", "in_review"]);
const RESOLVED_STATES = new Set(["resolved", "closed"]);

const EMPTY_CHECKLIST: VerificationChecklist = {
  rootCause: false,
  tests: false,
  evidence: false,
};

function displayBucket(status: string): Exclude<StatusFilter, "all"> {
  if (RESOLVED_STATES.has(status)) return "resolved";
  if (IN_PROGRESS_STATES.has(status)) return "in_progress";
  return "open";
}

function relativeTime(dateString: string) {
  const ms = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getMetadata(item: FeedbackItem) {
  if (item.metadata && typeof item.metadata === "object") {
    return item.metadata;
  }
  return {};
}

function getAgentationId(item: FeedbackItem) {
  const value = getMetadata(item).agentationId;
  if (typeof value === "string") return value;
  const legacy = getMetadata(item).annotationId;
  return typeof legacy === "string" ? legacy : null;
}

function getAssignedAgent(item: FeedbackItem): AgentTarget | null {
  const value = getMetadata(item).assignedAgent;
  if (value === "codex" || value === "claude_code") return value;
  return null;
}

function getVerificationChecklist(item: FeedbackItem): VerificationChecklist {
  const metadata = getMetadata(item);
  const value = metadata.verificationChecklist;
  if (!value || typeof value !== "object") return EMPTY_CHECKLIST;
  const record = value as Record<string, unknown>;
  return {
    rootCause: record.rootCause === true,
    tests: record.tests === true,
    evidence: record.evidence === true,
  };
}

function getDispatchHistory(item: FeedbackItem): DispatchHistoryEntry[] {
  const metadata = getMetadata(item);
  const value = metadata.dispatchHistory;
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => {
      const record = entry as Record<string, unknown>;
      return {
        target: record.target === "claude_code" ? "claude_code" : "codex",
        at: typeof record.at === "string" ? record.at : "",
        by: typeof record.by === "string" ? record.by : "",
        status: typeof record.status === "string" ? record.status : "",
        annotationId: typeof record.annotationId === "string" ? record.annotationId : null,
      };
    })
    .filter((entry) => entry.at.length > 0);
}

function agentLabel(target: AgentTarget) {
  return target === "codex" ? "Codex" : "Claude Code";
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function duplicateKey(item: FeedbackItem) {
  const selector = normalizeText(item.target_selector || "body");
  const summary = normalizeText(item.comment).slice(0, 80);
  return `${item.page_path}|${selector}|${summary}`;
}

function computePriorityScore(item: FeedbackItem, duplicateCount: number) {
  const severityScore =
    item.severity === "high" ? 50 : item.severity === "medium" ? 30 : item.severity === "low" ? 10 : 20;
  const statusScore =
    displayBucket(item.status) === "open" ? 20 : displayBucket(item.status) === "in_progress" ? 10 : 0;
  const duplicateScore = Math.min(30, Math.max(0, duplicateCount - 1) * 8);
  const ageDays = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000);
  const ageScore = Math.min(20, Math.max(0, ageDays));
  const assignmentBonus = getAssignedAgent(item) ? 0 : 5;
  return severityScore + statusScore + duplicateScore + ageScore + assignmentBonus;
}

function scoreLabel(score: number) {
  if (score >= 90) return "Critical";
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

export default function AnnotationInboxPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignedAgent, setAssignedAgent] = useState<AgentTarget>("codex");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [resolvingCluster, setResolvingCluster] = useState(false);
  const [lastDispatchCommand, setLastDispatchCommand] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    try {
      const primary = await fetch("/api/agentation/inbox?limit=500");

      if (primary.ok) {
        const data = await primary.json();
        const all = Array.isArray(data.items) ? (data.items as FeedbackItem[]) : [];
        setItems(all.filter((item) => getAgentationId(item) !== null));
        return;
      }

      // Fallback path: use the admin feedback endpoint and filter to annotation records.
      const fallback = await fetch("/api/admin/feedback?limit=500");
      if (fallback.ok) {
        const data = await fallback.json();
        const all = Array.isArray(data.items) ? (data.items as FeedbackItem[]) : [];
        setItems(all.filter((item) => getAgentationId(item) !== null));
        return;
      }

      const primaryError = (await primary.json().catch(() => ({}))) as { error?: string; details?: string };
      const fallbackError = (await fallback.json().catch(() => ({}))) as { error?: string; details?: string };
      const message =
        fallbackError.error ||
        primaryError.error ||
        fallbackError.details ||
        primaryError.details ||
        "Failed to load annotations";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function patchFeedback(
    id: string,
    payload: { status?: "open" | "in_progress" | "resolved"; metadata?: Record<string, unknown> },
  ) {
    const res = await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || "Update failed");
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  const duplicateCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = duplicateKey(item);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((item) => {
        if (statusFilter !== "all" && displayBucket(item.status) !== statusFilter) return false;
        if (assigneeFilter !== "all") {
          const assigned = getAssignedAgent(item);
          if (assigneeFilter === "unassigned" && assigned) return false;
          if ((assigneeFilter === "codex" || assigneeFilter === "claude_code") && assigned !== assigneeFilter) {
            return false;
          }
        }
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.comment.toLowerCase().includes(q) ||
          (getAgentationId(item) || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const scoreA = computePriorityScore(a, duplicateCounts.get(duplicateKey(a)) || 1);
        const scoreB = computePriorityScore(b, duplicateCounts.get(duplicateKey(b)) || 1);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [items, search, statusFilter, assigneeFilter, duplicateCounts]);

  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) || filtered[0] || null,
    [filtered, selectedId],
  );

  useEffect(() => {
    if (selected) {
      setSelectedId(selected.id);
      setAssignedAgent(getAssignedAgent(selected) || "codex");
    } else {
      setSelectedId(null);
      setAssignedAgent("codex");
    }
  }, [selected?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadComments() {
      if (!selected) {
        setComments([]);
        return;
      }
      setLoadingComments(true);
      const res = await fetch(`/api/admin/feedback/comments?feedbackItemId=${selected.id}`);
      const data = await res.json();
      if (!cancelled) {
        setComments(Array.isArray(data.comments) ? (data.comments as FeedbackComment[]) : []);
        setLoadingComments(false);
      }
    }
    void loadComments();
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  const counts = useMemo(
    () => ({
      total: items.length,
      open: items.filter((item) => displayBucket(item.status) === "open").length,
      inProgress: items.filter((item) => displayBucket(item.status) === "in_progress").length,
      resolved: items.filter((item) => displayBucket(item.status) === "resolved").length,
      unassigned: items.filter((item) => !getAssignedAgent(item)).length,
    }),
    [items],
  );

  const selectedDuplicateCluster = useMemo(() => {
    if (!selected) return [];
    const key = duplicateKey(selected);
    return items.filter((item) => duplicateKey(item) === key);
  }, [items, selected?.id]);

  const selectedScore = selected
    ? computePriorityScore(selected, duplicateCounts.get(duplicateKey(selected)) || 1)
    : 0;
  const selectedDispatchHistory = selected ? getDispatchHistory(selected) : [];

  async function updateStatus(status: "open" | "in_progress" | "resolved") {
    if (!selected) return;
    setUpdatingStatus(true);
    try {
      await patchFeedback(selected.id, { status });
      await loadItems();
      toast.success("Status updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      toast.error(message);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function saveAssignment() {
    if (!selected) return;
    setSavingAssignment(true);
    try {
      await patchFeedback(selected.id, {
        metadata: {
          assignedAgent,
          assignedAt: new Date().toISOString(),
        },
      });
      await loadItems();
      toast.success(`Assigned to ${assignedAgent === "codex" ? "Codex" : "Claude Code"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save assignment";
      toast.error(message);
    } finally {
      setSavingAssignment(false);
    }
  }

  async function submitReply() {
    if (!selected || !replyBody.trim()) return;
    setSavingReply(true);
    const res = await fetch("/api/admin/feedback/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feedbackItemId: selected.id,
        body: replyBody.trim(),
      }),
    });
    setSavingReply(false);

    if (!res.ok) {
      toast.error("Failed to post reply");
      return;
    }

    const data = await res.json();
    const comment = data?.comment as FeedbackComment | undefined;
    if (comment) {
      setComments((prev) => [...prev, comment]);
    }
    setReplyBody("");
    toast.success("Reply posted");
  }

  async function dispatchToAgent() {
    if (!selected) return;
    setDispatching(true);
    const res = await fetch("/api/admin/feedback/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        target: assignedAgent,
        markInProgress: true,
      }),
    });
    setDispatching(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error((data as { error?: string }).error || "Dispatch failed");
      return;
    }

    const data = (await res.json()) as {
      prompt: string;
      cliCommand: string;
      target: AgentTarget;
    };

    setLastDispatchCommand(data.cliCommand);
    await loadItems();
    void navigator.clipboard.writeText(data.prompt);
    toast.success(`Dispatched to ${data.target === "codex" ? "Codex" : "Claude Code"} and copied prompt`);
  }

  function copyLastCommand() {
    if (!lastDispatchCommand) return;
    void navigator.clipboard.writeText(lastDispatchCommand);
    toast.success("Dispatch command copied");
  }

  async function resolveDuplicateCluster() {
    if (!selected || selectedDuplicateCluster.length <= 1) return;
    setResolvingCluster(true);
    try {
      await Promise.all(
        selectedDuplicateCluster.map(async (item) => {
          await patchFeedback(item.id, { status: "resolved" });
        }),
      );
      await loadItems();
      toast.success(`Resolved ${selectedDuplicateCluster.length} duplicate items`);
    } catch {
      toast.error("Failed to resolve duplicate cluster");
    } finally {
      setResolvingCluster(false);
    }
  }

  async function toggleChecklist(nextChecklist: VerificationChecklist) {
    if (!selected) return;
    try {
      await patchFeedback(selected.id, {
        metadata: {
          verificationChecklist: nextChecklist,
          verificationUpdatedAt: new Date().toISOString(),
        },
      });
      await loadItems();
    } catch {
      toast.error("Failed to update verification checklist");
    }
  }

  return (
    <PageShell
      variant="dashboard"
      title="Annotation Inbox"
      showHeader={false}
      className="px-0! py-0!"
      description="Review Agentation annotations, dispatch to Codex or Claude Code, and track execution."
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-1 min-h-0">
          <section
            className="flex w-full flex-col border-r border-border lg:w-auto lg:shrink-0"
            style={{ width: 520, minWidth: 320, maxWidth: 640 }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {counts.total} items · {counts.open} open · {counts.inProgress} in progress · {counts.unassigned} unassigned
              </span>
              <Button variant="ghost" size="sm" onClick={() => void loadItems()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-border px-3 py-2">
              <Input
                placeholder="Search title, content, or annotation ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Status filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v as AssigneeFilter)}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  <SelectItem value="codex">Codex</SelectItem>
                  <SelectItem value="claude_code">Claude Code</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 overflow-y-auto bg-muted/20">
              {loading && <div className="p-6 text-sm text-muted-foreground">Loading annotations...</div>}
              {!loading && filtered.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">No annotations found.</div>
              )}
              {!loading &&
                filtered.map((item) => {
                  const duplicateCount = duplicateCounts.get(duplicateKey(item)) || 1;
                  const score = computePriorityScore(item, duplicateCount);
                  const assignee = getAssignedAgent(item);
                  return (
                    <Button
                      key={item.id}
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedId(item.id)}
                      className={`h-auto w-full justify-start rounded-none border-b border-border px-4 py-3 text-left last:border-b-0 ${
                        selected?.id === item.id ? "bg-muted/40" : "hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex w-full items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{item.comment}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {displayBucket(item.status)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {item.severity || "medium"}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Score {score} · {scoreLabel(score)}
                            </Badge>
                            {duplicateCount > 1 && (
                              <Badge variant="outline" className="text-xs">
                                {duplicateCount} duplicates
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {assignee === "codex"
                                ? "Codex"
                                : assignee === "claude_code"
                                  ? "Claude Code"
                                  : "Unassigned"}
                            </Badge>
                          </div>
                        </div>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {relativeTime(item.updated_at)}
                        </span>
                      </div>
                    </Button>
                  );
                })}
            </div>
          </section>
          <section className="flex flex-1 flex-col overflow-y-auto p-4">
            {!selected && (
              <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                Select an annotation to view details.
              </div>
            )}

            {selected && (
              <div className="space-y-4 rounded-md border border-border p-4">
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-foreground">{selected.title}</h2>
                  <p className="text-sm text-muted-foreground">{selected.comment}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Triage Status</p>
                    <Select
                      value={displayBucket(selected.status)}
                      onValueChange={(v) => void updateStatus(v as "open" | "in_progress" | "resolved")}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Annotation ID</p>
                    <p className="rounded-md border border-border px-2 py-2 text-xs text-foreground">
                      {getAgentationId(selected)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Assign Agent</p>
                    <Select value={assignedAgent} onValueChange={(v) => setAssignedAgent(v as AgentTarget)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="codex">Codex</SelectItem>
                        <SelectItem value="claude_code">Claude Code</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Auto Priority</p>
                    <p className="rounded-md border border-border px-2 py-2 text-xs text-foreground">
                      {selectedScore} · {scoreLabel(selectedScore)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={saveAssignment} disabled={savingAssignment}>
                    {savingAssignment ? "Saving..." : "Save Assignment"}
                  </Button>
                  <Button size="sm" onClick={dispatchToAgent} disabled={dispatching}>
                    <Send className="mr-2 h-4 w-4" />
                    {dispatching
                      ? "Dispatching..."
                      : `Dispatch to ${assignedAgent === "codex" ? "Codex" : "Claude Code"}`}
                  </Button>
                  {selected.page_url && (
                    <Button asChild variant="outline" size="sm">
                      <a href={selected.page_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Page
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={copyLastCommand} disabled={!lastDispatchCommand}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Last Command
                  </Button>
                </div>

                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Dispatch History</p>
                    <Badge variant="outline" className="text-xs">
                      {selectedDispatchHistory.length} dispatches
                    </Badge>
                  </div>
                  {selectedDispatchHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No dispatches recorded yet.</p>
                  ) : (
                    <div className="max-h-32 space-y-2 overflow-auto">
                      {selectedDispatchHistory.map((entry, idx) => (
                        <div key={`${entry.at}-${idx}`} className="rounded-md border border-border p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-foreground">{agentLabel(entry.target)}</p>
                            <p className="text-[11px] text-muted-foreground">{relativeTime(entry.at)}</p>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            by {entry.by} · status {entry.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Duplicate Cluster</p>
                    <Badge variant="outline" className="text-xs">
                      {selectedDuplicateCluster.length} related
                    </Badge>
                  </div>
                  {selectedDuplicateCluster.length > 1 ? (
                    <>
                      <div className="max-h-28 space-y-2 overflow-auto">
                        {selectedDuplicateCluster
                          .filter((item) => item.id !== selected.id)
                          .slice(0, 5)
                          .map((item) => (
                            <Button
                              key={item.id}
                              type="button"
                              variant="outline"
                              onClick={() => setSelectedId(item.id)}
                              className="h-auto w-full justify-start px-2 py-1 text-left text-xs"
                            >
                              {item.title}
                            </Button>
                          ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resolveDuplicateCluster}
                        disabled={resolvingCluster}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {resolvingCluster ? "Resolving..." : "Resolve Entire Cluster"}
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No strong duplicates detected.</p>
                  )}
                </div>

                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-sm font-semibold text-foreground">Verification Checklist</p>
                  {(["rootCause", "tests", "evidence"] as const).map((key) => {
                    const checklist = getVerificationChecklist(selected);
                    const labels: Record<typeof key, string> = {
                      rootCause: "Root cause documented",
                      tests: "Fix validated with tests",
                      evidence: "Evidence captured (screenshot/logs)",
                    };
                    return (
                      <label key={key} className="flex items-center gap-2 text-xs text-foreground">
                        <Checkbox
                          checked={checklist[key]}
                          onCheckedChange={(checked) =>
                            void toggleChecklist({
                              ...checklist,
                              [key]: checked === true,
                            })
                          }
                        />
                        {labels[key]}
                      </label>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Replies</h3>
                  <div className="max-h-64 space-y-2 overflow-auto rounded-md border border-border p-3">
                    {loadingComments && <p className="text-xs text-muted-foreground">Loading replies...</p>}
                    {!loadingComments && comments.length === 0 && (
                      <p className="text-xs text-muted-foreground">No replies yet.</p>
                    )}
                    {!loadingComments &&
                      comments.map((comment) => (
                        <div key={comment.id} className="space-y-1 rounded-md border border-border p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-foreground">
                              {comment.author.full_name || comment.author.email}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{relativeTime(comment.created_at)}</p>
                          </div>
                          <p className="text-xs text-foreground">{comment.body}</p>
                        </div>
                      ))}
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Reply to this annotation thread..."
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={4}
                    />
                    <Button size="sm" onClick={() => void submitReply()} disabled={savingReply || !replyBody.trim()}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {savingReply ? "Sending..." : "Send Reply"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
