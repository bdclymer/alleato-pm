"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RunnerStepList } from "../../_components/RunnerStepList";
import { RunnerActionBar } from "../../_components/RunnerActionBar";
import { ProgressBar } from "../../_components/ProgressBar";
import { RunSummaryTiles } from "../../_components/RunSummaryTiles";
import type { TestResult, TestStatus } from "../../_components/types";

// Runner: top progress, center steps (the star), bottom action bar.
// One route handles both "in-progress" and "complete" states based on
// whether any not_tested results remain.
export default function RunPage() {
  const params = useParams<{ runId: string }>();
  const router = useRouter();
  const runId = params.runId;

  const [results, setResults] = useState<TestResult[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    apiFetch<{ results?: TestResult[] }>(`/api/testing/runs/${runId}/results`)
      .then((d) => {
        const loaded = d.results ?? [];
        setResults(loaded);
        const firstUntested = loaded.findIndex((r) => r.status === "not_tested");
        setCursor(firstUntested >= 0 ? firstUntested : 0);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load run."),
      )
      .finally(() => setLoading(false));
  }, [runId]);

  const current = results[cursor] ?? null;

  useEffect(() => {
    // Reset notes when navigating between cases.
    setNotes(current?.notes ?? "");
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = { pass: 0, fail: 0, skip: 0, notTested: 0 };
    for (const r of results) {
      if (r.status === "pass") c.pass++;
      else if (r.status === "fail") c.fail++;
      else if (r.status === "skip") c.skip++;
      else c.notTested++;
    }
    return c;
  }, [results]);

  const allGraded = results.length > 0 && counts.notTested === 0;

  const record = useCallback(
    async (status: TestStatus) => {
      if (!current) return;
      setSaving(true);
      setError(null);
      try {
        const { result } = await apiFetch<{ result: TestResult }>(
          `/api/testing/runs/${runId}/results/${current.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status, notes: notes.trim() || null }),
          },
        );
        setResults((prev) =>
          prev.map((r) =>
            r.id === current.id
              ? { ...r, status: result.status, notes: result.notes }
              : r,
          ),
        );
        if (cursor < results.length - 1) {
          setCursor((c) => c + 1);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unable to save.";
        setError(msg);
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    },
    [current, runId, notes, cursor, results.length],
  );

  // Keyboard shortcuts for pass/skip/issue navigation.
  useEffect(() => {
    if (allGraded || !current) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        void record("pass");
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        void record("skip");
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        void record("fail");
      } else if (e.key === "ArrowLeft") {
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "ArrowRight") {
        setCursor((c) => Math.min(results.length - 1, c + 1));
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [record, allGraded, current, results.length]);

  if (loading) {
    return (
      <PageShell variant="content" title="Run" showHeader={false}>
        <p className="text-sm text-muted-foreground">Loading run…</p>
      </PageShell>
    );
  }

  if (error && results.length === 0) {
    return (
      <PageShell variant="content" title="Run">
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      </PageShell>
    );
  }

  // ── Complete state ──────────────────────────────────────────────────────
  if (allGraded) {
    return (
      <PageShell
        variant="content"
        title="Run complete"
        description="All cases have been graded."
        onBack={() => router.push("/testing/runs")}
        backLabel="All runs"
      >
        <RunSummaryTiles
          pass={counts.pass}
          fail={counts.fail}
          skip={counts.skip}
          total={results.length}
        />
        <section className="space-y-3 border-t border-border pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Results
          </h2>
          <ul className="divide-y divide-border">
            {results.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-4 px-1 py-3 text-sm"
              >
                <StatusDot status={r.status} />
                <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
                  {r.test_cases.test_number}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {r.test_cases.test_name}
                </span>
                {r.notes && (
                  <span className="truncate text-xs text-muted-foreground">
                    {r.notes}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </PageShell>
    );
  }

  // ── Runner state ────────────────────────────────────────────────────────
  if (!current) return null;
  const tc = current.test_cases;

  return (
    <PageShell
      variant="content"
      title={tc.test_name}
      description={`${tc.test_number} · ${tc.category}${tc.subcategory ? ` · ${tc.subcategory}` : ""}`}
      onBack={() => router.push("/testing/runs")}
      backLabel="All runs"
    >
      {/* Progress = the KPI. Segmented bar + inline counts replaces the 5-cell grid. */}
      <ProgressBar
        pass={counts.pass}
        fail={counts.fail}
        skip={counts.skip}
        notTested={counts.notTested}
      />

      {/* Nav between cases */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCursor((c) => Math.max(0, c - 1))}
          disabled={cursor === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <span>
          Case {cursor + 1} of {results.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCursor((c) => Math.min(results.length - 1, c + 1))}
          disabled={cursor === results.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {tc.context_note && (
        <p className="rounded-md bg-muted/60 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {tc.context_note}
        </p>
      )}

      {tc.setup_steps && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Setup
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {tc.setup_steps}
          </p>
        </section>
      )}

      {/* Steps are the star of the runner view. */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Steps
        </h2>
        <RunnerStepList steps={tc.steps} />
      </section>

      {tc.expected_result && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Expected
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {tc.expected_result}
          </p>
        </section>
      )}

      {tc.start_url && (
        <p className="text-xs text-muted-foreground">
          Start at:{" "}
          <Link
            href={tc.start_url}
            target="_blank"
            className="text-primary hover:underline"
          >
            {tc.start_url}
          </Link>
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notes
        </h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about this case…"
          rows={3}
        />
      </section>

      <RunnerActionBar
        onPass={() => void record("pass")}
        onFail={() => void record("fail")}
        onSkip={() => void record("skip")}
        disabled={saving}
      />
    </PageShell>
  );
}

function StatusDot({ status }: { status: TestStatus }) {
  const tone =
    status === "pass"
      ? "bg-success"
      : status === "fail"
      ? "bg-destructive"
      : status === "skip"
      ? "bg-muted-foreground/40"
      : "bg-muted";
  return (
    <span className={cn("h-2 w-2 shrink-0 rounded-full", tone)} aria-hidden />
  );
}
