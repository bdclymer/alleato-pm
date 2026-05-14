import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";

type AssistantEvalCase = {
  id: string;
  intent: string | null;
  status: string;
  durationMs: number | null;
  toolNames: string[];
  failures: string[];
  finalText: string;
};

type AssistantEvalRun = {
  runId: string;
  generatedAt: string | null;
  baseUrl: string | null;
  bundle: string | null;
  filter: string | null;
  totalCases: number;
  passed: number;
  failed: number;
  file: string;
  summaryFile: string | null;
  cases: AssistantEvalCase[];
};

/**
 * GET /api/admin/rag-eval/results
 * Returns the latest RAG baselines and AI assistant eval-suite runs from disk.
 * Only works in local development (reads files from repo root).
 */
export const GET = withApiGuardrails("/api/admin/rag-eval/results#GET", async () => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "/api/admin/rag-eval/results#GET", message: "Authentication required.", status: 401 });
  }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) {
    throw new GuardrailError({ code: "FORBIDDEN", where: "/api/admin/rag-eval/results#GET", message: "Admin access required.", status: 403 });
  }

  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "RAG eval results are only available in local development" },
      { status: 503 },
    );
  }

  const fs = await import("fs");
  const path = await import("path");

  const REPO_ROOT = path.resolve(process.cwd(), "..");
  const RAG_DIR = path.join(REPO_ROOT, "docs/PRPs/rag");

  function readJsonFile(filePath: string) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function latestFileMatching(dir: string, pattern: RegExp) {
    try {
      const files = fs.readdirSync(dir).filter((f: string) => pattern.test(f));
      if (!files.length) return null;
      files.sort().reverse();
      return path.join(dir, files[0]);
    } catch {
      return null;
    }
  }

  function loadAssistantRuns() {
    const runsDir = path.join(REPO_ROOT, "docs/ai-plan/evals/runs");
    try {
      return fs
        .readdirSync(runsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
        .reverse()
        .slice(0, 20)
        .map((runId) => {
          const resultPath = path.join(runsDir, runId, "results.json");
          const summaryPath = path.join(runsDir, runId, "summary.md");
          const result = readJsonFile(resultPath);
          if (!result) return null;

          const cases: AssistantEvalCase[] = Array.isArray(result.results)
            ? result.results.map((testCase: Record<string, unknown>) => {
                const score = (testCase.score ?? {}) as Record<string, unknown>;
                return {
                  id: String(testCase.id ?? ""),
                  intent: typeof testCase.intent === "string" ? testCase.intent : null,
                  status: typeof score.status === "string" ? score.status : "unknown",
                  durationMs:
                    typeof testCase.durationMs === "number" ? testCase.durationMs : null,
                  toolNames: Array.isArray(score.toolNames)
                    ? score.toolNames.filter((tool): tool is string => typeof tool === "string")
                    : [],
                  failures: Array.isArray(score.failures)
                    ? score.failures.filter((failure): failure is string => typeof failure === "string")
                    : [],
                  finalText: typeof score.finalText === "string" ? score.finalText : "",
                };
              })
            : [];

          return {
            runId,
            generatedAt: typeof result.generatedAt === "string" ? result.generatedAt : null,
            baseUrl: typeof result.baseUrl === "string" ? result.baseUrl : null,
            bundle: typeof result.bundle === "string" ? result.bundle : null,
            filter: typeof result.filter === "string" ? result.filter : null,
            totalCases: typeof result.totalCases === "number" ? result.totalCases : cases.length,
            passed:
              typeof result.passed === "number"
                ? result.passed
                : cases.filter((testCase) => testCase.status === "pass").length,
            failed:
              typeof result.failed === "number"
                ? result.failed
                : cases.filter((testCase) => testCase.status === "fail").length,
            file: path.relative(REPO_ROOT, resultPath),
            summaryFile: fs.existsSync(summaryPath) ? path.relative(REPO_ROOT, summaryPath) : null,
            cases,
          };
        })
        .filter((run): run is AssistantEvalRun => Boolean(run));
    } catch (error) {
      console.warn("[rag-eval/results] Unable to load assistant eval runs.", error);
      return [];
    }
  }

  const l1Path = latestFileMatching(RAG_DIR, /^rag-eval-baseline.*\.json$/);
  const l2Path = latestFileMatching(RAG_DIR, /^rag-answer-eval-baseline.*\.json$/);

  const l1 = l1Path ? readJsonFile(l1Path) : null;
  const l2 = l2Path ? readJsonFile(l2Path) : null;

  return NextResponse.json({
    l1: {
      data: l1,
      file: l1Path ? path.relative(REPO_ROOT, l1Path) : null,
    },
    l2: {
      data: l2,
      file: l2Path ? path.relative(REPO_ROOT, l2Path) : null,
    },
    assistant: {
      runs: loadAssistantRuns(),
    },
  });
});
