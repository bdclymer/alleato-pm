# Organize Components Root Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all 62 orphaned root-level `.tsx` files in `frontend/src/components/` into appropriate subdirectories without breaking any imports.

**Architecture:** The 62 files fall into four groups: (A) the Vercel AI SDK artifact/chat system (~35 files, move to `components/ai-chat/`), (B) nav/sidebar shell (`app-sidebar.tsx`, move to `components/nav/`), (C) shared UI primitives (move to `components/misc/`, which already exists and is used by `components/realtime/`), (D) orphaned/zero-consumer files (delete). The AI SDK files use relative imports among themselves, so moving them as a batch means only external callers need path updates.

**Tech Stack:** TypeScript, Next.js App Router, `npm run quality` (typecheck + lint) as the verification gate after each batch.

---

## Pre-flight: Understand what's where

Before touching anything, confirm the directory structure:

```
frontend/src/components/
  ai-chat/          ← DOES NOT EXIST YET (we'll create it)
  nav/              ← exists (nav-main, nav-user, sidebar.tsx, etc.)
  realtime/         ← exists (already uses @/components/misc/cursor)
  misc/             ← exists (cursor.tsx, avatar-stack.tsx, data-table.tsx, dropzone.tsx, etc.)
  auth/             ← exists (client-redirect.tsx only)
  chat/             ← exists (TEAM CHAT feature — do not confuse with AI chat)
  ds/               ← design system
  layout/           ← page structure
  ui/               ← shadcn primitives
```

**Critical distinction:** `components/chat/` = the Alleato team-chat feature. `components/ai-chat/` (new) = the Vercel AI SDK artifact/chatbot system. They are completely separate features.

---

## Task 1: Create `components/ai-chat/` and move the AI SDK system

**Files to create:** `frontend/src/components/ai-chat/` directory with 34 moved files.

**Files to modify (import path updates):**
- `frontend/src/artifacts/code/client.tsx`
- `frontend/src/artifacts/image/client.tsx`
- `frontend/src/artifacts/sheet/client.tsx`
- `frontend/src/artifacts/text/client.tsx`
- `frontend/src/hooks/use-artifact.ts`
- `frontend/src/hooks/use-auto-resume.ts`
- `frontend/src/hooks/use-chat-visibility.ts`
- `frontend/src/lib/ai/prompts.ts`
- `frontend/src/lib/artifacts/server.ts`
- `frontend/src/lib/db/queries.ts`
- `frontend/src/lib/editor/suggestions.tsx`
- `frontend/src/lib/types.ts`

- [ ] **Step 1: Create the directory and move the AI SDK files**

```bash
cd frontend/src/components
mkdir -p ai-chat
mv artifact.tsx artifact-actions.tsx artifact-close-button.tsx artifact-messages.tsx ai-chat/
mv chat.tsx chat-header.tsx create-artifact.tsx ai-chat/
mv data-stream-handler.tsx data-stream-provider.tsx ai-chat/
mv diffview.tsx ai-chat/
mv document.tsx document-preview.tsx document-skeleton.tsx ai-chat/
mv greeting.tsx weather.tsx ai-chat/
mv icons.tsx ai-chat/
mv message.tsx message-actions.tsx message-editor.tsx message-reasoning.tsx messages.tsx ai-chat/
mv multimodal-input.tsx preview-attachment.tsx ai-chat/
mv suggested-actions.tsx suggestion.tsx ai-chat/
mv toolbar.tsx version-footer.tsx visibility-selector.tsx ai-chat/
mv toast.tsx ai-chat/
mv code-editor.tsx console.tsx image-editor.tsx text-editor.tsx sheet-editor.tsx ai-chat/
mv panel-code-highlight.tsx highlight.tsx ai-chat/
mv sidebar-history.tsx sidebar-history-item.tsx sidebar-toggle.tsx sidebar-user-nav.tsx ai-chat/
```

- [ ] **Step 2: Update imports in `artifacts/code/client.tsx`**

Current:
```ts
import { CodeEditor } from "@/components/code-editor";
import { ... } from "@/components/console";
import { Artifact } from "@/components/create-artifact";
import { ... } from "@/components/icons";
```

Replace all `@/components/` with `@/components/ai-chat/` for these specific imports. Open the file and update:

```ts
import { CodeEditor } from "@/components/ai-chat/code-editor";
import { ... } from "@/components/ai-chat/console";
import { Artifact } from "@/components/ai-chat/create-artifact";
import { ... } from "@/components/ai-chat/icons";
```

- [ ] **Step 3: Update imports in `artifacts/image/client.tsx`**

```ts
import { Artifact } from "@/components/ai-chat/create-artifact";
import { CopyIcon, RedoIcon, UndoIcon } from "@/components/ai-chat/icons";
import { ImageEditor } from "@/components/ai-chat/image-editor";
```

