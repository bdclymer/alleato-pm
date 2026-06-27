import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(frontendRoot, "..");
const disableScript = path.join(frontendRoot, "scripts/build/disable-nonprod-routes.mjs");
const restoreScript = path.join(frontendRoot, "scripts/build/restore-nonprod-routes.mjs");
const statePath = path.join(frontendRoot, ".next-nonprod-routes/disabled-routes.json");
const nextDir = path.join(frontendRoot, ".next");
const TRANSIENT_NEXT_BUILD_FAILURES = [
  /Cannot find module for page: \/_document/,
  /PageNotFoundError/,
  /app-build-manifest\.json/,
  /_buildManifest\.js\.tmp/,
  /Cannot find module '.*\.next\/server\/app\/.*\/route\.js'/,
  /Export encountered an error on .*\/route/,
  /TurbopackInternalError: failed to write to .*\.next\//,
  /ENOENT: no such file or directory, open '.*\.next\//,
  /No such file or directory \(os error 2\)/,
];
const TURBOPACK_BUILD_ARGS = ["exec", "next", "build", "--turbopack"];
const WEBPACK_BUILD_ARGS = ["exec", "next", "build"];
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const buildEngine = (process.env.NEXT_PRODUCTION_BUILD_ENGINE ?? "turbopack")
  .trim()
  .toLowerCase();
const nextBuildNodeOptions =
  process.env.NEXT_PRODUCTION_BUILD_NODE_OPTIONS?.trim() || "--max-old-space-size=7168";

let activeChild = null;
let cleanedUp = false;

function formatDuration(ms) {
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  return `${(seconds / 60).toFixed(1)}min`;
}

async function timedStep(label, step) {
  const startedAt = Date.now();
  console.log(`[build] ${label} started`);
  try {
    return await step();
  } finally {
    console.log(`[build] ${label} finished in ${formatDuration(Date.now() - startedAt)}`);
  }
}

function runNodeScript(scriptPath, { cwd = frontendRoot } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Script terminated by signal ${signal}: ${scriptPath}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Script exited with code ${code}: ${scriptPath}`));
        return;
      }
      resolve();
    });
  });
}

function runRestoreSync() {
  // On Vercel the container is ephemeral — skip restore so that Vercel's own
  // post-build file tracing (NFT) can still lstat the .nonprod files it recorded
  // during the build. Restoring them before NFT runs causes ENOENT failures.
  if (process.env.VERCEL) {
    return;
  }

  if (cleanedUp || !existsSync(statePath)) {
    return;
  }

  cleanedUp = true;
  const result = spawnSync(process.execPath, [restoreScript], {
    cwd: frontendRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`[build] Failed to restore non-production routes (exit ${result.status ?? "unknown"})`);
  }
}

function removeNextDir(reason) {
  if (!existsSync(nextDir)) {
    return;
  }

  rmSync(nextDir, { recursive: true, force: true });
  console.log(`[build] Removed frontend/.next (${reason})`);
}

function isTransientNextBuildFailure(output) {
  return TRANSIENT_NEXT_BUILD_FAILURES.some((pattern) => pattern.test(output));
}

async function runNextBuildAttempt({ attempt, args, label }) {
  if (!isVercel || attempt > 1 || label !== "Turbopack") {
    removeNextDir("prevent stale manifest/cache failures");
  } else {
    console.log("[build] Preserving restored Vercel .next cache for first Turbopack attempt");
  }

  let buildOutput = "";
  const exitCode = await new Promise((resolve, reject) => {
    console.log(`[build] Starting ${label} production build attempt ${attempt}`);
    console.log(`[build] ${label} production build NODE_OPTIONS=${nextBuildNodeOptions}`);
    activeChild = spawn("pnpm", args, {
      cwd: frontendRoot,
      env: {
        ...process.env,
        NODE_OPTIONS: nextBuildNodeOptions,
      },
      stdio: ["inherit", "pipe", "pipe"],
    });

    activeChild.stdout.on("data", (chunk) => {
      buildOutput += chunk.toString();
      process.stdout.write(chunk);
    });
    activeChild.stderr.on("data", (chunk) => {
      buildOutput += chunk.toString();
      process.stderr.write(chunk);
    });
    activeChild.on("error", reject);
    activeChild.on("exit", (code, signal) => {
      activeChild = null;
      if (signal) {
        reject(new Error(`next build terminated by signal ${signal}`));
        return;
      }
      resolve(code ?? 1);
    });
  });

  if (exitCode !== 0 && label === "Turbopack" && isTransientNextBuildFailure(buildOutput)) {
    if (attempt === 1) {
      console.warn("[build] Turbopack hit a transient manifest/page-data artifact failure; clearing .next and retrying once.");
      return runNextBuildAttempt({ attempt: 2, args, label });
    }
    console.warn("[build] Next build hit a transient manifest/page-data artifact failure; clearing .next and retrying once.");
    console.warn("[build] Falling back to standard Next production build after repeated Turbopack artifact failures.");
    return runNextBuildAttempt({
      attempt: 1,
      args: WEBPACK_BUILD_ARGS,
      label: "Webpack",
    });
  }

  return exitCode;
}

async function main() {
  if (!["turbopack", "webpack"].includes(buildEngine)) {
    throw new Error(
      `[build] Unsupported NEXT_PRODUCTION_BUILD_ENGINE="${buildEngine}". Expected "turbopack" or "webpack".`,
    );
  }

  await timedStep("Disable non-production routes", () => runNodeScript(disableScript));

  await timedStep("Generate route inventory CSV", () =>
    runNodeScript(path.join(repoRoot, "scripts/verify/route-audit.mjs"), { cwd: repoRoot }),
  );

  const exitCode = await timedStep("Next production build", () => {
    if (buildEngine === "webpack") {
      console.log("[build] NEXT_PRODUCTION_BUILD_ENGINE=webpack; skipping Turbopack production build.");
      return runNextBuildAttempt({
        attempt: 1,
        args: WEBPACK_BUILD_ARGS,
        label: "Webpack",
      });
    }

    return runNextBuildAttempt({
      attempt: 1,
      args: TURBOPACK_BUILD_ARGS,
      label: "Turbopack",
    });
  });

  await timedStep("Restore non-production routes", () => {
    runRestoreSync();
  });
  process.exit(exitCode);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    try {
      if (activeChild) {
        activeChild.kill(signal);
      }
      runRestoreSync();
    } finally {
      process.exit(128);
    }
  });
}

process.on("uncaughtException", (error) => {
  try {
    runRestoreSync();
  } finally {
    console.error(error);
    process.exit(1);
  }
});

process.on("unhandledRejection", (error) => {
  try {
    runRestoreSync();
  } finally {
    console.error(error);
    process.exit(1);
  }
});

main().catch((error) => {
  try {
    runRestoreSync();
  } finally {
    console.error(error);
    process.exit(1);
  }
});
