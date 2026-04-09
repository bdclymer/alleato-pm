"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/layout";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Camera,
  ChevronLeft,
  BookOpen,
  Play,
  History,
  ChevronDown,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type TestStatus = "pass" | "fail" | "skip" | "not_tested";

interface TestCase {
  id: string;
  test_number: string;
  category: string;
  subcategory: string | null;
  test_name: string;
  steps: string | null;
  setup_steps: string | null;
  context_note: string | null;
  expected_result: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  start_url: string | null;
}

interface TestResult {
  id: string;
  status: TestStatus;
  notes: string | null;
  test_cases: TestCase;
  test_screenshots: { id: string; public_url: string | null; label: string | null }[];
}

interface Suite {
  id: string;
  tool_name: string;
  display_name: string;
  scenario_count: number;
  feature_count: number;
}

interface HistoryRun {
  id: string;
  run_date: string;
  tester: string | null;
  environment: string | null;
  branch: string | null;
  total: number;
  pass: number;
  fail: number;
  skip: number;
  not_tested: number;
}

interface RunDetailResult {
  id: string;
  status: TestStatus;
  notes: string | null;
  test_cases: {
    test_number: string;
    category: string;
    test_name: string;
    priority: string;
  };
}

// ─── View States ─────────────────────────────────────────────────────────────

type View = "home" | "start-run" | "running" | "complete" | "history" | "run-detail";

// ─── Helpers ─────────────────────────────────────────────────────────────────


