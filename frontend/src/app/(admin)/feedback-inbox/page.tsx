"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds";
import { PageShell } from "@/components/layout";
import { apiFetch } from "@/lib/api-client";
import { appToast as toast } from "@/lib/toast/app-toast";
import { cn } from "@/lib/utils";

import { FeedbackDetail } from "./_components/feedback-detail";
import { FeedbackQueue } from "./_components/feedback-queue";

const VeltFeedbackComments = dynamic(
  () => import("@/components/velt/VeltFeedbackComments").then((m) => m.VeltFeedbackComments),
  { ssr: false },
);
const VeltCommentToolbar = dynamic(
  () => import("@/components/velt/VeltFeedbackComments").then((m) => m.VeltCommentToolbar),
  { ssr: false },
);
import {
  FEEDBACK_INBOX_TABS,
  LIST_SECTION_ORDER,
  STATUS_FILTERS,
  STATUS_META,
  STATUS_OPTIONS,
} from "./constants";
import {
  agentLabel,
  getAssignedAgent,
  getDispatchStatus,
  notifyFeedbackInboxFailure,
  toDisplayStatus,
} from "./helpers";
import type {
  AgentTarget,
  DisplayStatus,
  FeedbackInboxTab,
  FeedbackItem,
  StatusFilter,
} from "./types";

