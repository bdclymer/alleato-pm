#!/usr/bin/env node
import fs from "fs";
import path from "path";

const feature = process.argv[2];
if (!feature) {
  console.error("Usage: node .agents/scripts/enforce-gates.js <feature>");
  process.exit(1);
}

const featureDir = `docs-ai/contents/docs/PRPs/${feature}`;
const required = ["STATUS.md", "TASKS.md", "PLAN.md", "TEST-RESULTS.md", "VERIFICATION.md", "handoff.json"];

const missing = required.filter((f) => !fs.existsSync(path.join(featureDir, f)));
if (missing.length) {
  console.error(`Missing required files in ${featureDir}:\n- ${missing.join("\n- ")}`);
  process.exit(1);
}

const verification = fs.readFileSync(path.join(featureDir, "VERIFICATION.md"), "utf8");
if (!/Final Verdict\s*\nVERIFIED/i.test(verification)) {
  console.error("VERIFICATION.md does not end in VERIFIED verdict.");
  process.exit(1);
}

console.log("File gates passed ✅");