"use client";

import * as React from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { Ban, Check, ChevronDown, ChevronRight, ExternalLink, Inbox, Loader2, Mail, MessageSquare, MoreVertical, Paperclip, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type TableColumn,
} from "@/components/tables/unified";
import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { useProjects } from "@/hooks/use-projects";

interface OutlookIntakeAttachment {
  id: number;
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  createdAt: string | null;
}

interface OutlookIntakeEmail {
  id: number;
  graphMessageId: string;
  mailboxUserId: string;
  documentMetadataId: string | null;
  documentStatus: string | null;
  conversationId: string | null;
  subject: string;
  fromName: string | null;
  fromEmail: string | null;
  toList: string[];
  matchStatus: string;
  assignmentMethod: string | null;
  assignmentConfidence: number | null;
  receivedAt: string | null;
  hasAttachments: boolean | null;
  webLink: string | null;
  createdAt: string | null;
  project: {
    id: number;
    name: string | null;
    projectNumber: string | null;
  } | null;
  attachments: OutlookIntakeAttachment[];
}

const columnsConfig = [
  { id: "subject", label: "Subject", defaultVisible: true, alwaysVisible: true },
  { id: "from", label: "From", defaultVisible: true },
  { id: "project", label: "Project", defaultVisible: true },
  { id: "match", label: "Status", defaultVisible: true },
  { id: "pipeline", label: "Pipeline", defaultVisible: true },
  { id: "received", label: "Date", defaultVisible: true },
  { id: "attachments", label: "Attachments", defaultVisible: true },
  { id: "mailbox", label: "Mailbox", defaultVisible: false },
];

type PipelineInfo = { label: string; variant: "success" | "warning" | "error" | "info" | "neutral" };

