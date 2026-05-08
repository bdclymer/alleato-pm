#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";

const rawArgs = process.argv.slice(2);

const options = {
  message: "",
  files: [],
  allDirty: false,
  stagedOnly: false,
  checkOnly: false,
  noPush: false,
  noVerify: false,
  allowNonMain: false,
  allowStaged: false,
};

function usage() {
  console.log(`Usage:
  npm run codex:finish -- --message "Commit message" --files path/to/file path/to/other
  npm run codex:finish -- --message "Commit message" --all-dirty
  npm run codex:finish -- --check

Options:
  -m, --message <text>   Commit message. Required unless --check is used.
  --files <paths...>     Stage only these task-owned files.
  --all-dirty            Stage every dirty file. Use only when the current task owns the whole diff.
  --staged-only          Commit the files already staged by the caller.
  --check                Report branch, sync, and dirty state without committing.
  --no-push              Commit locally but do not push.
  --no-verify            Skip targeted pre-commit checks.
  --allow-non-main       Allow running away from main.
  --allow-staged         Allow pre-existing staged files to be included.`);
}

function abort({ cause, detection, prevention, exitCode = 1 }) {
  console.error("codex:finish blocked");
  console.error(`Cause: ${cause}`);
  console.error(`Detection gap: ${detection}`);
  console.error(`Prevention step: ${prevention}`);
  process.exit(exitCode);
}

