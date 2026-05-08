"use client";

import * as React from "react";
import {
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  History,
  PauseCircle,
  Play,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/ds/empty-state";
import { SectionRuleHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import { formatNumber } from "@/lib/table-config/formatters";
import type { Database, Json } from "@/types/database.types";

type AiLearningPromotionRow = Database["public"]["Tables"]["ai_learning_promotions"]["Row"];
type AiRetrievalWeightRow = Database["public"]["Tables"]["ai_retrieval_weights"]["Row"];
type AiFeedbackEventRow = Database["public"]["Tables"]["ai_feedback_events"]["Row"];
type AiLearningPromotionWithWeight = AiLearningPromotionRow & {
  retrievalWeight?: AiRetrievalWeightRow | null;
};
type PromotionStatus = "candidate" | "approved" | "applied" | "rejected" | "superseded";
type PromotionAction =
  | "approve"
  | "reject"
  | "apply"
  | "pause"
  | "resume"
  | "supersede";

type RetrievalWeightImpactPreviewRow = {
  retrievalFeedbackId: string;
  sourceDocumentId: string | null;
  sourceChunkId: string | null;
  outcome: string;
  cited: boolean;
  usedInAnswer: boolean;
  originalScore: number;
  adjustedScore: number;
  originalRank: number;
  adjustedRank: number;
  matchedPromotionSource: boolean;
};

type RetrievalWeightImpactPreview = {
  multiplier: number;
  inspectedRows: number;
  matchingRows: number;
  beforeTop: RetrievalWeightImpactPreviewRow[];
  afterTop: RetrievalWeightImpactPreviewRow[];
  matchedRankChange: {
    beforeBestRank: number | null;
    afterBestRank: number | null;
  };
};

type AiLearningStats = {
  promotions: Record<PromotionStatus, number>;
  retrievalWeights: Record<"active" | "paused" | "superseded", number>;
  recentActivityCount: number;
};

type PromotionLearning = {
  action?: string;
  title?: string;
  toolName?: string;
  sourceDocumentId?: string | null;
  sourceChunkId?: string | null;
  querySignature?: string;
  problemSignature?: string;
  preventionPrompt?: string;
  content?: string;
  visibility?: string;
  candidateProjectName?: string | null;
  pagePath?: string | null;
  taskSnapshot?: Record<string, unknown> | null;
  rationale?: string;
  signalCounts?: {
    helpful?: number;
    problem?: number;
    total?: number;
  };
};

function jsonObject(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readLearning(value: Json): PromotionLearning {
  const record = jsonObject(value);
  const signalCounts = jsonObject(record.signalCounts as Json);
  return {
    action: typeof record.action === "string" ? record.action : undefined,
    title: typeof record.title === "string" ? record.title : undefined,
    toolName: typeof record.toolName === "string" ? record.toolName : undefined,
    sourceDocumentId:
      typeof record.sourceDocumentId === "string" ? record.sourceDocumentId : null,
    sourceChunkId:
      typeof record.sourceChunkId === "string" ? record.sourceChunkId : null,
    querySignature:
      typeof record.querySignature === "string" ? record.querySignature : undefined,
    problemSignature:
      typeof record.problemSignature === "string" ? record.problemSignature : undefined,
    preventionPrompt:
      typeof record.preventionPrompt === "string" ? record.preventionPrompt : undefined,
    content: typeof record.content === "string" ? record.content : undefined,
    visibility: typeof record.visibility === "string" ? record.visibility : undefined,
    candidateProjectName:
      typeof record.candidateProjectName === "string"
        ? record.candidateProjectName
        : null,
    pagePath: typeof record.pagePath === "string" ? record.pagePath : null,
    taskSnapshot: jsonObject(record.taskSnapshot as Json),
    rationale: typeof record.rationale === "string" ? record.rationale : undefined,
    signalCounts: {
      helpful: typeof signalCounts.helpful === "number" ? signalCounts.helpful : undefined,
      problem: typeof signalCounts.problem === "number" ? signalCounts.problem : undefined,
      total: typeof signalCounts.total === "number" ? signalCounts.total : undefined,
    },
  };
}

function formatDate(value: string | null) {
  if (!value) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "Unknown time";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function actionLabel(action?: string) {
  if (action === "boost") return "Boost";
  if (action === "downrank_review") return "Review down-rank";
  return action ?? "Review";
}

function canApplyPromotion(promotion: AiLearningPromotionRow) {
  return (
    promotion.promotion_type === "retrieval_weight" ||
    promotion.promotion_type === "agent_prevention_prompt" ||
    promotion.promotion_type === "positive_task_example" ||
    promotion.promotion_type === "user_preference" ||
    promotion.promotion_type === "project_lesson" ||
    promotion.promotion_type === "attribution_rule"
  );
}

function applyPromotionLabel(promotion: AiLearningPromotionRow) {
  if (promotion.promotion_type === "retrieval_weight") return "Apply retrieval weight";
  if (promotion.promotion_type === "agent_prevention_prompt") {
    return "Apply prevention learning";
  }
  if (promotion.promotion_type === "positive_task_example") {
    return "Apply task example";
  }
  if (promotion.promotion_type === "user_preference") return "Apply preference";
  if (promotion.promotion_type === "project_lesson") return "Apply lesson";
  if (promotion.promotion_type === "attribution_rule") return "Apply attribution";
  return "Apply";
}

function promotionHelpText(promotion: AiLearningPromotionRow) {
  if (promotion.promotion_type === "retrieval_weight") {
    return "Approved retrieval-weight promotions can be applied into active retrieval ranking hints.";
  }
  if (promotion.promotion_type === "agent_prevention_prompt") {
    return "Approved prevention prompts can be applied into active agent learnings used by the AI assistant.";
  }
  if (promotion.promotion_type === "positive_task_example") {
    return "Approved task examples can be applied into the promoted examples used by task generation.";
  }
  if (promotion.promotion_type === "user_preference") {
    return "Approved preferences can be applied into scoped AI memory for future assistant context.";
  }
  if (promotion.promotion_type === "project_lesson") {
    return "Approved project lessons can be applied into team-visible AI memory for future assistant context.";
  }
  if (promotion.promotion_type === "attribution_rule") {
    return "Approved attribution rules assign the linked source document to the reviewed project and audit the correction.";
  }
  return "This promotion type can be reviewed now and applied after its destination writer exists.";
}

function taskSnapshotLabel(learning: PromotionLearning, key: string): string | null {
  const value = learning.taskSnapshot?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function eventStatus(value: Json, key: "status" | "promotionStatus") {
  const record = jsonObject(value);
  const status = record[key];
  return typeof status === "string" ? status : "unknown";
}

function shortId(value: string | null) {
  if (!value) return "unknown";
  return value.slice(0, 8);
}

interface AiLearningPromotionsClientProps {
  initialPromotions: AiLearningPromotionRow[];
}

export function AiLearningPromotionsClient({
  initialPromotions,
}: AiLearningPromotionsClientProps) {
  const [promotions, setPromotions] =
    React.useState<AiLearningPromotionWithWeight[]>(initialPromotions);
  const [status, setStatus] = React.useState<PromotionStatus>("candidate");
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [previewBusyId, setPreviewBusyId] = React.useState<string | null>(null);
  const [previewsById, setPreviewsById] = React.useState<
    Record<string, RetrievalWeightImpactPreview>
  >({});
  const [activityEvents, setActivityEvents] = React.useState<AiFeedbackEventRow[]>([]);
  const [activityLoading, setActivityLoading] = React.useState(false);
  const [stats, setStats] = React.useState<AiLearningStats | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(false);

  const loadPromotions = React.useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiFetch<{ promotions?: AiLearningPromotionRow[] }>(
        `/api/admin/ai-learning-promotions?status=${status}&limit=100`,
        { cache: "no-store" },
      );
      setPromotions(json.promotions ?? []);
    } catch (error) {
      toast.error("Failed to load learning promotions", {
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setLoading(false);
    }
  }, [status]);

  React.useEffect(() => {
    void loadPromotions();
  }, [loadPromotions, status]);

  const loadActivityEvents = React.useCallback(async () => {
    setActivityLoading(true);
    try {
      const json = await apiFetch<{ events?: AiFeedbackEventRow[] }>(
        "/api/admin/ai-learning-promotions/activity?limit=25",
        { cache: "no-store" },
      );
      setActivityEvents(json.events ?? []);
    } catch (error) {
      toast.error("Failed to load learning activity", {
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setActivityLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadActivityEvents();
  }, [loadActivityEvents]);

  const loadStats = React.useCallback(async () => {
    setStatsLoading(true);
    try {
      const json = await apiFetch<AiLearningStats>(
        "/api/admin/ai-learning-promotions/stats",
        { cache: "no-store" },
      );
      setStats(json);
    } catch (error) {
      toast.error("Failed to load learning metrics", {
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const runGenerator = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{
        candidatesFound: number;
        candidatesCreated: number;
        inspectedRows: number;
      }>("/api/admin/ai-learning-promotions/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      toast.success("Promotion scan complete", {
        description: `${result.candidatesCreated} created from ${result.inspectedRows} retrieval feedback rows.`,
      });
      await loadPromotions();
      await loadStats();
    } catch (error) {
      toast.error("Promotion scan failed", {
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setLoading(false);
    }
  }, [loadPromotions, loadStats]);

  const reviewPromotion = React.useCallback(
    async (promotionId: string, action: PromotionAction) => {
      setBusyId(promotionId);
      try {
        await apiFetch("/api/admin/ai-learning-promotions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ promotionId, action }),
        });
        await loadPromotions();
        await loadActivityEvents();
        await loadStats();
        toast.success(
          action === "approve"
            ? "Promotion approved"
            : action === "apply"
              ? "Promotion applied"
              : action === "pause"
                ? "Retrieval weight paused"
                : action === "resume"
                  ? "Retrieval weight resumed"
                  : action === "supersede"
                    ? "Retrieval weight superseded"
                    : "Promotion rejected",
        );
      } catch (error) {
        toast.error("Review action failed", {
          description: error instanceof Error ? error.message : "Unexpected error",
        });
      } finally {
        setBusyId(null);
      }
    },
    [loadActivityEvents, loadPromotions, loadStats],
  );

  const loadImpactPreview = React.useCallback(async (promotionId: string) => {
    setPreviewBusyId(promotionId);
    try {
      const preview = await apiFetch<RetrievalWeightImpactPreview>(
        "/api/admin/ai-learning-promotions/preview",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ promotionId, limit: 10 }),
        },
      );
      setPreviewsById((prev) => ({ ...prev, [promotionId]: preview }));
      toast.success("Impact preview loaded");
    } catch (error) {
      toast.error("Impact preview failed", {
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setPreviewBusyId(null);
    }
  }, []);

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Candidates",
            value: stats?.promotions.candidate ?? 0,
            detail: `${formatNumber(stats?.promotions.approved ?? 0)} approved`,
          },
          {
            label: "Applied",
            value: stats?.promotions.applied ?? 0,
            detail: `${formatNumber(stats?.retrievalWeights.active ?? 0)} active weights`,
          },
          {
            label: "Paused",
            value: stats?.retrievalWeights.paused ?? 0,
            detail: `${formatNumber(stats?.promotions.superseded ?? 0)} superseded`,
          },
          {
            label: "Activity",
            value: stats?.recentActivityCount ?? 0,
            detail: statsLoading ? "Refreshing" : "audit events",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-md border border-border bg-muted/30 px-4 py-3"
          >
            <div className="text-xs font-medium uppercase text-muted-foreground">
              {metric.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {formatNumber(metric.value)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{metric.detail}</div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <SectionRuleHeading label="Candidate learnings" className="mb-0 pb-0" />
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading candidates"
              : `${promotions.length.toLocaleString()} ${status} promotion${promotions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status === "candidate" && (
            <Button variant="outline" size="sm" onClick={runGenerator} disabled={loading}>
              Generate
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void loadPromotions()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={status} onValueChange={(value) => setStatus(value as PromotionStatus)}>
        <TabsList>
          <TabsTrigger value="candidate">Candidate</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="applied">Applied</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="superseded">Superseded</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Learning</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead className="w-32 text-right">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && promotions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  Loading learning promotions
                </TableCell>
              </TableRow>
            ) : promotions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  No {status} learning promotions
                </TableCell>
              </TableRow>
            ) : (
              promotions.map((promotion) => {
                const learning = readLearning(promotion.proposed_learning);
                const retrievalWeight = promotion.retrievalWeight ?? null;
                const impactPreview = previewsById[promotion.id];
                const isExpanded = expandedId === promotion.id;
                const disabled = busyId === promotion.id;
                const previewDisabled = previewBusyId === promotion.id;

                return (
                  <React.Fragment key={promotion.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(isExpanded ? null : promotion.id)}
                    >
                      <TableCell className="max-w-md align-top">
                        <div className="flex items-start gap-2">
                          {isExpanded ? (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">
                              {learning.title ?? promotion.promotion_type}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatDate(promotion.created_at)}</span>
                          {promotion.project_id && <Badge variant="outline">Project {promotion.project_id}</Badge>}
                          <Badge variant="secondary">{actionLabel(learning.action)}</Badge>
                          {retrievalWeight && (
                            <Badge variant="outline">{retrievalWeight.status}</Badge>
                          )}
                        </div>
                            {learning.rationale && (
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {learning.rationale}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="font-medium text-foreground">
                          {promotion.promotion_type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {learning.toolName ?? "No tool scope"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs align-top">
                        <div className="text-sm text-foreground">
                          {promotion.source_event_ids.length} source signal(s)
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {learning.signalCounts?.helpful ?? 0} helpful,{" "}
                          {learning.signalCounts?.problem ?? 0} problem,{" "}
                          {learning.signalCounts?.total ?? 0} total
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline">{formatConfidence(promotion.confidence)}</Badge>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {promotion.risk_level} risk
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                          {promotion.status === "candidate" && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={disabled}
                                aria-label="Reject promotion"
                                onClick={() => void reviewPromotion(promotion.id, "reject")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                disabled={disabled}
                                aria-label="Approve promotion"
                                onClick={() => void reviewPromotion(promotion.id, "approve")}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {promotion.status === "approved" && (
                            <Button
                              size="sm"
                              disabled={disabled || !canApplyPromotion(promotion)}
                              onClick={() => void reviewPromotion(promotion.id, "apply")}
                            >
                              {applyPromotionLabel(promotion)}
                            </Button>
                          )}
                          {promotion.status === "applied" && retrievalWeight?.status === "active" && (
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={disabled}
                              aria-label="Pause retrieval weight"
                              onClick={() => void reviewPromotion(promotion.id, "pause")}
                            >
                              <PauseCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {promotion.status === "applied" && retrievalWeight?.status === "paused" && (
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={disabled}
                              aria-label="Resume retrieval weight"
                              onClick={() => void reviewPromotion(promotion.id, "resume")}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={5} className="px-6 py-4">
                          <div className="space-y-3">
                            <dl className="grid gap-3 text-sm md:grid-cols-2">
                              <div>
                                <dt className="text-xs font-medium uppercase text-muted-foreground">
                                  {promotion.promotion_type === "retrieval_weight"
                                    ? "Query signature"
                                    : promotion.promotion_type === "positive_task_example"
                                      ? "Task example"
                                      : promotion.promotion_type === "user_preference" ||
                                          promotion.promotion_type === "project_lesson"
                                        ? "Memory"
                                        : promotion.promotion_type === "attribution_rule"
                                          ? "Source document"
                                    : "Problem signature"}
                                </dt>
                                <dd className="mt-1 text-foreground">
                                  {promotion.promotion_type === "retrieval_weight"
                                    ? learning.querySignature ?? "No query signature"
                                    : promotion.promotion_type === "positive_task_example"
                                      ? taskSnapshotLabel(learning, "name") ??
                                        "No task name"
                                      : promotion.promotion_type === "user_preference" ||
                                          promotion.promotion_type === "project_lesson"
                                        ? learning.content ?? "No memory content"
                                        : promotion.promotion_type === "attribution_rule"
                                          ? learning.sourceDocumentId ?? "No source document"
                                    : learning.problemSignature ?? "No problem signature"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium uppercase text-muted-foreground">
                                  {promotion.promotion_type === "retrieval_weight"
                                    ? "Source"
                                    : promotion.promotion_type === "positive_task_example"
                                      ? "Example detail"
                                      : promotion.promotion_type === "user_preference" ||
                                          promotion.promotion_type === "project_lesson"
                                        ? "Visibility"
                                        : promotion.promotion_type === "attribution_rule"
                                          ? "Candidate project"
                                    : "Scope"}
                                </dt>
                                <dd className="mt-1 break-all text-foreground">
                                  {promotion.promotion_type === "retrieval_weight"
                                    ? learning.sourceChunkId ??
                                      learning.sourceDocumentId ??
                                      "No source id"
                                    : promotion.promotion_type === "positive_task_example"
                                      ? [
                                          taskSnapshotLabel(learning, "priority"),
                                          taskSnapshotLabel(learning, "assignee"),
                                          taskSnapshotLabel(learning, "dueDate"),
                                        ]
                                          .filter(Boolean)
                                          .join(" · ") || "No example detail"
                                    : promotion.promotion_type === "user_preference" ||
                                        promotion.promotion_type === "project_lesson"
                                      ? learning.visibility ?? "Default"
                                    : promotion.promotion_type === "attribution_rule"
                                      ? learning.candidateProjectName ?? "No candidate project"
                                    : learning.pagePath ?? learning.toolName ?? "Global"}
                                </dd>
                              </div>
                              {promotion.promotion_type === "agent_prevention_prompt" && (
                                <div className="md:col-span-2">
                                  <dt className="text-xs font-medium uppercase text-muted-foreground">
                                    Prevention prompt
                                  </dt>
                                  <dd className="mt-1 text-foreground">
                                    {learning.preventionPrompt ?? "No prevention prompt"}
                                  </dd>
                                </div>
                              )}
                              {retrievalWeight && (
                                <>
                                  <div>
                                    <dt className="text-xs font-medium uppercase text-muted-foreground">
                                      Retrieval weight
                                    </dt>
                                    <dd className="mt-1 text-foreground">
                                      {retrievalWeight.weight_multiplier}x, {retrievalWeight.status}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-medium uppercase text-muted-foreground">
                                      Destination
                                    </dt>
                                    <dd className="mt-1 break-all text-foreground">
                                      {retrievalWeight.id}
                                    </dd>
                                  </div>
                                </>
                              )}
                            </dl>
                            <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
                              {JSON.stringify(promotion.proposed_learning, null, 2)}
                            </pre>
                            <div className="flex items-center gap-3 pt-1">
                              <span className="text-xs text-muted-foreground">
                                {promotionHelpText(promotion)}
                              </span>
                              {promotion.promotion_type === "retrieval_weight" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={previewDisabled}
                                  onClick={() => void loadImpactPreview(promotion.id)}
                                >
                                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                                  Preview impact
                                </Button>
                              )}
                              {promotion.status === "candidate" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() => void reviewPromotion(promotion.id, "reject")}
                                  >
                                    <X className="mr-1.5 h-3.5 w-3.5" />
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() => void reviewPromotion(promotion.id, "approve")}
                                  >
                                    <Check className="mr-1.5 h-3.5 w-3.5" />
                                    Approve
                                  </Button>
                                </>
                              )}
                              {promotion.status === "approved" && (
                                <Button
                                  size="sm"
                                  disabled={disabled || !canApplyPromotion(promotion)}
                                  onClick={() => void reviewPromotion(promotion.id, "apply")}
                                >
                                  {applyPromotionLabel(promotion)}
                                </Button>
                              )}
                              {promotion.status === "applied" && retrievalWeight?.status === "active" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() => void reviewPromotion(promotion.id, "pause")}
                                  >
                                    <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Pause
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() => void reviewPromotion(promotion.id, "supersede")}
                                  >
                                    <Ban className="mr-1.5 h-3.5 w-3.5" />
                                    Supersede
                                  </Button>
                                </>
                              )}
                              {promotion.status === "applied" && retrievalWeight?.status === "paused" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() => void reviewPromotion(promotion.id, "resume")}
                                  >
                                    <Play className="mr-1.5 h-3.5 w-3.5" />
                                    Resume
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() => void reviewPromotion(promotion.id, "supersede")}
                                  >
                                    <Ban className="mr-1.5 h-3.5 w-3.5" />
                                    Supersede
                                  </Button>
                                </>
                              )}
                            </div>
                            {impactPreview && (
                              <div className="space-y-3 border-t border-border pt-3">
                                <div className="grid gap-3 text-sm md:grid-cols-4">
                                  <div>
                                    <div className="text-xs font-medium uppercase text-muted-foreground">
                                      Multiplier
                                    </div>
                                    <div className="mt-1 text-foreground">
                                      {impactPreview.multiplier}x
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium uppercase text-muted-foreground">
                                      Matching rows
                                    </div>
                                    <div className="mt-1 text-foreground">
                                      {impactPreview.matchingRows} of {impactPreview.inspectedRows}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium uppercase text-muted-foreground">
                                      Best before
                                    </div>
                                    <div className="mt-1 text-foreground">
                                      {impactPreview.matchedRankChange.beforeBestRank ?? "No match"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium uppercase text-muted-foreground">
                                      Best after
                                    </div>
                                    <div className="mt-1 text-foreground">
                                      {impactPreview.matchedRankChange.afterBestRank ?? "No match"}
                                    </div>
                                  </div>
                                </div>
                                <div className="grid gap-4 text-xs md:grid-cols-2">
                                  <div>
                                    <div className="mb-2 font-medium text-foreground">
                                      Before
                                    </div>
                                    <div className="space-y-1">
                                      {impactPreview.beforeTop.map((row) => (
                                        <div
                                          key={`before-${row.retrievalFeedbackId}`}
                                          className="flex items-center justify-between gap-3 border-t border-border/70 py-1.5"
                                        >
                                          <span className="truncate text-muted-foreground">
                                            #{row.originalRank} {row.outcome}
                                            {row.matchedPromotionSource ? " · matched" : ""}
                                          </span>
                                          <span className="font-mono text-foreground">
                                            {formatNumber(row.originalScore, 3)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="mb-2 font-medium text-foreground">
                                      After
                                    </div>
                                    <div className="space-y-1">
                                      {impactPreview.afterTop.map((row) => (
                                        <div
                                          key={`after-${row.retrievalFeedbackId}`}
                                          className="flex items-center justify-between gap-3 border-t border-border/70 py-1.5"
                                        >
                                          <span className="truncate text-muted-foreground">
                                            #{row.adjustedRank} {row.outcome}
                                            {row.matchedPromotionSource ? " · matched" : ""}
                                          </span>
                                          <span className="font-mono text-foreground">
                                            {formatNumber(row.adjustedScore, 3)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <SectionRuleHeading label="Learning activity" className="mb-0 pb-0" />
            <p className="mt-1 text-sm text-muted-foreground">
              {activityLoading
                ? "Loading activity"
                : `${activityEvents.length.toLocaleString()} recent learning event${activityEvents.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadActivityEvents()}
            disabled={activityLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="divide-y divide-border rounded-md border border-border">
          {activityEvents.length === 0 ? (
            <EmptyState
              icon={<History className="h-8 w-8" />}
              title="No learning activity yet"
              description="Learning-control changes will appear here after retrieval weights are paused, resumed, or superseded."
            />
          ) : (
            activityEvents.map((event) => {
              const subjectLabel =
                event.subject_type === "ai_retrieval_weight"
                  ? "Retrieval weight"
                  : "Promotion";

              return (
                <div key={event.id} className="flex gap-3 px-4 py-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <History className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {eventStatus(event.before_snapshot, "status")} to{" "}
                        {eventStatus(event.after_snapshot, "status")}
                      </span>
                      <Badge variant="outline">{event.signal}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(event.created_at)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Promotion {shortId(event.source_record_id)} · {subjectLabel}{" "}
                      {shortId(event.subject_id)} · User {shortId(event.user_id)}
                    </div>
                    {event.free_text && (
                      <p className="text-sm text-foreground">{event.free_text}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
