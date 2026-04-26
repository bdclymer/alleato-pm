#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const args = new Set(process.argv.slice(2));
const baseRefFromFlagIndex = process.argv.indexOf("--base");
const baseRefFromFlag =
  baseRefFromFlagIndex >= 0 ? process.argv[baseRefFromFlagIndex + 1] : undefined;

const mode = args.has("--staged") ? "staged" : "changed";
const baseRef = baseRefFromFlag || process.env.GUARDRAIL_BASE_REF || "origin/main";
const scanPathPrefixes = ["frontend/src/app/", "frontend/src/components/", "frontend/src/hooks/", "frontend/src/lib/"];
const codeExtensions = /\.(ts|tsx|js|jsx)$/;

const addedLineMatchers = [
  {
    name: "explicit any",
    re: /:\s*any\b|<\s*any\s*>|\bas any\b|\bArray<\s*any\s*>|\bReadonlyArray<\s*any\s*>|\bRecord<[^>]*,\s*any\s*>|\bPromise<\s*any\s*>|\bany\[\]/,
    message: "Replace new explicit any usage with a concrete type.",
  },
  {
    name: "unknown double-cast",
    re: /\bas\s+unknown\s+as\b/,
    message: "Replace new as-unknown-as casts with a typed adapter or runtime validation.",
  },
  {
    name: "unreasoned suppression",
    re: /eslint-disable|@ts-ignore|@ts-expect-error/,
    message: "Do not add suppressions without a documented guardrail-approved exception.",
  },
];

function run(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] })
      .toString()
      .trimEnd();
  } catch {
    return "";
  }
}

function shouldScanPath(path) {
  return scanPathPrefixes.some((prefix) => path.startsWith(prefix)) && codeExtensions.test(path);
}

function splitLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getCandidateFiles() {
  const commands =
    mode === "staged"
      ? ["git diff --cached --name-only --diff-filter=ACMR"]
      : [
          `git diff --name-only ${baseRef}...HEAD --diff-filter=ACMR`,
          "git diff --cached --name-only --diff-filter=ACMR",
          "git diff --name-only --diff-filter=ACMR",
        ];

  return [
    ...new Set(
      commands.flatMap((cmd) => splitLines(run(cmd))).filter(shouldScanPath),
    ),
  ].sort();
}

function getAddedLinesForFile(path) {
  const commands =
    mode === "staged"
      ? [`git diff --cached --unified=0 -- "${path}"`]
      : [
          `git diff --unified=0 ${baseRef}...HEAD -- "${path}"`,
          `git diff --cached --unified=0 -- "${path}"`,
          `git diff --unified=0 -- "${path}"`,
        ];

  const added = [];
  for (const cmd of commands) {
    const diffText = run(cmd);
    if (!diffText) continue;
    for (const rawLine of diffText.split("\n")) {
      if (!rawLine.startsWith("+")) continue;
      if (rawLine.startsWith("+++")) continue;
      added.push(rawLine.slice(1));
    }
  }
  return added;
}

function stripComments(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .trim();
}

export function findSilentCatchBlocks(source) {
  const violations = [];
  const catchBlockRe = /catch\s*(?:\([^)]*\))?\s*\{([\s\S]*?)\n\s*\}/g;
  let match;

  while ((match = catchBlockRe.exec(source)) !== null) {
    const body = match[1] ?? "";
    if (stripComments(body).length > 0) continue;
    const line = source.slice(0, match.index).split("\n").length;
    violations.push({ line, preview: "empty or comment-only catch block" });
  }

  return violations;
}

function findAddedLineViolations(file, addedLines) {
  const violations = [];
  for (const line of addedLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    for (const matcher of addedLineMatchers) {
      if (!matcher.re.test(line)) continue;
      violations.push({
        file,
        kind: matcher.name,
        message: matcher.message,
        preview: trimmed,
      });
    }
  }
  return violations;
}

export function buildUnsafePatternReport(files = getCandidateFiles()) {
  const violations = [];

  for (const file of files) {
    const addedLines = getAddedLinesForFile(file);
    violations.push(...findAddedLineViolations(file, addedLines));

    if (!existsSync(file)) continue;
    const source = readFileSync(file, "utf8");
    for (const catchViolation of findSilentCatchBlocks(source)) {
      violations.push({
        file,
        kind: "silent catch",
        message: "Catch blocks must fail loudly via structured reporting, user-visible state, or rethrow.",
        preview: `${catchViolation.preview} near line ${catchViolation.line}`,
      });
    }
  }

  return { files, violations };
}

function main() {
  const report = buildUnsafePatternReport();
  if (report.files.length === 0) {
    console.log(`No ${mode} frontend source files to scan for unsafe patterns.`);
    process.exit(0);
  }

  if (report.violations.length === 0) {
    console.log(`No unsafe patterns detected in ${report.files.length} ${mode} file(s).`);
    process.exit(0);
  }

  console.error("Unsafe quality patterns detected:");
  for (const violation of report.violations) {
    console.error(`- ${violation.file}: ${violation.kind}`);
    console.error(`  ${violation.message}`);
    console.error(`  + ${violation.preview}`);
  }
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
