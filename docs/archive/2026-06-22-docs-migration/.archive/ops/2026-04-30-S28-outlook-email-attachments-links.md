# Handoff: 2026-04-30 - Outlook email attachments and links into project documents

## Intake Block

1) Session ID: S28
2) Task ID: AAI-278
3) Linear issue: AAI-278
4) Linear URL: https://linear.app/megankharrison/issue/AAI-278/sync-outlook-email-attachments-and-links-into-project-documents
5) Current status: Pending Review
6) Files changed (absolute paths): `/Users/meganharrison/Documents/alleato-pm/backend/src/services/integrations/microsoft_graph/outlook.py`
7) Commands run and outcome (pass/fail counts): PASS `python3 -m py_compile backend/src/services/integrations/microsoft_graph/outlook.py`; PASS targeted Outlook helper assertions; PASS live Microsoft Graph probe for `webLink`, attachment relationship, and `fileAttachment.contentBytes`.
8) Evidence artifacts (screenshot/video/report/log paths): terminal evidence only; backend ingestion service changed, no frontend surface changed.
9) Top 3 findings (frontend-visible issues first): Outlook email rows were syncing body text only, so emailed files never became project documents; Microsoft Graph exposes message `webLink` and `/attachments` for synced messages; Graph `hasAttachments` does not cover inline-only images, so CID references in the HTML body also trigger attachment listing.
10) Recommended next action (one line): Run a bounded historical backfill for existing Outlook emails, then add OneDrive/SharePoint link dereferencing so emailed cloud links become durable project file records too.
11) Handoff file path: `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-04-30-S28-outlook-email-attachments-links.md`
12) Migration ledger evidence: Not applicable; no schema migration was created in this slice.

## Linear Updates

- Kickoff comment: Linear issue AAI-278 was created and moved to In Progress before coding.
- Milestone comments: Pending Review update should be posted from this handoff.
- Completion/blocker comment: Pending Review; no code blocker for the Outlook attachment/link ingestion slice.

## Current Status

The Outlook sync now requests Microsoft Graph message `webLink`, `internetMessageId`, and `conversationId` fields and preserves those values in `document_metadata.source_metadata`.

For relevant email messages, the sync now:

- Extracts useful body links from HTML anchors and plaintext URLs.
- Detects inline image/content IDs from `cid:` references.
- Lists message attachments through Microsoft Graph when `hasAttachments` is true or inline CIDs exist.
- Downloads `fileAttachment.contentBytes`, stores the raw file in the Supabase `documents` bucket, and records bucket/path/hash/size metadata.
- Reuses the OneDrive text extractor for supported file extensions so PDFs, Word docs, text, CSV, and markdown files can enter the existing raw ingestion path.
- Stores images and non-extractable files as `metadata_only` records instead of dropping them.
- Creates `project_documents` records under `Email Attachments` or `Email Links` when the parent email has an inferred or existing `project_id`.
- Keys Outlook attachment project documents by the parent message plus attachment id so records remain idempotent without cross-email collisions.
- Updates existing synced Outlook email rows with the new source fields, project assignment, extracted links, and attachment/link sync counts when those messages are returned by a sync/backfill pass.
- Records attachment listing/download failures in the parent email metadata and applies an `attachment_sync_error` tag so failures are visible.

## Exact Next Step

Run a controlled historical Outlook backfill for an agreed date range, starting with a recent window, so previously synced emails can receive attachment and link records without kicking off an unbounded mailbox crawl.

## Known Pitfalls

- Full historical mailbox backfill was not run in this slice because it can be high-volume and long-running.
- `fileAttachment` bytes are downloaded and stored. `itemAttachment` and `referenceAttachment` records are captured as metadata/link-backed records but not recursively downloaded yet.
- Emailed SharePoint/OneDrive links are stored as links today. A follow-up should dereference those links into actual file metadata/content where Graph permissions allow it.
- Inline signature/logo images may be captured when Graph returns them; the per-email attachment cap limits blast radius.
- `docs/ops/orchestration/session-board.md` already contained unrelated unresolved conflict markers, so it was not edited in this slice.

## Resume Commands

```bash
python3 -m py_compile backend/src/services/integrations/microsoft_graph/outlook.py
PYTHONPATH=backend python3 - <<'PY'
from src.services.integrations.microsoft_graph.outlook import _extract_links, _extract_cid_refs, _message_participants, _stable_graph_id
msg = {'body': {'content': '<p>See <a href="https://example.com/spec.pdf">Spec</a><img src="cid:image001.png@abc"></p>'}, 'bodyPreview': 'backup https://example.com/spec.pdf https://owner.example/rfi'}
assert _extract_links(msg) == [{'url': 'https://example.com/spec.pdf', 'label': 'Spec'}, {'url': 'https://owner.example/rfi', 'label': 'owner.example'}]
assert _extract_cid_refs(msg['body']['content']) == {'image001.png@abc'}
assert _message_participants({'toRecipients': [{'emailAddress': {'name': 'Owner', 'address': 'owner@example.com'}}], 'ccRecipients': []}, 'Sender', 'sender@example.com') == ['Sender <sender@example.com>', 'Owner <owner@example.com>']
assert len(_stable_graph_id('message-id')) == 24
print('outlook helper checks passed')
PY
```

## Evidence

```text
python3 -m py_compile backend/src/services/integrations/microsoft_graph/outlook.py
PASS

PYTHONPATH=backend python3 - <<'PY' ...
outlook helper checks passed

GRAPH_PROBE user=bclymer@alleatogroup.com messages=5 with_attachments=1 web_link_seen=True
GRAPH_ATTACHMENT_PROBE count=1 types=['#microsoft.graph.fileAttachment'] has_content_bytes=True
```