function parseArgs() {
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "-m" || arg === "--message") {
      options.message = rawArgs[index + 1] || "";
      index += 1;
      continue;
    }

    if (arg.startsWith("--message=")) {
      options.message = arg.slice("--message=".length);
      continue;
    }

    if (arg === "--files") {
      while (rawArgs[index + 1] && !rawArgs[index + 1].startsWith("--")) {
        options.files.push(rawArgs[index + 1]);
        index += 1;
      }
      continue;
    }

    if (arg.startsWith("--files=")) {
      options.files.push(
        ...arg
          .slice("--files=".length)
          .split(",")
          .map((file) => file.trim())
          .filter(Boolean)
      );
      continue;
    }

    if (arg === "--all-dirty") {
      options.allDirty = true;
      continue;
    }

    if (arg === "--staged-only") {
      options.stagedOnly = true;
      continue;
    }

    if (arg === "--check" || arg === "--check-only") {
      options.checkOnly = true;
      continue;
    }

    if (arg === "--no-push") {
      options.noPush = true;
      continue;
    }

    if (arg === "--no-verify") {
      options.noVerify = true;
      continue;
    }

    if (arg === "--allow-non-main") {
      options.allowNonMain = true;
      continue;
    }

    if (arg === "--allow-staged") {
      options.allowStaged = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }

    abort({
      cause: `Unknown argument: ${arg}`,
      detection: "The finish command only accepts explicit options.",
      prevention: "Run npm run codex:finish -- --help and pass task-owned files explicitly.",
      exitCode: 2,
    });
  }

  if (options.files.length > 0 && options.allDirty) {
    abort({
      cause: "--files and --all-dirty were both provided.",
      detection: "The command cannot tell whether the intended scope is narrow or the whole checkout.",
      prevention: "Use --files for focused task completion, or --all-dirty only when the task owns every dirty file.",
      exitCode: 2,
    });
  }

  if (options.stagedOnly && (options.files.length > 0 || options.allDirty)) {
    abort({
      cause: "--staged-only cannot be combined with --files or --all-dirty.",
      detection: "The command cannot safely mix caller-managed staging with automatic staging.",
      prevention: "Use --staged-only after manually staging exact hunks, or let codex:finish stage whole files with --files.",
      exitCode: 2,
    });
  }

  if (!options.checkOnly && !options.message.trim()) {
    abort({
      cause: "Missing commit message.",
      detection: "A publishable finish needs a clear commit boundary.",
      prevention: 'Pass --message "Short imperative commit message", or use --check for a dry state report.',
      exitCode: 2,
    });
  }
}

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = capture && result.stderr ? `\n${result.stderr.trim()}` : "";
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}${stderr}`);
  }

  return capture ? result.stdout.trim() : "";
}

function getRepoRoot() {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    abort({
      cause: "Current directory is not inside a Git repository.",
      detection: "git rev-parse --show-toplevel failed.",
      prevention: "Run this from the alleato-pm checkout before trying to publish.",
      exitCode: 2,
    });
  }

  return result.stdout.trim();
}

function listOutput(command, args) {
  const output = run(command, args, { capture: true });
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function printState() {
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { capture: true });
  const status = run("git", ["status", "--short", "--branch"], { capture: true });

  run("git", ["fetch", "origin", "main"]);
  const counts = run("git", ["rev-list", "--left-right", "--count", "origin/main...HEAD"], {
    capture: true,
  });
  const [behind = "0", ahead = "0"] = counts.split(/\s+/);

  console.log(`Branch: ${branch}`);
  console.log(`Sync: ${behind} behind, ${ahead} ahead of origin/main`);
  console.log(status || "Working tree clean");
}

function ensureMainBranch() {
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { capture: true });
  if (branch !== "main" && !options.allowNonMain) {
    abort({
      cause: `Current branch is ${branch}, not main.`,
      detection: "codex:finish checks the active branch before staging or committing.",
      prevention: "Switch to main for trunk-based publishing, or pass --allow-non-main for an intentional exception.",
    });
  }
}

function rebaseIfBehind() {
  run("git", ["fetch", "origin", "main"]);
  const counts = run("git", ["rev-list", "--left-right", "--count", "origin/main...HEAD"], {
    capture: true,
  });
  const [behind = "0"] = counts.split(/\s+/);

  if (Number(behind) > 0) {
    console.log(`Local main is ${behind} commit(s) behind origin/main. Rebasing with autostash.`);
    run("git", ["pull", "--rebase", "--autostash", "origin", "main"]);
  }
}

function ensureNoUnexpectedStagedFiles() {
  const staged = listOutput("git", ["diff", "--cached", "--name-only"]);
  if (options.stagedOnly) {
    if (staged.length === 0) {
      abort({
        cause: "--staged-only was provided but no files are staged.",
        detection: "The command relies on the caller-managed index for hunk-level publish safety.",
        prevention: "Stage the exact intended hunks first, then rerun codex:finish with --staged-only.",
        exitCode: 2,
      });
    }
    return;
  }

  if (staged.length > 0 && !options.allowStaged) {
    abort({
      cause: `There are already staged files: ${staged.join(", ")}`,
      detection: "Pre-existing staged files could be unrelated to the current completed task.",
      prevention: "Unstage or commit them separately, or pass --allow-staged when they are intentionally part of this task.",
    });
  }
}

function stageRequestedFiles() {
  if (options.stagedOnly) {
    return;
  }

  if (options.files.length > 0) {
    run("git", ["add", "--", ...options.files]);
    return;
  }

  if (options.allDirty) {
    run("git", ["add", "-A"]);
    return;
  }

  abort({
    cause: "No files were selected for staging.",
    detection: "The command refuses to infer task scope from a dirty checkout.",
    prevention: "Pass --files with the exact task-owned paths. Use --all-dirty only when this task owns every dirty file.",
    exitCode: 2,
  });
}

function hasAnyPrefix(files, prefixes) {
  return files.some((file) => prefixes.some((prefix) => file.startsWith(prefix)));
}

function runTargetedChecks(stagedFiles) {
  if (options.noVerify) {
    console.log("Skipping targeted checks because --no-verify was provided.");
    return;
  }

  run("git", ["diff", "--cached", "--check"]);

  const scriptFiles = stagedFiles.filter(
    (file) => file.startsWith("scripts/") && /\.(cjs|js|mjs)$/.test(file)
  );
  for (const file of scriptFiles) {
    run("node", ["--check", file]);
  }

  const appRouteTouched = stagedFiles.some(
    (file) => file.startsWith("frontend/src/app/") && file.includes("[")
  );
  if (appRouteTouched) {
    run("npm", ["run", "check:routes"]);
  }

  const frontendCodeTouched = stagedFiles.some(
    (file) => file.startsWith("frontend/") && /\.(ts|tsx|js|jsx)$/.test(file)
  );
  if (frontendCodeTouched) {
    run("npm", ["--prefix", "frontend", "run", "quality:changed"]);
  }

  const migrationFiles = stagedFiles.filter((file) =>
    /^supabase\/migrations\/\d{14}_.+\.sql$/.test(file)
  );
  for (const file of migrationFiles) {
    run("npm", ["run", "db:migrations:verify-applied", "--", file]);
  }

  if (
    !hasAnyPrefix(stagedFiles, ["frontend/", "backend/", "scripts/", "supabase/migrations/"])
  ) {
    console.log("No code-specific targeted checks were required for the staged file set.");
  }
}

function commitAndPush(stagedFiles) {
  run("git", ["commit", "-m", options.message.trim()]);

  rebaseIfBehind();

  if (options.noPush) {
    console.log("Committed locally. Push skipped because --no-push was provided.");
    return;
  }

  run("git", ["push", "origin", "main"]);
  run("git", ["fetch", "origin", "main"]);

  const localHead = run("git", ["rev-parse", "HEAD"], { capture: true });
  const remoteHead = run("git", ["rev-parse", "origin/main"], { capture: true });
  if (localHead !== remoteHead) {
    abort({
      cause: "Local HEAD does not match origin/main after push.",
      detection: `HEAD=${localHead}; origin/main=${remoteHead}`,
      prevention: "Inspect branch state before claiming the task is published.",
    });
  }

  console.log(`Published ${stagedFiles.length} file(s) to origin/main at ${localHead.slice(0, 10)}.`);
}

parseArgs();
const repoRoot = getRepoRoot();
process.chdir(repoRoot);

try {
  ensureMainBranch();

  if (options.checkOnly) {
    printState();
    process.exit(0);
  }

  rebaseIfBehind();
  ensureNoUnexpectedStagedFiles();
  stageRequestedFiles();

  const stagedFiles = listOutput("git", ["diff", "--cached", "--name-only"]);
  if (stagedFiles.length === 0) {
    console.log("No staged changes after applying the requested scope.");
    if (!options.noPush) {
      run("git", ["push", "origin", "main"]);
    }
    process.exit(0);
  }

  console.log("Staged files:");
  for (const file of stagedFiles) {
    console.log(`- ${file}`);
  }

  runTargetedChecks(stagedFiles);
  commitAndPush(stagedFiles);
} catch (error) {
  abort({
    cause: error instanceof Error ? error.message : String(error),
    detection: "A required Git or verification command returned a non-zero exit code.",
    prevention: "Fix the listed command failure, then rerun codex:finish with the same explicit file scope.",
  });
}
