#!/usr/bin/env node

import { spawn } from "node:child_process";

const timeoutMs = Number(process.env.TYPECHECK_TIMEOUT_MS || 60000);
const disableTimeout = process.env.TYPECHECK_NO_TIMEOUT === "1";

const child = spawn(
  process.execPath,
  [
    "--max-old-space-size=8192",
    "node_modules/typescript/bin/tsc",
    "--noEmit",
    "--pretty",
    "false",
  ],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  },
);

let timedOut = false;
let killTimer = null;

const timeoutHandle = disableTimeout
  ? null
  : setTimeout(() => {
      timedOut = true;
      console.error(
        `[typecheck] Timed out after ${timeoutMs}ms. This command now fails loudly instead of hanging forever.`,
      );
      console.error(
        "[typecheck] Detection gap: the frontend tsconfig still admits enough heavy app/generated code that full-program checking can stall.",
      );
      console.error(
        "[typecheck] Prevention step: keep non-app/generated artifacts out of frontend/tsconfig.json and use TYPECHECK_NO_TIMEOUT=1 only when intentionally profiling the full program.",
      );
      child.kill("SIGTERM");
      killTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);

child.on("exit", (code, signal) => {
  if (timeoutHandle) clearTimeout(timeoutHandle);
  if (killTimer) clearTimeout(killTimer);

  if (timedOut) {
    process.exit(124);
  }

  if (signal) {
    process.exit(1);
  }

  process.exit(code ?? 1);
});
