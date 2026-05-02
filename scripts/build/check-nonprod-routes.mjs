import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(repoRoot, "scripts/build/nonprod-routes.json");
const statePath = path.join(repoRoot, "frontend/.next-nonprod-routes/disabled-routes.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const missing = [];
const disabledInSource = [];

for (const relativePath of manifest.files) {
  const absolutePath = path.join(repoRoot, relativePath);
  const disabledPath = `${absolutePath}.nonprod`;

  if (!existsSync(absolutePath)) {
    missing.push(relativePath);
  }

  if (existsSync(disabledPath)) {
    disabledInSource.push(`${relativePath}.nonprod`);
  }
}

if (missing.length > 0 || disabledInSource.length > 0) {
  console.error("[build] Non-production route manifest is out of sync.");
  if (missing.length > 0) {
    console.error(`Missing active files:\n${missing.map((file) => `- ${file}`).join("\n")}`);
  }
  if (disabledInSource.length > 0) {
    console.error(`Disabled files left in source:\n${disabledInSource.map((file) => `- ${file}`).join("\n")}`);
  }
  process.exit(1);
}

if (existsSync(statePath)) {
  console.error("[build] Found active non-production route state file. A previous production build did not clean up.");
  console.error(`Remove or restore: ${path.relative(repoRoot, statePath)}`);
  process.exit(1);
}

console.log(`[build] Non-production route manifest is valid (${manifest.files.length} files)`);
