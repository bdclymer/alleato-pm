# COPILOT_PROMPTS

You can copy/paste these prompts directly into GitHub Copilot Chat.

### Project Context Prompt (Run Once Per Session)

You are working in a Node.js worker that ingests Outlook emails via Microsoft Graph into Supabase (Postgres).
Tables involved: projects_sync, project_emails, email_attachments, search_documents.
IDs: core tables use BIGINT; projects_sync uses UUID.
The worker must be idempotent, retry‑safe, and respect Supabase RLS (service role).
Always use parameterized SQL with pg.


### Schema‑Aware Coding Prompt

Before suggesting code, infer the database schema from existing SQL files.
Do not invent columns or change data types.
Assume project_emails.id and email_attachments.id are BIGINT.


### Worker Safety Prompt

Ensure all ingestion code is safe to retry.
Use on conflict do nothing or equivalent patterns.
Never assume inserts succeed.
Always reselect IDs if conflicts occur.


### Supabase‑Specific Prompt

This project uses Supabase Postgres.
Do not use named SQL parameters like :id.
Use $1, $2, $3… placeholders only.


### Graph API Prompt

When working with Microsoft Graph, never fetch data inside webhooks.
Fetch messages and attachments only in background workers.
Prefer $select to reduce payload size.


### Search / Embeddings Prompt

Store searchable text separately from binary data.
Store embeddings using pgvector.
Embed content only after successful storage.


✅ Why This Setup Works Extremely Well

You paste the worker once
Copilot helps you evolve small files, not spaghetti
Schemas don’t drift
Retry / DLQ logic stays consistent
You avoid pasting SQL incorrectly into Supabase
You now have true separation of:

ingestion
indexing
AI
persistence