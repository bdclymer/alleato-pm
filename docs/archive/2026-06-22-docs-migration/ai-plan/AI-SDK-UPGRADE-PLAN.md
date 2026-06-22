# AI SDK Upgrade Plan — Unused Features

**Generated:** 2026-05-13  
**Scope:** Close the gap between what the Vercel AI SDK v6 + AI Elements provides and what we're actually using in the main assistant.

---

## Current State Summary

The main assistant (`/api/ai-assistant/chat` → `chat-handler.ts`) is sophisticated — `ToolLoopAgent`, C-Suite sub-agents, intent routing, 28+ tools, Langfuse tracing, step diagnostics. But the *UI layer* is behind. The secondary chat scaffolding (`components/ai-chat/`) has a full artifact system that is completely disconnected (no `/api/chat` route exists).

**What IS being used:** `streamText`, `generateText`, `ToolLoopAgent`, `useChat`, `createUIMessageStream`, `tool()`, `stepCountIs`, `extractReasoningMiddleware`, `wrapLanguageModel`, `convertToModelMessages`, `experimental_telemetry`, `@ai-sdk/mcp`

**What IS NOT (the gap):**

| Feature | Package | Impact |
|---------|---------|--------|
| Artifacts (document creation panel) | AI Elements `artifact` + AI SDK tools | **HIGH** |
| Sources/Citations UI | AI Elements `sources` | **HIGH** |
| Tool call transparency UI | AI Elements `tool` | **HIGH** |
| Reasoning display | AI Elements `reasoning` | **HIGH** |
| Follow-up suggestions | AI Elements `suggestion` | **HIGH** |
| `useObject` (live structured data) | `@ai-sdk/react` | **MEDIUM** |
| Agent memory (persistent across sessions) | AI SDK memory + Supabase | **MEDIUM** |
| `PromptInput` AI Elements component | AI Elements `prompt-input` | **MEDIUM** |
| Auto-resume on reconnect | AI SDK `resumeStream` | **MEDIUM** |
| `InferAgentUIMessage` type safety | `ai` package | **LOW** |
| Voice/speech input | AI Elements `speech-input` | **LOW** |
| `prepareStep` dynamic tool filtering | AI SDK loop control | **LOW** |

---

## Phase 1 — UI Layer Upgrades (2–3 days, no backend changes)

These are pure frontend changes wired to data the backend already sends.

### 1A. Tool Call Transparency

**File:** `frontend/src/app/(main)/[projectId]/shell/chat-area.tsx`

Install and wire the AI Elements `Tool` component to render tool parts from `msg.parts`.

```bash
cd frontend && npx ai-elements@latest add tool
```

Currently, tool calls are shown via the custom `AssistantWidgetRenderer`. The AI SDK already puts `tool-*` typed parts on messages. Replace or augment the current rendering with:

```tsx
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";

// In message part rendering:
case "tool-semanticSearch":
case "tool-getMeetingIntelligence":
// ... for each tool type
  return (
    <Tool key={i} defaultOpen={part.state === "output-available"}>
      <ToolHeader type={part.type} state={part.state} />
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput output={<MessageResponse>{JSON.stringify(part.output, null, 2)}</MessageResponse>} />
      </ToolContent>
    </Tool>
  );
```

**Why it matters:** Users can't currently see what the AI is doing while it searches. This builds trust, especially for financial tools where the CFO agent makes 5 tool calls before responding.

---

### 1B. Reasoning Display

**File:** `frontend/src/app/(main)/[projectId]/shell/chat-area.tsx`  
**Requires:** Server already has `extractReasoningMiddleware` and `sendReasoning: true` (need to verify this flag is set in `chat-handler.ts`)

```bash
cd frontend && npx ai-elements@latest add reasoning
```

```tsx
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";

// Before text parts, collect all reasoning parts:
const reasoningText = msg.parts
  .filter(p => p.type === "reasoning")
  .map(p => p.text)
  .join("\n\n");

{reasoningText && (
  <Reasoning isStreaming={isLastMessage && isStreaming}>
    <ReasoningTrigger />
    <ReasoningContent>{reasoningText}</ReasoningContent>
  </Reasoning>
)}
```

Also add `sendReasoning: true` to `streamText` calls in `chat-handler.ts` if not already set.

---

### 1C. Sources/Citations UI

**Files:** `frontend/src/app/(main)/[projectId]/shell/chat-area.tsx`  
**Backend:** `chat-handler.ts` web search tools return URLs — need to emit them as `source-url` parts

