"use client";

/**
 * TestRunsTab — scripted manual-QA scenarios for the current tool.
 *
 * Data model (already exists): test_suites → test_cases → test_runs → test_results.
 * This component lets a tester:
 *   1. See all scenarios for a tool (e.g. "budget")
 *   2. Start a run (pre-creates one not_tested result per case)
 *   3. Mark each case Pass / Fail / Skip and add notes
 *
 * Drop into the dev panel with:
 *   <TestRunsTab tool="budget" />
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, SkipForward, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Priority = "HIGH" | "MEDIUM" | "LOW";
type Status = "pass" | "fail" | "skip" | "not_tested";

interface TestCase {
  id: string;
  test_number: string;
  category: string;
  subcategory: string | null;
  test_name: string;
  steps: string | null;
  expected_result: string | null;
  priority: Priority;
}

interface TestResult {
  id: string;
  case_id: string;
  status: Status;
  notes: string | null;
  test_cases: Pick<TestCase, "test_number" | "test_name" | "category" | "steps" | "expected_result" | "priority">;
}

interface ActiveRun {
  id: string;
  results: TestResult[];
}

interface Props {
  tool: string;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: "bg-destructive/10 text-destructive",
  MEDIUM: "bg-primary/10 text-primary",
  LOW: "bg-muted text-muted-foreground",
};

export function TestRunsTab({ tool }: Props) {
  const [loading, setLoading] = useState(true);
  const [suiteId, setSuiteId] = useState<string | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [starting, setStarting] = useState(false);

  const loadSuite = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dev/test-suites/${tool}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSuiteId(json.suite?.id ?? null);
      setCases(json.cases ?? []);
    } catch (err) {
      toast.error(`Failed to load test suite: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [tool]);

  useEffect(() => {
    loadSuite();
  }, [loadSuite]);

  const startRun = useCallback(async () => {
    if (!suiteId) return;
    setStarting(true);
    try {
      const res = await fetch("/api/dev/test-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suite_id: suiteId, branch: "main" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { run } = await res.json();

      const detail = await fetch(`/api/dev/test-runs/${run.id}`);
      const detailJson = await detail.json();
      setActiveRun({ id: run.id, results: detailJson.results ?? [] });
      toast.success("Test run started");
    } catch (err) {
      toast.error(`Failed to start run: ${(err as Error).message}`);
    } finally {
      setStarting(false);
    }
  }, [suiteId]);

  const updateResult = useCallback(
    async (resultId: string, patch: { status?: Status; notes?: string }) => {
      // Optimistic
      setActiveRun((prev) =>
        prev
          ? {
              ...prev,
              results: prev.results.map((r) =>
                r.id === resultId ? { ...r, ...patch } : r,
              ),
            }
          : prev,
      );
      try {
        const res = await fetch(`/api/dev/test-results/${resultId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        toast.error(`Save failed: ${(err as Error).message}`);
      }
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading test suite…
      </div>
    );
  }

  if (!suiteId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No test suite found for <code className="font-mono">{tool}</code>. Seed one in
        <code className="font-mono"> test_suites</code> / <code className="font-mono">test_cases</code>.
      </div>
    );
  }

  // Idle view — show the scenarios and a Start Run button.
  if (!activeRun) {
    return (
      <div className="space-y-4 p-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{cases.length} scenarios for {tool}</div>
            <div className="text-xs text-muted-foreground">Start a run to mark each one pass / fail / skip.</div>
          </div>
          <Button onClick={startRun} disabled={starting} size="sm">
            {starting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Start run
          </Button>
        </div>

        <ol className="space-y-2">
          {cases.map((c) => (
            <li key={c.id} className="rounded border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">
                  <span className="font-mono text-xs text-muted-foreground mr-2">{c.test_number}</span>
                  {c.test_name}
                </div>
                <Badge className={PRIORITY_COLOR[c.priority]} variant="secondary">
                  {c.priority}
                </Badge>
              </div>
              {c.category && (
                <div className="text-xs text-muted-foreground mt-1">{c.category}{c.subcategory ? ` · ${c.subcategory}` : ""}</div>
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // Active run — show each result as a card with pass/fail/skip + notes.
  const total = activeRun.results.length;
  const done = activeRun.results.filter((r) => r.status !== "not_tested").length;

  return (
    <div className="space-y-3 p-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Run in progress — {done}/{total} complete
        </div>
        <Button variant="outline" size="sm" onClick={() => setActiveRun(null)}>
          Close run
        </Button>
      </div>

      <ol className="space-y-3">
        {activeRun.results
          .slice()
          .sort((a, b) =>
            a.test_cases.test_number.localeCompare(b.test_cases.test_number, undefined, { numeric: true }),
          )
          .map((r) => (
            <li key={r.id} className="rounded border border-border p-3 space-y-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">
                  <span className="font-mono text-xs text-muted-foreground mr-2">
                    {r.test_cases.test_number}
                  </span>
                  {r.test_cases.test_name}
                </div>
                <Badge className={PRIORITY_COLOR[r.test_cases.priority]} variant="secondary">
                  {r.test_cases.priority}
                </Badge>
              </div>

              {r.test_cases.steps && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Steps</div>
                  <pre className="whitespace-pre-wrap font-sans text-xs mt-1">{r.test_cases.steps}</pre>
                </div>
              )}
              {r.test_cases.expected_result && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Expected</div>
                  <div className="text-xs mt-1">{r.test_cases.expected_result}</div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={r.status === "pass" ? "default" : "outline"}
                  onClick={() => updateResult(r.id, { status: "pass" })}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Pass
                </Button>
                <Button
                  size="sm"
                  variant={r.status === "fail" ? "destructive" : "outline"}
                  onClick={() => updateResult(r.id, { status: "fail" })}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Fail
                </Button>
                <Button
                  size="sm"
                  variant={r.status === "skip" ? "secondary" : "outline"}
                  onClick={() => updateResult(r.id, { status: "skip" })}
                >
                  <SkipForward className="h-4 w-4 mr-1" /> Skip
                </Button>
              </div>

              <Textarea
                placeholder="Notes (what happened, what was weird)…"
                value={r.notes ?? ""}
                onChange={(e) =>
                  setActiveRun((prev) =>
                    prev
                      ? {
                          ...prev,
                          results: prev.results.map((x) =>
                            x.id === r.id ? { ...x, notes: e.target.value } : x,
                          ),
                        }
                      : prev,
                  )
                }
                onBlur={(e) => updateResult(r.id, { notes: e.target.value })}
                className="text-xs"
                rows={2}
              />
            </li>
          ))}
      </ol>
    </div>
  );
}
