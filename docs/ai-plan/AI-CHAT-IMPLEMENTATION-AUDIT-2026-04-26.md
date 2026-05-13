# AI Chat Implementation Audit

## Current Live Implementation

- Live route: `frontend/src/app/api/ai-assistant/chat/route.ts`
- Runtime handler: `frontend/src/lib/ai/chat-handler.ts`
- Client: `frontend/src/components/ai-assistant/rag-chat-page.tsx`
- Tool registry: `frontend/src/lib/ai/orchestrator.ts`
- MCP bridge: `frontend/src/lib/ai/tools/mcp-tools.ts`

## MCP Status

The live assistant uses `@ai-sdk/mcp` through `frontend/src/lib/ai/tools/mcp-tools.ts`.
The runtime handler discovers configured MCP tools, prefixes them by server, merges
them into the scoped AI SDK tool set, records `mcpToolDiscovery` trace entries,
and closes MCP clients after each request.

The official Excalidraw remote MCP server is enabled by default unless
`AI_ASSISTANT_DISABLE_EXCALIDRAW_MCP=true` is set. Excalidraw tools are allowlisted
explicitly so diagram creation/export tools can be used without weakening the
generic read-only policy for arbitrary MCP servers.
