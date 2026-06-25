"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SourceSyncStatus } from "@/app/api/admin/source-sync/_contracts";
import { Canvas } from "@/components/ai-elements/canvas";
import { Edge } from "@/components/ai-elements/edge";
import {
  Node,
  NodeContent,
  NodeDescription,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import { InfoAlert } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type LifecycleStatus = "healthy" | "warning" | "critical" | "unknown";

const STATUS_TONE: Record<
  LifecycleStatus,
  { border: string; dot: string; text: string; label: string }
> = {
  healthy: {
    border: "border-status-success/50",
    dot: "bg-status-success",
    text: "text-status-success",
    label: "Healthy",
  },
  warning: {
    border: "border-status-warning/60",
    dot: "bg-status-warning",
    text: "text-status-warning",
    label: "Warning",
  },
  critical: {
    border: "border-status-error/60",
    dot: "bg-status-error",
    text: "text-status-error",
    label: "Critical",
  },
  unknown: {
    border: "border-border",
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    label: "No data",
  },
};

function relativeTime(iso: string | null): string {
  if (!iso) {
    return "never";
  }
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "—";
  }
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.round(hours / 24)}d ago`;
}

type StageNodeData = {
  kind: "stage";
  handles: { source: boolean; target: boolean };
  label: string;
  message: string;
  ownerHint: string;
  status: LifecycleStatus;
  count: number;
  total: number;
  latestAt: string | null;
};

type SourceNodeData = {
  kind: "source";
  handles: { source: boolean; target: boolean };
  label: string;
  systems: string;
  status: LifecycleStatus;
  totalSources: number;
  latestAt: string | null;
};

const StageNode = ({ data }: { data: StageNodeData }) => {
  const tone = STATUS_TONE[data.status];
  const pct = data.total > 0 ? Math.round((data.count / data.total) * 100) : 0;
  return (
    <Node className={cn("w-64", tone.border)} handles={data.handles}>
      <NodeHeader>
        <NodeTitle className="text-sm">{data.label}</NodeTitle>
        <NodeDescription className="text-xs">{data.message}</NodeDescription>
      </NodeHeader>
      <NodeContent className="space-y-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium text-foreground">
            {data.count.toLocaleString()} / {data.total.toLocaleString()}
          </span>
          <span className="text-muted-foreground">{relativeTime(data.latestAt)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", tone.dot)} style={{ width: `${pct}%` }} />
        </div>
      </NodeContent>
      <NodeFooter className="justify-between">
        <span className="flex items-center gap-1.5 text-xs">
          <span className={cn("size-2 rounded-full", tone.dot)} />
          <span className={tone.text}>{tone.label}</span>
        </span>
        <span className="text-xs text-muted-foreground">{data.ownerHint}</span>
      </NodeFooter>
    </Node>
  );
};

const SourceNode = ({ data }: { data: SourceNodeData }) => {
  const tone = STATUS_TONE[data.status];
  return (
    <Node className={cn("w-64", tone.border)} handles={data.handles}>
      <NodeHeader>
        <NodeTitle className="text-sm">{data.label}</NodeTitle>
        <NodeDescription className="text-xs">{data.systems}</NodeDescription>
      </NodeHeader>
      <NodeContent>
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium text-foreground">
            {data.totalSources.toLocaleString()} sources
          </span>
          <span className="text-muted-foreground">{relativeTime(data.latestAt)}</span>
        </div>
      </NodeContent>
      <NodeFooter>
        <span className="flex items-center gap-1.5 text-xs">
          <span className={cn("size-2 rounded-full", tone.dot)} />
          <span className={tone.text}>{tone.label}</span>
        </span>
      </NodeFooter>
    </Node>
  );
};

const nodeTypes = {
  source: SourceNode,
  stage: StageNode,
};

const edgeTypes = {
  animated: Edge.Animated,
  temporary: Edge.Temporary,
};

const COL_GAP = 300;
const ROW_GAP = 250;

function buildGraph(status: SourceSyncStatus) {
  const sources = status.ragLifecycle?.sources ?? [];
  const nodes: { id: string; type: string; position: { x: number; y: number }; data: StageNodeData | SourceNodeData }[] = [];
  const edges: { id: string; source: string; target: string; type: string }[] = [];

  sources.forEach((src, row) => {
    const y = row * ROW_GAP;
    const sourceId = `src-${src.key}`;

    nodes.push({
      id: sourceId,
      type: "source",
      position: { x: 0, y },
      data: {
        kind: "source",
        handles: { source: true, target: false },
        label: src.label,
        systems: src.sourceSystems.join(", "),
        status: src.status,
        totalSources: src.totalSources,
        latestAt: src.latestSourceAt,
      },
    });

    let prevId = sourceId;
    src.stages.forEach((stage, col) => {
      const stageId = `${src.key}-${stage.key}`;
      const isLast = col === src.stages.length - 1;
      nodes.push({
        id: stageId,
        type: "stage",
        position: { x: (col + 1) * COL_GAP, y },
        data: {
          kind: "stage",
          handles: { source: !isLast, target: true },
          label: stage.label,
          message: stage.message,
          ownerHint: stage.ownerHint,
          status: stage.status,
          count: stage.count,
          total: stage.total,
          latestAt: stage.latestAt,
        },
      });
      // A healthy handoff animates; a stuck/unknown one shows a dashed "attention" edge.
      edges.push({
        id: `${prevId}->${stageId}`,
        source: prevId,
        target: stageId,
        type: stage.status === "healthy" ? "animated" : "temporary",
      });
      prevId = stageId;
    });
  });

  return { nodes, edges };
}

const PipelineHealthPage = () => {
  const [status, setStatus] = useState<SourceSyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    void apiFetch<SourceSyncStatus>("/api/admin/source-sync/status")
      .then((data) => {
        setStatus(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load pipeline health");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const graph = useMemo(() => (status ? buildGraph(status) : null), [status]);

  const lifecycle = status?.ragLifecycle;
  const criticalSources = lifecycle?.sources.filter((s) => s.status === "critical") ?? [];
  const warningSources = lifecycle?.sources.filter((s) => s.status === "warning") ?? [];

  return (
    <PageShell
      variant="dashboard"
      eyebrow="AI / RAG operations"
      title="Pipeline health map"
      description="Live view of the ingestion pipeline — each source flows left to right through sync, embed, project attribution, task extraction, and intelligence compilation. Red nodes and dashed edges are where data stops flowing."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      {error ? (
        <InfoAlert variant="error" role="alert">
          {error}
        </InfoAlert>
      ) : null}

      {!error && lifecycle && (criticalSources.length > 0 || warningSources.length > 0) ? (
        <InfoAlert variant={criticalSources.length > 0 ? "error" : "warning"} role="alert">
          {criticalSources.length > 0
            ? `${criticalSources.length} source${criticalSources.length > 1 ? "s" : ""} stalled: ${criticalSources.map((s) => s.label).join(", ")}.`
            : `${warningSources.length} source${warningSources.length > 1 ? "s" : ""} degraded: ${warningSources.map((s) => s.label).join(", ")}.`}
        </InfoAlert>
      ) : null}

      {!error && status && !lifecycle ? (
        <InfoAlert variant="warning" role="alert">
          Lifecycle telemetry is unavailable — the source-sync status endpoint returned no
          ragLifecycle payload.
        </InfoAlert>
      ) : null}

      {loading && !status ? (
        <Skeleton className="h-[calc(100svh-18rem)] w-full rounded-md" />
      ) : graph ? (
        <div className="h-[calc(100svh-18rem)] w-full overflow-hidden rounded-md border border-border">
          <Canvas
            edges={graph.edges}
            edgeTypes={edgeTypes}
            fitView
            nodeTypes={nodeTypes}
            nodes={graph.nodes}
          />
        </div>
      ) : null}
    </PageShell>
  );
};

export default PipelineHealthPage;
