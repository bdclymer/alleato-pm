# MICROSOFT_OUTLOOK_SYNC

## How Your Worker Should Use This Table

### Insert pattern (Node / C# / Python equivalent logic)

```
insert into email_attachments (
  email_id,
  project_sync_id,
  graph_attachment_id,
  file_name,
  file_url,
  file_size,
  content_type,
  content,
  extracted_text,
  checksum_sha256
)
values (
  :email_id,
  :project_sync_id,
  :graph_attachment_id,
  :file_name,
  :file_url,
  :file_size,
  :content_type,
  :content,
  :extracted_text,
  :checksum
)
on conflict on constraint uq_email_attachments_graph
do nothing;
```

## How This Fits with Search / Embeddings

```
insert into search_documents (
  id,
  project_sync_id,
  source_type,
  source_id,
  content,
  embedding
)
values (
  gen_random_uuid(),
  :project_sync_id,
  'attachment',
  :attachment_id,     -- BIGINT is fine here
  :extracted_text,
  :embedding
);
```

```
email_attachments
├── id BIGINT (PK)
├── email_id BIGINT → project_emails(id)
├── project_sync_id UUID → projects_sync(id)
├── graph_attachment_id TEXT
├── file_name TEXT
├── file_url TEXT
├── file_size BIGINT
├── content_type TEXT
├── content BYTEA
├── extracted_text TEXT
├── checksum_sha256 TEXT
├── created_at TIMESTAMPTZ
```

## Worker Ingestion Steps (Authoritative)

Graph message
→ parse external project ID (INT8)
→ upsert projects_sync
→ insert project_emails
→ insert email_attachments
→ insert search_documents


## Project Sync Lookup (Critical Step)

```
select id
from projects_sync
where external_project_id = :external_project_id;
```

**If Missing**

```
insert into projects_sync (id, external_project_id, name)
values (gen_random_uuid(), :external_project_id, :project_name)
returning id;
```

### Insert project_emails

insert into projects_sync (id, external_project_id, name)
values (gen_random_uuid(), :external_project_id, :project_name)
returning id;

### Insert email_attachments (Final)

insert into email_attachments (
  email_id,
  project_sync_id,
  graph_attachment_id,
  file_name,
  file_url,
  file_size,
  content_type,
  content,
  extracted_text,
  checksum_sha256
)
values (...)
on conflict on constraint uq_email_attachments_graph
do nothing;


### Insert Search / Embeddings

SQLinsert into search_documents (  id,  project_sync_id,  source_type,  source_id,  content,  embedding)values (  gen_random_uuid(),  :project_sync_id,  'email',  :email_id,  :search_text,  :embedding);Show more lines

## 3. Migration Guards for Production Safety

You should never run blind migrations in prod.
Here’s how we guard everything.

### Guard Pattern: IF NOT EXISTS

- Already used everywhere
- Safe on repeated deploys
- CI/CD friendly

### Pre‑flight Check (Recommended)

Run before deploy:
SQLselect  column_name, data_typefrom information_schema.columnswhere table_name = 'project_emails';Show more lines
Fail deploy if unexpected types appear.

### Lock‑safe Migration Order

- Add columns
- Add constraints
- Add indexes
❌ Never drop or alter PKs
This guarantees:

No long locks
No downtime
No orphaned rows

## 4. Supabase RLS Policies (Project‑Scoped Access)

This is very important for security.
Assumption:

Your JWT includes project_ids (INT8 or UUID)
Or user is mapped via projects_sync

### Enable RLS
SQLalter table project_emails enable row level security;alter table email_attachments enable row level security;alter table search_documents enable row level security;Show more lines

### Example: Project‑Scoped Read Access
SQLcreate policy "project scoped read - emails"on project_emailsfor selectusing (  project_sync_id in (    select id    from projects_sync    where external_project_id = any (      (auth.jwt() ->> 'project_ids')::int8[]    )  ));Show more lines

### Attachments Policy
SQLcreate policy "project scoped read - attachments"on email_attachmentsfor selectusing (  project_sync_id in (    select id    from projects_sync    where external_project_id = any (      (auth.jwt() ->> 'project_ids')::int8[]    )  ));Show more lines

### Search Documents Policy
SQLcreate policy "project scoped read - search"on search_documentsfor selectusing (  project_sync_id in (    select id    from projects_sync    where external_project_id = any (      (auth.jwt() ->> 'project_ids')::int8[]    )  ));Show more lines
- UI can only see its projects
- Workers use service role → bypass RLS
- Zero leakage risk

### Final Architecture (Locked In)

| Layer | Responsibility |
| Azure | ADIdentity + Graph |
|Workers | Ingestion + OCR + embeddings |
| Supabase | Source of truth |
| projects_sync | Boundary adapter |
| project_emails | Email metadata |
| email_attachments | Files + OCR |
| search_documents | Search + AI |


This is enterprise‑grade, future‑proof, and scalable.

- What You Are Ready To Do Now

- Deploy migrations safely
- Update workers with confidence
- Enable search & embeddings
- Enforce project isolation
- Scale without redesign


If you want next, I can:

🎯 Deliver final worker code in your primary language
🎯 Add retry + DLQ patterns
🎯 Design search APIs (REST/GraphQL)
🎯 Validate JWT claim strategy
🎯 Create rollback scripts