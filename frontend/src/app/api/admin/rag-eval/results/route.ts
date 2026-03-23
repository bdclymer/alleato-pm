import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const RAG_DIR = path.join(REPO_ROOT, "docs-ai/contents/docs/PRPs/rag");

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
    const files = fs.readdirSync(dir).filter((f) => pattern.test(f));
    if (!files.length) return null;
    // Sort by name (filenames include dates) and take most recent
    files.sort().reverse();
    return path.join(dir, files[0]);
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/rag-eval/results
 * Returns the latest L1 and L2 eval baselines from disk.
 */
export async function GET() {
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
  });
}