- [ ] **Step 4: Update imports in `artifacts/sheet/client.tsx`**

```ts
import { Artifact } from "@/components/ai-chat/create-artifact";
import { ... } from "@/components/ai-chat/icons";
import { SpreadsheetEditor } from "@/components/ai-chat/sheet-editor";
```

- [ ] **Step 5: Update imports in `artifacts/text/client.tsx`**

```ts
import { Artifact } from "@/components/ai-chat/create-artifact";
import { DiffView } from "@/components/ai-chat/diffview";
import { DocumentSkeleton } from "@/components/ai-chat/document-skeleton";
import { ... } from "@/components/ai-chat/icons";
import { Editor } from "@/components/ai-chat/text-editor";
```

- [ ] **Step 6: Update imports in hooks and lib**

`frontend/src/hooks/use-artifact.ts`:
```ts
import type { UIArtifact } from "@/components/ai-chat/artifact";
```

`frontend/src/hooks/use-auto-resume.ts`:
```ts
import { useDataStream } from "@/components/ai-chat/data-stream-provider";
```

`frontend/src/hooks/use-chat-visibility.ts`:
```ts
import { ... } from "@/components/ai-chat/sidebar-history";
import type { VisibilityType } from "@/components/ai-chat/visibility-selector";
```

`frontend/src/lib/ai/prompts.ts`:
```ts
import type { ArtifactKind } from "@/components/ai-chat/artifact";
```

`frontend/src/lib/artifacts/server.ts`:
```ts
import type { ArtifactKind } from "@/components/ai-chat/artifact";
```

`frontend/src/lib/db/queries.ts`:
```ts
import type { ArtifactKind } from "@/components/ai-chat/artifact";
import type { VisibilityType } from "@/components/ai-chat/visibility-selector";
```

`frontend/src/lib/editor/suggestions.tsx`:
```ts
import type { ArtifactKind } from "@/components/ai-chat/artifact";
import { Suggestion as PreviewSuggestion } from "@/components/ai-chat/suggestion";
```

`frontend/src/lib/types.ts`:
```ts
import type { ArtifactKind } from "@/components/ai-chat/artifact";
```

- [ ] **Step 7: Verify no remaining root-level imports from this batch**

```bash
cd frontend
grep -rn "@/components/artifact\b\|@/components/chat-header\|@/components/chat\b\|@/components/code-editor\|@/components/console\b\|@/components/create-artifact\|@/components/data-stream\|@/components/diffview\|@/components/document\b\|@/components/document-preview\|@/components/document-skeleton\|@/components/greeting\|@/components/highlight\|@/components/icons\b\|@/components/image-editor\|@/components/message\b\|@/components/messages\b\|@/components/message-actions\|@/components/message-editor\|@/components/message-reasoning\|@/components/multimodal-input\|@/components/panel-code-highlight\|@/components/preview-attachment\|@/components/sheet-editor\|@/components/sidebar-history\|@/components/sidebar-toggle\|@/components/sidebar-user-nav\|@/components/suggested-actions\|@/components/suggestion\b\|@/components/text-editor\|@/components/toast\b\|@/components/toolbar\b\|@/components/version-footer\|@/components/visibility-selector\|@/components/weather\b" src --include="*.tsx" --include="*.ts"
```

Expected: zero results. If any appear, update them.

