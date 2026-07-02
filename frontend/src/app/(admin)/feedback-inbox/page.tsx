"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
import {
  ArrowUpDown,
  Check,
  Columns3,
  Filter,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  X,
} from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds";
import { PageShell } from "@/components/layout";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SplitPage, SplitPageFrame, useSplitPage } from "@/components/ui/split-page";
import {
  BoardView,
  type BoardColumnDefinition,
} from "@/components/tables/unified/board-view";
import { ExpandableSearch } from "@/components/tables/unified/table-toolbar";
import {
  displayAdminFeedbackTitle,
  isCommentRedundantWithTitle,
} from "@/lib/admin-feedback/title";
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
  FEEDBACK_STATUS_TABS,
  FEEDBACK_INBOX_TABS,
  STATUS_FILTERS,
  STATUS_META,
  STATUS_OPTIONS,
} from "./constants";
import {
  getAssignedAgent,
  getDispatchStatus,
  notifyFeedbackInboxFailure,
  toDisplayStatus,
  toolLabelFromPath,
} from "./helpers";
import type {
  DisplayStatus,
  FeedbackInboxTab,
  FeedbackItem,
  StatusFilter,
} from "./types";

const ACTIVE_EXCLUDED_STATUS_QUERY = "resolved,closed,deferred,archived";
const ALL_STATUS_QUERY =
  "open,github_failed,submitted,in_progress,triaged,diagnosing,fixing,verifying,in_review,pr_created,deferred,resolved,closed";
const FEEDBACK_LAYOUT_STORAGE_KEY = "alleato-feedback-inbox-layout";
const FEEDBACK_VIEW_STORAGE_KEY = "alleato-feedback-inbox-view";
const FEEDBACK_LEFT_DEFAULT = 456;
const FEEDBACK_LEFT_MIN = 320;
const FEEDBACK_LEFT_MAX = 640;

type FeedbackSortValue =
  | "newest"
  | "oldest"
  | "priority"
  | "source"
  | "status";
type FeedbackDateFilter = "all" | "today" | "7d" | "30d" | "older";
type FeedbackViewMode = "split" | "board";

const FEEDBACK_SORT_OPTIONS: {
  value: FeedbackSortValue;
  label: string;
}[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "priority", label: "Priority first" },
  { value: "source", label: "Source A-Z" },
  { value: "status", label: "Status" },
];
const FEEDBACK_DATE_FILTERS: {
  value: FeedbackDateFilter;
  label: string;
}[] = [
  { value: "all", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "older", label: "Older than 30 days" },
];
const FEEDBACK_BOARD_COLUMNS: BoardColumnDefinition[] = STATUS_OPTIONS
  .filter((option) => option.value !== "archived")
  .map((option) => ({
    id: option.value,
    label: option.label,
    emptyLabel: `No ${option.label.toLowerCase()} feedback`,
  }));

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function loadFeedbackLayout() {
  const fallback = {
    leftWidth: FEEDBACK_LEFT_DEFAULT,
    leftCollapsed: false,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(FEEDBACK_LAYOUT_STORAGE_KEY);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<typeof fallback>;
    return {
      leftWidth:
        typeof parsed.leftWidth === "number"
          ? clampNumber(parsed.leftWidth, FEEDBACK_LEFT_MIN, FEEDBACK_LEFT_MAX)
          : fallback.leftWidth,
      leftCollapsed:
        typeof parsed.leftCollapsed === "boolean"
          ? parsed.leftCollapsed
          : fallback.leftCollapsed,
    };
  } catch {
    return fallback;
  }
}

function saveFeedbackLayout(preference: {
  leftWidth: number;
  leftCollapsed: boolean;
}) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    FEEDBACK_LAYOUT_STORAGE_KEY,
    JSON.stringify(preference),
  );
}

function loadFeedbackViewMode(): FeedbackViewMode {
  if (typeof window === "undefined") return "split";
  return window.localStorage.getItem(FEEDBACK_VIEW_STORAGE_KEY) === "board"
    ? "board"
    : "split";
}

function saveFeedbackViewMode(viewMode: FeedbackViewMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FEEDBACK_VIEW_STORAGE_KEY, viewMode);
}

