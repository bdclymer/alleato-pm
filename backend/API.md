# Alleato PM — Backend API Reference

## Interactive Documentation

FastAPI auto-generates interactive API docs. When the server is running:

- **Swagger UI:** [http://localhost:8051/docs](http://localhost:8051/docs)
- **ReDoc:** [http://localhost:8051/redoc](http://localhost:8051/redoc)
- **OpenAPI JSON:** [http://localhost:8051/openapi.json](http://localhost:8051/openapi.json)

These are the authoritative, always-up-to-date references. The summary below provides a quick overview.

---

## Endpoints Overview

### System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check — returns backend status and AI provider config |

### RAG Chat

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Legacy keyword-based transcript lookup used by backend verification scripts |

Production AI strategist chat is handled by the frontend Next.js route at `frontend/src/app/api/ai-assistant/chat/route.ts`, not this backend API.

### Projects

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects` | List all projects |
| `GET` | `/api/projects/{project_id}` | Get project details with tasks & insights |

### Ingestion

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ingest/fireflies/recent` | Ingest recent Fireflies meetings |
| `POST` | `/api/ingest/fireflies` | Legacy file-based Fireflies ingest, disabled unless explicitly enabled |

### Admin (`/api/admin`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/documents/generate-embeddings` | Trigger embedding generation pipeline |
| `GET` | `/api/admin/documents/embedding-status/{task_id}` | Check embedding task status |
| `GET` | `/api/admin/documents/pipeline-stats` | Get document pipeline statistics |

### YokeFlow Agent Platform (`/yokeflow`)

Mounted as a sub-application. See YokeFlow-specific docs if available.

---

## Authentication & CORS

The API currently uses CORS-based access control. Allowed origins:
- `http://localhost:3000` / `http://127.0.0.1:3000`
- `http://localhost:3001` / `http://127.0.0.1:3001`
- `http://localhost:8080` / `http://127.0.0.1:8080`

No API key or token auth is currently enforced on endpoints.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for agent workflows |
| `USE_UNIFIED_AGENT` | No | Set to `"true"` to use unified agent instead of classification routing |

## Running the Server

```bash
cd backend
uvicorn src.api.main:app --host 0.0.0.0 --port 8051 --reload
```
