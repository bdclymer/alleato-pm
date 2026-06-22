# Dot Folders Guide

This guide explains which hidden folders at the repo root are source-of-truth vs generated artifacts so cleanup decisions are safe and fast.

## Keep and Maintain (authoritative)

| Folder | Purpose | Keep? | Notes |
|---|---|---|---|
| `.claude/` | Claude commands, agents, skills, plugins, workflows | Yes | Primary Claude config surface for this repo. |
| `.codex/` | Codex skill wrappers and local Codex config | Yes | Contains installed skill entrypoints used by Codex. |
| `.github/` | CI workflows, bots, automation config | Yes | Production automation; do not delete casually. |
| `.agents/` | Local agent metadata and helpers | Yes | Keep unless fully decommissioning agent tooling. |
| `.husky/` | Git hooks | Yes | Needed for local commit/push checks. |
| `.vscode/` | Workspace/editor settings | Optional | Keep if team relies on shared editor settings. |

## Generated or Ephemeral (safe to prune periodically)

| Folder | Purpose | Keep? | Cleanup policy |
|---|---|---|---|
| `.playwright-cli/` | Browser snapshot artifacts | No (long-term) | Safe to delete old `page-*.yml` snapshots after runs. |
| `.vercel/` | Vercel local metadata | No (long-term) | Recreated by Vercel tooling. |
| `.playwright-mcp/` | Playwright MCP runtime/cache files | No (long-term) | Keep only if actively debugging sessions. |
| `.qodo/`, `.snaplet/`, `.opencode/`, `.gemini/` | Tool-specific local config/cache | Usually | Keep only if you actively use that tool. |

## Dot-folder Cleanup Rules

1. Delete generated artifacts first (`.playwright-cli`, caches, old logs).
2. In instruction folders (`.claude`, `.codex`), delete only files with clear duplication markers like ` copy.md` or exact duplicates.
3. Never bulk-delete `.claude/commands`, `.claude/agents`, `.github/workflows`, or `.codex/skills` without a usage audit.
4. Prefer archiving to `docs/` when content has historical value.

## Cleanup Performed on 2026-03-05

- Deleted stale duplicate agent files in `.claude/agents/* copy.md`.
- Deleted stale browser snapshot artifacts in `.playwright-cli/page-2026-02-21T10-*.yml`.