function feedbackStatusQuery(filter: StatusFilter): string | null {
  if (filter === "all") return ALL_STATUS_QUERY;
  if (filter === "active") return null;
  if (filter === "open") {
    return "open,github_failed,submitted,in_progress,triaged,diagnosing,fixing,verifying,in_review,pr_created";
  }
  if (filter === "in_progress")
    return "in_progress,triaged,diagnosing,fixing,verifying,in_review,pr_created";
  if (filter === "dispatched") return ALL_STATUS_QUERY;
  if (filter === "deferred") return "deferred";
  if (filter === "resolved") return "resolved,closed";
  return filter;
}

function feedbackExcludedStatusQuery(filter: StatusFilter): string | null {
  if (filter === "active") return ACTIVE_EXCLUDED_STATUS_QUERY;
  return null;
}

function sortRank(item: FeedbackItem): number {
  if (item.severity === "high") return 0;
  if (item.severity === "medium") return 1;
  if (item.severity === "low") return 2;
  return 3;
}

function itemToolLabel(item: FeedbackItem): string {
  return toolLabelFromPath(item.page_path) ?? item.page_title ?? item.page_path;
}

function feedbackBoardColumnId(item: FeedbackItem): DisplayStatus {
  return toDisplayStatus(item.status);
}

function matchesDateFilter(item: FeedbackItem, filter: FeedbackDateFilter): boolean {
  if (filter === "all") return true;

  const createdAt = new Date(item.created_at).getTime();
  const now = Date.now();
  const ageMs = now - createdAt;
  const dayMs = 86_400_000;

  if (filter === "today") {
    return new Date(item.created_at).toDateString() === new Date().toDateString();
  }
  if (filter === "7d") return ageMs <= 7 * dayMs;
  if (filter === "30d") return ageMs <= 30 * dayMs;
  return ageMs > 30 * dayMs;
}

