# Phase 1: Follow-up Suggestions + Sources UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two missing AI SDK UI features to the main assistant: contextual follow-up suggestion chips after each response, and a collapsible Sources component replacing plain text citation chips.

**Architecture:**
- Suggestions: a new `intent-suggestions.ts` file maps each `AssistantIntent` to 3 follow-up strings. `chat-handler.ts` writes a `data-suggestions` stream part after the main response. `chat-area.tsx` reads those parts and renders `Suggestions`/`Suggestion` chips from the already-installed `@/components/ai-elements/suggestion`.
- Sources UI: install the AI Elements `sources` component, then replace the existing plain `<span>` chips in `chat-area.tsx` that currently render `[Source: ...]` citation labels with the collapsible `Sources`/`SourcesTrigger`/`SourcesContent` shell.

**Tech Stack:** Next.js 15, Vercel AI SDK v6, `createUIMessageStream`, AI Elements (`suggestion.tsx` already installed, `sources.tsx` needs install), TypeScript strict.

---

## Pre-work audit (no coding)

**Already done — no work needed:**
- ✅ Tool call transparency — `ToolCallItem` using `ToolDisplay/ToolHeader/ToolContent/ToolInput/ToolOutput` from AI Elements
- ✅ Reasoning display — `Reasoning/ReasoningTrigger/ReasoningContent` from AI Elements, server already extracts reasoning via `extractReasoningMiddleware`
- ✅ Chain of thought — `ChainOfThought/ChainOfThoughtHeader/ChainOfThoughtContent/ChainOfThoughtStep`
- ✅ Confirmation/approval — full `Confirmation` component flow
- ✅ Message/Conversation/PromptInput — all from AI Elements
- ✅ `suggestion.tsx` is installed at `frontend/src/components/ai-elements/suggestion.tsx`

**Remaining Phase 1 work:**
1. Follow-up suggestions (Task 1–3 below)
2. Sources UI upgrade (Task 4–5 below)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/lib/ai/intent-suggestions.ts` | Static map: `AssistantIntent → string[]` + `getIntentSuggestions()` helper |
| Modify | `frontend/src/lib/ai/chat-handler.ts` | Import `getIntentSuggestions`, write `data-suggestions` stream part after `recordAgentLearningUsages` (~line 6740) |
| Modify | `frontend/src/components/ai-assistant/chat-area.tsx` | Add `getSuggestionParts()` helper, import `Suggestions/Suggestion`, render chips after last assistant message |
| Install | `frontend/src/components/ai-elements/sources.tsx` | `npx ai-elements@latest add sources` from `frontend/` |
| Modify | `frontend/src/components/ai-assistant/chat-area.tsx` | Import `Sources/SourcesTrigger/SourcesContent`, replace `inlineSources` plain chips |

---

## Task 1: Create `intent-suggestions.ts`

**Files:**
- Create: `frontend/src/lib/ai/intent-suggestions.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { AssistantIntent } from "@/lib/ai/intent-router";

