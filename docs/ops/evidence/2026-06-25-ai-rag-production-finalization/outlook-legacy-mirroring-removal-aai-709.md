# AAI-709 Outlook Legacy Mirroring Removal Proof

Date: 2026-06-26

This evidence file is the deletion gate for disabled Outlook ingestion-side
legacy mirroring gates:

- `OUTLOOK_SYNC_LEGACY_ATTACHMENTS`
- `OUTLOOK_SYNC_LEGACY_LINKS`
- `OUTLOOK_SYNC_LEGACY_PROJECT_EMAILS`

## Final Production Owner

The production Outlook ingestion owner is:

- Raw intake: `outlook_email_intake`
- Canonical intake attachments: `outlook_email_intake_attachments`
- RAG metadata: `document_metadata` and `rag_document_metadata`
- Vector records: `document_chunks`
- Project assignment: shared project inference projected onto
  `document_metadata` and `outlook_email_intake`
- Sync runtime: `backend/src/services/integrations/microsoft_graph/outlook.py`
  through Microsoft Graph sync/webhook/reconciliation entrypoints

New Graph syncs must not depend on legacy `project_emails` mirroring to become
searchable or project-assigned.

## Retained Paths

| Path | Classification | Reason |
| --- | --- | --- |
| `outlook_email_intake` writes | `active-keep` | Raw Outlook capture and assistant operations use this as canonical intake. |
| `outlook_email_intake_attachments` writes | `active-keep` | Canonical attachment lineage for Outlook intake; independent of legacy `email_attachments`. |
| `document_metadata` / `rag_document_metadata` Outlook rows | `active-keep` | Required for email RAG, project assignment, citations, and vectorization. |
| `project_emails` table/read routes | `active-keep-for-now` | Frontend/project email surfaces still read this table. This slice does not drop table/read routes. |
| `email_attachments` table/read routes | `active-keep-for-now` | Frontend email attachment surfaces still read this table. This slice does not drop table/read routes. |

## Deletion Candidate Inventory

| Candidate | Evidence | Classification | Action |
| --- | --- | --- | --- |
| `OUTLOOK_SYNC_LEGACY_PROJECT_EMAILS` | Only gates optional Graph sync mirroring into `project_emails`; prior provider proof says it is not set on checked Render services. | `delete` | Removed env gate and new-sync project email mirroring. |
| `_upsert_project_outlook_email(...)` | Only used by the disabled `OUTLOOK_SYNC_LEGACY_PROJECT_EMAILS` branch. | `delete` | Removed helper with the gated branch. |
| `OUTLOOK_SYNC_LEGACY_ATTACHMENTS` | Only gates optional old attachment/document side path. Attachment RAG creation is now owned by canonical intake attachment capture. | `delete-and-migrate` | Removed env gate and branch; kept attachment RAG creation under `OUTLOOK_SYNC_INTAKE_ATTACHMENTS`. |
| `_upsert_project_outlook_attachment(...)` | Only used when a legacy `project_email_id` exists from the removed mirroring branch. | `delete` | Removed helper and stopped linking new intake attachments to legacy `email_attachments`. |
| `OUTLOOK_SYNC_LEGACY_LINKS` | Only gates optional link extraction/write path into separate link documents. | `delete` | Remove env gate, extraction, and `_sync_email_link(...)` branch. |
| `_sync_email_link(...)` | Only used by the disabled legacy link branch. | `delete` | Remove helper with link mirroring branch. |

## Current Proof Log

- `rg -n "OUTLOOK_SYNC_LEGACY|SYNC_LEGACY_PROJECT_EMAILS|project_emails|email_attachments" backend/src frontend/src scripts/verify package.json render.yaml docs/tasks docs/ops/evidence docs/ops/ai-rag-production-finalization docs/architecture/AI-RAG-ARCHITECTURE.md docs/architecture/COMMUNICATIONS-DATA-PIPELINE.md docs/architecture/email-sync-rebuild-plan.md`
  - Found the three legacy env gates only in `backend/src/services/integrations/microsoft_graph/outlook.py` plus finalization evidence/progress docs.
  - Found active frontend readers of `project_emails` and `email_attachments`, so table/read-route deletion is not part of this slice.
