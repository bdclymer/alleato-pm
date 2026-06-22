# Alleato System MCP

Hosted MCP endpoint for live Alleato project context.

## Endpoint

- Production path: `/mcp/`
- Transport: `Streamable HTTP`
- Runtime host: the existing `alleato-backend` FastAPI service

## Auth

Send:

```http
Authorization: Bearer <ALLEATO_SYSTEM_MCP_BEARER_TOKEN>
```

If `ALLEATO_SYSTEM_MCP_BEARER_TOKEN` is absent, the backend currently falls back to `ADMIN_API_KEY` so the endpoint fails loudly less often during rollout. A dedicated MCP token is still the intended production configuration.

## Status Check

- `GET /api/mcp/status`

Returns whether the hosted MCP surface is enabled, whether auth is configured, the endpoint path, and the transport type.

## Tool Surface

- `list_projects`
- `get_project_overview`
- `search_project_context`
- `list_project_tasks`
- `list_project_rfis`
- `list_project_commitments`
- `list_project_documents`

## Current Constraints

- Read-only by design
- `search_project_context` is keyword-first on purpose
- RAG chunk keyword search is included when the AI/RAG database is available
- No mutation tools are exposed yet

## Next Expansion Candidates

- `create_rfi`
- `create_task`
- `link_document_to_project`
- `find_commitment_by_vendor`
