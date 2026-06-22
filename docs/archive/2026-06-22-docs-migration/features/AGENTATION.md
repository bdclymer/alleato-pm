# Agentation — What It Is and How to Use It

> Written: March 23, 2026
> Context: Megan already had Agentation installed before the dev bridge was built.
> This document explains what Agentation does, how it's already set up, and
> how it replaces/supersedes the custom dev bridge we built today.

---

## What Agentation is

Agentation is a browser toolbar + MCP server that lets you annotate any page
in your running app and have Claude Code respond to those annotations directly —
without copy-pasting, describing bugs in text, or switching contexts.

You annotate in the browser. Claude Code receives the annotation via MCP,
sees the element path and React component tree, fixes the code, and resolves
the annotation. The annotation disappears from the browser when it's done.

It is exactly what we were trying to build with the custom dev bridge —
and it already exists, is already installed in Alleato, and is more
sophisticated than what we built.

---

## What's already installed in Alleato

The `Agentation` component is already imported and rendered in `layout.tsx`:

```tsx
import { AgentationThemeSync } from "@/components/dev/AgentationThemeSync";
import { Agentation } from "agentation";
...
{process.env.NODE_ENV === "development" && (
  <>
    <AgentationThemeSync />
    <Agentation />
  </>
)}
```

This means the toolbar is already live in your dev environment.
You don't need to add anything to the app itself.

---

## What you need to set up in Claude Code

The MCP server side needs to be connected to Claude Code once.
Run this from anywhere:

```bash
npx add-mcp "npx -y agentation-mcp server"
```

Or use the interactive wizard:

```bash
npx agentation-mcp init
```

Then restart Claude Code. Verify it's working:

```bash
npx agentation-mcp doctor
```

---

## How to use it day-to-day

### Basic workflow (hands-on)
1. Start dev server: `npm run dev`
2. Open the app in your browser — you'll see the Agentation toolbar
3. Click on any element, add a comment ("markup dropdown still broken")
4. In Claude Code: it sees the annotation via MCP automatically
5. Claude Code reads the component path, fixes the code, resolves the annotation
6. Annotation disappears from the browser when fixed

### Hands-free mode (best for batch fixes)
Tell Claude Code in the terminal:
```
Watch mode — call agentation_watch_annotations in a loop.
For each annotation: acknowledge it, make the fix, then resolve it with a summary.
```
Then just annotate in the browser. Claude Code picks them up automatically.

### Critique mode (AI reviews the UI unprompted)
```
Critique the UI at http://localhost:3000/[projectId]/prime-contracts
```
Claude Code opens a headed browser, scrolls through the page, and adds
annotations for things it finds wrong. You review and decide what to fix.

### Self-driving mode (AI annotates AND fixes)
```
Self-driving mode on http://localhost:3000/[projectId]/prime-contracts
```
Claude Code annotates issues AND fixes them in the same session.
Requires the self-driving skill to be installed.

---

## The 9 MCP tools Claude Code has access to

| Tool | What it does |
|------|-------------|
| `agentation_list_sessions` | List all active annotation sessions |
| `agentation_get_session` | Get a session + all its annotations |
| `agentation_get_pending` | Get unresolved annotations for a session |
| `agentation_get_all_pending` | Get all pending across every session |
| `agentation_acknowledge` | Tell Megan "I've seen this, working on it" |
| `agentation_resolve` | Mark as fixed (annotation disappears) |
| `agentation_dismiss` | Skip with a reason |
| `agentation_reply` | Ask a clarifying question back |
| `agentation_watch_annotations` | Block + wait for new annotations (use in loops) |

The most useful annotation payload includes:
- `comment` — what Megan said
- `element` — which HTML element was annotated
- `elementPath` — CSS selector path (e.g. `body > main > .hero > button.cta`)
- `reactComponents` — React component tree (e.g. `App > ProjectPage > MarkupDropdown`)
- `intent` — fix / change / question / approve
- `severity` — blocking / important / suggestion

The `reactComponents` field is especially powerful — it tells Claude Code
exactly which component to open without any searching.

---

## What we built today vs. what Agentation already does

| Feature | Our dev bridge | Agentation |
|---------|---------------|------------|
| Annotate from browser | ✅ | ✅ |
| Screenshot capture | ✅ | ✅ (better) |
| React component path | ❌ | ✅ |
| CSS element selector | Basic | ✅ Precise |
| Claude Code receives via MCP | ❌ (polling) | ✅ (native MCP) |
| Hands-free watch loop | ❌ | ✅ |
| Critique mode (AI reviews UI) | ❌ | ✅ |
| Self-driving mode | ❌ | ✅ |
| Intent/severity tagging | ❌ | ✅ |
| Annotation threads | ❌ | ✅ |

Agentation is the right tool for this. Our `dev_annotations` table, API endpoint,
overlay component, and watcher script are all preserved in the codebase but
disabled — they demonstrate the concept and can be repurposed if needed.

---

## CLAUDE.md instructions to add

Add this to the Agentation section of CLAUDE.md (or it's already implied by
the AgentationThemeSync being wired in):

```
## Agentation (in-app annotation bridge)

When in watch mode or self-driving mode, use agentation_watch_annotations
to receive annotations from Megan in real time. For each annotation:
1. Call agentation_acknowledge immediately
2. Read the reactComponents path to find the exact component
3. Fix the issue
4. Call agentation_resolve with a summary of what you changed
5. Loop back to agentation_watch_annotations

For critique mode: open agent-browser to the page, scroll through it,
annotate 5-8 issues via the toolbar, then resolve each one after fixing.
```

---

## Files related to Agentation in this project

| File | What it is |
|------|-----------|
| `frontend/src/components/dev/AgentationThemeSync.tsx` | Syncs dark/light mode with toolbar |
| `frontend/src/app/layout.tsx` | Renders `<Agentation />` in dev mode |

## Our custom dev bridge files (preserved, disabled)

| File | Status |
|------|--------|
| `frontend/src/components/dev/dev-annotation-overlay.tsx` | Built, disabled in layout |
| `frontend/src/app/api/dev/annotate/route.ts` | Built, available |
| `scripts/dev-bridge/watch-annotations.ts` | Built, available |
| `supabase/migrations/20260323100000_dev_annotations.sql` | Ran, table exists |