function parseSteps(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split("\n").filter(Boolean).map((s) => s.replace(/^\d+\.\s*/, "").trim());
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TestingPage() {
  const [view, setView] = useState<View>("home");
  const [suites, setSuites] = useState<Suite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<Suite | null>(null);
  const [runForm, setRunForm] = useState({ tester: "", environment: typeof window !== "undefined" ? window.location.host : "", branch: "main", notes: "" });
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [issueNotes, setIssueNotes] = useState("");
  const [showIssueBox, setShowIssueBox] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [historyRuns, setHistoryRuns] = useState<HistoryRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetailResult[]>([]);
  const [runDetailLoading, setRunDetailLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // ── Load suites + pre-fill tester name from session ──
  useEffect(() => {
    fetch("/api/testing/suites")
      .then((r) => r.json())
      .then((d) => setSuites((d.suites ?? []).filter((s: Suite) => s.scenario_count > 0)));

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!user) return;
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "";
      setRunForm((f) => ({ ...f, tester: name }));
    });
  }, []);

  // ── Load history for a suite ──
  const openHistory = async (suite: Suite) => {
    setSelectedSuite(suite);
    setHistoryLoading(true);
    setHistoryRuns([]);
    setView("history");
    const res = await fetch(`/api/testing/runs?suite=${suite.tool_name}`);
    if (res.ok) {
      const d = await res.json();
      setHistoryRuns(d.runs ?? []);
    }
    setHistoryLoading(false);
  };

  // ── Load detail for a single run ──
  const openRunDetail = async (runId: string) => {
    setExpandedRunId(runId);
    setRunDetailLoading(true);
    setRunDetail([]);
    setView("run-detail");
    const res = await fetch(`/api/testing/runs/${runId}/results`);
    if (res.ok) {
      const d = await res.json();
      setRunDetail(d.results ?? []);
    }
    setRunDetailLoading(false);
  };

  // ── Reset step checkboxes when scenario changes ──
  useEffect(() => {
    setCheckedSteps({});
    setIssueNotes("");
    setShowIssueBox(false);
  }, [cursor]);

  const current = results[cursor] ?? null;
  const steps = parseSteps(current?.test_cases?.steps ?? null);
  const doneCount = results.filter((r) => r.status !== "not_tested").length;
  const pct = results.length > 0 ? Math.round((doneCount / results.length) * 100) : 0;

  // ── Start a run ──
  const startRun = async () => {
    if (!selectedSuite) return;
    setStartError(null);
    setSaving(true);
    const res = await fetch("/api/testing/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suite: selectedSuite.tool_name, ...runForm }),
    });
    if (res.ok) {
      const { run_id } = await res.json();
      setActiveRunId(run_id);
      const r2 = await fetch(`/api/testing/runs/${run_id}/results?type=scenario`);
      const d2 = await r2.json();
      const loaded = d2.results ?? [];
      if (loaded.length === 0) {
        setStartError("No scenario test cases found for this tool. Check that the test suite has been seeded.");
      } else {
        setResults(loaded);
        setCursor(0);
        setView("running");
      }
    } else {
      const err = await res.json().catch(() => ({}));
      setStartError(err.error ?? "Failed to create test run. Please try again.");
    }
    setSaving(false);
  };

  // ── Record outcome ──
  const record = useCallback(async (status: TestStatus) => {
    if (!current || !activeRunId) return;
    setSaving(true);
    const res = await fetch(`/api/testing/runs/${activeRunId}/results/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes: issueNotes || null }),
    });
    if (res.ok) {
      const { result } = await res.json();
      setResults((prev) =>
        prev.map((r) => r.id === current.id ? { ...r, status: result.status, notes: result.notes } : r)
      );
      if (cursor < results.length - 1) {
        setCursor((c) => c + 1);
      } else {
        setView("complete");
      }
    }
    setSaving(false);
  }, [current, activeRunId, issueNotes, cursor, results.length]);

  // ── Screenshot upload ──
  const handleFile = useCallback(async (file: File) => {
    if (!current || !activeRunId) return;
    setUploadingScreenshot(true);
    const reader = new FileReader();
    reader.onload = async () => {
      await fetch(`/api/testing/runs/${activeRunId}/results/${current.id}/screenshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: reader.result, label: file.name }),
      });
      const r2 = await fetch(`/api/testing/runs/${activeRunId}/results`);
      const d2 = await r2.json();
      setResults(d2.results ?? []);
      setUploadingScreenshot(false);
    };
    reader.readAsDataURL(file);
  }, [current, activeRunId]);

  // ─── View: HOME ────────────────────────────────────────────────────────────
  if (view === "home") {
    const FINANCIAL = new Set([
      "budget",
      "prime-contracts",
      "commitments",
      "change-events",
      "change-orders",
      "direct-costs",
      "invoicing",
      "invoices",
    ]);
    const categoryFor = (tool: string): "Financial" | "Project Management" => {
      const key = tool.toLowerCase();
      if (FINANCIAL.has(key) || key.includes("budget") || key.includes("cost") || key.includes("invoice") || key.includes("contract") || key.includes("change")) {
        return "Financial";
      }
      return "Project Management";
    };

    const grouped = suites.reduce<Record<string, Suite[]>>((acc, s) => {
      const cat = categoryFor(s.tool_name);
      (acc[cat] ||= []).push(s);
      return acc;
    }, {});
    const order: Array<"Financial" | "Project Management"> = ["Financial", "Project Management"];

    return (
      <PageShell variant="content" title="Testing" description="Browse scenarios or start an interactive test session">
        <div className="space-y-10">
          {suites.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-12">No test scenarios available yet.</p>
          )}
          {order.filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{cat}</h2>
              {/* Mobile: stacked list */}
              <div className="sm:hidden divide-y divide-border rounded-md border border-border bg-card">
                {grouped[cat].map((suite) => (
                  <div key={suite.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{suite.display_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {suite.scenario_count} scenarios
                          {suite.feature_count ? ` · ${suite.feature_count} feature checks` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/procore-tools/${suite.tool_name}?tab=test-scenarios`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-muted-foreground"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Review
                      </Link>
                      <button
                        type="button"
                        onClick={() => openHistory(suite)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-muted-foreground"
                      >
                        <History className="h-3.5 w-3.5" />
                        Results
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedSuite(suite); setView("start-run"); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground ml-auto"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Run
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto rounded-md border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th style={{ fontSize: "10px" }} className="text-left font-semibold uppercase tracking-wider text-foreground px-5 py-2">Tool</th>
                      <th style={{ fontSize: "10px" }} className="text-left font-semibold uppercase tracking-wider text-foreground px-5 py-2 w-28 whitespace-nowrap">Scenarios</th>
                      <th style={{ fontSize: "10px" }} className="text-left font-semibold uppercase tracking-wider text-foreground px-5 py-2 w-44 whitespace-nowrap">Feature checks</th>
                      <th style={{ fontSize: "10px" }} className="text-right font-semibold uppercase tracking-wider text-foreground px-5 py-2 w-72">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {grouped[cat].map((suite) => (
                      <tr key={suite.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium">{suite.display_name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{suite.scenario_count}</td>
                        <td className="px-5 py-3 text-muted-foreground">{suite.feature_count || "—"}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <Link
                              href={`/procore-tools/${suite.tool_name}?tab=test-scenarios`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              Review
                            </Link>
                            <button
                              type="button"
                              onClick={() => openHistory(suite)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <History className="h-3.5 w-3.5" />
                              Results
                            </button>
                            <button
                              type="button"
                              onClick={() => { setSelectedSuite(suite); setView("start-run"); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              <Play className="h-3.5 w-3.5" />
                              Run
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  // ─── View: START RUN ───────────────────────────────────────────────────────
  if (view === "start-run") {
    return (
      <PageShell
        variant="form"
        title={selectedSuite?.display_name ?? "Test Session"}
        description="Start a new test session"
        onBack={() => setView("home")}
      >
        <div className="space-y-6">
          <div className="bg-muted/40 rounded-xl px-5 py-4 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Before you start</p>
            <p>Make sure you&apos;re logged into the app you&apos;re testing.</p>
            <p>Each test takes 1–3 minutes. You&apos;ll follow step-by-step instructions and mark each test passed, failed, or skipped.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Your name</Label>
              <Input
                value={runForm.tester}
                onChange={(e) => setRunForm((f) => ({ ...f, tester: e.target.value }))}
                placeholder="e.g. Megan"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Input
                value={runForm.environment}
                onChange={(e) => setRunForm((f) => ({ ...f, environment: e.target.value }))}
                placeholder="localhost:3000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Branch <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={runForm.branch}
                onChange={(e) => setRunForm((f) => ({ ...f, branch: e.target.value }))}
                placeholder="main"
              />
            </div>
          </div>

          {startError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-4 py-3">{startError}</p>
          )}

          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={startRun}
            disabled={saving || !runForm.tester.trim()}
          >
            {saving ? "Setting up…" : `Start ${selectedSuite?.display_name} testing →`}
          </Button>
          {!runForm.tester.trim() && (
            <p className="text-xs text-center text-muted-foreground">Enter your name above to begin</p>
          )}
        </div>
      </PageShell>
    );
  }

  // ─── View: COMPLETE ────────────────────────────────────────────────────────
  if (view === "complete") {
    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const skipped = results.filter((r) => r.status === "skip").length;
    return (
      <PageShell variant="content" title="Session Complete">
        <div className="text-center space-y-6">
          <div className="text-5xl">{failed === 0 ? "🎉" : "📋"}</div>
          <p className="text-muted-foreground">
            {selectedSuite?.display_name} · {runForm.tester}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-4">
              <p className="text-2xl font-bold text-green-600">{passed}</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">Passed</p>
            </div>
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-4">
              <p className="text-2xl font-bold text-red-500">{failed}</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Failed</p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="text-2xl font-bold text-muted-foreground">{skipped}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Skipped</p>
            </div>
          </div>
          {failed > 0 && (
            <div className="text-left space-y-2">
              <p className="text-sm font-medium">Failed tests:</p>
              {results.filter((r) => r.status === "fail").map((r) => (
                <div key={r.id} className="text-sm bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">
                  <p className="font-medium">{r.test_cases?.test_name}</p>
                  {r.notes && <p className="text-muted-foreground text-xs mt-0.5">{r.notes}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setView("home"); setSelectedSuite(null); setResults([]); setActiveRunId(null); setCursor(0); }}>
              Back to home
            </Button>
            <Button type="button" className="flex-1" onClick={() => { setView("start-run"); setCursor(0); }}>
              Run again
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ─── View: HISTORY ────────────────────────────────────────────────────────
  if (view === "history") {
    const passRate = (run: HistoryRun) =>
      run.total > 0 ? Math.round((run.pass / run.total) * 100) : 0;

    return (
      <PageShell
        variant="content"
        title={`${selectedSuite?.display_name ?? ""} — Results`}
        description="Past test runs"
        onBack={() => setView("home")}
      >
        <div className="space-y-3">
          {historyLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>}
          {!historyLoading && historyRuns.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No runs yet. Click Run to start the first session.</p>
          )}
          {historyRuns.map((run) => (
            <div key={run.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => openRunDetail(run.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {new Date(run.run_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {run.tester && <span className="text-muted-foreground font-normal"> · {run.tester}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {run.environment ?? "localhost:3000"}
                    {run.branch && ` · ${run.branch}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-600 font-semibold">{run.pass} ✓</span>
                    {run.fail > 0 && <span className="text-red-500 font-semibold">{run.fail} ✗</span>}
                    {run.skip > 0 && <span className="text-muted-foreground">{run.skip} –</span>}
                  </div>
                  <div className="w-16 text-right">
                    <span className={`text-sm font-bold ${passRate(run) === 100 ? "text-green-600" : passRate(run) >= 70 ? "text-amber-500" : "text-red-500"}`}>
                      {passRate(run)}%
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  // ─── View: RUN DETAIL ──────────────────────────────────────────────────────
  if (view === "run-detail") {
    const grouped = runDetail.reduce<Record<string, RunDetailResult[]>>((acc, r) => {
      const cat = r.test_cases?.category ?? "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(r);
      return acc;
    }, {});

    const statusIcon = (s: TestStatus) => {
      if (s === "pass") return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
      if (s === "fail") return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
      if (s === "skip") return <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />;
      return <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />;
    };

    return (
      <PageShell
        variant="content"
        title={`${selectedSuite?.display_name ?? ""} — Run Detail`}
        onBack={() => setView("history")}
      >
        <div className="space-y-6">
          {runDetailLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>}
          {!runDetailLoading && Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{category}</p>
              <div className="space-y-1">
                {items.map((r) => (
                  <div key={r.id} className={`flex items-start gap-3 px-4 py-3 rounded-lg ${r.status === "fail" ? "bg-red-50 dark:bg-red-950/20" : r.status === "pass" ? "bg-green-50/50 dark:bg-green-950/10" : "bg-muted/20"}`}>
                    {statusIcon(r.status)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        <span className="text-muted-foreground text-xs mr-1.5">{r.test_cases?.test_number}</span>
                        {r.test_cases?.test_name}
                      </p>
                      {r.notes && <p className="text-xs text-muted-foreground mt-0.5">{r.notes}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{r.test_cases?.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  // ─── View: RUNNING ─────────────────────────────────────────────────────────
  if (!current) return null;
  const tc = current.test_cases;

  return (
    <PageShell variant="content" title="" showHeader={false}>
      {/* Progress bar — spans full container */}
      <div className="h-1.5 bg-muted -mt-2 mb-0">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }} // eslint-disable-line react/forbid-component-props
        />
      </div>

      {/* Run header */}
      <div className="flex items-center justify-between border-b border-border py-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Previous scenario"
            onClick={() => setCursor((c) => Math.max(c - 1, 0))}
            disabled={cursor === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{cursor + 1}</span> / {results.length}
          </span>
        </div>
        <p className="text-sm font-medium">{selectedSuite?.display_name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-green-600 font-medium">{results.filter((r) => r.status === "pass").length} ✓</span>
          <span className="text-red-500 font-medium">{results.filter((r) => r.status === "fail").length} ✗</span>
        </div>
      </div>

      <div className="space-y-6 pb-12">

        {/* Category chip + test number */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 font-medium">
            {tc.category}{tc.subcategory ? ` · ${tc.subcategory}` : ""}
          </span>
          <span className="text-xs text-muted-foreground font-mono">#{tc.test_number}</span>
          {tc.priority === "HIGH" && (
            <span className="text-xs bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 rounded-full px-2.5 py-0.5 font-medium">
              High priority
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-semibold leading-snug tracking-tight">{tc.test_name}</h2>

        {/* Context note (plain English "what this tests") */}
        {tc.context_note && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
            <span className="font-medium">What this checks: </span>{tc.context_note}
          </div>
        )}

        {/* Setup steps ("Before you start") */}
        {tc.setup_steps && (
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">Before you start</p>
            {parseSteps(tc.setup_steps).map((s, i) => (
              <p key={i} className="text-sm text-amber-900 dark:text-amber-300">· {s}</p>
            ))}
          </div>
        )}

        {/* Open in app button */}
        {tc.start_url && (
          <a
            href={(() => { try { return new URL(tc.start_url ?? "").pathname; } catch { return tc.start_url ?? "#"; } })()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            Open the app at the right page →
          </a>
        )}

        {/* Steps */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Steps</p>
          {steps.map((step, i) => (
            <label
              key={i}
              className={cn(
                "flex items-start gap-3 cursor-pointer py-1.5 transition-all select-none",
                checkedSteps[i] && "opacity-70"
              )}
            >
              <div className={cn(
                "mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all",
                checkedSteps[i] ? "border-green-500 bg-green-500" : "border-muted-foreground/40"
              )}>
                {checkedSteps[i] && <CheckCircle2 className="h-4 w-4 text-white" />}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={!!checkedSteps[i]}
                onChange={(e) => setCheckedSteps((prev) => ({ ...prev, [i]: e.target.checked }))}
              />
              <span className={cn(
                "text-sm leading-relaxed",
                checkedSteps[i] && "line-through text-muted-foreground"
              )}>
                <span className="font-medium text-muted-foreground mr-2">{i + 1}.</span>
                {step}
              </span>
            </label>
          ))}
        </div>

        {/* Expected result */}
        {tc.expected_result && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">What should happen</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {tc.expected_result}
            </p>
          </div>
        )}

        {/* Issue notes box (shown when Fail is tapped) */}
        {showIssueBox && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Describe what went wrong
            </Label>
            <Textarea
              autoFocus
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              placeholder="e.g. The save button didn't respond, page showed an error message…"
              className="resize-none h-24 text-sm"
            />
          </div>
        )}

        {/* Screenshots */}
        {current.test_screenshots.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Screenshots</p>
            <div className="flex flex-wrap gap-2">
              {current.test_screenshots.map((s) => (
                <a key={s.id} href={s.public_url ?? "#"} target="_blank" rel="noopener noreferrer">
                  <img
                    src={s.public_url ?? ""}
                    alt={s.label ?? "screenshot"}
                    className="h-24 w-auto rounded-lg border border-border object-cover hover:opacity-80 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Verdict buttons ── */}
        <div className="pt-2 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={async () => { setShowIssueBox(false); await record("pass"); }}
              disabled={saving}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white h-12 text-sm font-semibold rounded-xl"
            >
              <CheckCircle2 className="h-4 w-4" />
              Passed
            </Button>
            <Button
              onClick={() => setShowIssueBox((v) => !v)}
              disabled={saving}
              variant="destructive"
              className="gap-2 h-12 text-sm font-semibold rounded-xl"
            >
              <XCircle className="h-4 w-4" />
              {showIssueBox ? "Confirm →" : "Issue found"}
            </Button>
            <Button
              onClick={async () => { setShowIssueBox(false); await record("skip"); }}
              disabled={saving}
              variant="outline"
              className="gap-2 h-12 text-sm font-semibold rounded-xl"
            >
              <MinusCircle className="h-4 w-4" />
              Skip
            </Button>
          </div>

          {/* Confirm fail when issue box is open */}
          {showIssueBox && (
            <Button
              onClick={() => record("fail")}
              disabled={saving}
              variant="destructive"
              className="w-full h-10 text-sm rounded-xl"
            >
              Save issue &amp; continue →
            </Button>
          )}

          {/* Screenshot upload */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              aria-label="Upload screenshot"
              title="Upload screenshot"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingScreenshot}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted"
            >
              <Camera className="h-3.5 w-3.5" />
              {uploadingScreenshot ? "Uploading…" : "Attach screenshot"}
            </button>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