/** Map document_metadata.status → label + badge variant */
function pipelineStatus(email: OutlookIntakeEmail): PipelineInfo {
  if (!email.documentMetadataId) {
    return { label: "Not indexed", variant: "neutral" };
  }
  switch (email.documentStatus) {
    case "embedded":
    case "compiled":
    case "segmented":
      return { label: "Vectorized", variant: "success" };
    case "raw_ingested":
      return { label: "Pending", variant: "warning" };
    case "skipped_low_content":
      return { label: "Too short", variant: "neutral" };
    case "metadata_only":
      return { label: "Metadata only", variant: "neutral" };
    case "error":
      return { label: "Error", variant: "error" };
    default:
      return { label: "Indexed", variant: "info" };
  }
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function senderLabel(email: OutlookIntakeEmail): string {
  if (email.fromName && email.fromEmail) return `${email.fromName} <${email.fromEmail}>`;
  return email.fromName || email.fromEmail || "Unknown sender";
}


interface InlineProjectSelectProps {
  emailId: number;
  project: OutlookIntakeEmail["project"];
  onSaved: () => void;
}

function InlineProjectSelect({ emailId, project, onSaved }: InlineProjectSelectProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const { projects, isLoading } = useProjects({ enabled: open });

  async function handleSelect(projectId: number | null) {
    if (projectId === (project?.id ?? null)) { setOpen(false); return; }
    setSaving(true);
    try {
      await apiFetch(`/api/outlook-intake/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      toast.success(projectId ? "Project assigned" : "Assignment cleared");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  const label = project
    ? project.projectNumber
      ? `${project.projectNumber} — ${project.name ?? ""}`
      : (project.name ?? `Project ${project.id}`)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex min-w-0 w-56 justify-start gap-1.5 px-2 font-normal"
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          )}
          <span className={label ? "truncate font-medium text-foreground" : "text-muted-foreground"}>
            {label ?? "Assign project…"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects…" />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading…" : "No projects found."}
            </CommandEmpty>
            <CommandGroup>
              {project && (
                <CommandItem
                  value="__unassign__"
                  onSelect={() => handleSelect(null)}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 size-3.5" />
                  Clear assignment
                </CommandItem>
              )}
              {projects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.project_number ?? ""} ${p.name ?? ""}`}
                  onSelect={() => handleSelect(p.id)}
                >
                  <Check
                    className={`mr-2 size-3.5 ${p.id === project?.id ? "opacity-100" : "opacity-0"}`}
                  />
                  <span className="truncate">
                    {p.project_number ? (
                      <><span className="font-medium">{p.project_number}</span> — {p.name}</>
                    ) : (
                      p.name ?? `Project ${p.id}`
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Thread / conversation view ────────────────────────────────────────────────

interface ThreadGroup {
  conversationId: string;
  subject: string;
  emailCount: number;
  participants: string[];
  latestDate: string | null;
  emails: OutlookIntakeEmail[];
}

function groupByConversation(emails: OutlookIntakeEmail[]): ThreadGroup[] {
  const map = new Map<string, OutlookIntakeEmail[]>();
  const noThread: OutlookIntakeEmail[] = [];

  for (const email of emails) {
    const key = email.conversationId ?? null;
    if (!key) { noThread.push(email); continue; }
    const group = map.get(key) ?? [];
    group.push(email);
    map.set(key, group);
  }

  const threads: ThreadGroup[] = [];

  map.forEach((msgs, cid) => {
    // Sort within thread oldest→newest
    const sorted = [...msgs].sort((a, b) =>
      (a.receivedAt ?? "").localeCompare(b.receivedAt ?? ""),
    );
    const latest = sorted[sorted.length - 1];
    const seen = new Set<string>();
    const participants: string[] = [];
    for (const m of sorted) {
      const name = m.fromName ?? m.fromEmail ?? "";
      if (name && !seen.has(name)) { seen.add(name); participants.push(name); }
    }
    threads.push({
      conversationId: cid,
      subject: latest.subject,
      emailCount: sorted.length,
      participants,
      latestDate: latest.receivedAt,
      emails: sorted.reverse(), // newest first when expanded
    });
  });

  // Solo emails (no conversation_id) each become their own thread
  for (const email of noThread) {
    threads.push({
      conversationId: email.id.toString(),
      subject: email.subject,
      emailCount: 1,
      participants: [email.fromName ?? email.fromEmail ?? ""],
      latestDate: email.receivedAt,
      emails: [email],
    });
  }

  // Sort threads by latest date desc
  return threads.sort((a, b) =>
    (b.latestDate ?? "").localeCompare(a.latestDate ?? ""),
  );
}

interface ThreadViewProps {
  emails: OutlookIntakeEmail[];
  searchTerm: string;
  onProjectSaved: () => void;
}

function ThreadView({ emails, searchTerm, onProjectSaved }: ThreadViewProps): React.ReactElement {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const threads = React.useMemo(() => {
    const all = groupByConversation(emails);
    if (!searchTerm) return all;
    return all.filter((t) =>
      t.subject.toLowerCase().includes(searchTerm) ||
      t.participants.some((p) => p.toLowerCase().includes(searchTerm)),
    );
  }, [emails, searchTerm]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <MessageSquare className="mb-3 size-8 opacity-40" />
        <p className="text-sm">No threads found</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {threads.map((thread) => {
        const isExpanded = expanded.has(thread.conversationId);
        return (
          <div key={thread.conversationId}>
            {/* Thread summary row */}
            <Button
              variant="ghost"
              onClick={() => toggle(thread.conversationId)}
              className="flex h-auto w-full items-center gap-3 rounded-none px-4 py-3 text-left transition-colors"
            >
              <ChevronRight
                className={`size-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-foreground">{thread.subject}</span>
                  {thread.emailCount > 1 && (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {thread.emailCount}
                    </span>
                  )}
                </div>
                <span className="truncate text-sm text-muted-foreground">
                  {thread.participants.slice(0, 3).join(", ")}
                  {thread.participants.length > 3 ? ` +${thread.participants.length - 3} more` : ""}
                </span>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">
                {thread.latestDate
                  ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
                      new Date(thread.latestDate),
                    )
                  : ""}
              </span>
            </Button>

            {/* Expanded individual emails */}
            {isExpanded && (
              <div className="border-l-2 border-primary/20 ml-7 divide-y divide-border/50">
                {thread.emails.map((email) => {
                  const { label, variant } = pipelineStatus(email);
                  return (
                    <div key={email.id} className="flex items-start gap-4 px-4 py-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {email.fromName ?? email.fromEmail ?? "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {email.receivedAt
                              ? new Intl.DateTimeFormat("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }).format(new Date(email.receivedAt))
                              : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={email.matchStatus} />
                          <StatusBadge status={label} variant={variant} />
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <InlineProjectSelect
                          emailId={email.id}
                          project={email.project}
                          onSaved={onProjectSaved}
                        />
                        {email.webLink && (
                          <Button size="icon" variant="ghost" asChild className="size-7">
                            <a href={email.webLink} target="_blank" rel="noreferrer" aria-label="Open in Outlook">
                              <ExternalLink className="size-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function OutlookIntakeClient({ unassigned, embedded }: { unassigned?: boolean; embedded?: boolean } = {}): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname() ?? "/outlook-intake";
  const rawSearchParams = useSearchParams();
  const searchParams =
    rawSearchParams ?? (new URLSearchParams() as unknown as ReadonlyURLSearchParams);
  const queryClient = useQueryClient();
  const [threadView, setThreadView] = React.useState(false);
  const initialMatchStatus = searchParams.get("match_status") ?? "";

  const tableState = useUnifiedTableState({
    entityKey: "outlook-intake",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "received",
      sortDirection: "desc",
      visibleColumns: columnsConfig.filter((c) => c.defaultVisible !== false).map((c) => c.id),
      filters: {
        match_status: initialMatchStatus || undefined,
      },
    },
  });

  const matchStatus = tableState.activeFilters.match_status as string | undefined;
  const vectorizedFilter = tableState.activeFilters.vectorized as string | undefined;
  const params = new URLSearchParams();
  if (matchStatus) params.set("match_status", matchStatus);
  if (unassigned) params.set("unassigned", "true");
  const queryString = params.toString();

  const { data = [], isLoading, error } = useQuery<OutlookIntakeEmail[]>({
    queryKey: ["outlook-intake", matchStatus ?? "", unassigned ? "unassigned" : "all"],
    queryFn: ({ signal }) =>
      apiFetch<OutlookIntakeEmail[]>(
        `/api/outlook-intake${queryString ? `?${queryString}` : ""}`,
        { signal },
      ),
  });

  const searchTerm = tableState.debouncedSearch.trim().toLowerCase();
  const filtered = data.filter((email) => {
    if (vectorizedFilter === "yes" && !email.documentMetadataId) return false;
    if (vectorizedFilter === "no" && email.documentMetadataId) return false;
    if (!searchTerm) return true;
    const fields = [
      email.subject,
      senderLabel(email),
      email.mailboxUserId,
      email.project?.name ?? "",
      email.project?.projectNumber ?? "",
      email.attachments.map((attachment) => attachment.fileName).join(" "),
    ];
    return fields.some((field) => field.toLowerCase().includes(searchTerm));
  });

  const columns = React.useMemo<TableColumn<OutlookIntakeEmail>[]>(
    () => [
      {
        id: "subject",
        label: "Subject",
        width: 300,
        render: (email) => (
          <span className="font-medium text-foreground">{email.subject || "-"}</span>
        ),
        sortable: true,
        sortValue: (email) => email.subject,
      },
      {
        id: "from",
        label: "From",
        width: 180,
        render: (email) => (
          <span className="text-muted-foreground">{senderLabel(email)}</span>
        ),
        sortable: true,
        sortValue: (email) => email.fromName ?? email.fromEmail ?? "",
      },
      {
        id: "project",
        label: "Project",
        width: 220,
        render: (email) => (
          <InlineProjectSelect
            emailId={email.id}
            project={email.project}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["outlook-intake"] })}
          />
        ),
        sortable: true,
        sortValue: (email) => email.project?.name ?? "",
      },
      {
        id: "match",
        label: "Status",
        width: 120,
        render: (email) => <StatusBadge status={email.matchStatus} />,
        sortable: true,
        sortValue: (email) => email.matchStatus,
      },
      {
        id: "pipeline",
        label: "Pipeline",
        width: 130,
        render: (email) => {
          const { label, variant } = pipelineStatus(email);
          return <StatusBadge status={label} variant={variant} />;
        },
        sortable: true,
        sortValue: (email) => pipelineStatus(email).label,
      },
      {
        id: "received",
        label: "Date",
        width: 180,
        render: (email) => (
          <span className="text-muted-foreground">
            {formatDate(email.receivedAt || email.createdAt)}
          </span>
        ),
        sortable: true,
        sortValue: (email) => email.receivedAt || email.createdAt || "",
      },
      {
        id: "attachments",
        label: "Attachments",
        width: 100,
        render: (email) =>
          email.attachments.length > 0 ? (
            <Paperclip className="size-4 text-muted-foreground" />
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
        sortable: true,
        sortValue: (email) => email.attachments.length,
      },
      {
        id: "mailbox",
        label: "Mailbox",
        width: 180,
        render: (email) => (
          <span className="text-muted-foreground">{email.mailboxUserId}</span>
        ),
        sortable: true,
        sortValue: (email) => email.mailboxUserId,
      },
    ],
    [queryClient],
  );

  const sorted = React.useMemo(() => {
    const sortColumn = columns.find((column) => column.id === tableState.sortBy);
    const sortValue = sortColumn?.sortValue;
    if (!sortValue) return filtered;

    return [...filtered].sort((left, right) => {
      const leftValue = sortValue(left);
      const rightValue = sortValue(right);
      const comparison = String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
      return tableState.sortDirection === "asc" ? comparison : -comparison;
    });
  }, [columns, filtered, tableState.sortBy, tableState.sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / tableState.perPage));
  const pageStart = (tableState.page - 1) * tableState.perPage;
  const paged = sorted.slice(pageStart, pageStart + tableState.perPage);

  const updateFilters = (next: Record<string, string | undefined>) => {
    tableState.setActiveFilters(next);
    tableState.setSearchParams({
      match_status: next.match_status ?? null,
      vectorized: next.vectorized ?? null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const threadToggle = (
    <Button
      size="sm"
      variant={threadView ? "default" : "outline"}
      onClick={() => setThreadView((v) => !v)}
      aria-pressed={threadView}
    >
      <MessageSquare className="mr-1.5 size-3.5" />
      Threads
    </Button>
  );

  // ── Thread view ──────────────────────────────────────────────────────────────
  if (threadView) {
    return (
      <div className={embedded ? "" : "px-4 sm:px-6 lg:px-8"}>
        <div className="flex items-center gap-2 py-3">
          <Input
            type="search"
            placeholder="Search threads..."
            value={tableState.searchInput}
            onChange={(e) => tableState.setSearchInput(e.target.value)}
            className="h-8 flex-1"
          />
          {threadToggle}
        </div>
        {isLoading ? (
          <div className="space-y-2 py-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <ThreadView
            emails={filtered}
            searchTerm={tableState.debouncedSearch.trim().toLowerCase()}
            onProjectSaved={() => queryClient.invalidateQueries({ queryKey: ["outlook-intake"] })}
          />
        )}
      </div>
    );
  }

  // ── Standard table view ───────────────────────────────────────────────────────
  return (
      <UnifiedTablePage
      header={embedded ? { title: "", variant: "compact" } : {
        title: "Outlook Intake",
        description: "All synced Outlook emails and attachments before and after project matching.",
        actions: (
          <Button size="sm" variant="outline" asChild>
            <Link href="/outlook-emails">
              <Mail />
              Project Emails
            </Link>
          </Button>
        ),
      }}
      toolbar={{
        totalItems: data.length,
        filteredItems: threadView ? groupByConversation(filtered).length : filtered.length,
        selectedCount: 0,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search Outlook intake...",
        customActions: (
          <Button
            size="sm"
            variant={threadView ? "default" : "outline"}
            onClick={() => setThreadView((v) => !v)}
            aria-pressed={threadView}
          >
            <MessageSquare className="mr-1.5 size-3.5" />
            Threads
          </Button>
        ),
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        filters: [
          {
            id: "match_status",
            label: "Match",
            type: "select",
            options: [
              { label: "Unassigned", value: "unassigned" },
              { label: "Matched", value: "matched" },
              { label: "Ignored", value: "ignored" },
              { label: "Error", value: "error" },
            ],
          },
          {
            id: "vectorized",
            label: "Vectorized",
            type: "select",
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
          },
        ],
        activeFilters: tableState.activeFilters,
        onFilterChange: (filters) =>
          updateFilters({
            match_status: filters.match_status as string | undefined,
            vectorized: filters.vectorized as string | undefined,
          }),
        onClearFilters: () => updateFilters({}),
        columns: columnsConfig,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: paged,
        isLoading,
        error: error ?? undefined,
      }}
      table={{
        density: "compact",
        columns,
        getRowId: (email) => String(email.id),
        rowActions: (email) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Row actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {email.webLink ? (
                <DropdownMenuItem asChild>
                  <a href={email.webLink} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 size-4" />
                    Open in Outlook
                  </a>
                </DropdownMenuItem>
              ) : null}
              {email.matchStatus !== "ignored" ? (
                <DropdownMenuItem
                  className="text-muted-foreground"
                  onClick={async () => {
                    try {
                      await apiFetch(`/api/outlook-intake/${email.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ match_status: "ignored" }),
                      });
                      toast.success("Email marked as filtered");
                      void queryClient.invalidateQueries({ queryKey: ["outlook-intake"] });
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to update");
                    }
                  }}
                >
                  <Ban className="mr-2 size-4" />
                  Mark as filtered
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-muted-foreground"
                  onClick={async () => {
                    try {
                      await apiFetch(`/api/outlook-intake/${email.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ match_status: "unassigned" }),
                      });
                      toast.success("Email restored");
                      void queryClient.invalidateQueries({ queryKey: ["outlook-intake"] });
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to update");
                    }
                  }}
                >
                  <X className="mr-2 size-4" />
                  Remove filter
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }}
      sorting={{
        sortBy: tableState.sortBy,
        sortDirection: tableState.sortDirection,
        onSortChange: (sortBy, direction) => {
          tableState.setSortBy(sortBy);
          tableState.setSortDirection(direction);
          tableState.setSearchParams({ sort: sortBy, sort_dir: direction, page: "1" });
          tableState.setPage(1);
        },
      }}
      views={{
        list: (email) => (
          <div className="space-y-2 border-b px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{email.subject}</div>
                <div className="truncate text-sm text-muted-foreground">{senderLabel(email)}</div>
              </div>
              <StatusBadge status={email.matchStatus} />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{email.attachments.length} attachments</span>
              <span>{email.project?.name ?? "Unassigned"}</span>
              <span>{formatDate(email.receivedAt || email.createdAt)}</span>
            </div>
          </div>
        ),
      }}
      emptyState={{
        title: "No Outlook intake found",
        description: "No synced Outlook intake records are stored yet.",
        filteredDescription: "Try adjusting your search or match filter.",
        isFiltered: Boolean(tableState.searchInput) || Boolean(matchStatus),
        icon: <Inbox className="size-10 text-muted-foreground" />,
      }}
      pagination={{
        page: tableState.page,
        totalPages,
        perPage: tableState.perPage,
        onPageChange: (page) => {
          tableState.setPage(page);
          tableState.setSearchParams({ page: String(page) });
        },
        onPerPageChange: (perPage) => {
          tableState.setPerPage(Number(perPage));
          tableState.setPage(1);
          tableState.setSearchParams({ per_page: perPage, page: "1" });
        },
      }}
      layout={{
        fullBleedTable: false,
        containerPadding: !embedded,
      }}
    />
  );
}