export default function FeedbackInboxPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedbackInboxTab>("issues");
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingToGitHub, setSendingToGitHub] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const listPanelRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  function showDetailOnMobileOnly() {
    const isMobileViewport =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches;
    setMobileShowDetail(isMobileViewport);
  }

  const dispatchScoped = useCallback(
    (list: FeedbackItem[]) =>
      filter === "dispatched"
        ? list.filter(
            (item) =>
              getDispatchStatus(item) === "dispatched" ||
              getAssignedAgent(item) !== null,
          )
        : list,
    [filter],
  );

  const issueItems = useMemo(
    () =>
      dispatchScoped(
        items.filter((item) => item.request_type !== "feature_request"),
      ),
    [items, dispatchScoped],
  );
  const featureRequestItems = useMemo(
    () =>
      dispatchScoped(
        items.filter((item) => item.request_type === "feature_request"),
      ),
    [items, dispatchScoped],
  );

  const visibleItems =
    activeTab === "feature_requests" ? featureRequestItems : issueItems;
  const currentTabLabel =
    FEEDBACK_INBOX_TABS.find((tab) => tab.value === activeTab)?.label ?? "Issues";
  const selected = useMemo(
    () => visibleItems.find((i) => i.id === selectedId) ?? null,
    [visibleItems, selectedId],
  );
  const currentFilterLabel =
    STATUS_FILTERS.find((statusFilter) => statusFilter.value === filter)?.label ??
    filter.replace("_", " ");

  // ---- Fetch ----
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        if (filter === "open") {
          params.set("status", "open,submitted,github_failed");
        } else if (filter === "in_progress") {
          params.set(
            "status",
            "in_progress,triaged,diagnosing,fixing,verifying,in_review",
          );
        } else if (filter === "dispatched") {
          params.set(
            "status",
            "open,github_failed,submitted,in_progress,triaged,diagnosing,fixing,verifying,in_review,deferred,resolved,closed",
          );
        } else if (filter === "deferred") {
          params.set("status", "deferred");
        } else if (filter === "resolved") {
          params.set("status", "resolved,closed");
        } else {
          params.set("status", filter);
        }
      } else {
        params.set(
          "status",
          "open,github_failed,submitted,in_progress,triaged,diagnosing,fixing,verifying,in_review,deferred,resolved,closed",
        );
      }
      const data = await apiFetch<{ items?: FeedbackItem[]; total?: number }>(
        `/api/admin/feedback?${params.toString()}`,
      );
      setItems(data.items ?? []);
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "load-feedback-items",
        title: "Could not load feedback items",
        fallback: "The feedback inbox list could not be loaded.",
        error: err,
        metadata: { filter },
      });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Auto-select the most recent item when items load or current selection is invalid
  useEffect(() => {
    if (loading) return;
    if (visibleItems.length === 0) {
      if (selectedId) setSelectedId(null);
      setFocusedIndex(0);
      return;
    }
    const currentExists = selectedId && visibleItems.some((i) => i.id === selectedId);
    if (!currentExists) {
      setSelectedId(visibleItems[0].id);
      setFocusedIndex(0);
    }
  }, [loading, visibleItems, selectedId]);

  // Keep focusedIndex in sync with selectedId
  useEffect(() => {
    if (selectedId) {
      const idx = visibleItems.findIndex((i) => i.id === selectedId);
      if (idx >= 0) setFocusedIndex(idx);
    }
  }, [selectedId, visibleItems]);

  // ---- Keyboard Navigation ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (visibleItems.length === 0) return;
          const nextIdx = Math.min(focusedIndex + 1, visibleItems.length - 1);
          setFocusedIndex(nextIdx);
          setSelectedId(visibleItems[nextIdx].id);
          const listEl = listPanelRef.current;
          if (listEl) {
            const buttons = listEl.querySelectorAll("[data-feedback-item]");
            buttons[nextIdx]?.scrollIntoView({ block: "nearest" });
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (visibleItems.length === 0) return;
          const prevIdx = Math.max(focusedIndex - 1, 0);
          setFocusedIndex(prevIdx);
          setSelectedId(visibleItems[prevIdx].id);
          const listEl = listPanelRef.current;
          if (listEl) {
            const buttons = listEl.querySelectorAll("[data-feedback-item]");
            buttons[prevIdx]?.scrollIntoView({ block: "nearest" });
          }
          break;
        }
        case "Enter": {
          if (visibleItems.length === 0) return;
          setSelectedId(visibleItems[focusedIndex].id);
          showDetailOnMobileOnly();
          break;
        }
        case "Escape": {
          setMobileShowDetail(false);
          break;
        }
        case "c": {
          e.preventDefault();
          commentInputRef.current?.focus();
          break;
        }
        case "g": {
          if (selected?.github_issue_url) {
            window.open(selected.github_issue_url, "_blank", "noopener,noreferrer");
          }
          break;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visibleItems, focusedIndex, selected]);

  // ---- Update status ----
  async function updateStatus(id: string, status: DisplayStatus) {
    setUpdatingId(id);
    try {
      await apiFetch("/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      const statusLabel =
        STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
      toast.success(`Marked as ${statusLabel}`);
      fetchItems();
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "update-feedback-status",
        title: "Could not update status",
        fallback: "The feedback item status could not be updated.",
        error: err,
        metadata: { feedbackId: id, status },
      });
    } finally {
      setUpdatingId(null);
    }
  }

  // ---- Send to GitHub ----
  async function sendToGitHub(id: string) {
    setSendingToGitHub(true);
    try {
      const data = await apiFetch<{ githubIssue?: { number?: number } }>(
        "/api/admin/feedback",
        {
          method: "PUT",
          body: JSON.stringify({ id }),
        },
      );
      toast.success(`Created GitHub issue #${data.githubIssue?.number ?? ""}`);
      fetchItems();
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "send-feedback-to-github",
        title: "Could not send to GitHub",
        fallback: "The feedback item could not be sent to GitHub.",
        error: err,
        metadata: { feedbackId: id },
      });
    } finally {
      setSendingToGitHub(false);
    }
  }

  // ---- Dispatch to agent ----
  async function dispatchToAgent(id: string, target: AgentTarget) {
    setDispatchingId(id);
    try {
      const data = await apiFetch<{
        cliCommand?: string;
        githubIssue?: { number?: number; url?: string } | null;
        trigger?: "github" | "metadata_queue";
      }>("/api/admin/feedback/dispatch", {
        method: "POST",
        body: JSON.stringify({ id, target, markInProgress: true }),
      });

      if (data.cliCommand) {
        try {
          await navigator.clipboard.writeText(data.cliCommand);
        } catch (clipboardError) {
          notifyFeedbackInboxFailure({
            operation: "copy-dispatch-command",
            title: "Dispatch succeeded, but command could not be copied",
            fallback: "Dispatch succeeded, but the command could not be copied.",
            error: clipboardError,
            metadata: { feedbackId: id, target },
          });
        }
      }

      const triggerLabel = data.trigger === "github" ? "GitHub" : "dispatch queue";
      const issueLabel = data.githubIssue?.number
        ? ` #${data.githubIssue.number}`
        : "";
      toast.success(`Dispatched to ${agentLabel(target)}`, {
        description: `${triggerLabel}${issueLabel}`,
      });
      setFilter("dispatched");
      setSelectedId(id);
      fetchItems();
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "dispatch-feedback-agent",
        title: `Could not dispatch to ${agentLabel(target)}`,
        fallback: "The feedback item could not be queued for agent work.",
        error: err,
        metadata: { feedbackId: id, target },
      });
    } finally {
      setDispatchingId(null);
    }
  }

  // ---- Delete ----
  async function deleteItem(id: string) {
    const previousItems = items;
    const previousSelectedId = selectedId;
    const previousMobileShowDetail = mobileShowDetail;

    setDeletingId(id);
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setMobileShowDetail(false);
    }

    try {
      await apiFetch("/api/admin/feedback", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      toast.success("Feedback item deleted");
      fetchItems();
    } catch (err) {
      setItems(previousItems);
      setSelectedId(previousSelectedId);
      setMobileShowDetail(previousMobileShowDetail);
      notifyFeedbackInboxFailure({
        operation: "delete-feedback-item",
        title: "Could not delete feedback item",
        fallback: "The feedback item could not be deleted.",
        error: err,
        metadata: { feedbackId: id },
      });
    } finally {
      setDeletingId(null);
    }
  }

  function selectItem(id: string) {
    setSelectedId(id);
    showDetailOnMobileOnly();
  }

  function handleMobileBack() {
    setMobileShowDetail(false);
  }

  const listSections = useMemo(() => {
    if (filter === "dispatched") {
      const grouped = new Map<DisplayStatus, FeedbackItem[]>(
        LIST_SECTION_ORDER.map((status) => [status, []]),
      );
      for (const item of visibleItems) {
        const status = toDisplayStatus(item.status);
        grouped.get(status)?.push(item);
      }
      return LIST_SECTION_ORDER.map((status) => ({
        status,
        label: STATUS_META[status].label,
        items: grouped.get(status) ?? [],
      })).filter((section) => section.items.length > 0);
    }

    if (filter !== "all") {
      return visibleItems.length > 0
        ? [
            {
              status: filter as DisplayStatus,
              label: STATUS_META[filter as DisplayStatus].label,
              items: visibleItems,
            },
          ]
        : [];
    }

    const grouped = new Map<DisplayStatus, FeedbackItem[]>(
      LIST_SECTION_ORDER.map((status) => [status, []]),
    );

    for (const item of visibleItems) {
      const status = toDisplayStatus(item.status);
      grouped.get(status)?.push(item);
    }

    return LIST_SECTION_ORDER.map((status) => ({
      status,
      label: STATUS_META[status].label,
      items: grouped.get(status) ?? [],
    })).filter((section) => section.items.length > 0);
  }, [visibleItems, filter]);

  const handleInboxTabClick = useCallback((value: string) => {
    setActiveTab(value as FeedbackInboxTab);
    setSelectedId(null);
    setMobileShowDetail(false);
    setFocusedIndex(0);
  }, []);

  const handleFilterTabClick = useCallback((value: string) => {
    setFilter(value as StatusFilter);
    setSelectedId(null);
    setMobileShowDetail(false);
  }, []);

  return (
    <PageShell
      variant="dashboard"
      title="Feedback Inbox"
      showHeader={false}
      className="bg-background px-0! py-0!"
      contentClassName="space-y-0 pt-0 pb-0"
      fillHeight
      description="Review feedback, assign tools, and sync issues to GitHub."
    >
      <VeltFeedbackComments
        documentId="feedback-inbox"
        documentName="Feedback Inbox"
      />
      <div className="flex h-full min-h-0 bg-background">
        {mobileShowDetail && selected ? (
          <div className="flex flex-1 flex-col overflow-y-auto bg-background lg:hidden">
            <FeedbackDetail
              item={selected}
              updatingId={updatingId}
              sendingToGitHub={sendingToGitHub}
              dispatchingId={dispatchingId}
              onUpdateStatus={updateStatus}
              onSendToGitHub={sendToGitHub}
              onDispatchToAgent={dispatchToAgent}
              deletingId={deletingId}
              onDelete={deleteItem}
              onBack={handleMobileBack}
              commentInputRef={commentInputRef}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            <div
              ref={listPanelRef}
              className={cn(
                "min-w-0 overflow-hidden flex flex-col bg-muted/35",
                mobileShowDetail ? "hidden lg:flex" : "flex",
                "w-full lg:w-112 lg:max-w-lg lg:shrink-0",
              )}
            >
              <div className="space-y-4 px-4 pb-4 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div
                    className="flex min-w-0 items-center gap-3"
                    aria-label="Feedback type"
                  >
                    {FEEDBACK_INBOX_TABS.map((tab) => {
                      const count =
                        tab.value === "feature_requests"
                          ? featureRequestItems.length
                          : issueItems.length;
                      const selected = activeTab === tab.value;
                      return (
                        <Button
                          key={tab.value}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInboxTabClick(tab.value)}
                          aria-pressed={selected}
                          className={cn(
                            "h-auto rounded-none px-0 py-0 text-sm font-medium hover:bg-transparent",
                            selected
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span>{tab.label}</span>
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {count}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                  <VeltCommentToolbar />
                </div>
                <Select value={filter} onValueChange={handleFilterTabClick}>
                  <SelectTrigger
                    aria-label="Filter feedback status"
                    size="sm"
                    className="h-8 w-full bg-background text-sm shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map((statusFilter) => (
                      <SelectItem
                        key={statusFilter.value}
                        value={statusFilter.value}
                      >
                        {statusFilter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 overflow-y-auto">
                <FeedbackQueue
                  sections={listSections}
                  items={visibleItems}
                  selectedId={selectedId}
                  loading={loading}
                  currentFilterLabel={`${currentFilterLabel} ${currentTabLabel}`}
                  onSelect={selectItem}
                  onUpdateStatus={updateStatus}
                  onSendToGitHub={sendToGitHub}
                  onDelete={deleteItem}
                />
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 overflow-y-auto bg-background lg:block">
              {!selected && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Select an item to review
                  </p>
                </div>
              )}

              {selected && (
                <FeedbackDetail
                  item={selected}
                  updatingId={updatingId}
                  sendingToGitHub={sendingToGitHub}
                  dispatchingId={dispatchingId}
                  deletingId={deletingId}
                  onUpdateStatus={updateStatus}
                  onSendToGitHub={sendToGitHub}
                  onDispatchToAgent={dispatchToAgent}
                  onDelete={deleteItem}
                  commentInputRef={commentInputRef}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
