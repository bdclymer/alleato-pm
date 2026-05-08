"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Badge, Button, ErrorState, InfoAlert, SectionHeader } from "@/components/ds";
import { SectionRuleHeading } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type ReadinessLevel = "ready" | "attention" | "blocked" | "unknown";

interface OperationsReadinessStatus {
  generatedAt: string;
  status: "ready" | "attention" | "blocked";
  summary: string;
  counts: {
    ready: number;
    attention: number;
    blocked: number;
    unknown: number;
  };
  items: ReadinessItem[];
}

interface ReadinessItem {
  id: "source-data" | "tasks" | "project-intelligence" | "daily-brief";
  question: string;
  answer: string;
  level: ReadinessLevel;
  checkedAt: string;
  metrics: Array<{ label: string; value: string }>;
  blocker: string | null;
  cause: string;
  prevention: string;
  primaryAction: { label: string; href: string };
  runActions: ReadinessRunAction[];
}

interface ReadinessRunAction {
  id: string;
  label: string;
  endpoint: string;
  method: "POST";
  body?: Record<string, unknown>;
  confirm?: string;
}

const levelConfig: Record<
  ReadinessLevel,
  {
    label: string;
    badge: "active" | "warning" | "destructive" | "secondary";
    icon: React.ComponentType<{ className?: string }>;
    iconClassName: string;
  }
> = {
  ready: {
    label: "Ready",
    badge: "active",
    icon: CheckCircle2,
    iconClassName: "text-status-success",
  },
  attention: {
    label: "Needs follow-up",
    badge: "warning",
    icon: AlertTriangle,
    iconClassName: "text-status-warning",
  },
  blocked: {
    label: "Blocked",
    badge: "destructive",
    icon: XCircle,
    iconClassName: "text-destructive",
  },
  unknown: {
    label: "Unknown",
    badge: "secondary",
    icon: CircleHelp,
    iconClassName: "text-muted-foreground",
  },
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

function LevelBadge({ level }: { level: ReadinessLevel }) {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <Badge variant={config.badge} className="gap-1.5">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function ReadinessRow({
  item,
  runningActionId,
  onRunAction,
}: {
  item: ReadinessItem;
  runningActionId: string | null;
  onRunAction: (item: ReadinessItem, action: ReadinessRunAction) => void;
}) {
  const config = levelConfig[item.level];
  const Icon = config.icon;

  return (
    <section className="space-y-4 border-t border-border/60 pt-6 first:border-t-0 first:pt-0">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Icon className={cn("h-5 w-5 shrink-0", config.iconClassName)} />
            <SectionRuleHeading
              label={item.question}
              className="mb-0 pb-0"
            />
            <LevelBadge level={item.level} />
          </div>
          <p className="text-sm leading-6 text-foreground">{item.answer}</p>
          <p className="text-xs text-muted-foreground">
            Checked {formatDate(item.checkedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(item.runActions ?? []).map((action) => {
            const actionKey = `${item.id}:${action.id}`;
            const running = runningActionId === actionKey;

            return (
              <Button
                key={action.id}
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={Boolean(runningActionId)}
                onClick={() => onRunAction(item, action)}
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {action.label}
              </Button>
            );
          })}
          <Button asChild size="sm" variant="outline" className="w-fit">
            <Link href={item.primaryAction.href}>{item.primaryAction.label}</Link>
          </Button>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {item.metrics.map((metric) => (
          <div key={`${item.id}-${metric.label}`} className="space-y-1 bg-muted/25 px-3 py-2">
            <dt className="text-xs font-medium text-muted-foreground">{metric.label}</dt>
            <dd className="text-sm font-semibold tabular-nums text-foreground">{metric.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Blocker
          </p>
          <p className="text-sm leading-6 text-foreground">
            {item.blocker ?? "No active blocker reported."}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Cause
          </p>
          <p className="text-sm leading-6 text-foreground">{item.cause}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Prevention
          </p>
          <p className="text-sm leading-6 text-foreground">{item.prevention}</p>
        </div>
      </div>
    </section>
  );
}

export function OperationsReadinessPanel() {
  const [status, setStatus] = React.useState<OperationsReadinessStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [runningActionId, setRunningActionId] = React.useState<string | null>(null);
  const [lastActionResult, setLastActionResult] = React.useState<string | null>(null);

  const loadStatus = React.useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    if (mode === "refresh") setLastActionResult(null);

    try {
      const payload = await apiFetch<OperationsReadinessStatus>(
        "/api/admin/operations-readiness/status",
      );
      setStatus(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load operations readiness.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void loadStatus("initial");
  }, [loadStatus]);

  const runAction = React.useCallback(
    async (item: ReadinessItem, action: ReadinessRunAction) => {
      if (action.confirm && !window.confirm(action.confirm)) return;

      const actionKey = `${item.id}:${action.id}`;
      setRunningActionId(actionKey);
      setError(null);
      setLastActionResult(null);

      try {
        await apiFetch(action.endpoint, {
          method: action.method,
          ...(action.body ? { body: JSON.stringify(action.body) } : {}),
        });
        setLastActionResult(`${action.label} started. Readiness will refresh shortly.`);
        window.setTimeout(() => {
          void loadStatus("initial");
        }, 1500);
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : `${action.label} failed.`,
        );
      } finally {
        setRunningActionId(null);
      }
    },
    [loadStatus],
  );

  if (loading) return <LoadingState />;

  if (error && !status) {
    return (
      <ErrorState
        title="Readiness could not be loaded"
        description={error}
        onRetry={() => void loadStatus("refresh")}
      />
    );
  }

  if (!status) {
    return (
      <InfoAlert variant="warning">
        Operations readiness returned no status payload.
      </InfoAlert>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge
                level={
                  status.status === "ready"
                    ? "ready"
                    : status.status === "attention"
                      ? "attention"
                      : "blocked"
                }
              />
              <span className="text-sm text-muted-foreground">
                Last checked {formatDate(status.generatedAt)}
              </span>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {status.summary}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={refreshing}
            onClick={() => void loadStatus("refresh")}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        <dl className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground">Ready</dt>
            <dd className="text-lg font-semibold tabular-nums text-foreground">
              {status.counts.ready}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground">Needs follow-up</dt>
            <dd className="text-lg font-semibold tabular-nums text-foreground">
              {status.counts.attention}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground">Blocked</dt>
            <dd className="text-lg font-semibold tabular-nums text-foreground">
              {status.counts.blocked}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground">Unknown</dt>
            <dd className="text-lg font-semibold tabular-nums text-foreground">
              {status.counts.unknown}
            </dd>
          </div>
        </dl>

        {error ? (
          <InfoAlert variant="error">
            {error}
          </InfoAlert>
        ) : null}

        {lastActionResult ? (
          <InfoAlert variant="success">
            {lastActionResult}
          </InfoAlert>
        ) : null}
      </section>

      <section className="space-y-6">
        <SectionHeader title="Operating Questions" />
        <div className="space-y-6">
          {status.items.map((item) => (
            <ReadinessRow
              key={item.id}
              item={item}
              runningActionId={runningActionId}
              onRunAction={runAction}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