export default function FeedbackInboxPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedbackInboxTab>("all");
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [dateFilter, setDateFilter] = useState<FeedbackDateFilter>("all");
  const [toolFilter, setToolFilter] = useState("all");
  const [submitterFilter, setSubmitterFilter] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [sortBy, setSortBy] = useState<FeedbackSortValue>("newest");
  const [viewMode, setViewMode] = useState<FeedbackViewMode>("split");
  const [leftWidth, setLeftWidth] = useState(FEEDBACK_LEFT_DEFAULT);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingToGitHub, setSendingToGitHub] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const listPanelRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const preference = loadFeedbackLayout();
    setLeftWidth(preference.leftWidth);
    setLeftCollapsed(preference.leftCollapsed);
    setViewMode(loadFeedbackViewMode());
  }, []);

  useEffect(() => {
    saveFeedbackLayout({ leftWidth, leftCollapsed });
  }, [leftWidth, leftCollapsed]);

  useEffect(() => {
    saveFeedbackViewMode(viewMode);
  }, [viewMode]);

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

  const tabScopedItems =
    activeTab === "feature_requests"
      ? featureRequestItems
      : activeTab === "issues"
        ? issueItems
        : dispatchScoped(items);
  const toolOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const item of tabScopedItems) {
      const label = itemToolLabel(item);
      options.set(label, label);
    }
    return [...options.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tabScopedItems]);
  const submitterOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const item of tabScopedItems) {
      const value = item.created_by;
      const label = item.submitter?.full_name || item.submitter?.email || item.created_by;
      options.set(value, label);
    }
    return [...options.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tabScopedItems]);
  const filterScopedItems = useMemo(
    () =>
      tabScopedItems.filter((item) => {
        if (!matchesDateFilter(item, dateFilter)) return false;
        if (toolFilter !== "all" && itemToolLabel(item) !== toolFilter) return false;
        if (submitterFilter !== "all" && item.created_by !== submitterFilter) return false;
        return true;
      }),
    [dateFilter, submitterFilter, tabScopedItems, toolFilter],
  );
  const searchTerm = searchValue.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    const filtered = searchTerm
      ? filterScopedItems.filter((item) => {
          const submitter =
            item.submitter?.full_name || item.submitter?.email || item.created_by;
          const fields = [
            item.title,
            item.comment,
            item.page_title ?? "",
            item.page_path,
            item.page_url,
            item.target_text ?? "",
            submitter,
            item.github_issue_number ? `#${item.github_issue_number}` : "",
          ];
          return fields.some((field) => field.toLowerCase().includes(searchTerm));
        })
      : filterScopedItems;

    return [...filtered].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "priority") {
        const priorityDiff = sortRank(a) - sortRank(b);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "source") {
        const sourceA = (a.page_title || a.page_path || "").toLowerCase();
        const sourceB = (b.page_title || b.page_path || "").toLowerCase();
        return sourceA.localeCompare(sourceB);
      }
      if (sortBy === "status") {
        const statusA = toDisplayStatus(a.status);
        const statusB = toDisplayStatus(b.status);
        const statusDiff = statusA.localeCompare(statusB);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filterScopedItems, searchTerm, sortBy]);
  const currentTabLabel =
    FEEDBACK_INBOX_TABS.find((tab) => tab.value === activeTab)?.label ?? "Issues";
  const selected = useMemo(
    () => visibleItems.find((i) => i.id === selectedId) ?? null,
    [visibleItems, selectedId],
  );
  const currentFilterLabel =
    STATUS_FILTERS.find((statusFilter) => statusFilter.value === filter)?.label ??
    filter.replace("_", " ");
  const activeFilterCount =
    (activeTab !== "all" ? 1 : 0) +
    (dateFilter !== "all" ? 1 : 0) +
    (toolFilter !== "all" ? 1 : 0) +
    (submitterFilter !== "all" ? 1 : 0);

  // ---- Fetch ----
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const statusQuery = feedbackStatusQuery(filter);
      const excludedStatusQuery = feedbackExcludedStatusQuery(filter);
      params.set("excludeBoardItems", "true");
      if (statusQuery) params.set("status", statusQuery);
      if (excludedStatusQuery) params.set("excludeStatus", excludedStatusQuery);
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

  // ---- Delete ----
  async function deleteItem(id: string) {
    const previousItems = items;
    const previousSelectedId = selectedId;

    setDeletingId(id);
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
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
  }

  function selectItemFromBoard(id: string) {
    setSelectedId(id);
    setViewMode("split");
  }

  const handleInboxTabClick = useCallback((value: string) => {
    setActiveTab(value as FeedbackInboxTab);
    setSelectedId(null);
    setFocusedIndex(0);
  }, []);

  const handleFilterTabClick = useCallback((value: string) => {
    setFilter(value as StatusFilter);
    setSelectedId(null);
    setFocusedIndex(0);
  }, []);

  const handleResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = leftWidth;

      function handleMove(moveEvent: MouseEvent) {
        const nextWidth = clampNumber(
          startWidth + moveEvent.clientX - startX,
          FEEDBACK_LEFT_MIN,
          FEEDBACK_LEFT_MAX,
        );
        setLeftWidth(nextWidth);
      }

      function handleUp() {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      }

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [leftWidth],
  );

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
      <SplitPageFrame
        height="fill"
        className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background"
      >
        {viewMode === "board" ? (
          <FeedbackBoardPane
            activeFilterCount={activeFilterCount}
            activeTab={activeTab}
            currentFilterLabel={currentFilterLabel}
            currentTabLabel={currentTabLabel}
            dateFilter={dateFilter}
            featureRequestCount={featureRequestItems.length}
            filter={filter}
            issueCount={issueItems.length}
            items={visibleItems}
            loading={loading}
            searchValue={searchValue}
            selectedId={selectedId}
            sortBy={sortBy}
            submitterFilter={submitterFilter}
            submitterOptions={submitterOptions}
            toolFilter={toolFilter}
            toolOptions={toolOptions}
            totalCount={dispatchScoped(items).length}
            onDateFilterChange={setDateFilter}
            onFilterChange={handleFilterTabClick}
            onInboxTabChange={handleInboxTabClick}
            onSearchChange={setSearchValue}
            onSelect={selectItemFromBoard}
            onSortChange={setSortBy}
            onSubmitterFilterChange={setSubmitterFilter}
            onToolFilterChange={setToolFilter}
            onViewModeChange={setViewMode}
            viewMode={viewMode}
          />
        ) : (
          <SplitPage
            variant="two-column"
            breakpoint="lg"
            defaultIsOpen={!selected}
            className="min-h-0 flex-1"
            firstPaneClassName={leftCollapsed ? "lg:w-14" : "lg:w-auto"}
            secondPaneClassName="bg-background"
          >
            <FeedbackListPane
              activeFilterCount={activeFilterCount}
              activeTab={activeTab}
              currentFilterLabel={currentFilterLabel}
              currentTabLabel={currentTabLabel}
              dateFilter={dateFilter}
              deletingId={deletingId}
              featureRequestCount={featureRequestItems.length}
              filter={filter}
              focusedIndex={focusedIndex}
              issueCount={issueItems.length}
              items={visibleItems}
              leftCollapsed={leftCollapsed}
              leftWidth={leftWidth}
              listPanelRef={listPanelRef}
              loading={loading}
              searchValue={searchValue}
              selectedId={selectedId}
              sortBy={sortBy}
              submitterFilter={submitterFilter}
              submitterOptions={submitterOptions}
              toolFilter={toolFilter}
              toolOptions={toolOptions}
              totalCount={dispatchScoped(items).length}
              viewMode={viewMode}
              onDelete={deleteItem}
              onDateFilterChange={setDateFilter}
              onFilterChange={handleFilterTabClick}
              onInboxTabChange={handleInboxTabClick}
              onResizeStart={handleResizeStart}
              onSearchChange={setSearchValue}
              onSelect={selectItem}
              onSendToGitHub={sendToGitHub}
              onSortChange={setSortBy}
              onSubmitterFilterChange={setSubmitterFilter}
              onToggleCollapsed={() => setLeftCollapsed((value) => !value)}
              onToolFilterChange={setToolFilter}
              onUpdateStatus={updateStatus}
              onViewModeChange={setViewMode}
            />
            <FeedbackDetailPane
              commentInputRef={commentInputRef}
              deletingId={deletingId}
              item={selected}
              sendingToGitHub={sendingToGitHub}
              updatingId={updatingId}
              onDelete={deleteItem}
              onSendToGitHub={sendToGitHub}
              onUpdateStatus={updateStatus}
              onRefresh={fetchItems}
            />
          </SplitPage>
        )}
      </SplitPageFrame>
    </PageShell>
  );
}

