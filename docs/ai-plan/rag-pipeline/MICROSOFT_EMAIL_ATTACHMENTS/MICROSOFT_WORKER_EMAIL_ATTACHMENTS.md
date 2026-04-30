# MICROSOFT_OUTLOOK_SYNC

```
email-ingestion-worker/
├── src/
│   ├── index.ts                 # App entrypoint
│   ├── worker.ts                # Orchestrates ingestion
│   ├── graph/
│   │   ├── client.ts            # Microsoft Graph auth + client
│   │   ├── messages.ts          # Fetch messages
│   │   └── attachments.ts       # Fetch attachments
│   ├── db/
│   │   ├── pool.ts              # Supabase Postgres pool
│   │   ├── projectsSync.ts      # projects_sync resolution
│   │   ├── projectEmails.ts     # project_emails inserts
│   │   ├── emailAttachments.ts  # email_attachments inserts
│   │   ├── searchDocuments.ts   # embeddings + search storage
│   │   └── deadLetter.ts        # DLQ writer
│   ├── processing/
│   │   ├── parseProjectId.ts    # subject/body parsing
│   │   ├── textExtract.ts       # HTML + attachment text extraction
│   │   ├── ocr.ts               # OCR abstraction
│   │   └── embeddings.ts        # embedding generation
│   ├── queue/
│   │   └── consumer.ts          # Queue / webhook consumer
│   └── util/
│       ├── retry.ts             # retry & backoff config
│       ├── hash.ts              # SHA‑256 helper
│       └── logger.ts
│
├── migrations/                  # SQL only (never runtime logic)
│   ├── 001_projects_sync.sql
│   ├── 002_project_emails_ext.sql
│   ├── 003_email_attachments_ext.sql
│   ├── 004_search_documents.sql
│   └── rollback/
│       ├── rollback_project_emails.sql
│       └── rollback_attachments.sql
│
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
└── COPILOT_PROMPTS.md
```