const INTENT_SUGGESTIONS: Record<AssistantIntent, readonly [string, string, string]> = {
  target_briefing: [
    "What are the key risks on this project right now?",
    "Show me the latest change events and their cost impact",
    "Who are the key contacts and what are their current roles?",
  ],
  latest_status: [
    "What are the biggest blockers right now?",
    "Show me all open RFIs",
    "What items need my attention this week?",
  ],
  risk_review: [
    "Create a task to address the top risk",
    "What change events are tied to these risks?",
    "Show me the risk history over the past 30 days",
  ],
  financial_analysis: [
    "What's driving the biggest cost variances?",
    "Show me all pending change orders",
    "Compare this month's spending to the forecast",
  ],
  change_management_review: [
    "What's the total cost impact of all open change events?",
    "Show me which PCOs are still pending approval",
    "Draft an email summarizing the change order status",
  ],
  decision_lookup: [
    "Who made that decision and when?",
    "What other decisions are pending from recent meetings?",
    "Create a task to follow up on this decision",
  ],
  task_followup: [
    "Show me all overdue tasks",
    "Who has the most open action items?",
    "What tasks are coming due in the next 7 days?",
  ],
  task_write: [
    "Add another task to my list",
    "Show me all tasks I've created this week",
    "What tasks are coming due soon?",
  ],
  email_action: [
    "Schedule a follow-up reminder for this",
    "Show me other recent emails from this contact",
    "Draft a meeting invite to follow up on this thread",
  ],
  calendar_action: [
    "Show me my upcoming meetings this week",
    "Draft an agenda for this meeting",
    "Who else should be invited to this meeting?",
  ],
  external_research: [
    "How does this compare to industry benchmarks?",
    "Find me similar case studies or examples",
    "What are the latest trends in this area?",
  ],
  source_lookup: [
    "Show me more details from that source",
    "What other meetings covered this topic?",
    "Find emails related to this issue",
  ],
  strategy_brainstorm: [
    "What are the pros and cons of each option?",
    "Which approach do you recommend and why?",
    "What risks should we consider before deciding?",
  ],
  implementation_planning: [
    "Create tasks for each action item",
    "Who should own each step?",
    "What's the critical path for this plan?",
  ],
  app_help: [
    "Show me how to create a change order",
    "How do I set up project budget codes?",
    "What else can the AI assistant do?",
  ],
  general_conversation: [
    "Tell me more about this project",
    "What should I focus on today?",
    "Show me recent activity across all my projects",
  ],
};

export function getIntentSuggestions(intent: AssistantIntent): string[] {
  return [...(INTENT_SUGGESTIONS[intent] ?? [])];
}
```

- [ ] **Step 2: Run typecheck to confirm the file is valid**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run typecheck 2>&1 | grep -E "intent-suggestions|error TS" | head -20
```

Expected: no errors mentioning `intent-suggestions.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/lib/ai/intent-suggestions.ts && git commit -m "feat: add intent-to-suggestions mapping for AI follow-up chips"
```

---

## Task 2: Emit `data-suggestions` from `chat-handler.ts`

**Files:**
- Modify: `frontend/src/lib/ai/chat-handler.ts`

- [ ] **Step 1: Add the import at the top of chat-handler.ts**

The import block already has many imports. Add after the last `@/lib/ai/` import (search for the block ending with `intent-router` or `intent-classifier`):

```typescript
import { getIntentSuggestions } from "@/lib/ai/intent-suggestions";
```

- [ ] **Step 2: Write suggestions to the stream after `recordAgentLearningUsages`**

Find the block at approximately line 6732–6740:
```typescript
        if (learningUsage?.learnings.length) {
          await recordAgentLearningUsages({
            sessionId,
            userId: user.id,
            messageText: lastUserContent,
            responseQualityScore: responseQuality.score,
            learnings: learningUsage.learnings,
          });
        }
```

Insert this block **immediately after** the closing `}` of that `if` block (before the `// Trace the ACTUAL final response` comment):

```typescript
        // Emit contextual follow-up suggestion chips based on resolved intent
        if (assistantIntent && content.trim()) {
          const suggestions = getIntentSuggestions(assistantIntent);
          if (suggestions.length > 0) {
            writer.write({
              type: "data-suggestions",
              id: "suggestions",
              data: { suggestions },
            } as Parameters<typeof writer.write>[0]);
          }
        }
```

- [ ] **Step 3: Run typecheck**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run typecheck 2>&1 | grep "error TS" | head -20
```

Expected: zero `error TS` lines.

- [ ] **Step 4: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/lib/ai/chat-handler.ts && git commit -m "feat: emit data-suggestions stream part from chat handler"
```

---

## Task 3: Render suggestion chips in `chat-area.tsx`

**Files:**
- Modify: `frontend/src/components/ai-assistant/chat-area.tsx`

