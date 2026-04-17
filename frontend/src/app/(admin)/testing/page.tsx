"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { ToolReferencePanel } from "@/components/domain/testing/ToolReferencePanel";
import { FileUploadField } from "@/components/forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { testingFeatureFlags } from "@/lib/testing/feature-flags";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronLeft,
  BookOpen,
  Play,
  History,
  ChevronDown,
  Pencil,
  Send,
  Plus,
  Trash2,
  ChevronRight,
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

type RunListItem = { run: HistoryRun; suiteName: string; suiteDisplayName: string };

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

interface ManagedCase {
  id: string;
  test_number: string;
  category: string;
  subcategory: string | null;
  test_name: string;
  context_note: string | null;
  setup_steps: string | null;
  steps: string | null;
  expected_result: string | null;
  priority: string;
  start_url: string | null;
  test_type: string;
  scenario_depth: string;
}

interface TesterActivityRow {
  result_id: string;
  run_id: string;
  run_date: string;
  status: TestStatus;
  notes: string | null;
  test_case_id: string | null;
  test_number: string | null;
  test_name: string | null;
  screenshot_url: string | null;
  screenshot_label: string | null;
}

interface TesterActivityScenario {
  tool_name: string;
  display_name: string;
  rows: TesterActivityRow[];
}

const TESTER_ACTIVITY_USERS = [
  { key: "tester-1", label: "Tester 1", email: "testadmin1@mail.com" },
  { key: "tester-2", label: "Tester 2", email: "testadmin2@mail.com" },
  { key: "tester-3", label: "Tester 3", email: "testadmin3@mail.com" },
] as const;

const DEFAULT_TEST_PROJECT_ID = "891";
const TESTING_PROJECT_ID_STORAGE_KEY = "testing-default-project-id";
const ENABLE_SCENARIO_DEPTH_FILTER = testingFeatureFlags.scenarioDepthFilterEnabled;

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

/** Maps stored test status values to user-facing tester activity labels. */
function statusLabel(status: TestStatus): string {
  if (status === "pass") return "Passed";
  if (status === "fail") return "Failed";
  if (status === "skip") return "Skipped";
  return "Incomplete";
}

// Converts unknown thrown values into a message that is safe to show in the UI.
function formatActionError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

