import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(repoRoot, "scripts/build/nonprod-routes.json");
const stateDir = path.join(repoRoot, "frontend/.next-nonprod-routes");
const statePath = path.join(stateDir, "disabled-routes.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const disabled = [];

if (existsSync(statePath)) {
  console.log("[build] non-production routes are already disabled; skipping");
  process.exit(0);
}

mkdirSync(stateDir, { recursive: true });

for (const relativePath of manifest.files) {
  const absolutePath = path.join(repoRoot, relativePath);
  const disabledPath = `${absolutePath}.nonprod`;

  if (!existsSync(absolutePath)) {
    if (existsSync(disabledPath)) {
      disabled.push({ from: relativePath, to: `${relativePath}.nonprod`, alreadyDisabled: true });
      continue;
    }

    console.warn(`[build] Skipping missing non-production route file: ${relativePath}`);
    continue;
  }

  if (existsSync(disabledPath)) {
    throw new Error(`[build] Refusing to overwrite existing disabled route file: ${relativePath}.nonprod`);
  }

  renameSync(absolutePath, disabledPath);
  disabled.push({ from: relativePath, to: `${relativePath}.nonprod` });
}

writeFileSync(statePath, `${JSON.stringify({ disabledAt: new Date().toISOString(), files: disabled }, null, 2)}\n`);
console.log(`[build] Disabled ${disabled.length} non-production route files for this production build`);
