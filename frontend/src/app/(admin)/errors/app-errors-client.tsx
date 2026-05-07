"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/ds";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  AppErrorClassification,
  AppErrorEventForPacket,
} from "@/lib/app-error-classification";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type ErrorStatus = "new" | "triaged" | "in_progress" | "fixed" | "ignored" | "needs_human";

export interface AppErrorGroupRow {
  id: string;
  created_at: string;
  first_seen_at: string;
  last_seen_at: string;
  signature: string;
  source: string;
  severity: string;
  status: string;
  event_count: number;
  affected_user_count: number;
  affected_project_count: number;
  latest_message: string;
  latest_route: string | null;
  latest_action: string | null;
  latest_error_code: string | null;
  latest_request_id: string | null;
  latest_user_id: string | null;
  latest_project_id: number | null;
  linear_issue_id: string | null;
  linear_issue_url: string | null;
}

interface AppErrorsClientProps {
  rows: AppErrorGroupRow[];
  loadError: string | null;
}

interface AppErrorGroupDetail {
  group: AppErrorGroupRow;
  events: AppErrorEventForPacket[];
  classification: AppErrorClassification;
  fixPacket: string;
}

interface CreateLinearIssueResponse {
  group: AppErrorGroupRow;
  issue: {
    identifier: string;
    url: string;
    created: boolean;
  };
}

const STATUS_OPTIONS: { value: ErrorStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "triaged", label: "Triaged" },
  { value: "in_progress", label: "In Progress" },
  { value: "needs_human", label: "Needs Human" },
  { value: "fixed", label: "Fixed" },
  { value: "ignored", label: "Ignored" },
];

const SEVERITY_CLASS: Record<string, string> = {
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
  high: "border-status-warning/30 bg-status-warning/10 text-status-warning",
  medium: "border-status-info/30 bg-status-info/10 text-status-info",
  low: "border-border bg-muted text-muted-foreground",
};

const STATUS_CLASS: Record<ErrorStatus, string> = {
  new: "border-destructive/30 bg-destructive/10 text-destructive",
  triaged: "border-status-info/30 bg-status-info/10 text-status-info",
  in_progress: "border-primary/30 bg-primary/10 text-primary",
  needs_human: "border-status-warning/30 bg-status-warning/10 text-status-warning",
  fixed: "border-status-success/30 bg-status-success/10 text-status-success",
  ignored: "border-border bg-muted text-muted-foreground",
};

function relativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusIcon(status: string) {
  if (status === "fixed") return CheckCircle2;
  if (status === "in_progress") return Loader2;
  if (status === "needs_human" || status === "new") return AlertTriangle;
  return Circle;
}

