"""
Backfills project_contact_references from high-confidence email assignments.

For each email in outlook_email_intake with a confirmed project assignment
(assignment_confidence >= threshold), extracts participant email addresses,
looks them up in the people table, and creates project_contact_references
records linking those people to the project.

This improves future project assignment accuracy because the ProjectAssigner
Strategy 2 (contact matching) queries project_contact_references.

Usage:
    python3 -m src.scripts.backfill_project_contacts_from_emails
    python3 -m src.scripts.backfill_project_contacts_from_emails --min-confidence 0.86
    python3 -m src.scripts.backfill_project_contacts_from_emails --dry-run
"""

import argparse
import os
import sys
import uuid
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from src.services.supabase_helpers import get_supabase_client

INTERNAL_DOMAINS = set(
    d.strip().lower()
    for d in os.environ.get("COMPANY_EMAIL_DOMAINS", "alleatogroup.com").split(",")
    if d.strip()
)


def _email_domain(email: str) -> str:
    return email.split("@")[-1].lower() if "@" in email else ""


def _is_external(email: str) -> bool:
    return _email_domain(email) not in INTERNAL_DOMAINS


def _collect_participants(row: dict) -> list[tuple[str, str]]:
    """Return (email, reference_type) pairs for external participants in a row."""
    results: list[tuple[str, str]] = []
    seen: set[str] = set()

    from_email = row.get("from_email")
    if from_email and isinstance(from_email, str) and "@" in from_email and _is_external(from_email):
        addr = from_email.lower().strip()
        if addr not in seen:
            results.append((addr, "email_sender"))
            seen.add(addr)

    for addr in (row.get("to_list") or []) + (row.get("cc_list") or []):
        if addr and isinstance(addr, str) and "@" in addr and _is_external(addr):
            a = addr.lower().strip()
            if a not in seen:
                results.append((a, "email_recipient"))
                seen.add(a)

    return results


def run(min_confidence: float = 0.70, dry_run: bool = False) -> dict:
    supabase = get_supabase_client()

    print(f"[contact-backfill] Starting (min_confidence={min_confidence}, dry_run={dry_run})")

    # 1. Load high-confidence email assignments
    resp = (
        supabase.from_("outlook_email_intake")
        .select("project_id, assignment_confidence, from_email, to_list, cc_list")
        .not_.is_("project_id", "null")
        .gte("assignment_confidence", min_confidence)
        .is_("deleted_at", "null")
        .execute()
    )
    emails = resp.data or []
    print(f"[contact-backfill] Found {len(emails)} high-confidence emails")

    # 2. Build map: project_id → set of (email, reference_type) pairs
    project_participants: dict[int, set[tuple[str, str]]] = defaultdict(set)
    for row in emails:
        pid = row["project_id"]
        for pair in _collect_participants(row):
            project_participants[pid].add(pair)

    total_participants = sum(len(v) for v in project_participants.values())
    print(f"[contact-backfill] {total_participants} unique external participants across {len(project_participants)} projects")

    # 3. Load all people with emails so we can match addresses to person_id
    people_resp = (
        supabase.from_("people")
        .select("id, email")
        .not_.is_("email", "null")
        .execute()
    )
    email_to_person: dict[str, str] = {
        p["email"].lower().strip(): p["id"]
        for p in (people_resp.data or [])
        if p.get("email")
    }
    print(f"[contact-backfill] {len(email_to_person)} people records with emails")

    # 4. Load existing project_contact_references to avoid duplicates
    existing_resp = (
        supabase.from_("project_contact_references")
        .select("project_id, person_id")
        .eq("status", "active")
        .execute()
    )
    existing: set[tuple] = {
        (r["project_id"], r["person_id"])
        for r in (existing_resp.data or [])
    }
    print(f"[contact-backfill] {len(existing)} existing active contact references")

    # 5. Build new records
    new_records = []
    skipped_no_person = 0
    skipped_exists = 0

    for project_id, pairs in project_participants.items():
        for addr, ref_type in pairs:
            person_id = email_to_person.get(addr)
            if not person_id:
                skipped_no_person += 1
                continue
            if (project_id, person_id) in existing:
                skipped_exists += 1
                continue
            new_records.append({
                "id": str(uuid.uuid4()),
                "project_id": project_id,
                "person_id": person_id,
                "reference_type": ref_type,
                "source_system": "email_sync_backfill",
                "confidence": 0.80,
                "status": "active",
            })

    print(f"[contact-backfill] {len(new_records)} new references to create")
    print(f"[contact-backfill] Skipped: {skipped_no_person} (no person record), {skipped_exists} (already linked)")

    if not new_records:
        return {"created": 0, "skipped_no_person": skipped_no_person, "skipped_exists": skipped_exists}

    if dry_run:
        print("[contact-backfill] DRY RUN — not writing anything")
        for r in new_records[:10]:
            print(f"  would create: project_id={r['project_id']} person_id={r['person_id']} ref_type={r['reference_type']}")
        return {"created": 0, "would_create": len(new_records), "dry_run": True}

    # 6. Batch insert in chunks of 100
    created = 0
    errors = 0
    for i in range(0, len(new_records), 100):
        batch = new_records[i : i + 100]
        ins = supabase.from_("project_contact_references").insert(batch).execute()
        if ins.data:
            created += len(ins.data)
        else:
            errors += len(batch)
            print(f"[contact-backfill] Batch insert error: {getattr(ins, 'error', 'unknown')}")

    print(f"[contact-backfill] Done — created={created}, errors={errors}")
    return {
        "created": created,
        "errors": errors,
        "skipped_no_person": skipped_no_person,
        "skipped_exists": skipped_exists,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-confidence", type=float, default=0.70)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    result = run(min_confidence=args.min_confidence, dry_run=args.dry_run)
    print(result)