- [ ] **Step 8: Typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: same error count as before (zero new errors). Fix any new errors before proceeding.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/ai-chat/ frontend/src/artifacts/ frontend/src/hooks/ frontend/src/lib/
git commit -m "refactor(components): move Vercel AI SDK system to components/ai-chat/"
```

---

## Task 2: Move `app-sidebar.tsx` to `components/nav/`

**Files to modify (import path updates):**
- `frontend/src/app/(main)/layout.tsx`
- `frontend/src/app/(admin)/layout.tsx`
- `frontend/src/app/(dashboard)/layout.tsx`
- `frontend/src/app/(tables)/layout.tsx`
- `frontend/src/components/layouts/SidebarLayout.tsx`

- [ ] **Step 1: Move the file**

```bash
mv frontend/src/components/app-sidebar.tsx frontend/src/components/nav/app-sidebar.tsx
```

- [ ] **Step 2: Update all layout imports**

In each of these 5 files, change:
```ts
import { AppSidebar } from "@/components/app-sidebar";
```
to:
```ts
import { AppSidebar } from "@/components/nav/app-sidebar";
```

Files to update:
- `frontend/src/app/(main)/layout.tsx:5`
- `frontend/src/app/(admin)/layout.tsx:3`
- `frontend/src/app/(dashboard)/layout.tsx:4`
- `frontend/src/app/(tables)/layout.tsx:3`
- `frontend/src/components/layouts/SidebarLayout.tsx:4`

- [ ] **Step 3: Verify no remaining root-level imports**

```bash
grep -rn "@/components/app-sidebar" frontend/src --include="*.tsx" --include="*.ts"
```

Expected: zero results.

- [ ] **Step 4: Typecheck**

```bash
cd frontend && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/nav/app-sidebar.tsx frontend/src/app/ frontend/src/components/layouts/
git commit -m "refactor(components): move app-sidebar to components/nav/"
```

---

## Task 3: Move shared UI primitives to `components/misc/`

`components/misc/` already exists and contains many shared UI files. The realtime/ subdirectory already imports from `@/components/misc/cursor` and `@/components/misc/avatar-stack`, confirming this is the correct destination.

**Files to move:**
- `cursor.tsx` → `misc/` (if `misc/cursor.tsx` doesn't already exist; if it does, update importers to use `misc/` version instead)
- `mode-toggle.tsx` → `misc/`
- `dropzone.tsx` → `misc/` (if `misc/dropzone.tsx` doesn't already exist)
- `dropdown.tsx` → `misc/`
- `language-dropdown.tsx` → `misc/`
- `portals.tsx` → `misc/`
- `select-scrollable.tsx` → `misc/`
- `chart-area-interactive.tsx` → `misc/`

**Files with external importers needing path updates:**
- `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx` imports `cursor.tsx` indirectly via `realtime-cursors.tsx`
- `frontend/src/components/live-cursors/LiveCursors.tsx` imports `cursor.tsx`
- `frontend/src/components/admin-panel/navbar.tsx` imports `mode-toggle.tsx`
- `frontend/src/app/(tables)/documents/page.tsx` imports `dropzone.tsx`

- [ ] **Step 1: Check for existing files in misc/ before moving**

```bash
ls frontend/src/components/misc/cursor.tsx frontend/src/components/misc/dropzone.tsx 2>/dev/null
```

If `misc/cursor.tsx` already exists: skip moving `cursor.tsx` and just update importers to use `@/components/misc/cursor`.
If `misc/dropzone.tsx` already exists: skip moving `dropzone.tsx` and just update importers to use `@/components/misc/dropzone`.

- [ ] **Step 2: Move files that don't have misc/ counterparts**

For each file confirmed not in misc/:
```bash
mv frontend/src/components/cursor.tsx frontend/src/components/misc/
mv frontend/src/components/mode-toggle.tsx frontend/src/components/misc/
mv frontend/src/components/dropzone.tsx frontend/src/components/misc/
mv frontend/src/components/dropdown.tsx frontend/src/components/misc/
mv frontend/src/components/language-dropdown.tsx frontend/src/components/misc/
mv frontend/src/components/portals.tsx frontend/src/components/misc/
mv frontend/src/components/select-scrollable.tsx frontend/src/components/misc/
mv frontend/src/components/chart-area-interactive.tsx frontend/src/components/misc/
```

For files that already exist in misc/: delete the root-level duplicate ONLY after confirming the root one is identical or the importers have been updated to use misc/.

- [ ] **Step 3: Update importers of `cursor.tsx`**

`frontend/src/components/live-cursors/LiveCursors.tsx`:
```ts
import { Cursor } from "@/components/misc/cursor";
```

`frontend/src/components/realtime-cursors.tsx` (still at root for now):
```ts
import { Cursor } from "@/components/misc/cursor";
```

- [ ] **Step 4: Update importer of `mode-toggle.tsx`**

`frontend/src/components/admin-panel/navbar.tsx:1`:
```ts
import { ModeToggle } from "@/components/misc/mode-toggle";
```

- [ ] **Step 5: Update importer of `dropzone.tsx`**

`frontend/src/app/(tables)/documents/page.tsx:10`:
```ts
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/misc/dropzone";
```

- [ ] **Step 6: Update `language-dropdown.tsx` (it imports `dropdown.tsx`)**

After moving `dropdown.tsx` to misc/, `language-dropdown.tsx` (also being moved to misc/) imports it relatively. Confirm the relative import `import Dropdown from '@/components/dropdown'` is updated to `import Dropdown from '@/components/misc/dropdown'` (or a relative `./dropdown` since both will be in misc/).

- [ ] **Step 7: Typecheck**

```bash
cd frontend && npm run typecheck
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/misc/ frontend/src/components/live-cursors/ frontend/src/components/admin-panel/ frontend/src/app/
git commit -m "refactor(components): move shared UI primitives to components/misc/"
```

---

## Task 4: Move realtime root-level files to `components/realtime/`

Root-level `realtime-cursors.tsx`, `realtime-avatar-stack.tsx`, `realtime-chat.tsx` differ from their `realtime/` counterparts (the subdir versions are newer). The goal: update consumers to use the `realtime/` versions and delete the root-level ones.

**Files with external importers:**
- `frontend/src/app/(main)/[projectId]/home/project-command-center.tsx` imports `@/components/realtime-cursors`

- [ ] **Step 1: Compare root vs subdir versions**

```bash
diff frontend/src/components/realtime-cursors.tsx frontend/src/components/realtime/realtime-cursors.tsx | head -20
```

The subdir version (`realtime/realtime-cursors.tsx`) already imports from `@/components/misc/cursor` (the correct new path). Use the subdir version as canonical.

- [ ] **Step 2: Update project-command-center.tsx to use subdir version**

`frontend/src/app/(main)/[projectId]/home/project-command-center.tsx:42`:
```ts
import { RealtimeCursors } from "@/components/realtime/realtime-cursors";
```

- [ ] **Step 3: Delete root-level realtime duplicates**

```bash
rm frontend/src/components/realtime-cursors.tsx
rm frontend/src/components/realtime-avatar-stack.tsx
rm frontend/src/components/realtime-chat.tsx
```

- [ ] **Step 4: Verify no remaining root-level imports**

```bash
grep -rn "@/components/realtime-cursors\|@/components/realtime-avatar-stack\|@/components/realtime-chat" frontend/src --include="*.tsx" --include="*.ts"
```

Expected: zero results.

- [ ] **Step 5: Typecheck**

```bash
cd frontend && npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add -A frontend/src/
git commit -m "refactor(components): consolidate realtime components to components/realtime/"
```

---

## Task 5: Delete orphaned root-level files

These files have zero external importers — nothing in the codebase uses them via `@/components/<name>`. They're either legacy leftovers or were shadowed by subdir versions.

**Files to delete:**
- `auth-form.tsx` — exports `AuthForm` but nothing imports it (auth uses its own forms in auth/)
- `sign-out-form.tsx` — exports `SignOutForm` but nothing imports it
- `submit-button.tsx` — exports `SubmitButton` but nothing imports it (executive pages define their own `PendingSubmitButton` locally)
- `avatar-stack.tsx` — zero external consumers (already in ds/ and misc/)
- `data-table.tsx` — zero external consumers (already in ds/ and misc/)
- `section-cards.tsx` — zero external consumers (already in misc/)
- `search-form.tsx` — zero external consumers (already in misc/)
- `version-switcher.tsx` — zero external consumers (already in misc/)
- `theme-provider.tsx` — zero external consumers (providers/ has its own)
- `version-footer.tsx` — already moved to ai-chat/ in Task 1

- [ ] **Step 1: Confirm zero consumers for each file before deleting**

```bash
grep -rn "auth-form\|sign-out-form\|submit-button" frontend/src --include="*.tsx" --include="*.ts" | grep "import"
grep -rn "@/components/avatar-stack\|@/components/data-table\b\|@/components/section-cards\|@/components/search-form\b\|@/components/version-switcher\|@/components/theme-provider\b" frontend/src --include="*.tsx" --include="*.ts"
```

For any that DO have importers — update the importers to use the misc/ or ds/ version instead of deleting.

- [ ] **Step 2: Delete confirmed orphans**

```bash
cd frontend/src/components
rm -f auth-form.tsx sign-out-form.tsx submit-button.tsx
rm -f avatar-stack.tsx data-table.tsx section-cards.tsx search-form.tsx version-switcher.tsx theme-provider.tsx
```

- [ ] **Step 3: Typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: zero new errors. If errors appear, those files had hidden consumers — restore them and update the importer paths instead of deleting.

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src/components/
git commit -m "refactor(components): delete orphaned root-level component files"
```

---

## Task 6: Final verification

- [ ] **Step 1: Count root-level tsx files (should be near zero)**

```bash
ls frontend/src/components/*.tsx 2>/dev/null | wc -l
ls frontend/src/components/*.tsx 2>/dev/null
```

Expected: 0 files, or only files that were intentionally left (if any edge case was discovered).

- [ ] **Step 2: Full typecheck**

```bash
cd frontend && npm run quality
```

Expected: same result as before the refactor started (no new errors).

- [ ] **Step 3: Start dev server and verify it boots clean**

```bash
cd frontend && npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 12 && tail -20 /tmp/nextjs-dev.log
```

Expected: "Ready" line appears, no module-not-found errors.

- [ ] **Step 4: Kill dev server**

```bash
pkill -f "next dev"
```

- [ ] **Step 5: Final commit if any stragglers were cleaned up**

```bash
git status
# commit anything remaining
```

---

## What success looks like

- `ls frontend/src/components/*.tsx` returns empty (or near-empty)
- `npm run quality` passes with no new errors
- Dev server boots without module-not-found errors
- All existing pages and routes continue to work
- No changes to any component's actual behavior — only file locations changed