- `rg -n "OUTLOOK_SYNC_LEGACY" . --glob '!frontend/src/components/dev-tools/db-inventory.generated.json' --glob '!node_modules/**' --glob '!.next/**' --glob '!frontend/.next/**'`
  - Before deletion, only the three constants existed in the Outlook service.
- `docs/tasks/2026-06-23-global-emails-freshness-investigation.md`
  - Prior Render/provider read-back recorded `OUTLOOK_SYNC_LEGACY_PROJECT_EMAILS` not set on checked services and newer intake rows lacking `project_email_id`.

## Post-Deletion Verification Log

- Delegated verification worker:
  - `backend/.venv/bin/python -m py_compile backend/src/services/integrations/microsoft_graph/outlook.py backend/tests/test_outlook_intake.py`
    - Passed.
  - `backend/.venv/bin/python -m pytest backend/tests/test_outlook_intake.py -q`
    - Passed: 20 tests. Non-fatal warnings only.
  - `rg -n "OUTLOOK_SYNC_LEGACY_ATTACHMENTS|OUTLOOK_SYNC_LEGACY_LINKS|OUTLOOK_SYNC_LEGACY_PROJECT_EMAILS|SYNC_LEGACY_OUTLOOK_ATTACHMENTS|SYNC_LEGACY_OUTLOOK_LINKS|SYNC_LEGACY_PROJECT_EMAILS|_upsert_project_outlook_attachment|_sync_email_link|_upsert_project_outlook_email|_extract_links|_link_doc_id|MAX_LINKS_PER_EMAIL|NOISY_LINK_HOSTS|DOCUMENT_LINK|HREF_RE|URL_RE|urlparse|html\\.|link_count|link_count_synced|links=%d|project_attachment_id|extracted_links|project_email_id|email_attachment_id" backend/src/services/integrations/microsoft_graph/outlook.py backend/tests/test_outlook_intake.py`
    - Passed with zero matches.

## Source And Contract Result

- `backend/src/services/integrations/microsoft_graph/outlook.py`
  - Removed legacy Outlook env gates.
  - Removed new-sync writes to `project_emails`.
  - Removed new-sync writes/linkage to legacy `email_attachments`.
  - Removed legacy email hyperlink extraction and `outlook_link` document creation.
  - Kept canonical writes to `outlook_email_intake`, `outlook_email_intake_attachments`, `document_metadata`, and `rag_document_metadata`.
  - Kept attachment RAG creation under the canonical intake attachment path.
- `backend/tests/test_outlook_intake.py`
  - Updated focused tests so the production contract no longer includes legacy project email or email attachment IDs on new intake writes.
- `docs/architecture/AI-RAG-ARCHITECTURE.md`
  - Updated the Outlook ingestion boundary to state that Graph sync no longer mirrors into `project_emails`, `email_attachments`, or separate email-link document rows.

## Superseded Local Proof

Earlier local proof commands while this slice was still in progress:

- `rg -n "OUTLOOK_SYNC_LEGACY|SYNC_LEGACY|_upsert_project_outlook_email|_upsert_project_outlook_attachment|_sync_email_link|_extract_links|_link_doc_id|MAX_LINKS_PER_EMAIL|NOISY_LINK_HOSTS|DOCUMENT_LINK|HREF_RE|URL_RE|urlparse|html\\.|link_count|link_count_synced|links=%d|project_attachment_id|extracted_links|project_email_id or" backend/src/services/integrations/microsoft_graph/outlook.py backend/tests/test_outlook_intake.py`
  - Passed with no matches.
- `python -m py_compile backend/src/services/integrations/microsoft_graph/outlook.py backend/tests/test_outlook_intake.py`
  - Passed.
- `backend/.venv/bin/python -m pytest backend/tests/test_outlook_intake.py -q`
  - Superseded by delegated result above after the final test update.
