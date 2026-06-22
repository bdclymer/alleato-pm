# Dependency Graphs

Visual import maps for the codebase. Each file shows what depends on what — boxes are folders/files, arrows are imports.

**These are generated.** Don't edit by hand. Regenerate with:

```bash
cd frontend
npm run map:all          # all five at once
npm run map:overview     # just the architecture overview
npm run map:ai-lib       # just the AI library
# ... etc
```

Requires: `graphviz` (`brew install graphviz`) and `dependency-cruiser` (already a devDep).

## Files

| File | Scope | Open in | Use when |
|------|-------|---------|----------|
| [`architecture-overview.svg`](./architecture-overview.svg) | Whole `src/`, folder-level | Browser (large — 3MB) | You want a 30,000ft view of the whole frontend |
| [`app-main-routes.svg`](./app-main-routes.svg) | `src/app/(main)/`, folder-level | Browser | You want to see how product pages connect |
| [`components.svg`](./components.svg) | `src/components/`, folder-level | Browser | You want to see component reuse and clusters |
| [`ai-lib-folders.svg`](./ai-lib-folders.svg) | `src/lib/ai/`, folder-level | Browser | You want the AI Assistant's internal architecture |
| [`ai-tools.svg`](./ai-tools.svg) | `src/lib/ai/tools/`, file-level | Browser | You want to see how the 28+ AI tools relate |
| [`ai-lib-folders.mmd`](./ai-lib-folders.mmd) | Mermaid version of the AI lib graph | GitHub / VS Code Mermaid Preview | You want a text-based / GitHub-renderable view |
| [`ai-lib-graph.mmd`](./ai-lib-graph.mmd) | Mermaid, file-level | GitHub / VS Code Mermaid Preview | Same, more detail |

## How to read them

- **Each box** is a file or folder.
- **Arrows** point from importer → imported. So `A → B` means "A imports B".
- **Clusters** (nested rectangles) are folders. A box inside a cluster is a file inside that folder.
- **Dense clusters of arrows** are coupling hotspots — candidates for refactoring.
- **Isolated boxes** with no arrows in are dead code or entry points.
- **Cycles** (arrows going both ways) are smell — modules that depend on each other.

## Why these graphs are useful

When you're new to a part of the codebase, the question "where do I start reading?" has a real answer: the box with the most incoming arrows. That's the file everyone else uses — read it first.

When you're planning a refactor, the question "what will break if I change this?" has a real answer: trace outgoing arrows from the file you want to touch.

When you're looking for cleanup targets, dense or tangled clusters are the right place to focus. The [AI library graph](./ai-lib-folders.svg) shows several of these; see [`../ai-assistant.md`](../ai-assistant.md) cleanup targets.

## Other graph types depcruise can produce

If you need them, add a new `map:*` script in `frontend/package.json`:

```bash
# Reverse view — what depends on this one file?
depcruise --output-type dot --reaches "src/lib/ai/orchestrator.ts" src | dot -Tsvg > who-uses-orchestrator.svg

# Just the cycles — finds circular dependencies
depcruise --output-type dot --include-only "src/lib/ai" --validate src | dot -Tsvg > ai-cycles.svg

# Metrics report — stability, fan-in, fan-out per module
depcruise --output-type metrics src/lib/ai > ai-metrics.txt
```

Full reference: <https://github.com/sverweij/dependency-cruiser>
