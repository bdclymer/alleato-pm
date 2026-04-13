"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
type Severity = "critical" | "major" | "minor" | "cosmetic" | "";
type ScenarioDepth = "broad" | "detailed" | "all";

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
  scenario_depth?: "broad" | "detailed" | null;
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
  broad_scenario_count: number;
  detailed_scenario_count: number;
  feature_count: number;
}

interface HistoryRun {
  id: string;
  run_date: string;
  tester: string | null;
  environment: string | null;
  branch: string | null;
  scenario_depth: ScenarioDepth;
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

function depthLabel(depth: ScenarioDepth): string {
  if (depth === "broad") return "Broad";
  if (depth === "detailed") return "Detailed";
  return "All";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TestingPage() {
  const [view, setView] = useState<View>("home");
  const [suites, setSuites] = useState<Suite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<Suite | null>(null);
  const [runForm, setRunForm] = useState({
    tester: "",
    environment: typeof window !== "undefined" ? window.location.host : "",
    branch: "main",
    notes: "",
    projectId: "",
    scenarioDepth: "broad" as ScenarioDepth,
  });
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [severityMap, setSeverityMap] = useState<Record<string, Severity>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [historyRuns, setHistoryRuns] = useState<HistoryRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [runDetail, setRunDetail] = useState<RunDetailResult[]>([]);
  const [runDetailLoading, setRunDetailLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [showJumpList, setShowJumpList] = useState(false);
  const [inProgressRuns, setInProgressRuns] = useState<{ run: HistoryRun; suiteName: string; suiteDisplayName: string }[]>([]);
  const jumpListRef = useRef<HTMLDivElement>(null);

  // ── Load suites + pre-fill tester name from session ──
  useEffect(() => {
    fetch("/api/testing/suites")
      .then((r) => r.json())
      .then((d) => {
        const loaded: Suite[] = (d.suites ?? []).filter((s: Suite) => s.scenario_count > 0);
        setSuites(loaded);

        // Fetch in-progress runs for each suite
        Promise.all(
          loaded.map((suite) =>
            fetch(`/api/testing/runs?suite=${suite.tool_name}`)
              .then((r) => r.ok ? r.json() : { runs: [] })
              .then((data) => {
                const incomplete = (data.runs ?? []).filter((run: HistoryRun) => run.not_tested > 0);
                return incomplete.map((run: HistoryRun) => ({
                  run,
                  suiteName: suite.tool_name,
                  suiteDisplayName: suite.display_name,
                }));
              })
              .catch(() => [])
          )
        ).then((results) => {
          const flat = results.flat();
          setInProgressRuns(flat);
        });
      });

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

  // ── Restore notes from localStorage when runId changes ──
  useEffect(() => {
    if (!activeRunId) return;
    const saved = localStorage.getItem(`testing-notes-${activeRunId}`);
    if (saved) {
      try {
        setNotesMap(JSON.parse(saved));
      } catch {
        // ignore malformed
      }
    }
  }, [activeRunId]);

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

  // ── Reset step checkboxes when scenario changes (notes persist per result ID) ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCheckedSteps({});
  }, [cursor]); // cursor is intentional — reset checkboxes when navigating tests

  // ── Close jump list on outside click ──
  useEffect(() => {
    if (!showJumpList) return;
    const handler = (e: MouseEvent) => {
      if (jumpListRef.current && !jumpListRef.current.contains(e.target as Node)) {
        setShowJumpList(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showJumpList]);

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
      body: JSON.stringify({ suite: selectedSuite.tool_name, testType: "scenario", ...runForm }),
    });
    if (res.ok) {
      const { run_id, effective_depth } = await res.json();
      if (effective_depth && effective_depth !== runForm.scenarioDepth) {
        setRunForm((f) => ({ ...f, scenarioDepth: effective_depth as ScenarioDepth }));
      }
      setActiveRunId(run_id);
      const r2 = await fetch(`/api/testing/runs/${run_id}/results?type=scenario`);
      const d2 = await r2.json();
      const loaded = d2.results ?? [];
      if (loaded.length === 0) {
        setStartError(
          runForm.scenarioDepth === "broad"
            ? "No broad scenarios found for this tool yet. Switch to Detailed or All, or seed broad scenarios."
            : "No scenario test cases found for this tool. Check that the test suite has been seeded."
        );
      } else {
        setResults(loaded);
        setCursor(0);
        setNotesMap({});
        setSeverityMap({});
        setView("running");
      }
    } else {
      const err = await res.json().catch(() => ({}));
      setStartError(err.error ?? "Failed to create test run. Please try again.");
    }
    setSaving(false);
  };

  // ── Resume an in-progress run ──
  const resumeRun = async (run: HistoryRun, suiteName: string) => {
    const suite = suites.find((s) => s.tool_name === suiteName);
    if (!suite) return;
    setSelectedSuite(suite);
    setActiveRunId(run.id);
    setRunForm((f) => ({ ...f, scenarioDepth: run.scenario_depth ?? "broad" }));
    const res = await fetch(`/api/testing/runs/${run.id}/results?type=scenario`);
    const d = await res.json();
    const loaded: TestResult[] = d.results ?? [];
    setResults(loaded);
    const firstUntested = loaded.findIndex((r) => r.status === "not_tested");
    setCursor(firstUntested >= 0 ? firstUntested : 0);
    const saved = localStorage.getItem(`testing-notes-${run.id}`);
    if (saved) {
      try {
        setNotesMap(JSON.parse(saved));
      } catch {
        // ignore
      }
    } else {
      setNotesMap({});
    }
    setSeverityMap({});
    setView("running");
  };

  // ── Record outcome ──
  const record = useCallback(async (status: TestStatus) => {
    if (!current || !activeRunId) return;
    setSaving(true);
    const notes = notesMap[current.id] || null;
    const severity = severityMap[current.id] || null;
    const res = await fetch(`/api/testing/runs/${activeRunId}/results/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes, severity }),
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
  }, [current, activeRunId, notesMap, severityMap, cursor, results.length]);

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

  // ── Keyboard shortcuts (running view only) ──
  useEffect(() => {
    if (view !== "running") return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      switch (e.key) {
        case "p":
        case "P":
          e.preventDefault();
          void record("pass");
          break;
        case "i":
        case "I":
          e.preventDefault();
          void record("fail");
          break;
        case "s":
        case "S":
          e.preventDefault();
          void record("skip");
          break;
        case "n":
        case "N":
          e.preventDefault();
          notesRef.current?.focus();
          break;
        case "ArrowLeft":
          e.preventDefault();
          setCursor((c) => Math.max(c - 1, 0));
          break;
        case "ArrowRight":
          e.preventDefault();
          setCursor((c) => Math.min(c + 1, results.length - 1));
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [view, record, results.length]);

  // ── Persist notes to localStorage on change ──
  const updateNote = (resultId: string, value: string) => {
    const updated = { ...notesMap, [resultId]: value };
    setNotesMap(updated);
    if (activeRunId) {
      try {
        localStorage.setItem(`testing-notes-${activeRunId}`, JSON.stringify(updated));
      } catch {
        // ignore quota errors
      }
    }
  };

  // ─── Status icon helper ───────────────────────────────────────────────────
  const statusIcon = (s: TestStatus) => {
    if (s === "pass") return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    if (s === "fail") return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    if (s === "skip") return <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />;
    return <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />;
  };

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
      if (s.tool_name === "project-lifecycle") return acc; // shown as hero above
      const cat = categoryFor(s.tool_name);
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    }, {});
    const order: Array<"Financial" | "Project Management"> = ["Financial", "Project Management"];

    return (
      <PageShell variant="content" title="Testing" description="Browse scenarios or start an interactive test session">
        <Tabs defaultValue="scenarios">
          <TabsList className="mb-6">
            <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
            <TabsTrigger value="in-progress">
              In Progress
              {inProgressRuns.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary leading-none">
                  {inProgressRuns.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Test Scenarios ── */}
          <TabsContent value="scenarios" className="m-0">
            <div className="space-y-10">

              {/* ── Project Lifecycle hero ── */}
              {(() => {
                const lifecycle = suites.find((s) => s.tool_name === "project-lifecycle");
                if (!lifecycle) return null;
                return (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-6 py-5 flex items-start justify-between gap-6">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">Project Lifecycle</p>
                        <span className="text-[10px] font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">Recommended</span>
                      </div>
                      <p className="text-sm text-muted-foreground">End-to-end test covering the full construction workflow: Budget → Prime Contract → Commitments → Change Events → Change Orders → Invoicing</p>
                      <p className="text-xs text-muted-foreground">{lifecycle.scenario_count} sequential test cases</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href="/procore-tools/project-lifecycle?tab=scenarios"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Review
                      </Link>
                      <button
                        type="button"
                        onClick={() => { setSelectedSuite(lifecycle); setView("start-run"); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start Lifecycle Run
                      </button>
                    </div>
                  </div>
                );
              })()}

              {suites.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-12">No test scenarios available yet.</p>
              )}
              {order.filter((cat) => grouped[cat]?.length).map((cat) => (
                <div key={cat} className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{cat}</h2>

                  {/* Mobile */}
                  <div className="sm:hidden divide-y divide-border rounded-md border border-border bg-card">
                    {grouped[cat].map((suite) => (
                      <div key={suite.id} className="px-4 py-3 space-y-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{suite.display_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {suite.scenario_count} scenarios
                            {suite.broad_scenario_count > 0 ? ` · ${suite.broad_scenario_count} broad` : ""}
                            {suite.detailed_scenario_count > 0 ? ` · ${suite.detailed_scenario_count} detailed` : ""}
                            {suite.feature_count ? ` · ${suite.feature_count} feature checks` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/procore-tools/${suite.tool_name}?tab=scenarios`}
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

                  {/* Desktop */}
                  <div className="hidden sm:block overflow-x-auto rounded-md border border-border bg-card">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th style={{ fontSize: "10px" }} className="text-left font-semibold uppercase tracking-wider text-foreground px-5 py-2">Tool</th>
                          <th style={{ fontSize: "10px" }} className="text-left font-semibold uppercase tracking-wider text-foreground px-5 py-2 w-28">Scenarios</th>
                          <th style={{ fontSize: "10px" }} className="text-left font-semibold uppercase tracking-wider text-foreground px-5 py-2 w-40">Depth Mix</th>
                          <th style={{ fontSize: "10px" }} className="text-left font-semibold uppercase tracking-wider text-foreground px-5 py-2 w-44">Feature checks</th>
                          <th style={{ fontSize: "10px" }} className="text-right font-semibold uppercase tracking-wider text-foreground px-5 py-2 w-72">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {grouped[cat].map((suite) => (
                          <tr key={suite.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3 font-medium">{suite.display_name}</td>
                            <td className="px-5 py-3 text-muted-foreground">{suite.scenario_count}</td>
                            <td className="px-5 py-3 text-muted-foreground">
                              {suite.broad_scenario_count > 0 ? `${suite.broad_scenario_count} broad` : ""}
                              {suite.broad_scenario_count > 0 && suite.detailed_scenario_count > 0 ? " · " : ""}
                              {suite.detailed_scenario_count > 0 ? `${suite.detailed_scenario_count} detailed` : ""}
                              {suite.broad_scenario_count === 0 && suite.detailed_scenario_count === 0 ? "—" : ""}
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">{suite.feature_count || "—"}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                <Link
                                  href={`/procore-tools/${suite.tool_name}?tab=scenarios`}
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
          </TabsContent>

          {/* ── Tab: In Progress ── */}
          <TabsContent value="in-progress" className="m-0">
            {inProgressRuns.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-16">No runs in progress. Start a test session from the Scenarios tab.</p>
            ) : (
              <div className="space-y-3">
                {inProgressRuns.map(({ run, suiteName, suiteDisplayName }) => {
                  const done = run.pass + run.fail + run.skip;
                  const pctDone = run.total > 0 ? Math.round((done / run.total) * 100) : 0;
                  return (
                    <div key={run.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-sm font-medium">{suiteDisplayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {run.tester && `${run.tester} · `}
                          {new Date(run.run_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" · "}
                          {depthLabel(run.scenario_depth)}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pctDone}%` }} /> {/* eslint-disable-line react/forbid-component-props */}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{done}/{run.total}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void resumeRun(run, suiteName)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                      >
                        Resume →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
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
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Before you start</p>
            <p>Make sure you&apos;re logged into the app you&apos;re testing.</p>
            <p>Each test takes 1–3 minutes. You&apos;ll follow step-by-step instructions and mark each test passed, failed, or skipped.</p>
            <p><span className="font-medium text-foreground">Broad</span> is recommended for fast team testing. Use Detailed later for deeper coverage.</p>
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
            <div className="space-y-1.5">
              <Label>Project ID <span className="text-muted-foreground text-xs">(for test links)</span></Label>
              <Input
                value={runForm.projectId}
                onChange={(e) => setRunForm((f) => ({ ...f, projectId: e.target.value }))}
                placeholder="e.g. 67"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Scenario depth</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "broad" as const, label: "Broad", hint: "Fastest, high-signal workflows" },
                  { value: "detailed" as const, label: "Detailed", hint: "Longer, deeper checks" },
                  { value: "all" as const, label: "All", hint: "Everything in suite" },
                ]).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRunForm((f) => ({ ...f, scenarioDepth: option.value }))}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors",
                      runForm.scenarioDepth === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-foreground/30"
                    )}
                  >
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{option.hint}</p>
                  </button>
                ))}
              </div>
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
            {selectedSuite?.display_name} · {runForm.tester} · {depthLabel(runForm.scenarioDepth)}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-4">
              <p className="text-2xl font-bold text-green-600">{passed}</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">Passed</p>
            </div>
            <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-4">
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
                    {` · ${depthLabel(run.scenario_depth)}`}
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
          {/* Jump-to-test popover */}
          <div className="relative" ref={jumpListRef}>
            <button
              type="button"
              onClick={() => setShowJumpList((v) => !v)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded"
            >
              <span className="font-medium text-foreground">{cursor + 1}</span> / {results.length}
            </button>
            {showJumpList && (
              <div className="absolute top-full left-0 mt-1 z-50 w-72 max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-sm">
                {results.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setCursor(i); setShowJumpList(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors",
                      i === cursor && "bg-muted/60"
                    )}
                  >
                    {statusIcon(r.status)}
                    <span className="text-xs text-muted-foreground font-mono shrink-0">#{r.test_cases?.test_number}</span>
                    <span className="text-xs truncate">{r.test_cases?.test_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="text-sm font-medium">{selectedSuite?.display_name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-2 py-0.5">
            {depthLabel(runForm.scenarioDepth)}
          </span>
          <div className="flex items-center gap-1.5">
            <label htmlFor="runner-project-id" className="text-muted-foreground shrink-0">Project ID:</label>
            <input
              id="runner-project-id"
              type="text"
              value={runForm.projectId}
              onChange={(e) => setRunForm((f) => ({ ...f, projectId: e.target.value }))}
              placeholder="e.g. 67"
              className="w-16 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
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
            {parseSteps(tc.setup_steps).map((s) => (
              <p key={s} className="text-sm text-amber-900 dark:text-amber-300">· {s}</p>
            ))}
          </div>
        )}

        {/* Open in app button */}
        {tc.start_url && (
          <a
            href={(() => {
              try {
                const raw = new URL(tc.start_url ?? "").pathname;
                if (runForm.projectId) {
                  return raw.replace(/^\/\d+\//, `/${runForm.projectId}/`);
                }
                return raw;
              } catch {
                const raw = tc.start_url ?? "#";
                if (runForm.projectId) {
                  return raw.replace(/^\/\d+\//, `/${runForm.projectId}/`);
                }
                return raw;
              }
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            Open the app at the right page →
          </a>
        )}

        {/* Steps */}
        <div className="space-y-3 pt-2">
          <p className="text-base font-semibold text-foreground">Steps</p>
          {steps.map((step, i) => (
            <label
              key={step}
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

        {/* ── Notes + Severity + Verdict ── */}
        <div className="pt-2 space-y-3">

          {/* Always-visible notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Notes <span className="font-normal">(optional)</span>
            </Label>
            <Textarea
              ref={notesRef}
              value={notesMap[current.id] ?? ""}
              onChange={(e) => updateNote(current.id, e.target.value)}
              placeholder="Optional notes, observations, or anything unexpected…"
              className="resize-none h-20 text-sm"
            />
          </div>

          {/* Severity selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Severity:</span>
            {(["critical", "major", "minor", "cosmetic"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverityMap((prev) => ({ ...prev, [current.id]: prev[current.id] === s ? "" : s }))}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-md border transition-colors",
                  severityMap[current.id] === s
                    ? s === "critical"
                      ? "bg-red-600 text-white border-red-600"
                      : s === "major"
                      ? "bg-orange-500 text-white border-orange-500"
                      : s === "minor"
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-muted text-foreground border-border"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground"
                )}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Keyboard hint bar */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60 pb-1">
            <span><kbd className="font-mono">P</kbd> Pass</span>
            <span><kbd className="font-mono">I</kbd> Issue</span>
            <span><kbd className="font-mono">S</kbd> Skip</span>
            <span><kbd className="font-mono">N</kbd> Notes</span>
            <span><kbd className="font-mono">←→</kbd> Navigate</span>
          </div>

          {/* Verdict buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => void record("pass")}
              disabled={saving}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white h-12 text-sm font-semibold"
            >
              <CheckCircle2 className="h-4 w-4" />
              Passed
            </Button>
            <Button
              onClick={() => void record("fail")}
              disabled={saving}
              variant="destructive"
              className="gap-2 h-12 text-sm font-semibold"
            >
              <XCircle className="h-4 w-4" />
              Issue found
            </Button>
            <Button
              onClick={() => void record("skip")}
              disabled={saving}
              variant="outline"
              className="gap-2 h-12 text-sm font-semibold"
            >
              <MinusCircle className="h-4 w-4" />
              Skip
            </Button>
          </div>

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
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1.5 rounded-md hover:bg-primary/10"
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
