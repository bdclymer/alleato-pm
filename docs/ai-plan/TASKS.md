# AI Plan Tasks

## Done in S20

- Added Ask Alleato widget plan.
- Added the mandatory I-don't-know reflex prompt as a reusable AI prompt module.
- Wired the reflex into the live strategist prompt path and the legacy RAG prompt export.
- Added a production-aware KB marker/check parser script.
- Added user-facing clear-all memory API and linked AI Memory in settings navigation.

## Remaining

- Implement real KB ingestion and retrieval with the repo's `halfvec(3072)` convention.
- Extend existing `user_profiles` instead of creating a conflicting table.
- Build admin profile/memory UI under a `[userId]` route with API-level admin checks.
- Add unknown-question logging and knowledge-gaps dashboard.