- [ ] **Step 1: Add the `getSuggestionParts` helper after `getLatestStatusPart`**

Find the existing helper functions block (around line 292–314 where `getLatestStatusPart` is defined). Add this function **after** `getLatestStatusPart`:

```typescript
function getSuggestionParts(msg: UIMessage): string[] {
  for (const part of [...msg.parts].reverse()) {
    if (part.type !== "data-suggestions") continue;
    const data = (part as { data?: unknown }).data;
    if (!data || typeof data !== "object") return [];
    const record = data as Record<string, unknown>;
    if (!Array.isArray(record.suggestions)) return [];
    return record.suggestions.filter((s): s is string => typeof s === "string");
  }
  return [];
}
```

- [ ] **Step 2: Import `Suggestions` and `Suggestion` from ai-elements**

Find the existing import:
```typescript
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ai-elements/prompt-input";
```

Add directly after it:
```typescript
import {
  Suggestions,
  Suggestion,
} from "@/components/ai-elements/suggestion";
```

- [ ] **Step 3: Extract suggestions in the message rendering loop**

Inside the `messages.map((msg, msgIndex) => {` block, the existing code already computes `assistantWidgetParts`, `toolParts`, etc. Add `suggestions` to this list. Find:

```typescript
                const isLastMessage = msgIndex === messages.length - 1;
```

Add on the very next line:
```typescript
                const suggestions = isAssistant && isLastMessage && !isStreaming
                  ? getSuggestionParts(msg)
                  : [];
```

- [ ] **Step 4: Render suggestion chips after the assistant Message component**

Find the closing structure of the assistant message block. It looks like:

```typescript
                  </div>
                );
              })}
```

More specifically, the assistant message block ends at approximately line 2197:
```tsx
                  </div>
                </div>
              );
```

The inner structure is:
```tsx
                return (
                  <div key={msg.id} className="flex items-start">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Message from="assistant">
                        ...
                      </Message>
                    </div>
                  </div>
                );
```

Replace the closing two `</div>` tags with:
```tsx
                    </div>
                    {suggestions.length > 0 && (
                      <Suggestions className="mt-1">
                        {suggestions.map((s) => (
                          <Suggestion
                            key={s}
                            suggestion={s}
                            onClick={(text) => onSubmit(text)}
                          />
                        ))}
                      </Suggestions>
                    )}
                  </div>
                );
```

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run typecheck 2>&1 | grep "error TS" | head -20
```

Expected: zero `error TS` lines.

- [ ] **Step 6: Run quality**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run quality 2>&1 | tail -20
```

Expected: no lint errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/components/ai-assistant/chat-area.tsx && git commit -m "feat: render follow-up suggestion chips after assistant responses"
```

---

## Task 4: Install AI Elements `sources` component

**Files:**
- Install: `frontend/src/components/ai-elements/sources.tsx` (and potentially `frontend/src/components/ai-elements/inline-citation.tsx`)

- [ ] **Step 1: Install from the `frontend/` directory**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx ai-elements@latest add sources
```

Expected: confirmation that `sources.tsx` (and any peer files) were added to `src/components/ai-elements/`.

- [ ] **Step 2: Verify the file exists**

```bash
ls /Users/meganharrison/Documents/alleato-pm/frontend/src/components/ai-elements/sources.tsx
```

Expected: file path printed.

- [ ] **Step 3: Run typecheck to confirm no install breakage**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run typecheck 2>&1 | grep "error TS" | head -20
```

Expected: zero `error TS` lines.

- [ ] **Step 4: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/components/ai-elements/ && git commit -m "feat: install AI Elements sources component"
```

---

## Task 5: Replace plain citation chips with collapsible `Sources` UI

**Files:**
- Modify: `frontend/src/components/ai-assistant/chat-area.tsx`

- [ ] **Step 1: Import Sources components**

Add to the imports in `chat-area.tsx`:
```typescript
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
} from "@/components/ai-elements/sources";
```

