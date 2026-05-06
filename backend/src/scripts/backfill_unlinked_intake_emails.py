#!/usr/bin/env python3
"""
Backfill document_metadata records and vectorize outlook_email_intake rows
that were saved without a document_metadata_id (i.e. skipped by the old
project-relevance gate).

Run from the backend/ directory:
    python -m src.scripts.backfill_unlinked_intake_emails
"""
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

_backend_src = Path(__file__).resolve().parents[1]   # .../backend/src
_backend_root = Path(__file__).resolve().parents[2]  # .../backend
for p in (_backend_src, _backend_root):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    from services.env_loader import load_env
    load_env()
except Exception:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from services.supabase_helpers import get_supabase_client
from services.intelligence.compiler import process_source_document_to_packet
from services.integrations.microsoft_graph.project_inference import infer_project_id

DOCUMENT_BUCKET = os.environ.get("SUPABASE_DOCUMENTS_BUCKET", "documents")
LOOKBACK_DAYS = int(os.environ.get("BACKFILL_LOOKBACK_DAYS", "30"))


def backfill():
    supabase = get_supabase_client()
    print(f"=== Backfilling unlinked intake emails (last {LOOKBACK_DAYS} days) ===")

    from datetime import timedelta
    since = (datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)).isoformat()
    rows = (
        supabase.from_("outlook_email_intake")
        .select("id, graph_message_id, mailbox_user_id, subject, body_text, from_name, from_email, to_list, received_at, has_attachments, web_link, internet_message_id, conversation_id, project_id, match_status")
        .is_("document_metadata_id", "null")
        .is_("deleted_at", "null")
        .gte("received_at", since)
        .order("received_at", desc=False)
        .execute()
    ).data or []

    print(f"Found {len(rows)} unlinked emails to backfill\n")
    success = 0
    skipped = 0
    failed = 0

    for email in rows:
        intake_id = email["id"]
        msg_id = email.get("graph_message_id") or ""
        subject = email.get("subject") or "(no subject)"
        body_text = email.get("body_text") or ""
        sender_name = email.get("from_name") or ""
        sender_addr = email.get("from_email") or ""
        received = email.get("received_at") or datetime.now(timezone.utc).isoformat()
        web_link = email.get("web_link") or ""
        mailbox = email.get("mailbox_user_id") or ""

        if not msg_id:
            print(f"  [SKIP] intake_id={intake_id} — no graph_message_id")
            skipped += 1
            continue

        if len(body_text) < 50:
            print(f"  [SKIP] intake_id={intake_id} — body too short ({len(body_text)} chars)")
            skipped += 1
            continue

        doc_id = f"outlook_{msg_id}"

        # Check if document_metadata already exists (created by a parallel sync)
        existing = (
            supabase.from_("document_metadata")
            .select("id")
            .eq("id", doc_id)
            .limit(1)
            .execute()
        ).data or []

        try:
            if not existing:
                # Infer project
                participants = [f"{sender_name} <{sender_addr}>"] if sender_addr else [sender_name]
                to_list = email.get("to_list") or []
                for addr in (to_list if isinstance(to_list, list) else []):
                    participants.append(addr)

                project_id, assignment_method, assignment_confidence = infer_project_id(
                    supabase,
                    title=f"Email: {subject}",
                    content=body_text,
                    participants=participants,
                )

                tags = ["email", "outlook", "backfilled"]
                if project_id:
                    tags.append(f"project_auto:{assignment_method}")

                # Upload body to storage
                storage_path = f"outlook/{mailbox}/{msg_id}.txt"
                try:
                    supabase.storage.from_(DOCUMENT_BUCKET).upload(
                        storage_path,
                        body_text.encode("utf-8"),
                        {"content-type": "text/plain", "upsert": "true"},
                    )
                except Exception as e:
                    print(f"  [WARN] storage upload failed for {msg_id}: {e}")
                    storage_path = ""

                source_metadata = {
                    "outlook_message_id": msg_id,
                    "mailbox_user_id": mailbox,
                    "internet_message_id": email.get("internet_message_id"),
                    "conversation_id": email.get("conversation_id"),
                    "outlook_web_link": web_link,
                    "has_attachments": bool(email.get("has_attachments")),
                    "backfilled": True,
                }

                supabase.from_("document_metadata").insert({
                    "id": doc_id,
                    "title": f"Email: {subject}",
                    "source": "microsoft_graph",
                    "category": "email",
                    "type": "email",
                    "content": body_text,
                    "date": received[:10] if received else None,
                    "participants": ", ".join(participants[:50]),
                    "status": "raw_ingested",
                    "tags": ",".join(tags),
                    "project_id": project_id,
                    "url": web_link,
                    "source_system": "outlook_email",
                    "source_item_id": msg_id,
                    "source_path": f"outlook/{mailbox}/{msg_id}.txt",
                    "source_web_url": web_link,
                    "storage_bucket": DOCUMENT_BUCKET if storage_path else None,
                    "file_path": storage_path or None,
                    "source_metadata": source_metadata,
                }).execute()

                print(f"  [OK] Created document_metadata for intake_id={intake_id} msg={msg_id[:16]}... project={project_id}")
            else:
                print(f"  [OK] document_metadata already exists for {doc_id}")

            # Link the intake row to the metadata doc
            supabase.from_("outlook_email_intake").update({
                "document_metadata_id": doc_id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", intake_id).execute()

            # Vectorize
            result = process_source_document_to_packet(supabase, doc_id)
            status = (result or {}).get("status")
            print(f"    -> vectorized: status={status}")
            success += 1

        except Exception as exc:
            print(f"  [FAIL] intake_id={intake_id} msg={msg_id[:16]}...: {exc}")
            failed += 1

    print(f"\n=== Done: {success} vectorized, {skipped} skipped, {failed} failed ===")


if __name__ == "__main__":
    backfill()