```bash
cd frontend && npx ai-elements@latest add sources
```

The server needs to emit sources. Two options:
1. In `streamText` call: `return result.toUIMessageStreamResponse({ sendSources: true })` (if using a provider that returns sources)
2. Manual: in web search tool `execute`, write source URLs to the stream as `source-url` parts via `writer.write`

The `searchWeb` tool already returns URLs in its results. Wire these as source parts so the UI can render:

```tsx
import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ai-elements/sources";

// On assistant messages:
const sourceParts = msg.parts.filter(p => p.type === "source-url");
{sourceParts.length > 0 && (
  <Sources>
    <SourcesTrigger count={sourceParts.length} />
    <SourcesContent>
      {sourceParts.map((p, i) => <Source key={i} href={p.url} title={p.url} />)}
    </SourcesContent>
  </Sources>
)}
```

---

### 1D. Follow-Up Suggestions

**File:** `frontend/src/app/(main)/[projectId]/shell/chat-area.tsx`

```bash
cd frontend && npx ai-elements@latest add suggestion
```

After a completed assistant response, render context-aware suggestions. Two implementation paths:

**Option A (static):** Hardcode 3 suggestions per intent type. Low effort, still useful.

**Option B (dynamic — recommended):** The backend already computes `AssistantIntent`. After stream completes, emit a `data-suggestions` part with 3 follow-up questions based on intent. Client renders them as `<Suggestion>` chips.

```tsx
// In chat-handler.ts onFinish:
writer.write({ type: "data-suggestions", id: "suggestions", data: { suggestions: getSuggestionsForIntent(intent) } });
```

```tsx
// In chat-area.tsx:
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";

{isLastAssistantMessage && suggestions.length > 0 && (
  <Suggestions>
    {suggestions.map(s => (
      <Suggestion key={s} suggestion={s} onClick={(text) => sendMessage({ text })} />
    ))}
  </Suggestions>
)}
```

---

## Phase 2 — Artifacts (3–4 days)

The secondary chat (`components/ai-chat/`) already has `artifact.tsx`, `document.tsx`, `code-editor.tsx`, `text-editor.tsx`, and `sheet-editor.tsx` — but there's no `/api/chat` route to back it. Two paths:

### 2A. Connect the Secondary Chat (Quick Win)

Create `/api/chat/route.ts` that routes to the main assistant backend. The artifact tools (`create-document`, `update-document`) already exist in `components/ai-chat/document-tools.ts`.

The secondary chat already has the complete artifact panel UI — it just needs a backend. Wire it to `chat-handler.ts` logic (or a simplified version).

### 2B. Integrate Artifacts Into the Main Assistant (Full Integration)

Add an artifact side panel to the main `rag-chat-page.tsx`. When the AI calls a `create-document` or `update-document` tool, the panel opens.

```bash
cd frontend && npx ai-elements@latest add artifact
```

**New tools to add to `orchestrator.ts`:**
- `createDocument(title, content, type)` → writes to `data-artifact` stream part, opens side panel
- `updateDocument(id, content)` → streams updated content to open artifact
- `requestSuggestions(documentId)` → streams inline suggestions on the artifact

**Artifact types relevant to construction PM:**
- `text/markdown` — project status reports, meeting summaries
- `application/json` — structured data exports
- `text/plain` — action item lists, scope changes

**UI:** Split panel — chat on left (60%), artifact on right (40%). Artifact header has Copy, Download, Close actions using `<ArtifactAction>`.

```tsx
import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactActions, ArtifactAction, ArtifactContent, ArtifactClose } from "@/components/ai-elements/artifact";
```

---

## Phase 3 — `useObject` for Live Structured Data (1–2 days)

**Use case:** When the CFO agent is generating a financial analysis, stream the structured data to a live table rather than waiting for the full text response.

```bash
# @ai-sdk/react already installed — useObject is experimental_useObject
```

**Implementation:**

1. Create `/api/projects/[projectId]/analyze/route.ts`:
```typescript
import { streamText, Output } from "ai";
// Returns a structured financial analysis object
export async function POST(req: Request) {
  const result = streamText({
    model: "openai/gpt-4.1",
    output: Output.object({ schema: financialAnalysisSchema }),
    // ...
  });
  return result.toUIMessageStreamResponse();
}
```