- [ ] **Step 2: Replace the `inlineSources` rendering block**

Find the existing rendering at approximately line 2108–2121:
```tsx
                          {/* Source citations — rendered as subtle chips */}
                          {inlineSources.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {inlineSources.map((src) => (
                                <span
                                  key={src}
                                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                                >
                                  <FileTextIcon className="h-3 w-3 shrink-0 opacity-60" />
                                  {src}
                                </span>
                              ))}
                            </div>
                          )}
```

Replace with:
```tsx
                          {/* Source citations — collapsible Sources component */}
                          {inlineSources.length > 0 && (
                            <Sources className="mt-2">
                              <SourcesTrigger count={inlineSources.length} />
                              <SourcesContent>
                                {inlineSources.map((src) => (
                                  <div
                                    key={src}
                                    className="flex items-center gap-1.5 py-1 text-xs text-foreground"
                                  >
                                    <FileTextIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <span>{src}</span>
                                  </div>
                                ))}
                              </SourcesContent>
                            </Sources>
                          )}
```

Note: We use `<div>` rows instead of the `<Source>` anchor element because our internal citations are text labels (meeting titles, email subjects) not external URLs.

- [ ] **Step 3: Remove `FileTextIcon` from the lucide imports if it's no longer used elsewhere**

Check if `FileTextIcon` is still used elsewhere in the file (it's also used in the upload preview section at line ~1537):
```bash
grep -n "FileTextIcon" /Users/meganharrison/Documents/alleato-pm/frontend/src/components/ai-assistant/chat-area.tsx
```

If it appears on multiple lines, keep the import. If only in the sources section, remove it.

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run typecheck 2>&1 | grep "error TS" | head -20
```

Expected: zero `error TS` lines.

- [ ] **Step 5: Run quality**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run quality 2>&1 | tail -20
```

Expected: passes.

- [ ] **Step 6: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/components/ai-assistant/chat-area.tsx && git commit -m "feat: replace plain citation chips with collapsible Sources component"
```

---

## Task 6: Browser verification

- [ ] **Step 1: Start the dev server (if not running)**

```bash
cd /Users/meganharrison/Documents/alleato-pm && npm run dev
```

- [ ] **Step 2: Open the AI assistant and send a test message**

Navigate to the AI assistant. Send: `What's the current status of my project?`

Expected:
- Response streams normally
- After the response completes, 3 suggestion chips appear below the message (e.g., "What are the biggest blockers right now?", "Show me all open RFIs", "What items need my attention this week?")

- [ ] **Step 3: Click a suggestion chip**

Click one of the suggestion chips.

Expected: that text appears in the chat as a user message and the AI responds.

- [ ] **Step 4: Verify sources collapsible (if a response contains citations)**

Ask something likely to use RAG: `What was discussed in the last meeting about budget?`

Expected: if the response contains `[Source: Meeting - ...]` patterns, they now render as a collapsible `Sources` section with a trigger showing the count, expanding to show the source labels.

- [ ] **Step 5: Verify no regressions**

Confirm tool calls, reasoning blocks, and confirmation flows still render correctly.

---

## Self-review checklist

- [x] `intent-suggestions.ts` covers all 16 `AssistantIntent` values — confirmed by matching the union type exactly
- [x] No placeholder suggestions — each is a specific, actionable question relevant to construction PM
- [x] `data-suggestions` is only written when `content.trim()` is non-empty — avoids chips on empty/error responses
- [x] Suggestions are only shown on the **last** assistant message and only when **not streaming** — avoids flicker during generation
- [x] `getSuggestionParts` is safe on old messages with no `data-suggestions` parts (returns `[]`)
- [x] `FileTextIcon` still used in upload preview — import retained
- [x] Sources uses `<div>` rows, not `<Source>` anchors — correct because internal citations are not URLs
- [x] All new imports use `@/components/ai-elements/` path — consistent with existing pattern