function FeedbackListPane({
  activeFilterCount,
  activeTab,
  currentFilterLabel,
  currentTabLabel,
  dateFilter,
  deletingId,
  featureRequestCount,
  filter,
  issueCount,
  items,
  leftCollapsed,
  leftWidth,
  listPanelRef,
  loading,
  searchValue,
  selectedId,
  sortBy,
  submitterFilter,
  submitterOptions,
  toolFilter,
  toolOptions,
  totalCount,
  viewMode,
  onDelete,
  onDateFilterChange,
  onFilterChange,
  onInboxTabChange,
  onResizeStart,
  onSearchChange,
  onSelect,
  onSendToGitHub,
  onSortChange,
  onSubmitterFilterChange,
  onToggleCollapsed,
  onToolFilterChange,
  onUpdateStatus,
  onViewModeChange,
}: {
  activeFilterCount: number;
  activeTab: FeedbackInboxTab;
  currentFilterLabel: string;
  currentTabLabel: string;
  dateFilter: FeedbackDateFilter;
  deletingId: string | null;
  featureRequestCount: number;
  filter: StatusFilter;
  focusedIndex: number;
  issueCount: number;
  items: FeedbackItem[];
  leftCollapsed: boolean;
  leftWidth: number;
  listPanelRef: RefObject<HTMLDivElement | null>;
  loading: boolean;
  searchValue: string;
  selectedId: string | null;
  sortBy: FeedbackSortValue;
  submitterFilter: string;
  submitterOptions: { value: string; label: string }[];
  toolFilter: string;
  toolOptions: { value: string; label: string }[];
  totalCount: number;
  viewMode: FeedbackViewMode;
  onDelete: (id: string) => void;
  onDateFilterChange: (value: FeedbackDateFilter) => void;
  onFilterChange: (value: string) => void;
  onInboxTabChange: (value: string) => void;
  onResizeStart: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onSendToGitHub: (id: string) => void;
  onSortChange: (value: FeedbackSortValue) => void;
  onSubmitterFilterChange: (value: string) => void;
  onToggleCollapsed: () => void;
  onToolFilterChange: (value: string) => void;
  onUpdateStatus: (id: string, status: DisplayStatus) => void;
  onViewModeChange: (value: FeedbackViewMode) => void;
}) {
  const splitPage = useSplitPage();

  function handleSelect(id: string) {
    onSelect(id);
    if (!splitPage.isDesktop) splitPage.onClose();
  }

  if (leftCollapsed && splitPage.isDesktop) {
    return (
      <div className="flex h-full w-14 flex-col items-center border-r border-border/70 bg-muted/30 py-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground"
          onClick={onToggleCollapsed}
          aria-label="Expand feedback list"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={listPanelRef}
      className="relative flex h-full min-h-0 w-full flex-col border-r border-border/70 bg-muted/30 lg:w-[var(--feedback-left-width)]"
      style={{ "--feedback-left-width": `${leftWidth}px` } as CSSProperties}
    >
      <div className="bg-background/90 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold leading-7 text-foreground">
              Feedback
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 rounded-full text-muted-foreground lg:inline-flex"
              onClick={onToggleCollapsed}
              aria-label="Collapse feedback list"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            <FeedbackViewMenu
              value={viewMode}
              onValueChange={onViewModeChange}
            />
            <FeedbackFilterPopover
              activeCount={activeFilterCount}
              activeTab={activeTab}
              dateFilter={dateFilter}
              featureRequestCount={featureRequestCount}
              issueCount={issueCount}
              submitterFilter={submitterFilter}
              submitterOptions={submitterOptions}
              toolFilter={toolFilter}
              toolOptions={toolOptions}
              totalCount={totalCount}
              onDateFilterChange={onDateFilterChange}
              onInboxTabChange={onInboxTabChange}
              onSubmitterFilterChange={onSubmitterFilterChange}
              onToolFilterChange={onToolFilterChange}
            />
            <ExpandableSearch
              value={searchValue}
              onChange={onSearchChange}
              placeholder="Search feedback"
              ariaLabel="Search feedback"
            />
            <FeedbackSortPopover
              sortBy={sortBy}
              onSortChange={onSortChange}
            />
            <VeltCommentToolbar />
          </div>
        </div>
        <FeedbackStatusTabs
          value={filter}
          onValueChange={onFilterChange}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <FeedbackQueue
          items={items}
          selectedId={selectedId}
          loading={loading}
          currentFilterLabel={`${currentFilterLabel} ${currentTabLabel}`}
          onSelect={handleSelect}
          onUpdateStatus={onUpdateStatus}
          onSendToGitHub={onSendToGitHub}
          onDelete={onDelete}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Resize feedback list"
        className="absolute right-0 top-0 hidden h-full w-1 translate-x-1/2 cursor-col-resize rounded-none bg-transparent p-0 transition-colors hover:bg-primary/40 lg:block"
        onMouseDown={onResizeStart}
      />
    </div>
  );
}

function FeedbackBoardPane({
  activeFilterCount,
  activeTab,
  currentFilterLabel,
  currentTabLabel,
  dateFilter,
  featureRequestCount,
  filter,
  issueCount,
  items,
  loading,
  searchValue,
  selectedId,
  sortBy,
  submitterFilter,
  submitterOptions,
  toolFilter,
  toolOptions,
  totalCount,
  viewMode,
  onDateFilterChange,
  onFilterChange,
  onInboxTabChange,
  onSearchChange,
  onSelect,
  onSortChange,
  onSubmitterFilterChange,
  onToolFilterChange,
  onViewModeChange,
}: {
  activeFilterCount: number;
  activeTab: FeedbackInboxTab;
  currentFilterLabel: string;
  currentTabLabel: string;
  dateFilter: FeedbackDateFilter;
  featureRequestCount: number;
  filter: StatusFilter;
  issueCount: number;
  items: FeedbackItem[];
  loading: boolean;
  searchValue: string;
  selectedId: string | null;
  sortBy: FeedbackSortValue;
  submitterFilter: string;
  submitterOptions: { value: string; label: string }[];
  toolFilter: string;
  toolOptions: { value: string; label: string }[];
  totalCount: number;
  viewMode: FeedbackViewMode;
  onDateFilterChange: (value: FeedbackDateFilter) => void;
  onFilterChange: (value: string) => void;
  onInboxTabChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onSortChange: (value: FeedbackSortValue) => void;
  onSubmitterFilterChange: (value: string) => void;
  onToolFilterChange: (value: string) => void;
  onViewModeChange: (value: FeedbackViewMode) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 bg-background/90 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold leading-7 text-foreground">
              Feedback
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <FeedbackViewMenu
              value={viewMode}
              onValueChange={onViewModeChange}
            />
            <FeedbackFilterPopover
              activeCount={activeFilterCount}
              activeTab={activeTab}
              dateFilter={dateFilter}
              featureRequestCount={featureRequestCount}
              issueCount={issueCount}
              submitterFilter={submitterFilter}
              submitterOptions={submitterOptions}
              toolFilter={toolFilter}
              toolOptions={toolOptions}
              totalCount={totalCount}
              onDateFilterChange={onDateFilterChange}
              onInboxTabChange={onInboxTabChange}
              onSubmitterFilterChange={onSubmitterFilterChange}
              onToolFilterChange={onToolFilterChange}
            />
            <ExpandableSearch
              value={searchValue}
              onChange={onSearchChange}
              placeholder="Search feedback"
              ariaLabel="Search feedback"
            />
            <FeedbackSortPopover
              sortBy={sortBy}
              onSortChange={onSortChange}
            />
            <VeltCommentToolbar />
          </div>
        </div>
        <FeedbackStatusTabs
          value={filter}
          onValueChange={onFilterChange}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full min-h-48 items-center justify-center px-6 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No feedback items</p>
              <p className="text-sm text-muted-foreground">
                No {`${currentFilterLabel} ${currentTabLabel}`.toLowerCase()} items found.
              </p>
            </div>
          </div>
        ) : (
          <BoardView
            columns={FEEDBACK_BOARD_COLUMNS}
            items={items}
            getItemId={(item) => item.id}
            getColumnId={feedbackBoardColumnId}
            renderCard={(item) => (
              <FeedbackBoardCard
                item={item}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            )}
            className="min-w-full"
            columnsClassName="min-w-72"
          />
        )}
      </div>
    </div>
  );
}