export function AppErrorsClient({ rows, loadError }: AppErrorsClientProps) {
  const [items, setItems] = useState(rows);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ErrorStatus | "active" | "all">("active");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AppErrorGroupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [linearIssueId, setLinearIssueId] = useState("");
  const [linearIssueUrl, setLinearIssueUrl] = useState("");
  const [linearCreating, setLinearCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? !["fixed", "ignored"].includes(item.status)
          : item.status === statusFilter);

      if (!statusMatches) return false;
      if (!normalizedQuery) return true;

      return [
        item.latest_message,
        item.latest_route,
        item.latest_action,
        item.latest_error_code,
        item.latest_request_id,
        item.signature,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [items, query, statusFilter]);

  const summary = useMemo(() => {
    return {
      active: items.filter((item) => !["fixed", "ignored"].includes(item.status)).length,
      critical: items.filter((item) => item.severity === "critical").length,
      events: items.reduce((sum, item) => sum + item.event_count, 0),
    };
  }, [items]);

  function updateStatus(id: string, status: ErrorStatus) {
    setPendingId(id);
    startTransition(() => {
      apiFetch<{ group: AppErrorGroupRow }>(`/api/admin/app-errors/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
        .then(({ group }) => {
          refreshItem(group);
          toast.success("Error status updated");
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "Failed to update error status");
        })
        .finally(() => setPendingId(null));
    });
  }

  function refreshItem(group: AppErrorGroupRow) {
    setItems((current) =>
      current.map((item) => (item.id === group.id ? { ...item, ...group } : item)),
    );
    setDetail((current) => (current?.group.id === group.id ? { ...current, group } : current));
  }

  function openDetails(id: string) {
    setSelectedGroupId(id);
    setDetailLoading(true);
    apiFetch<AppErrorGroupDetail>(`/api/admin/app-errors/${id}`)
      .then((payload) => {
        setDetail(payload);
        setLinearIssueId(payload.group.linear_issue_id ?? "");
        setLinearIssueUrl(payload.group.linear_issue_url ?? "");
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load error details");
      })
      .finally(() => setDetailLoading(false));
  }

  function closeDetails(open: boolean) {
    if (open) return;
    setSelectedGroupId(null);
    setDetail(null);
    setDetailLoading(false);
  }

  function copyFixPacket() {
    if (!detail?.fixPacket) return;
    navigator.clipboard
      .writeText(detail.fixPacket)
      .then(() => toast.success("Fix packet copied"))
      .catch(() => toast.error("Unable to copy fix packet"));
  }

  function saveLinearLink() {
    if (!detail) return;
    setPendingId(detail.group.id);
    apiFetch<{ group: AppErrorGroupRow }>(`/api/admin/app-errors/${detail.group.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        linearIssueId: linearIssueId.trim() || null,
        linearIssueUrl: linearIssueUrl.trim() || null,
      }),
    })
      .then(({ group }) => {
        refreshItem(group);
        toast.success("Linear link saved");
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to save Linear link");
      })
      .finally(() => setPendingId(null));
  }

  function createLinearIssue() {
    if (!detail) return;
    setLinearCreating(true);
    apiFetch<CreateLinearIssueResponse>(`/api/admin/app-errors/${detail.group.id}`, {
      method: "POST",
    })
      .then(({ group, issue }) => {
        refreshItem(group);
        setLinearIssueId(group.linear_issue_id ?? issue.identifier);
        setLinearIssueUrl(group.linear_issue_url ?? issue.url);
        toast.success(issue.created ? `Created ${issue.identifier}` : `${issue.identifier} is already linked`);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to create Linear issue");
      })
      .finally(() => setLinearCreating(false));
  }

  if (loadError) {
    return (
      <ErrorState
        title="Unable to load application errors"
        description={loadError}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Active groups" value={summary.active} />
        <SummaryTile label="Critical groups" value={summary.critical} />
        <SummaryTile label="Captured events" value={summary.events} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search route, message, request id, or signature"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ErrorStatus | "active" | "all")}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 />}
            title="No matching error groups"
            description="Captured application failures will appear here once they are grouped."
          />
        ) : (
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Failure</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const StatusIcon = statusIcon(item.status);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-md whitespace-normal">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={cn("capitalize", SEVERITY_CLASS[item.severity] ?? SEVERITY_CLASS.medium)}>
                              {item.severity}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {item.source}
                            </Badge>
                            {item.latest_error_code && (
                              <span className="font-mono text-xs text-muted-foreground">{item.latest_error_code}</span>
                            )}
                          </div>
                          <p className="line-clamp-2 text-sm font-medium text-foreground">
                            {item.latest_message}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {item.latest_request_id ?? item.signature.slice(0, 24)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="space-y-1">
                          <p className="truncate font-mono text-xs text-foreground">
                            {item.latest_route ?? "-"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.latest_action ?? "No action captured"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="space-y-1">
                          <p className="font-medium">{item.event_count}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.affected_user_count} users
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p>{relativeTime(item.last_seen_at)}</p>
                          <p className="text-xs text-muted-foreground">
                            first {relativeTime(item.first_seen_at)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-48">
                        <Select
                          value={item.status}
                          disabled={isPending && pendingId === item.id}
                          onValueChange={(value) => updateStatus(item.id, value as ErrorStatus)}
                        >
                          <SelectTrigger className="h-8">
                            <span className="flex items-center gap-2">
                              <StatusIcon className={cn("h-3.5 w-3.5", item.status === "in_progress" && "animate-spin")} />
                              <SelectValue />
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                <span className={cn("rounded px-1.5 py-0.5 text-xs", STATUS_CLASS[status.value])}>
                                  {status.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetails(item.id)}
                            aria-label="Open error details"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {item.linear_issue_url ? (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={item.linear_issue_url} target="_blank" rel="noreferrer" aria-label="Open Linear issue">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Sheet open={Boolean(selectedGroupId)} onOpenChange={closeDetails}>
        <SheetContent className="overflow-y-auto sm:max-w-none lg:w-1/2">
          <SheetHeader>
            <SheetTitle>Error Detail</SheetTitle>
            <SheetDescription>
              Recent events, classification, and a copy-ready Linear/Codex fix packet.
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex items-center gap-2 px-8 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading error details
            </div>
          ) : detail ? (
            <div className="space-y-6 px-8 pb-8">
              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("capitalize", SEVERITY_CLASS[detail.group.severity] ?? SEVERITY_CLASS.medium)}>
                    {detail.group.severity}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {detail.group.source}
                  </Badge>
                  <Badge variant="outline">
                    {detail.classification.category}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {detail.group.latest_message}
                </p>
                <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                  <DetailValue label="Route" value={detail.group.latest_route} />
                  <DetailValue label="Action" value={detail.group.latest_action} />
                  <DetailValue label="Request ID" value={detail.group.latest_request_id} />
                  <DetailValue label="Signature" value={detail.group.signature} />
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                <SummaryTile label="Events" value={detail.group.event_count} />
                <SummaryTile label="Users" value={detail.group.affected_user_count} />
                <SummaryTile label="Projects" value={detail.group.affected_project_count} />
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Diagnosis</h3>
                <div className="space-y-3 text-sm">
                  <DiagnosisRow label="Likely owner" value={detail.classification.likelyOwner} />
                  <DiagnosisRow label="Likely cause" value={detail.classification.likelyCause} />
                  <DiagnosisRow label="Detection gap" value={detail.classification.detectionGap} />
                  <DiagnosisRow label="Prevention step" value={detail.classification.preventionStep} />
                  <DiagnosisRow label="Verification" value={detail.classification.suggestedVerification} />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Fix Packet</h3>
                  <Button size="sm" variant="outline" onClick={copyFixPacket}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  readOnly
                  value={detail.fixPacket}
                  className="min-h-64 font-mono text-xs"
                />
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Linear Link</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={createLinearIssue}
                    disabled={linearCreating || Boolean(detail.group.linear_issue_url)}
                  >
                    {linearCreating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Create Issue
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
                  <Input
                    value={linearIssueId}
                    onChange={(event) => setLinearIssueId(event.target.value)}
                    placeholder="AAI-123"
                  />
                  <Input
                    value={linearIssueUrl}
                    onChange={(event) => setLinearIssueUrl(event.target.value)}
                    placeholder="https://linear.app/..."
                  />
                  <Button
                    variant="outline"
                    onClick={saveLinearLink}
                    disabled={pendingId === detail.group.id}
                  >
                    {pendingId === detail.group.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Recent Events</h3>
                <div className="divide-y divide-border rounded-md border border-border">
                  {detail.events.map((event) => (
                    <div key={event.id} className="space-y-2 p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {event.request_id ?? event.id}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        {event.route ?? event.page_path ?? "Unknown route"} · {event.action ?? "Unknown action"}
                      </p>
                      {event.stack ? (
                        <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono text-[11px] text-muted-foreground">
                          {event.stack}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="px-8 py-6 text-sm text-muted-foreground">
              Select an error group to see details.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border px-4 py-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function DetailValue({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="font-medium uppercase text-muted-foreground">{label}</p>
      <p className="truncate font-mono text-foreground">{value ?? "-"}</p>
    </div>
  );
}

function DiagnosisRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
