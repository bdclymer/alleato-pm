import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const PYTHON = path.join(REPO_ROOT, "backend/.venv/bin/python");
const RAG_DIR = path.join(REPO_ROOT, "docs-ai/contents/docs/PRPs/rag");

type EvalType = "l1" | "l2" | "reranker" | "coverage" | "e2e";

const EVAL_CONFIGS: Record<EvalType, { script: string; args: (outputPath: string) => string[]; description: string }> = {
  l1: {
    script: "backend/src/scripts/rag_eval.py",
    args: (out) => ["--verbose", "--output", out],
    description: "L1 Retrieval Eval (MRR, pass rate, source match)",
  },
  l2: {
    script: "backend/src/scripts/rag_answer_eval.py",
    args: (out) => ["--verbose", "--output", out],
    description: "L2 Answer Quality Eval (LLM judge, 5 dimensions)",
  },
  reranker: {
    script: "backend/src/scripts/rag_reranker_eval.py",
    args: (out) => ["--verbose", "--output", out],
    description: "Reranker A/B Eval (with vs. without LLM reranker)",
  },
  coverage: {
    script: "backend/src/scripts/rag_source_coverage.py",
    args: (out) => ["--output", out],
    description: "Source Coverage Diagnostic (chunk counts by source type)",
  },
  e2e: {
    script: "backend/src/scripts/rag_e2e_eval.py",
    args: (out) => ["--verbose", "--output", out],
    description: "L3 End-to-End Eval (SQL tools + vector, financial questions fixed)",
  },
};

/**
 * POST /api/admin/rag-eval/run
 * Body: { type: "l1" | "l2" | "reranker" | "coverage" | "e2e" }
 *
 * Streams eval script stdout/stderr as Server-Sent Events.
 * On completion, saves results to RAG_DIR and emits a "result" event.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const evalType = body.type as EvalType;

  if (!evalType || !EVAL_CONFIGS[evalType]) {
    return new Response(
      JSON.stringify({ error: `Unknown eval type: ${evalType}. Valid: ${Object.keys(EVAL_CONFIGS).join(", ")}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!fs.existsSync(PYTHON)) {
    return new Response(
      JSON.stringify({ error: `Python venv not found at ${PYTHON}. Run: cd backend && python -m venv .venv && pip install -r requirements.txt` }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const config = EVAL_CONFIGS[evalType];
  const scriptPath = path.join(REPO_ROOT, config.script);
  const timestamp = new Date().toISOString().slice(0, 10);
  const outputFile = path.join(RAG_DIR, `rag-${evalType}-eval-${timestamp}.json`);
  const args = [scriptPath, ...config.args(outputFile)];

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      function send(event: string, data: unknown) {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      send("start", { type: evalType, description: config.description, timestamp: new Date().toISOString() });

      const proc = spawn(PYTHON, args, {
        cwd: REPO_ROOT,
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      });

      proc.stdout.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        for (const line of lines) send("log", { line });
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        for (const line of lines) send("log", { line });
      });

      proc.on("close", (code) => {
        const success = code === 0;
        let resultData: unknown = null;

        if (success && fs.existsSync(outputFile)) {
          try {
            resultData = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
          } catch {
            // result file parse failed — still report success
          }
        }

        send("complete", { success, exitCode: code, outputFile: path.relative(REPO_ROOT, outputFile), result: resultData });
        controller.close();
      });

      proc.on("error", (err) => {
        send("error", { message: err.message });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