function FeedbackBoardCard({
  item,
  selectedId,
  onSelect,
}: {
  item: FeedbackItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const displayStatus = toDisplayStatus(item.status);
  const meta = STATUS_META[displayStatus];
  const title = displayAdminFeedbackTitle({
    storedTitle: item.title,
    requestType: item.request_type,
    comment: item.comment,
    targetText: item.target_text,
    pageTitle: item.page_title,
  });
  const sourceLabel = toolLabelFromPath(item.page_path) ?? item.page_title ?? item.page_path;
  const showCommentPreview = !isCommentRedundantWithTitle(title, item.comment);

  return (
    <Button
      type="button"
      variant="ghost"
      size="default"
      onClick={() => onSelect(item.id)}
      className={cn(
        "h-auto w-full min-w-0 flex-col items-start justify-start rounded-md border border-border/60 bg-background p-3 text-left shadow-none hover:bg-muted/40",
        selectedId === item.id && "border-primary/40 bg-primary/5",
      )}
    >
      <span className="flex w-full min-w-0 items-start justify-between gap-3">
        <span className="line-clamp-2 min-w-0 text-[13px] font-semibold leading-snug text-foreground">
          {title}
        </span>
        <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
          {relativeTime(item.created_at)}
        </span>
      </span>
      {showCommentPreview ? (
        <span className="mt-1 line-clamp-2 text-[12px] font-normal leading-snug text-muted-foreground">
          {item.comment}
        </span>
      ) : null}
      <span className="mt-3 flex w-full min-w-0 items-center gap-2 text-[11px] leading-4 text-muted-foreground">
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", meta.dotClassName)}
          aria-label={meta.label}
          title={meta.label}
        />
        <span className="min-w-0 shrink truncate">{submitterLabel(item)}</span>
        <span aria-hidden className="text-border">
          /
        </span>
        {item.severity === "high" ? (
          <>
            <span className="shrink-0 font-medium text-status-error">
              High priority
            </span>
            <span aria-hidden className="text-border">
              /
            </span>
          </>
        ) : null}
        <span className="min-w-0 truncate">{sourceLabel}</span>
      </span>
    </Button>
  );
}

function FeedbackViewMenu({
  value,
  onValueChange,
}: {
  value: FeedbackViewMode;
  onValueChange: (value: FeedbackViewMode) => void;
}) {
  const TriggerIcon = value === "board" ? Columns3 : PanelRight;
  const options: {
    value: FeedbackViewMode;
    label: string;
    icon: typeof PanelRight;
  }[] = [
    { value: "split", label: "Split page", icon: PanelRight },
    { value: "board", label: "Board", icon: Columns3 },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Change feedback view"
          className="h-8 w-8 rounded-full text-muted-foreground shadow-none"
        >
          <TriggerIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onValueChange(option.value)}
              className={cn(
                "gap-2",
                value === option.value
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
              {value === option.value ? (
                <Check className="ml-auto h-3.5 w-3.5" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FeedbackFilterPopover({
  activeCount,
  activeTab,
  dateFilter,
  featureRequestCount,
  issueCount,
  submitterFilter,
  submitterOptions,
  toolFilter,
  toolOptions,
  totalCount,
  onDateFilterChange,
  onInboxTabChange,
  onSubmitterFilterChange,
  onToolFilterChange,
}: {
  activeCount: number;
  activeTab: FeedbackInboxTab;
  dateFilter: FeedbackDateFilter;
  featureRequestCount: number;
  issueCount: number;
  submitterFilter: string;
  submitterOptions: { value: string; label: string }[];
  toolFilter: string;
  toolOptions: { value: string; label: string }[];
  totalCount: number;
  onDateFilterChange: (value: FeedbackDateFilter) => void;
  onInboxTabChange: (value: string) => void;
  onSubmitterFilterChange: (value: string) => void;
  onToolFilterChange: (value: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Filter feedback"
          className={cn(
            "relative h-8 w-8 rounded-full text-muted-foreground shadow-none",
            activeCount > 0 && "text-foreground",
          )}
        >
          <Filter className="h-4 w-4" />
          {activeCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <FeedbackScopePanel
          activeCount={activeCount}
          activeTab={activeTab}
          dateFilter={dateFilter}
          featureRequestCount={featureRequestCount}
          issueCount={issueCount}
          submitterFilter={submitterFilter}
          submitterOptions={submitterOptions}
          toolFilter={toolFilter}
          toolOptions={toolOptions}
          totalCount={totalCount}
          onClear={() => {
            onInboxTabChange("all");
            onDateFilterChange("all");
            onToolFilterChange("all");
            onSubmitterFilterChange("all");
          }}
          onDateFilterChange={onDateFilterChange}
          onSubmitterFilterChange={onSubmitterFilterChange}
          onToolFilterChange={onToolFilterChange}
          onTypeChange={onInboxTabChange}
        />
      </PopoverContent>
    </Popover>
  );
}

function FeedbackScopePanel({
  activeCount,
  activeTab,
  dateFilter,
  featureRequestCount,
  issueCount,
  submitterFilter,
  submitterOptions,
  toolFilter,
  toolOptions,
  totalCount,
  onClear,
  onDateFilterChange,
  onSubmitterFilterChange,
  onToolFilterChange,
  onTypeChange,
}: {
  activeCount: number;
  activeTab: FeedbackInboxTab;
  dateFilter: FeedbackDateFilter;
  featureRequestCount: number;
  issueCount: number;
  submitterFilter: string;
  submitterOptions: { value: string; label: string }[];
  toolFilter: string;
  toolOptions: { value: string; label: string }[];
  totalCount: number;
  onClear: () => void;
  onDateFilterChange: (value: FeedbackDateFilter) => void;
  onSubmitterFilterChange: (value: string) => void;
  onToolFilterChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Filters</span>
        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Type</span>
        <div className="inline-flex w-full items-center rounded-md border border-border/60 bg-muted/40 p-0.5">
          {FEEDBACK_INBOX_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? totalCount
                : tab.value === "feature_requests"
                  ? featureRequestCount
                  : issueCount;
            return (
              <Button
                key={tab.value}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onTypeChange(tab.value)}
                className={cn(
                  "h-7 flex-1 rounded-sm px-2 text-xs shadow-none",
                  activeTab === tab.value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-transparent hover:text-foreground",
                )}
              >
                <span className="truncate">{tab.label}</span>
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Submitted</span>
        <Select
          value={dateFilter}
          onValueChange={(value) => onDateFilterChange(value as FeedbackDateFilter)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FEEDBACK_DATE_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Tool</span>
        <Select value={toolFilter} onValueChange={onToolFilterChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Any tool" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any tool</SelectItem>
            {toolOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Submitted by</span>
        <Select value={submitterFilter} onValueChange={onSubmitterFilterChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Anyone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Anyone</SelectItem>
            {submitterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

    </div>
  );
}

function FeedbackStatusTabs({
  value,
  onValueChange,
}: {
  value: StatusFilter;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-4 border-b border-border/70">
      {FEEDBACK_STATUS_TABS.map((tab) => (
        <Button
          key={tab.value}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onValueChange(tab.value)}
          className={cn(
            "h-5 rounded-none px-0 text-[11px] font-medium shadow-none",
            value === tab.value
              ? "text-foreground shadow-[inset_0_-1px_0_hsl(var(--primary))]"
              : "text-muted-foreground hover:bg-transparent hover:text-foreground",
          )}
        >
          <span className="truncate">{tab.label}</span>
        </Button>
      ))}
    </div>
  );
}

function FeedbackSortPopover({
  sortBy,
  onSortChange,
}: {
  sortBy: FeedbackSortValue;
  onSortChange: (value: FeedbackSortValue) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Sort feedback"
          className="h-8 w-8 rounded-full text-muted-foreground shadow-none"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        {FEEDBACK_SORT_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSortChange(option.value)}
            className={cn(
              "flex h-auto w-full justify-start gap-2 rounded-sm px-3 py-1.5 text-sm shadow-none transition-colors hover:bg-muted",
              sortBy === option.value
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {sortBy === option.value ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : null}
            <span className={cn(sortBy !== option.value && "pl-[1.375rem]")}>
              {option.label}
            </span>
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function FeedbackDetailPane({
  commentInputRef,
  deletingId,
  item,
  sendingToGitHub,
  updatingId,
  onDelete,
  onSendToGitHub,
  onUpdateStatus,
  onRefresh,
}: {
  commentInputRef: RefObject<HTMLTextAreaElement | null>;
  deletingId: string | null;
  item: FeedbackItem | null;
  sendingToGitHub: boolean;
  updatingId: string | null;
  onDelete: (id: string) => void;
  onSendToGitHub: (id: string) => void;
  onUpdateStatus: (id: string, status: DisplayStatus) => void;
  onRefresh: () => void;
}) {
  const splitPage = useSplitPage();

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Select feedback to review</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background">
      <FeedbackDetail
        item={item}
        updatingId={updatingId}
        sendingToGitHub={sendingToGitHub}
        deletingId={deletingId}
        onUpdateStatus={onUpdateStatus}
        onSendToGitHub={onSendToGitHub}
        onDelete={onDelete}
        onRefresh={onRefresh}
        onBack={splitPage.isDesktop ? undefined : splitPage.onOpen}
        commentInputRef={commentInputRef}
      />
    </div>
  );
}
