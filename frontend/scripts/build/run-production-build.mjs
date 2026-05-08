import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const disableScript = path.join(frontendRoot, "scripts/build/disable-nonprod-routes.mjs");
const restoreScript = path.join(frontendRoot, "scripts/build/restore-nonprod-routes.mjs");
const statePath = path.join(frontendRoot, ".next-nonprod-routes/disabled-routes.json");
const nextDir = path.join(frontendRoot, ".next");

let activeChild = null;
let cleanedUp = false;

function runNodeScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: frontendRoot,
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

async function main() {
  await runNodeScript(disableScript);

  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
    console.log("[build] Removed frontend/.next before production build to prevent stale manifest/cache failures");
  }

  const exitCode = await new Promise((resolve, reject) => {
    activeChild = spawn("pnpm", ["exec", "next", "build", "--turbopack"], {
      cwd: frontendRoot,
      env: {
        ...process.env,
        NODE_OPTIONS: "--max-old-space-size=7168",
      },
      stdio: "inherit",
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

  runRestoreSync();
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