2. In the financial analysis widget, replace static rendering with `useObject`:
```tsx
import { experimental_useObject as useObject } from "@ai-sdk/react";

const { object, submit, isLoading } = useObject({
  api: `/api/projects/${projectId}/analyze`,
  schema: financialAnalysisSchema,
});
// object is partial and updates in real-time
```

**Where to use:** Budget variance analysis, risk exposure summary, portfolio overview — anywhere structured data is currently generated and then formatted as markdown.

---

## Phase 4 — Agent Memory (2–3 days)

Currently every conversation starts cold — the AI has no persistent knowledge of user preferences, recurring project issues, or past decisions.

**Implementation using AI SDK custom memory tool + Supabase:**

1. **Schema:** Add `agent_memory` table:
```sql
create table agent_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  project_id integer references projects(id),
  key text not null,
  value text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

2. **Memory tools** in `orchestrator.ts`:
```typescript
const rememberFact = tool({
  description: "Save an important fact about this user or project to memory",
  inputSchema: z.object({ key: z.string(), value: z.string() }),
  execute: async ({ key, value }) => {
    await supabase.from("agent_memory").upsert({ user_id, project_id, key, value });
    return "Remembered.";
  }
});

const recallFacts = tool({
  description: "Recall saved facts about this user or project",
  inputSchema: z.object({ query: z.string().optional() }),
  execute: async ({ query }) => {
    const { data } = await supabase.from("agent_memory")
      .select()
      .eq("user_id", user_id)
      .eq("project_id", project_id);
    return data;
  }
});
```

3. **Inject into system prompt:** On each request, load the user's memory and prepend to system prompt:
```typescript
const memories = await loadUserMemories(userId, projectId);
const systemWithMemory = memories.length
  ? `${baseSystem}\n\n## What I remember about you:\n${memories.map(m => `- ${m.key}: ${m.value}`).join("\n")}`
  : baseSystem;
```

---

## Phase 5 — Auto-Resume + PromptInput (1 day)

### Auto-Resume

The main `rag-chat-page.tsx` lacks the auto-resume hook that `components/ai-chat/chat.tsx` has. If a connection drops mid-response, the message is lost.

```tsx
// Add to rag-chat-page.tsx:
import { useAutoResume } from "@/hooks/use-auto-resume"; // already exists in ai-chat/

useAutoResume({
  autoResume: true,
  initialMessages: messages,
  experimental_resume,
  setMessages,
  transport,
});
```

### PromptInput Component

The current chat input is custom-built. Swap for AI Elements `PromptInput` which includes file attachments, model selector, and screenshot capture built-in.

```bash
cd frontend && npx ai-elements@latest add prompt-input
```

---

## Implementation Order (Recommended)

| Priority | Feature | Effort | Files Changed |
|----------|---------|--------|--------------|
| 1 | Tool transparency (1A) | 2h | `chat-area.tsx` |
| 2 | Reasoning display (1B) | 2h | `chat-area.tsx`, `chat-handler.ts` |
| 3 | Follow-up suggestions (1D) | 3h | `chat-area.tsx`, `chat-handler.ts` |
| 4 | Sources UI (1C) | 3h | `chat-area.tsx`, web search tools |
| 5 | Connect `/api/chat` (2A) | 4h | New route file |
| 6 | Artifacts in main assistant (2B) | 1.5d | `rag-chat-page.tsx`, `orchestrator.ts` |
| 7 | `useObject` live data (Phase 3) | 1d | New analyze route, financial widgets |
| 8 | Agent memory (Phase 4) | 1.5d | New DB table, `orchestrator.ts` |
| 9 | Auto-resume + PromptInput (Phase 5) | 4h | `rag-chat-page.tsx` |

**Total estimate:** ~6–7 days of focused work

---

## AI Elements Components Not Yet Needed (parked)

These exist in AI Elements but don't have an obvious immediate use case:

- `canvas.md` — drawing/whiteboard (no use case yet)
- `mic-selector.md`, `speech-input.md`, `transcription.md` — voice input (Phase 6 if field crews need it)
- `jsx-preview.md` — JSX preview sandbox (no code gen use case yet)
- `sandbox.md` — code execution (useful if we add scripted report generation)
- `web-preview.md` — iframe web preview (no use case yet)
- `terminal.md` — terminal output (no use case yet)
- `commit.md`, `file-tree.md` — git UI (no code features)
- `schema-display.md` — schema viewer (could be useful in DB inspection)
