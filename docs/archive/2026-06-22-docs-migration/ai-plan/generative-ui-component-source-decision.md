# Generative UI Component Source Decision

Last updated: 2026-05-13

## Decision

Alleato AI assistant UI should use AI SDK UI message data parts plus the local assistant widget registry as the source of truth for generative UI.

Use:

- `frontend/src/lib/ai/assistant-widgets.ts` for typed widget payload contracts.
- `frontend/src/components/ai-assistant/assistant-widget-renderer.tsx` for React rendering.
- `frontend/src/components/ai-elements/` for shared chat primitives.
- `data-assistant-widget` message parts for persistence and reload behavior.

Do not treat OpenAI ChatKit Widget Builder JSON as the in-app widget system. ChatKit widgets are useful for ChatKit-hosted experiences, but Alleato needs native React components that can use app auth, links, routing, shared primitives, persisted chat history, and project-specific action flows.

## Current External References

- AI SDK generative UI: model/tool results become React-rendered UI inside the app.
- AI SDK streaming data: custom UI message data parts are the durable transport for dynamic UI state.
- OpenAI ChatKit Widget Builder: JSON-based widgets rendered in ChatKit surfaces.
- OpenAI Apps SDK widgets: iframe/resources linked to MCP tool results through widget metadata.

## Component Source Ranking

1. AI Elements and local shadcn primitives for the chat shell and message UI.
2. Existing Alleato assistant widgets for domain packets such as tasks, meetings, financial pulse, risk exposure, decision packets, and record write previews.
3. AI SDK Patterns or assistant-ui examples only as reference implementations.
4. ChatKit Widget Builder only when building a ChatKit surface outside the normal Alleato app.
5. OpenAI Apps SDK widgets only when building a ChatGPT/App SDK surface backed by MCP tools.

## Guardrail

New widget types must be added to `ASSISTANT_WIDGET_TYPES`, the `AssistantWidgetPayload` union, and the renderer registry. Unknown widget types must fail closed rather than rendering generic UI or crashing the chat surface.

Run this targeted check after changing widget payload contracts:

```bash
cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/__tests__/assistant-widgets.test.ts
```
