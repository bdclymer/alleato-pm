#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const handoffDir = path.join(repoRoot, "docs/ops/handoffs");
const dateArg = process.argv[2];
const today = dateArg || new Date().toISOString().slice(0, 10);

const requiredMarkers = [
  "Session ID",
  "Task ID",
  "Current status",
  "Files changed",
  "Commands run and outcome",
  "Evidence artifacts",
  "Top 3 findings",
  "Recommended next action",
  "Handoff file path",
];

function getWorkerFile(sessionId) {
  return path.join(handoffDir, `${today}-${sessionId}-workstream.md`);
}

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, missing: requiredMarkers, modified: null };
  }

  const text = fs.readFileSync(filePath, "utf8");
  const stat = fs.statSync(filePath);
  const missing = requiredMarkers.filter((marker) => !text.includes(marker));
  return {
    exists: true,
    missing,
    modified: stat.mtime.toISOString(),
  };
}

const sessions = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];
const rows = sessions.map((sessionId) => {
  const file = getWorkerFile(sessionId);
  const info = checkFile(file);
  return {
    sessionId,
    file: path.relative(repoRoot, file),
    exists: info.exists,
    complete: info.exists && info.missing.length === 0,
    missingCount: info.missing.length,
    missing: info.missing.join("; "),
    modified: info.modified || "missing",
  };
});

console.log(`Worker status for ${today}`);
console.log(
  "Session | Exists | Complete | Missing Fields | Last Modified | File"
);
console.log(
  "------- | ------ | -------- | -------------- | ------------- | ----"
);
for (const row of rows) {
  console.log(
    `${row.sessionId} | ${row.exists ? "yes" : "no"} | ${
      row.complete ? "yes" : "no"
    } | ${row.missingCount} | ${row.modified} | ${row.file}`
  );
}

const incomplete = rows.filter((r) => !r.complete);
if (incomplete.length > 0) {
  console.log("\nNeeds rework:");
  for (const row of incomplete) {
    console.log(`- ${row.sessionId}: ${row.missing || "file missing"}`);
  }
}