// Resolves a scenario start path and guarantees a project-scoped URL path.
function resolveScenarioStartPath(startUrl: string | null, projectId: string): string {
  const effectiveProjectId = projectId.trim() || DEFAULT_TEST_PROJECT_ID;
  const rawInput = startUrl?.trim() || "/testing";
  let path = rawInput;

  try {
    path = new URL(rawInput).pathname || "/testing";
  } catch {
    path = rawInput;
  }

  if (/^\/\d+\//.test(path)) {
    return path.replace(/^\/\d+\//, `/${effectiveProjectId}/`);
  }
  if (path.startsWith("/")) {
    return `/${effectiveProjectId}${path}`;
  }
  return `/${effectiveProjectId}/${path}`;
}

/** Converts a screenshot file into a data URL for admin feedback submissions. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read screenshot file."));
    };
    reader.onerror = () => reject(new Error("Unable to read screenshot file."));
    reader.readAsDataURL(file);
  });
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
    scenarioDepth: "all" as ScenarioDepth,
  });
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedbackSentIds, setFeedbackSentIds] = useState<Set<string>>(new Set());
  const [feedbackSendingIds, setFeedbackSendingIds] = useState<Set<string>>(new Set());
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [severityMap, setSeverityMap] = useState<Record<string, Severity>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [historyRuns, setHistoryRuns] = useState<HistoryRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [runDetail, setRunDetail] = useState<RunDetailResult[]>([]);
  const [runDetailLoading, setRunDetailLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [showJumpList, setShowJumpList] = useState(false);
  const [inProgressRuns, setInProgressRuns] = useState<RunListItem[]>([]);
  const [completedRuns, setCompletedRuns] = useState<RunListItem[]>([]);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
  const jumpListRef = useRef<HTMLDivElement>(null);
  const [editingCase, setEditingCase] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({ steps: "", setup_steps: "", context_note: "", expected_result: "", start_url: "" });
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueSubmitError, setIssueSubmitError] = useState<string | null>(null);
  const [issueForm, setIssueForm] = useState<{ notes: string; screenshotDataUrl: string | null; screenshotName: string | null }>({
    notes: "",
    screenshotDataUrl: null,
    screenshotName: null,
  });

  // ── Manage Cases tab state ──
  const [manageSuite, setManageSuite] = useState<Suite | null>(null);
  const [manageCases, setManageCases] = useState<ManagedCase[]>([]);
  const [manageCasesLoading, setManageCasesLoading] = useState(false);
  const [manageDepth, setManageDepth] = useState<"broad" | "detailed">("broad");
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [manageEditId, setManageEditId] = useState<string | null>(null);
  const [manageEditForm, setManageEditForm] = useState<Partial<ManagedCase>>({});
  const [manageEditSaving, setManageEditSaving] = useState(false);
  const [manageDeleting, setManageDeleting] = useState<string | null>(null);
  const [showAddCase, setShowAddCase] = useState(false);
  const [addForm, setAddForm] = useState({
    test_number: "", category: "", subcategory: "", test_name: "",
    priority: "MEDIUM" as "HIGH" | "MEDIUM" | "LOW",
    scenario_depth: "broad" as "broad" | "detailed",
    steps: "", setup_steps: "", context_note: "", expected_result: "", start_url: "",
  });
  const [addSaving, setAddSaving] = useState(false);
  const [activeTesterEmail, setActiveTesterEmail] = useState<string>(TESTER_ACTIVITY_USERS[0].email);
  const [testerActivityLoading, setTesterActivityLoading] = useState(false);
  const [testerActivity, setTesterActivity] = useState<TesterActivityScenario[]>([]);
  const [expandedTesterScenarios, setExpandedTesterScenarios] = useState<Record<string, boolean>>({});

  const detailedUnavailable =
    ENABLE_SCENARIO_DEPTH_FILTER && selectedSuite?.detailed_scenario_count === 0;

  // ── Load suites + pre-fill tester name from session ──
  useEffect(() => {
    apiFetch<{ suites?: Suite[] }>("/api/testing/suites")
      .then((d) => {
        const loaded: Suite[] = d.suites ?? [];
        setSuites(loaded);

        // Fetch in-progress runs for each suite
        Promise.all(
          loaded.map((suite) =>
            apiFetch<{ runs?: HistoryRun[] }>(`/api/testing/runs?suite=${suite.tool_name}`)
              .then((data) => {
                const suiteRuns = data.runs ?? [];
                const inProgress = suiteRuns
                  .filter((run: HistoryRun) => run.not_tested > 0)
                  .map((run: HistoryRun) => ({
                    run,
                    suiteName: suite.tool_name,
                    suiteDisplayName: suite.display_name,
                  }));
                const completed = suiteRuns
                  .filter((run: HistoryRun) => run.not_tested === 0 && run.total > 0)
                  .map((run: HistoryRun) => ({
                    run,
                    suiteName: suite.tool_name,
                    suiteDisplayName: suite.display_name,
                  }));
                return { inProgress, completed };
              })
              .catch((error) => {
                setUiError(formatActionError(error, "Unable to load in-progress test runs."));
                return { inProgress: [] as RunListItem[], completed: [] as RunListItem[] };
              })
          )
        ).then((results) => {
          const inProgress = results
            .flatMap((result) => result.inProgress)
            .sort((a, b) => new Date(b.run.run_date).getTime() - new Date(a.run.run_date).getTime());
          const completed = results
            .flatMap((result) => result.completed)
            .sort((a, b) => new Date(b.run.run_date).getTime() - new Date(a.run.run_date).getTime());
          setInProgressRuns(inProgress);
          setCompletedRuns(completed);
        });
      })
      .catch((error) => {
        setUiError(formatActionError(error, "Unable to load test suites."));
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

    try {
      const storedProjectId = localStorage.getItem(TESTING_PROJECT_ID_STORAGE_KEY);
      if (storedProjectId?.trim()) {
        setRunForm((f) => ({ ...f, projectId: storedProjectId.trim() }));
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  // Persist project id so future test runs reuse the same project context.
  useEffect(() => {
    try {
      const normalized = runForm.projectId.trim();
      if (normalized) {
        localStorage.setItem(TESTING_PROJECT_ID_STORAGE_KEY, normalized);
      } else {
        localStorage.removeItem(TESTING_PROJECT_ID_STORAGE_KEY);
      }
    } catch {
      // ignore storage access errors
    }
  }, [runForm.projectId]);

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
    setUiError(null);
    setSelectedSuite(suite);
    setHistoryLoading(true);
    setHistoryRuns([]);
    setView("history");
    try {
      const d = await apiFetch<{ runs?: HistoryRun[] }>(`/api/testing/runs?suite=${suite.tool_name}`);
      setHistoryRuns(d.runs ?? []);
    } catch (error) {
      setUiError(formatActionError(error, "Unable to load run history."));
    }
    setHistoryLoading(false);
  };

  // ── Load detail for a single run ──
  const openRunDetail = async (runId: string) => {
    setUiError(null);
    setRunDetailLoading(true);
    setRunDetail([]);
    setView("run-detail");
    try {
      const d = await apiFetch<{ results?: TestResult[] }>(`/api/testing/runs/${runId}/results`);
      setRunDetail(d.results ?? []);
    } catch (error) {
      setUiError(formatActionError(error, "Unable to load run details."));
    }
    setRunDetailLoading(false);
  };

  // Loads scenario test activity for a specific tester email.
  const loadTesterActivity = useCallback(async (testerEmail: string) => {
    setUiError(null);
    setTesterActivityLoading(true);
    try {
      const response = await apiFetch<{ scenarios?: TesterActivityScenario[] }>(
        `/api/testing/tester-activity?tester=${encodeURIComponent(testerEmail)}`,
      );
      const loadedScenarios = response.scenarios ?? [];
      setTesterActivity(loadedScenarios);
      setExpandedTesterScenarios((prev) => {
        const next: Record<string, boolean> = {};
        for (const scenario of loadedScenarios) {
          const key = `${testerEmail}:${scenario.tool_name}`;
          next[key] = prev[key] ?? false;
        }
        return next;
      });
    } catch (error) {
      setTesterActivity([]);
      setUiError(formatActionError(error, "Unable to load tester activity."));
    } finally {
      setTesterActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTesterActivity(activeTesterEmail);
  }, [activeTesterEmail, loadTesterActivity]);

  // ── Manage Cases: load cases for a suite + depth ──
  const loadManagedCases = useCallback(async (suite: Suite, depth: "broad" | "detailed") => {
    setUiError(null);
    setManageCasesLoading(true);
    setManageCases([]);
    setExpandedCase(null);
    setManageEditId(null);
    try {
      const d = await apiFetch<{ grouped?: Record<string, ManagedCase[]> }>(
        `/api/testing/suites/${suite.tool_name}/cases?type=scenario&depth=${ENABLE_SCENARIO_DEPTH_FILTER ? depth : "all"}`,
      );
      const all: ManagedCase[] = Object.values(d.grouped ?? {}).flat() as ManagedCase[];
      setManageCases(all);
    } catch (error) {
      setUiError(formatActionError(error, "Unable to load test cases."));
    }
    setManageCasesLoading(false);
  }, []);

  useEffect(() => {
    if (manageSuite) void loadManagedCases(manageSuite, manageDepth);
  }, [manageSuite, manageDepth, loadManagedCases]);

  useEffect(() => {
    if (ENABLE_SCENARIO_DEPTH_FILTER && detailedUnavailable && runForm.scenarioDepth === "detailed") {
      setRunForm((f) => ({ ...f, scenarioDepth: "broad" }));
    }
  }, [detailedUnavailable, runForm.scenarioDepth]);

  // ── Manage Cases: save inline edit ──
  const saveManageEdit = async (caseId: string) => {
    setUiError(null);
    setManageEditSaving(true);
    try {
      const { case: updated } = await apiFetch<{ case: ManagedCase }>(
        `/api/testing/cases/${caseId}`,
        {
          method: "PATCH",
          body: JSON.stringify(manageEditForm),
        },
      );
      setManageCases((prev) => prev.map((c) => c.id === caseId ? { ...c, ...updated } : c));
      setManageEditId(null);
    } catch (error) {
      setUiError(formatActionError(error, "Unable to save test case changes."));
    }
    setManageEditSaving(false);
  };

  // ── Manage Cases: delete ──
  const deleteCase = async (caseId: string) => {
    setUiError(null);
    setManageDeleting(caseId);
    try {
      await apiFetch(`/api/testing/cases/${caseId}`, { method: "DELETE" });
      setManageCases((prev) => prev.filter((c) => c.id !== caseId));
      if (expandedCase === caseId) setExpandedCase(null);
    } catch (error) {
      setUiError(formatActionError(error, "Unable to delete the test case."));
    }
    setManageDeleting(null);
  };

  // ── Manage Cases: add new ──
  const addCase = async () => {
    if (!manageSuite) return;
    setUiError(null);
    setAddSaving(true);
    try {
      const { case: created } = await apiFetch<{ case: ManagedCase }>("/api/testing/cases", {
        method: "POST",
        body: JSON.stringify({ suite_id: manageSuite.id, ...addForm }),
      });
      setManageCases((prev) => [...prev, created]);
      setShowAddCase(false);
      setAddForm({
        test_number: "", category: "", subcategory: "", test_name: "",
        priority: "MEDIUM", scenario_depth: "broad",
        steps: "", setup_steps: "", context_note: "", expected_result: "", start_url: "",
      });
    } catch (error) {
      setUiError(formatActionError(error, "Unable to add the test case."));
    }
    setAddSaving(false);
  };

  // ── Reset step checkboxes + close edit mode when scenario changes ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCheckedSteps({});
    setEditingCase(false);
  }, [cursor]); // cursor is intentional — reset per-test state when navigating


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
    setUiError(null);
    setStartError(null);
    setSaving(true);
    try {
      const { run_id, effective_depth } = await apiFetch<{ run_id: string; effective_depth?: string }>(
        "/api/testing/runs",
        {
          method: "POST",
          body: JSON.stringify({
            suite: selectedSuite.tool_name,
            testType: "scenario",
            ...runForm,
            scenarioDepth: ENABLE_SCENARIO_DEPTH_FILTER ? runForm.scenarioDepth : "all",
          }),
        },
      );
      if (effective_depth && effective_depth !== runForm.scenarioDepth) {
        setRunForm((f) => ({ ...f, scenarioDepth: effective_depth as ScenarioDepth }));
      }
      setActiveRunId(run_id);
      const d2 = await apiFetch<{ results?: TestResult[] }>(
        `/api/testing/runs/${run_id}/results?type=scenario`,
      );
      const loaded = d2.results ?? [];
      if (loaded.length === 0) {
        setStartError("No active scenario test cases were found for this tool. Check that cases are seeded and not marked inactive.");
      } else {
        setResults(loaded);
        setCursor(0);
        setNotesMap({});
        setSeverityMap({});
        setView("running");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create test run. Please try again.";
      setStartError(message);
    }
    setSaving(false);
  };

  // ── Resume an in-progress run ──
  const resumeRun = async (run: HistoryRun, suiteName: string) => {
    setUiError(null);
    const suite = suites.find((s) => s.tool_name === suiteName);
    if (!suite) return;
    setSelectedSuite(suite);
    setActiveRunId(run.id);
    setRunForm((f) => ({ ...f, scenarioDepth: run.scenario_depth ?? "all" }));
    let loaded: TestResult[] = [];
    try {
      const d = await apiFetch<{ results?: TestResult[] }>(
        `/api/testing/runs/${run.id}/results?type=scenario`,
      );
      loaded = d.results ?? [];
    } catch (error) {
      loaded = [];
      setUiError(formatActionError(error, "Unable to resume this run."));
    }
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

  // Removes a deleted run from all relevant local run collections.
  const removeRunFromLocalState = useCallback((runId: string) => {
    setInProgressRuns((prev) => prev.filter(({ run }) => run.id !== runId));
    setCompletedRuns((prev) => prev.filter(({ run }) => run.id !== runId));
    setHistoryRuns((prev) => prev.filter((run) => run.id !== runId));
  }, []);

  // Deletes a test run and updates the local UI state to prevent stale in-progress rows.
  const deleteInProgressRun = useCallback(async (runId: string) => {
    setUiError(null);
    setDeletingRunId(runId);
    try {
      await apiFetch(`/api/testing/runs/${runId}`, { method: "DELETE" });
      removeRunFromLocalState(runId);
    } catch (error) {
      setUiError(formatActionError(error, "Unable to delete this in-progress run."));
    } finally {
      setDeletingRunId((currentRunId) => (currentRunId === runId ? null : currentRunId));
    }
  }, [removeRunFromLocalState]);

  // Sends failed scenario details to admin feedback and includes hidden scenario context metadata.
  const sendToFeedback = useCallback(async (
    result: TestResult,
    options?: { notes?: string; screenshotDataUrl?: string | null }
  ) => {
    const tc = result.test_cases;
    if (feedbackSentIds.has(result.id)) return;
    setFeedbackSendingIds((prev) => new Set([...prev, result.id]));

    const notes = options?.notes ?? notesMap[result.id] ?? null;
    const sev = severityMap[result.id] || null;
    const feedbackSeverity: "low" | "medium" | "high" =
      sev === "critical" || sev === "major" ? "high" :
      sev === "minor" ? "medium" : "low";

    const startPath = resolveScenarioStartPath(tc.start_url, runForm.projectId);
    const pageUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${startPath}`
        : startPath;

    try {
      await apiFetch("/api/admin/feedback", {
        method: "POST",
        body: JSON.stringify({
          title: `[Test] ${tc.test_name}`,
          comment: notes ?? `Test failed: ${tc.test_name}`,
          pageUrl,
          pagePath: startPath,
          pageTitle: `${selectedSuite?.display_name ?? "Testing"} — ${tc.test_name}`,
          requestType: "bug",
          severity: feedbackSeverity,
          target: {
            selector: "#test-runner",
            text: tc.test_name,
            id: `test-case-${tc.id}`,
          },
          metadata: {
            test_case_id: tc.id,
            test_number: tc.test_number,
            run_id: activeRunId,
            suite: selectedSuite?.tool_name,
            suite_display: selectedSuite?.display_name,
            tester: runForm.tester,
            source: "test-runner",
            scenario_context: {
              setup_steps: tc.setup_steps,
              steps: tc.steps,
              context_note: tc.context_note,
              expected_result: tc.expected_result,
              start_url: tc.start_url,
              category: tc.category,
              subcategory: tc.subcategory,
            },
          },
          screenshotDataUrl: options?.screenshotDataUrl ?? null,
        }),
      });
      setFeedbackSentIds((prev) => new Set([...prev, result.id]));
    } finally {
      setFeedbackSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(result.id);
        return next;
      });
    }
  }, [feedbackSentIds, notesMap, severityMap, runForm, selectedSuite, activeRunId]);

  // ── Record outcome ──
  const record = useCallback(async (status: TestStatus) => {
    if (!current || !activeRunId) return;
    setUiError(null);
    setSaving(true);
    const notes = notesMap[current.id] || null;
    const severity = severityMap[current.id] || null;
    try {
      const { result } = await apiFetch<{ result: TestResult }>(
        `/api/testing/runs/${activeRunId}/results/${current.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status, notes, severity }),
        },
      );
      const updatedResult = { ...current, status: result.status, notes: result.notes };
      setResults((prev) =>
        prev.map((r) => r.id === current.id ? updatedResult : r)
      );
      if (cursor < results.length - 1) {
        setCursor((c) => c + 1);
      } else {
        setView("complete");
      }
    } catch (error) {
      setUiError(formatActionError(error, "Unable to save this test result."));
    }
    setSaving(false);
  }, [current, activeRunId, notesMap, severityMap, cursor, results.length]);

  // Opens the issue report modal prefilled with the current case notes.
  const openIssueModal = useCallback(() => {
    if (!current) return;
    setIssueSubmitError(null);
    setIssueForm({
      notes: notesMap[current.id] ?? "",
      screenshotDataUrl: null,
      screenshotName: null,
    });
    setIssueModalOpen(true);
  }, [current, notesMap]);

  // Sensitive: writes test_results status and creates admin feedback/GitHub issue records.
  const submitIssueReport = useCallback(async () => {
    if (!current || !activeRunId) return;
    setIssueSubmitError(null);
    setUiError(null);
    setIssueSubmitting(true);

    const notes = issueForm.notes.trim() || null;
    const severity = severityMap[current.id] || null;

    try {
      const { result } = await apiFetch<{ result: TestResult }>(
        `/api/testing/runs/${activeRunId}/results/${current.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "fail", notes, severity }),
        },
      );
      const updatedResult = { ...current, status: result.status, notes: result.notes };
      setResults((prev) => prev.map((r) => (r.id === current.id ? updatedResult : r)));
      setNotesMap((prev) => ({ ...prev, [current.id]: issueForm.notes }));

      await sendToFeedback(updatedResult, {
        notes: issueForm.notes,
        screenshotDataUrl: issueForm.screenshotDataUrl,
      });

      setIssueModalOpen(false);
      if (cursor < results.length - 1) {
        setCursor((c) => c + 1);
      } else {
        setView("complete");
      }
    } catch (error) {
      setIssueSubmitError(formatActionError(error, "Unable to submit issue report."));
    } finally {
      setIssueSubmitting(false);
    }
  }, [current, activeRunId, issueForm, severityMap, sendToFeedback, cursor, results.length]);

  // Reads and stores the selected screenshot so it can be uploaded with the issue report.
  const handleIssueScreenshotSelected = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    void fileToDataUrl(file)
      .then((dataUrl) => {
        setIssueForm((prev) => ({
          ...prev,
          screenshotDataUrl: dataUrl,
          screenshotName: file.name,
        }));
      })
      .catch((error) => {
        setIssueSubmitError(formatActionError(error, "Unable to read screenshot file."));
      });
  }, []);

  // ── Screenshot upload ──
  const handleFile = useCallback(async (file: File) => {
    if (!current || !activeRunId) return;
    setUiError(null);
    setUploadingScreenshot(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await apiFetch(
          `/api/testing/runs/${activeRunId}/results/${current.id}/screenshots`,
          {
            method: "POST",
            body: JSON.stringify({ dataUrl: reader.result, label: file.name }),
          },
        );
        const d2 = await apiFetch<{ results?: TestResult[] }>(
          `/api/testing/runs/${activeRunId}/results`,
        );
        setResults(d2.results ?? []);
      } catch (error) {
        setUiError(formatActionError(error, "Unable to upload the screenshot."));
      }
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
          openIssueModal();
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
  }, [view, record, results.length, openIssueModal]);

  // ── Sync edit form when navigating to a new test case ──
  useEffect(() => {
    if (!current) return;
    const tc = current.test_cases;
    setEditForm({
      steps: tc.steps ?? "",
      setup_steps: tc.setup_steps ?? "",
      context_note: tc.context_note ?? "",
      expected_result: tc.expected_result ?? "",
      start_url: tc.start_url ?? "",
    });
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save edited test case ──
  const saveEdit = async () => {
    if (!current) return;
    setUiError(null);
    setEditSaving(true);
    try {
      const { case: updated } = await apiFetch<{ case: Partial<TestResult["test_cases"]> }>(
        `/api/testing/cases/${current.test_cases.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(editForm),
        },
      );
      setResults((prev) =>
        prev.map((r) =>
          r.id === current.id
            ? { ...r, test_cases: { ...r.test_cases, ...updated } }
            : r
        )
      );
      setEditingCase(false);
    } catch (error) {
      setUiError(formatActionError(error, "Unable to save scenario edits."));
    }
    setEditSaving(false);
  };

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
            <TabsTrigger value="completed">
              Completed
              {completedRuns.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary leading-none">
                  {completedRuns.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tester-activity">Tester Activity</TabsTrigger>
            <TabsTrigger value="manage">Manage Cases</TabsTrigger>
          </TabsList>
          {uiError && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">
              {uiError}
            </p>
          )}

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
                  const isDeleting = deletingRunId === run.id;
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
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete this in-progress run for ${suiteDisplayName}? This cannot be undone.`)) {
                              void deleteInProgressRun(run.id);
                            }
                          }}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {isDeleting ? "Deleting…" : "Delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void resumeRun(run, suiteName)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                        >
                          Resume →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Completed ── */}
          <TabsContent value="completed" className="m-0">
            {completedRuns.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-16">No completed scenario runs yet.</p>
            ) : (
              <div className="space-y-3">
                {completedRuns.map(({ run, suiteName, suiteDisplayName }) => {
                  const passRate = run.total > 0 ? Math.round((run.pass / run.total) * 100) : 0;
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
                        <p className="text-xs text-muted-foreground">
                          {run.pass} passed · {run.fail} failed · {run.skip} skipped
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            passRate === 100 ? "text-green-600" : passRate >= 70 ? "text-amber-500" : "text-red-500",
                          )}
                        >
                          {passRate}%
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const suite = suites.find((s) => s.tool_name === suiteName);
                            if (suite) setSelectedSuite(suite);
                            void openRunDetail(run.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Tester Activity ── */}
          <TabsContent value="tester-activity" className="m-0">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {TESTER_ACTIVITY_USERS.map((tester) => (
                  <button
                    key={tester.key}
                    type="button"
                    onClick={() => setActiveTesterEmail(tester.email)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                      activeTesterEmail === tester.email
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    <p className="font-medium">{tester.label}</p>
                    <p className="mt-0.5 text-[11px]">{tester.email}</p>
                  </button>
                ))}
              </div>

              {testerActivityLoading && (
                <p className="py-12 text-center text-sm text-muted-foreground">Loading tester activity…</p>
              )}

              {!testerActivityLoading && testerActivity.length === 0 && (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No tester activity found for {activeTesterEmail}.
                </p>
              )}

              {!testerActivityLoading && testerActivity.length > 0 && (
                <div className="space-y-3">
                  {testerActivity.map((scenario) => {
                    const scenarioKey = `${activeTesterEmail}:${scenario.tool_name}`;
                    const isOpen = expandedTesterScenarios[scenarioKey] ?? false;
                    return (
                      <section key={scenario.tool_name} className="rounded-lg border border-border bg-card">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTesterScenarios((prev) => ({
                              ...prev,
                              [scenarioKey]: !isOpen,
                            }))
                          }
                          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/20"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{scenario.display_name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{scenario.rows.length} test case results</p>
                          </div>
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                        </button>

                        {isOpen && (
                          <div className="border-t border-border px-4 py-3">
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[860px] text-sm">
                                <thead className="bg-muted/40">
                                  <tr>
                                    <th style={{ fontSize: "10px" }} className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-foreground">Name</th>
                                    <th style={{ fontSize: "10px" }} className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-foreground">Number</th>
                                    <th style={{ fontSize: "10px" }} className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-foreground">Status</th>
                                    <th style={{ fontSize: "10px" }} className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-foreground">Notes</th>
                                    <th style={{ fontSize: "10px" }} className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-foreground">Screenshot</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {scenario.rows.map((row) => (
                                    <tr key={row.result_id}>
                                      <td className="px-3 py-2 align-top">
                                        <p className="font-medium text-foreground">{row.test_name ?? "Untitled test"}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                          Run {new Date(row.run_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </p>
                                      </td>
                                      <td className="px-3 py-2 align-top text-muted-foreground">{row.test_number ?? "—"}</td>
                                      <td className="px-3 py-2 align-top">
                                        <span
                                          className={cn(
                                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                            row.status === "pass" && "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300",
                                            row.status === "fail" && "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300",
                                            row.status === "skip" && "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
                                            row.status === "not_tested" && "bg-muted text-muted-foreground",
                                          )}
                                        >
                                          {statusLabel(row.status)}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 align-top text-muted-foreground">
                                        <p className="max-w-[360px] whitespace-pre-wrap break-words text-xs">
                                          {row.notes?.trim() ? row.notes : "—"}
                                        </p>
                                      </td>
                                      <td className="px-3 py-2 align-top">
                                        {row.screenshot_url ? (
                                          <a
                                            href={row.screenshot_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-medium text-primary hover:underline"
                                          >
                                            {row.screenshot_label?.trim() || "View screenshot"}
                                          </a>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Tab: Manage Cases ── */}
          <TabsContent value="manage" className="m-0">
            <div className="space-y-4">

              {/* Suite picker */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex flex-wrap gap-2">
                  {suites.map((s) => (
                    <button
                      key={s.tool_name}
                      type="button"
                      onClick={() => setManageSuite(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                        manageSuite?.tool_name === s.tool_name
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      )}
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
                {manageSuite && ENABLE_SCENARIO_DEPTH_FILTER && (
                  <div className="flex gap-1.5 ml-auto shrink-0">
                    {(["broad", "detailed"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setManageDepth(d)}
                        className={cn(
                          "px-2.5 py-1 rounded-md border text-xs transition-colors",
                          manageDepth === d
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/30"
                        )}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!manageSuite && (
                <p className="text-sm text-muted-foreground text-center py-12">Select a suite above to manage its test cases.</p>
              )}

              {manageSuite && (
                <>
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {manageCasesLoading ? "Loading…" : `${manageCases.length} cases`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddCase((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add case
                    </button>
                  </div>
                  {!showAddCase && !ENABLE_SCENARIO_DEPTH_FILTER && (
                    <p className="text-xs text-muted-foreground">Scenario depth filtering is temporarily disabled; all active cases are shown.</p>
                  )}

                  {/* Add case form */}
                  {showAddCase && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 space-y-3">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">New test case</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Test number</Label>
                          <Input value={addForm.test_number} onChange={(e) => setAddForm((f) => ({ ...f, test_number: e.target.value }))} placeholder="e.g. 1.1" className="text-sm h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Category</Label>
                          <Input value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Budget" className="text-sm h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Subcategory <span className="font-normal">(optional)</span></Label>
                          <Input value={addForm.subcategory} onChange={(e) => setAddForm((f) => ({ ...f, subcategory: e.target.value }))} placeholder="e.g. Line Items" className="text-sm h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Priority</Label>
                          <select value={addForm.priority} onChange={(e) => setAddForm((f) => ({ ...f, priority: e.target.value as "HIGH" | "MEDIUM" | "LOW" }))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                            <option value="HIGH">HIGH</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="LOW">LOW</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Depth</Label>
                          <select value={addForm.scenario_depth} onChange={(e) => setAddForm((f) => ({ ...f, scenario_depth: e.target.value as "broad" | "detailed" }))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                            <option value="broad">Broad</option>
                            <option value="detailed">Detailed</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Start URL</Label>
                          <Input value={addForm.start_url} onChange={(e) => setAddForm((f) => ({ ...f, start_url: e.target.value }))} placeholder="/67/budget" className="text-sm h-8 font-mono" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Test name</Label>
                        <Input value={addForm.test_name} onChange={(e) => setAddForm((f) => ({ ...f, test_name: e.target.value }))} placeholder="e.g. Create a budget line item" className="text-sm h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Context note</Label>
                        <Textarea value={addForm.context_note} onChange={(e) => setAddForm((f) => ({ ...f, context_note: e.target.value }))} placeholder="What this test verifies…" className="resize-none h-16 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Setup steps</Label>
                        <Textarea value={addForm.setup_steps} onChange={(e) => setAddForm((f) => ({ ...f, setup_steps: e.target.value }))} placeholder="Prerequisites, one per line…" className="resize-none h-14 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Steps (one per line)</Label>
                        <Textarea value={addForm.steps} onChange={(e) => setAddForm((f) => ({ ...f, steps: e.target.value }))} placeholder="Click the Create button&#10;Fill in the Name field&#10;Click Save" className="resize-none h-28 text-sm font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Expected result</Label>
                        <Textarea value={addForm.expected_result} onChange={(e) => setAddForm((f) => ({ ...f, expected_result: e.target.value }))} placeholder="The record appears in the list…" className="resize-none h-14 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={addCase} disabled={addSaving || !addForm.test_number || !addForm.category || !addForm.test_name} className="flex-1">
                          {addSaving ? "Saving…" : "Add test case"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setShowAddCase(false)} disabled={addSaving}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Cases list */}
                  {!manageCasesLoading && manageCases.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-10">No active cases found for {manageSuite.display_name}.</p>
                  )}
                  <div className="space-y-1">
                    {manageCases.map((c) => {
                      const isExpanded = expandedCase === c.id;
                      const isEditing = manageEditId === c.id;
                      return (
                        <div key={c.id} className="rounded-lg border border-border bg-card overflow-hidden">
                          {/* Row header */}
                          <div className="flex items-center gap-3 px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setExpandedCase(isExpanded ? null : c.id)}
                              className="flex items-center gap-2 flex-1 text-left min-w-0"
                            >
                              <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform", isExpanded && "rotate-90")} />
                              <span className="text-xs font-mono text-muted-foreground shrink-0">#{c.test_number}</span>
                              <span className="text-sm font-medium truncate">{c.test_name}</span>
                            </button>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-muted-foreground">{c.category}{c.subcategory ? ` · ${c.subcategory}` : ""}</span>
                              <span className={cn(
                                "text-[10px] font-medium rounded-full px-2 py-0.5",
                                c.priority === "HIGH" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" :
                                c.priority === "LOW" ? "bg-muted text-muted-foreground" :
                                "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                              )}>{c.priority}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setManageEditId(isEditing ? null : c.id);
                                  setManageEditForm({
                                    test_number: c.test_number,
                                    category: c.category,
                                    subcategory: c.subcategory ?? "",
                                    test_name: c.test_name,
                                    priority: c.priority,
                                    scenario_depth: c.scenario_depth as "broad" | "detailed",
                                    steps: c.steps ?? "",
                                    setup_steps: c.setup_steps ?? "",
                                    context_note: c.context_note ?? "",
                                    expected_result: c.expected_result ?? "",
                                    start_url: c.start_url ?? "",
                                  });
                                  if (!isEditing) setExpandedCase(c.id);
                                }}
                                className={cn(
                                  "flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors",
                                  isEditing
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                                )}
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => { if (confirm(`Delete "${c.test_name}"?`)) void deleteCase(c.id); }}
                                disabled={manageDeleting === c.id}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-red-600 hover:border-red-300 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded: view or edit */}
                          {isExpanded && (
                            <div className="border-t border-border px-4 py-4 space-y-3 bg-muted/20">
                              {isEditing ? (
                                <>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Test number</Label>
                                      <Input value={manageEditForm.test_number ?? ""} onChange={(e) => setManageEditForm((f) => ({ ...f, test_number: e.target.value }))} className="text-sm h-8" />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Category</Label>
                                      <Input value={manageEditForm.category ?? ""} onChange={(e) => setManageEditForm((f) => ({ ...f, category: e.target.value }))} className="text-sm h-8" />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Subcategory</Label>
                                      <Input value={(manageEditForm.subcategory as string) ?? ""} onChange={(e) => setManageEditForm((f) => ({ ...f, subcategory: e.target.value }))} className="text-sm h-8" />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Priority</Label>
                                      <select value={manageEditForm.priority ?? "MEDIUM"} onChange={(e) => setManageEditForm((f) => ({ ...f, priority: e.target.value }))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                                        <option value="HIGH">HIGH</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="LOW">LOW</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Depth</Label>
                                      <select value={manageEditForm.scenario_depth ?? "broad"} onChange={(e) => setManageEditForm((f) => ({ ...f, scenario_depth: e.target.value }))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                                        <option value="broad">Broad</option>
                                        <option value="detailed">Detailed</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Start URL</Label>
                                      <Input value={(manageEditForm.start_url as string) ?? ""} onChange={(e) => setManageEditForm((f) => ({ ...f, start_url: e.target.value }))} className="text-sm h-8 font-mono" />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Test name</Label>
                                    <Input value={manageEditForm.test_name ?? ""} onChange={(e) => setManageEditForm((f) => ({ ...f, test_name: e.target.value }))} className="text-sm h-8" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Context note</Label>
                                    <Textarea value={(manageEditForm.context_note as string) ?? ""} onChange={(e) => setManageEditForm((f) => ({ ...f, context_note: e.target.value }))} className="resize-none h-16 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Setup steps</Label>
                                    <Textarea value={(manageEditForm.setup_steps as string) ?? ""} onChange={(e) => setManageEditForm((f) => ({ ...f, setup_steps: e.target.value }))} className="resize-none h-14 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Steps</Label>
                                    <Textarea value={(manageEditForm.steps as string) ?? ""} onChange={(e) => setManageEditForm((f) => ({ ...f, steps: e.target.value }))} className="resize-none h-28 text-sm font-mono" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Expected result</Label>
                                    <Textarea value={(manageEditForm.expected_result as string) ?? ""} onChange={(e) => setManageEditForm((f) => ({ ...f, expected_result: e.target.value }))} className="resize-none h-14 text-sm" />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button type="button" size="sm" onClick={() => void saveManageEdit(c.id)} disabled={manageEditSaving} className="flex-1">
                                      {manageEditSaving ? "Saving…" : "Save changes"}
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => setManageEditId(null)} disabled={manageEditSaving}>Cancel</Button>
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-2 text-sm">
                                  {c.context_note && <p className="text-muted-foreground"><span className="font-medium text-foreground">What it checks:</span> {c.context_note}</p>}
                                  {c.setup_steps && <p className="text-muted-foreground"><span className="font-medium text-foreground">Setup:</span> {c.setup_steps}</p>}
                                  {c.start_url && <p className="text-muted-foreground"><span className="font-medium text-foreground">URL:</span> <span className="font-mono text-xs">{c.start_url}</span></p>}
                                  {c.steps && (
                                    <div>
                                      <p className="font-medium text-foreground mb-1">Steps</p>
                                      <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                                        {c.steps.split("\n").filter(Boolean).map((s) => (
                                          <li key={s} className="text-xs">{s.replace(/^\d+\.\s*/, "")}</li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                  {c.expected_result && <p className="text-muted-foreground"><span className="font-medium text-foreground">Expected:</span> {c.expected_result}</p>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
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
          {uiError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">
              {uiError}
            </p>
          )}
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
              <Label className="text-primary">Project ID <span className="text-muted-foreground text-xs">(for test links)</span></Label>
              <Input
                value={runForm.projectId}
                onChange={(e) => setRunForm((f) => ({ ...f, projectId: e.target.value }))}
                placeholder="e.g. 67"
              />
            </div>
            {ENABLE_SCENARIO_DEPTH_FILTER ? (
              <div className="space-y-1.5">
                <Label>Scenario depth</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "broad" as const, label: "Broad", hint: "Fastest, high-signal workflows" },
                    { value: "detailed" as const, label: "Detailed", hint: "Longer, deeper checks" },
                  ]).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (option.value === "detailed" && detailedUnavailable) return;
                        setRunForm((f) => ({ ...f, scenarioDepth: option.value }));
                      }}
                      disabled={option.value === "detailed" && detailedUnavailable}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left transition-colors",
                        option.value === "detailed" && detailedUnavailable && "cursor-not-allowed opacity-50",
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
                {detailedUnavailable && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Detailed mode is disabled because this suite has no detailed scenarios in Supabase yet.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Scenario depth is currently not used. This run will include all active scenario cases.</p>
            )}
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

          <p className="text-xs text-muted-foreground">
            Selecting <span className="font-medium text-foreground">Issue found</span> opens a report form so notes and screenshots can be attached before submission.
          </p>
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{r.test_cases?.test_name}</p>
                      {r.notes && <p className="text-muted-foreground text-xs mt-0.5">{r.notes}</p>}
                    </div>
                    {feedbackSentIds.has(r.id) ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Sent
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          void sendToFeedback(r).catch((error) => {
                            setUiError(formatActionError(error, "Unable to send this failed test to feedback inbox."));
                          });
                        }}
                        disabled={feedbackSendingIds.has(r.id)}
                        className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 shrink-0 mt-0.5 transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {feedbackSendingIds.has(r.id) ? "Sending…" : "→ Feedback"}
                      </button>
                    )}
                  </div>
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
          {uiError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">
              {uiError}
            </p>
          )}
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
          {uiError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">
              {uiError}
            </p>
          )}
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
  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const skipCount = results.filter((r) => r.status === "skip").length;
  const pendingCount = results.length - passCount - failCount - skipCount;
  const startPath = tc.start_url ? resolveScenarioStartPath(tc.start_url, runForm.projectId) : null;

  return (
    <PageShell variant="content" title="" showHeader={false}>
      {/* Progress bar for quick run completion visibility. */}
      <div className="h-1.5 bg-muted -mt-2">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }} // eslint-disable-line react/forbid-component-props
        />
      </div>

      <div className="space-y-8 pt-6 pb-12">
        {/* Run summary header for orientation and quick health checks. */}
        <section className="space-y-5 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Active Test Run</p>
              <p className="text-lg font-semibold text-foreground">{selectedSuite?.display_name}</p>
              <p className="text-sm text-muted-foreground">
                Scenario <span className="font-medium text-foreground">{cursor + 1}</span> of {results.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous scenario"
                onClick={() => setCursor((c) => Math.max(c - 1, 0))}
                disabled={cursor === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {/* Jump-to-scenario menu for non-linear navigation. */}
              <div className="relative" ref={jumpListRef}>
                <button
                  type="button"
                  onClick={() => setShowJumpList((v) => !v)}
                  className="h-8 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="font-medium text-foreground">{cursor + 1}</span> / {results.length}
                </button>
                {showJumpList && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-80 max-h-80 overflow-y-auto rounded-md border border-border bg-background">
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
              <button
                type="button"
                aria-label="Next scenario"
                onClick={() => setCursor((c) => Math.min(c + 1, results.length - 1))}
                disabled={cursor >= results.length - 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Depth</p>
              <p className="text-sm font-medium text-foreground">{depthLabel(runForm.scenarioDepth)}</p>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Passed</p>
              <p className="text-sm font-medium text-green-600">{passCount}</p>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Issues</p>
              <p className="text-sm font-medium text-red-500">{failCount}</p>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Skipped</p>
              <p className="text-sm font-medium text-muted-foreground">{skipCount}</p>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</p>
              <p className="text-sm font-medium text-foreground">{pendingCount}</p>
            </div>
          </div>
        </section>

        {uiError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">
            {uiError}
          </p>
        )}

        <div className="space-y-8">
          <section className="space-y-7">
            {/* Scenario heading and controls. */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold leading-snug tracking-tight text-foreground">
                  {tc.test_number} {tc.test_name}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingCase((v) => !v)}
                  title="Edit test instructions"
                  className={cn(
                    "flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors shrink-0",
                    editingCase
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  <Pencil className="h-3 w-3" />
                  {editingCase ? "Editing" : "Edit"}
                </button>
              </div>
            </div>

            {/* Project context row to keep deep-link navigation accurate per project. */}
            <div className="space-y-2">
              <Label htmlFor="runner-project-id" className="text-xs text-muted-foreground">Project ID (for links)</Label>
              <div className="flex items-center gap-3">
                <input
                  id="runner-project-id"
                  type="text"
                  value={runForm.projectId}
                  onChange={(e) => setRunForm((f) => ({ ...f, projectId: e.target.value }))}
                  placeholder="Enter project ID (e.g. 890)"
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {runForm.projectId && (
                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    /{runForm.projectId}/…
                  </span>
                )}
              </div>
            </div>

            {/* Editable scenario form for maintaining test case quality in place. */}
            {editingCase ? (
              <div className="space-y-4 rounded-md border border-border px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Editing test instructions</p>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">What this checks (context note)</Label>
                  <Textarea
                    value={editForm.context_note}
                    onChange={(e) => setEditForm((f) => ({ ...f, context_note: e.target.value }))}
                    placeholder="Plain English description of what this test verifies…"
                    className="resize-none h-16 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Before you start (setup steps)</Label>
                  <Textarea
                    value={editForm.setup_steps}
                    onChange={(e) => setEditForm((f) => ({ ...f, setup_steps: e.target.value }))}
                    placeholder="Prerequisites, one per line…"
                    className="resize-none h-16 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Start URL</Label>
                  <Input
                    value={editForm.start_url}
                    onChange={(e) => setEditForm((f) => ({ ...f, start_url: e.target.value }))}
                    placeholder="/67/budget"
                    className="text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Steps (one per line, no leading numbers)</Label>
                  <Textarea
                    value={editForm.steps}
                    onChange={(e) => setEditForm((f) => ({ ...f, steps: e.target.value }))}
                    placeholder="Click the Create button&#10;Fill in the Name field&#10;Click Save"
                    className="resize-none h-40 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">What should happen (expected result)</Label>
                  <Textarea
                    value={editForm.expected_result}
                    onChange={(e) => setEditForm((f) => ({ ...f, expected_result: e.target.value }))}
                    placeholder="The record appears in the list…"
                    className="resize-none h-16 text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={saveEdit} disabled={editSaving} className="flex-1">
                    {editSaving ? "Saving…" : "Save instructions"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingCase(false)} disabled={editSaving}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-7">
                {tc.context_note && (
                  <section className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Context</p>
                    <p className="text-sm leading-relaxed text-foreground">{tc.context_note}</p>
                  </section>
                )}

                {tc.setup_steps && (
                  <section className="space-y-2 border-l border-border pl-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Before You Start</p>
                    <div className="space-y-1">
                      {parseSteps(tc.setup_steps).map((s) => (
                        <p key={s} className="text-sm text-foreground">• {s}</p>
                      ))}
                    </div>
                  </section>
                )}

                {/* Checklist keeps each validation step explicit and easy to track. */}
                <section className="space-y-3">
                  <p className="text-base font-semibold text-foreground">Steps</p>
                  <div className="space-y-2">
                    {steps.map((step, i) => (
                      <label
                        key={step}
                        className={cn(
                          "flex items-start gap-3 cursor-pointer rounded-md border border-transparent px-1.5 py-2 transition-all",
                          checkedSteps[i] ? "opacity-70" : "hover:border-border"
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
                </section>

                {startPath && (
                  <a
                    href={startPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    Open the app at the right page →
                  </a>
                )}

                {tc.expected_result && (
                  <section className="pt-2 space-y-2">
                    <p className="text-sm font-semibold text-foreground">What should happen</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{tc.expected_result}</p>
                  </section>
                )}

                {current.test_screenshots.length > 0 && (
                  <section className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Screenshots</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {current.test_screenshots.map((s) => (
                        <a key={s.id} href={s.public_url ?? "#"} target="_blank" rel="noopener noreferrer">
                          <img
                            src={s.public_url ?? ""}
                            alt={s.label ?? "screenshot"}
                            className="h-24 w-full rounded-md border border-border object-cover hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </section>

          {/* Action section in single-column flow for easier reading. */}
          <section className="space-y-4 pt-6">
            <section className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Notes <span className="font-normal">(optional)</span>
                </Label>
                <Textarea
                  ref={notesRef}
                  value={notesMap[current.id] ?? ""}
                  onChange={(e) => updateNote(current.id, e.target.value)}
                  placeholder="Optional notes, observations, or anything unexpected…"
                  className="resize-none h-24 text-sm"
                />
              </div>

            </section>

            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Result</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => void record("pass")}
                  disabled={saving}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white h-11 text-sm font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Passed
                </Button>
                <Button
                  onClick={openIssueModal}
                  disabled={saving || issueSubmitting}
                  variant="destructive"
                  className="gap-2 h-11 text-sm font-semibold"
                >
                  <XCircle className="h-4 w-4" />
                  Issue found
                </Button>
                <Button
                  onClick={() => void record("skip")}
                  disabled={saving}
                  variant="outline"
                  className="gap-2 h-11 text-sm font-semibold"
                >
                  <MinusCircle className="h-4 w-4" />
                  Skip
                </Button>
              </div>
            </section>

            <section className="space-y-2 pt-3">
              <FileUploadField
                label={<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attachments</span>}
                accept="image/*"
                multiple={false}
                maxFiles={1}
                maxSize={10 * 1024 * 1024}
                disabled={uploadingScreenshot}
                variant="minimal"
                showMetaText
                onFilesSelected={(files) => {
                  const file = files[0];
                  if (file) void handleFile(file);
                }}
              />

              {current.status === "fail" && (
                feedbackSentIds.has(current.id) ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Sent to feedback inbox
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      void sendToFeedback(current).catch((error) => {
                        setUiError(formatActionError(error, "Unable to send this failed test to feedback inbox."));
                      });
                    }}
                    disabled={feedbackSendingIds.has(current.id)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 transition-colors rounded-md border border-border px-3 py-2 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {feedbackSendingIds.has(current.id) ? "Sending…" : "Send to feedback inbox"}
                  </button>
                )
              )}
            </section>
          </section>
        </div>

      </div>

      {/* Tool reference panel — collapsible, lazy-loaded */}
      {selectedSuite && (
        <div className="pb-12">
          <ToolReferencePanel toolName={selectedSuite.tool_name} />
        </div>
      )}

      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Issue Found</DialogTitle>
            <DialogDescription>
              Add notes and an optional screenshot. Scenario details are attached automatically in the background.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="issue-notes">Notes</Label>
              <Textarea
                id="issue-notes"
                value={issueForm.notes}
                onChange={(e) =>
                  setIssueForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Describe what failed and what you observed."
                className="h-28 resize-none text-sm"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Screenshot (optional)</Label>
              <FileUploadField
                label={<span className="text-xs text-muted-foreground">Upload screenshot for this issue report</span>}
                accept="image/*"
                multiple={false}
                maxFiles={1}
                maxSize={4 * 1024 * 1024}
                variant="minimal"
                showMetaText
                disabled={issueSubmitting}
                onFilesSelected={handleIssueScreenshotSelected}
              />
              {issueForm.screenshotDataUrl && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{issueForm.screenshotName ?? "Screenshot selected"}</p>
                  <img
                    src={issueForm.screenshotDataUrl}
                    alt="Issue screenshot preview"
                    className="max-h-48 w-full rounded-md border border-border object-contain"
                  />
                </div>
              )}
            </div>

            {issueSubmitError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-300">
                {issueSubmitError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIssueModalOpen(false)}
              disabled={issueSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void submitIssueReport()}
              disabled={issueSubmitting}
            >
              {issueSubmitting ? "Submitting…" : "Submit Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
