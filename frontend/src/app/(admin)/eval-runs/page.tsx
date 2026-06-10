"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, FlaskConical, RefreshCw } from "lucide-react";

import { Button, EmptyState, ErrorState, StatusBadge } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { ExpandableSearch } from "@/components/tables/unified/table-toolbar";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type RunSummary = {
  runId: string;
  generatedAt: string | null;
  baseUrl: string | null;
  bundleName: string;
  bundleDescription: string | null;
  totalCases: number;
  passed: number;
  failed: number;
  warningCount: number;
};

type EvalCase = {
  id: string;
  intent: string | null;
  prompt: string;
  durationMs: number | null;
  selectedProjectId: number | null;
  status: string;
  expectedToolNames: string[];
  toolsFired: string[];
  failures: string[];
  warnings: string[];
  answer: string;
};

type SelectedRun = RunSummary & {
  bundleCriteria: string[];
  filter: string | null;
  cases: EvalCase[];
};

type EvalRunsResponse = {
  available: boolean;
  runs: RunSummary[];
  selectedRun: SelectedRun | null;
};

function formatDateTime(value: string | null): string {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(value: number | null): string {
  if (value == null) return "—";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

function targetLabel(baseUrl: string | null): string {
  if (!baseUrl) return "unknown target";
  if (baseUrl.includes("projects.alleatogroup.com")) return "production";
  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) return "local";
  return baseUrl.replace(/^https?:\/\//, "");
}

function isPass(status: string): boolean {
  return status === "pass" || status === "passed";
}

function ToolChips({ tools }: { tools: string[] }) {
  if (tools.length === 0) {
    return <span className="text-xs text-muted-foreground">none</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {tools.map((tool) => (
        <span
          key={tool}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
        >
          {tool}
        </span>
      ))}
    </span>
  );
}

export default function EvalRunsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [runs, setRuns] = React.useState<RunSummary[]>([]);
  const [selectedRun, setSelectedRun] = React.useState<SelectedRun | null>(null);
  const [available, setAvailable] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedCaseId, setExpandedCaseId] = React.useState<string | null>(null);

  const load = React.useCallback(async (runId?: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = runId
        ? `/api/admin/eval-runs?runId=${encodeURIComponent(runId)}`
        : "/api/admin/eval-runs";
      const response = await apiFetch<EvalRunsResponse>(url);
      setRuns(response.runs);
      setSelectedRun(response.selectedRun);
      setAvailable(response.available);
    } catch (loadError) {
      console.error("Failed to load eval runs", loadError);
      setError(
        loadError instanceof Error ? loadError.message : "Eval runs could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load(searchParams?.get("runId") ?? null);
  }, [load, searchParams]);

  const filteredRuns = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return runs;
    return runs.filter((run) =>
      [run.bundleName, run.runId, run.bundleDescription ?? "", targetLabel(run.baseUrl)]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [runs, query]);

  function selectRun(runId: string) {
    setExpandedCaseId(null);
    router.replace(`${pathname}?runId=${encodeURIComponent(runId)}`, { scroll: false });
    void load(runId);
  }

  return (
    <PageShell
      variant="dashboard"
      title="Assistant Eval Runs"
      description="Browse local AI-assistant eval runs: pass/fail per case, the exact tools each prompt fired, failure reasons, and the answer the assistant returned."
      actions={
        <Button
          variant="outline"
          onClick={() => void load(selectedRun?.runId)}
          disabled={isLoading}
        >
          <RefreshCw className={cn("mr-2 size-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      {!available && !isLoading ? (
        <EmptyState
          icon={<FlaskConical />}
          title="No eval runs found on this machine"
          description="Runs are written to docs/ai-plan/evals/runs/ (gitignored, local-only). Run the suite from the CLI, then refresh: node scripts/verify/verify_ai_assistant_eval_suite.mjs --bundle tool-coverage-read-regression"
        />
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(320px,400px)_1fr]">
          <section className="min-w-0 space-y-4">
            <div className="flex justify-end">
              <ExpandableSearch
                value={query}
                onChange={setQuery}
                placeholder="Search runs..."
                ariaLabel="Search eval runs"
              />
            </div>

            {error ? <ErrorState title="Couldn't load eval runs" description={error} /> : null}

            <div className="space-y-3">
              {filteredRuns.map((run) => {
                const isSelected = selectedRun?.runId === run.runId;
                const allPassed = run.failed === 0 && run.totalCases > 0;
                return (
                  <Button
                    key={run.runId}
                    type="button"
                    variant="ghost"
                    onClick={() => selectRun(run.runId)}
                    className={cn(
                      "h-auto w-full justify-start whitespace-normal rounded-md border border-border/70 bg-background p-0 text-left transition-colors hover:border-foreground/20 hover:bg-muted/20",
                      isSelected && "border-foreground/25 bg-muted/30",
                    )}
                  >
                    <span className="flex w-full flex-col gap-3 p-4">
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0 space-y-1">
                          <span className="block truncate font-mono text-sm font-medium text-foreground">
                            {run.bundleName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(run.generatedAt)} · {targetLabel(run.baseUrl)}
                          </span>
                        </span>
                        <StatusBadge
                          status={`${run.passed}/${run.totalCases}`}
                          variant={allPassed ? "success" : "warning"}
                        />
                      </span>
                      <span className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{run.passed} passed</span>
                        {run.failed > 0 ? (
                          <span className="text-destructive">{run.failed} failed</span>
                        ) : null}
                        {run.warningCount > 0 ? <span>{run.warningCount} warnings</span> : null}
                      </span>
                    </span>
                  </Button>
                );
              })}
              {!isLoading && filteredRuns.length === 0 ? (
                <EmptyState
                  icon={<FlaskConical />}
                  title="No runs match"
                  description="Try a different search, or refresh to pick up new runs."
                />
              ) : null}
            </div>
          </section>

          <section className="min-w-0 space-y-6">
            {selectedRun ? (
              <>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="break-all font-mono text-lg font-semibold text-foreground">
                      {selectedRun.bundleName}
                    </h2>
                    <StatusBadge
                      status={`${selectedRun.passed}/${selectedRun.totalCases} passed`}
                      variant={selectedRun.failed === 0 ? "success" : "warning"}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(selectedRun.generatedAt)} · {targetLabel(selectedRun.baseUrl)} ·{" "}
                    {selectedRun.failed} failed · {selectedRun.warningCount} warnings
                  </p>
                  {selectedRun.bundleDescription ? (
                    <p className="max-w-3xl text-sm text-muted-foreground">
                      {selectedRun.bundleDescription}
                    </p>
                  ) : null}
                </div>

                <div className="divide-y divide-border/60 overflow-hidden rounded-md border border-border/70">
                  {selectedRun.cases.map((evalCase) => {
                    const expanded = expandedCaseId === evalCase.id;
                    const pass = isPass(evalCase.status);
                    return (
                      <div key={evalCase.id} className="bg-background">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setExpandedCaseId(expanded ? null : evalCase.id)
                          }
                          className="h-auto w-full items-start justify-start gap-3 rounded-none px-4 py-3 text-left whitespace-normal hover:bg-muted/40"
                        >
                          {expanded ? (
                            <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="min-w-0 flex-1 space-y-1.5">
                            <span className="flex items-center justify-between gap-3">
                              <span className="truncate font-mono text-sm font-medium text-foreground">
                                {evalCase.id}
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatDuration(evalCase.durationMs)}
                                </span>
                                <StatusBadge
                                  status={pass ? "Pass" : "Fail"}
                                  variant={pass ? "success" : "error"}
                                />
                              </span>
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {evalCase.prompt}
                            </span>
                          </span>
                        </Button>

                        {expanded ? (
                          <div className="space-y-4 border-t border-border/50 bg-muted/10 px-4 py-4 pl-11">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Expected tool(s)
                                </p>
                                <ToolChips tools={evalCase.expectedToolNames} />
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Tools that actually fired
                                </p>
                                <ToolChips tools={evalCase.toolsFired} />
                              </div>
                            </div>

                            {evalCase.failures.length > 0 ? (
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Why it failed
                                </p>
                                <ul className="space-y-1">
                                  {evalCase.failures.map((failure, index) => (
                                    <li key={index} className="text-xs text-destructive">
                                      {failure}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {evalCase.warnings.length > 0 ? (
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Warnings
                                </p>
                                <ul className="space-y-1">
                                  {evalCase.warnings.map((warning, index) => (
                                    <li key={index} className="text-xs text-muted-foreground">
                                      {warning}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground">
                                Assistant answer
                              </p>
                              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-background p-3 text-xs leading-6 text-foreground">
                                {evalCase.answer.trim() ||
                                  "No answer text was captured for this case."}
                              </pre>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyState
                icon={<FlaskConical />}
                title="No run selected"
                description="Choose a run on the left to see per-case results, tools fired, and answers."
              />
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}
