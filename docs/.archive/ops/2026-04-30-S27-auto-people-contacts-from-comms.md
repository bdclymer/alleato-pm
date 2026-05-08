# Handoff: 2026-04-30 - Auto-create people contacts from emails and meetings

## Intake Block

1) Session ID: S27
2) Task ID: AAI-276
3) Linear issue: AAI-276
4) Linear URL: https://linear.app/megankharrison/issue/AAI-276/auto-create-people-contacts-from-emails-and-meetings
5) Current status: Pending Review
6) Files changed (absolute paths): `/Users/meganharrison/Documents/alleato-pm/supabase/migrations/20260430110000_auto_people_contacts_from_comms.sql`
7) Commands run and outcome (pass/fail counts): PASS temp Supabase type generation to `/tmp/alleato-database.types.current.ts`; PASS migration SQL rollback syntax/schema check; PASS live trigger rollback check; PASS targeted migration application with psql; PASS `supabase migration repair --status applied 20260430110000 --linked`; PASS `npm run db:migrations:verify-applied -- supabase/migrations/20260430110000_auto_people_contacts_from_comms.sql`; PASS production backfill.
8) Evidence artifacts (screenshot/video/report/log paths): terminal evidence only; no frontend surface changed.
9) Top 3 findings (frontend-visible issues first): Existing legacy `add_meeting_participants_to_contacts()` targeted obsolete `contacts`, not `people`; Outlook and Fireflies both write communication participants to `document_metadata`; existing `people.email` is indexed but not globally unique, so the upsert path uses an advisory lock and lookup before insert.
10) Recommended next action (one line): Review directory contact volume/quality after backfill and decide whether project-level directory memberships should also be inferred later.
11) Handoff file path: `/Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-04-30-S27-auto-people-contacts-from-comms.md`
12) Migration ledger evidence: `npm run db:migrations:verify-applied -- supabase/migrations/20260430110000_auto_people_contacts_from_comms.sql` passed with `Supabase migration ledger check passed: 20260430110000`.

## Linear Updates

- Kickoff comment: Linear issue created and moved to In Progress before coding.
- Milestone comments: Final update posted with migration/backfill evidence.
- Completion/blocker comment: Pending Review; no blocker for the contact automation itself.

## Current Status

The database now has a trigger on `public.document_metadata` that auto-creates `public.people` rows for email and meeting identities found in `participants`, `participants_array`, `meeting_attendees`, `organizer_email`, and `host_email`. It preserves existing people/users by updating metadata instead of inserting duplicates. The old legacy meeting contact functions were replaced so they no longer target the obsolete `contacts` table.

The production backfill processed 666 unique email identities from existing email/meeting documents. Live verification showed 654 contacts auto-created and 12 existing people marked as communication-seen.

## Exact Next Step

Review the newly auto-created contacts in the Directory contacts view and decide whether a separate project-membership inference pass should add these contacts to `project_directory_memberships` when `document_metadata.project_id` is known.

## Known Pitfalls

- This intentionally populates `people`, not `project_directory_memberships`; contacts become available globally but are not automatically members of a project directory yet.
- The trigger extracts only email-like identities. Participant names without emails are skipped to avoid low-quality contact rows.
- `people.email` is not globally unique in the existing schema. The function uses `pg_advisory_xact_lock(hashtextextended(email, 0))` plus lookup to prevent new duplicate inserts under concurrent ingestion, but it does not merge historical duplicates.
- `docs/ops/orchestration/session-board.md` already contained unresolved conflict markers before this work, so it was not edited in this slice.

## Resume Commands

```bash
npm run db:migrations:verify-applied -- supabase/migrations/20260430110000_auto_people_contacts_from_comms.sql
bash -lc "set -a; source .env >/dev/null 2>&1; set +a; psql \"\$DATABASE_URL\" -v ON_ERROR_STOP=1 -X -q -c \"select count(*) from public.people where metadata ->> 'auto_created_from' = 'document_metadata';\""
```

## Evidence

```text
Supabase migration ledger check passed: 20260430110000

document_metadata_auto_people_contacts_trg | O

production backfill:
total_people_contacts_seen: 666
unique_email_count: 666
auto_created_contacts: 654
auto_seen_people: 12
```
