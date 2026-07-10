---
name: guided-creation
description: >-
  Use whenever the user wants to CREATE a record in the platform — a change
  event, prime contract, change order, commitment, budget modification, daily
  report, RFI, or submittal. Triggers on intent like "create a change event",
  "log a budget mod", "start a new prime contract", "add a daily report". This
  skill governs HOW to run the guided-creation conversation: pre-fill what's
  known, render the form card, pursue the high-value optional fields (not just
  the required ones), confirm before writing, and close with insight. The
  per-entity field knowledge lives in resources/<entity>.md and is loaded on
  demand. Do NOT use for editing existing records, querying, or reporting.
---

# Guided Creation

One choreography for every entity. What changes between a change event and a
budget modification is the field set (the manifest) and the field dictionary
(this skill's resources) — never the flow below.

## The mechanism vs. this skill

- The **write** is the `propose_entity` / `commit_agent_action` tool. It stages
  a pending action, renders the card, and commits through the gated approve RPC.
  The tool is the only thing that touches the database.
- **This skill** is the playbook the tool can't encode: when to pre-fill, how
  hard to push on a recommended field, when to stop, and what to say after.

## Choreography (identical for all entities)

1. **Identify the entity and load its knowledge.**
   Map the request to an `entity_type`. Read `resources/<entity_type>.md` for
   the field dictionary so the rationale for each field is in context before
   you ask anything. If no resource exists for that entity, say so plainly —
   do not improvise field meanings.

2. **Derive silently. Never ask for what you can infer.**
   System fields (number, status, created_by, project) are server-derived —
   never prompt for them. Pre-fill anything you already know from the
   conversation or project context into the draft.

3. **Render the card.** Call `propose_entity(entity_type, draft, project_id,
   user_id)`. The returned card is the generative-UI form the user edits
   directly. From here the user can type into any field themselves OR let you
   fill it — both paths stay in sync through the card.

4. **Collect required, then actively pursue recommended.**
   - Required (`missing_required`): the entity can't be created without these.
     Get them.
   - Recommended (`pursue_recommended`): **this is the step the agent usually
     skips — do not skip it.** For each recommended field still empty, make the
     one-line case for it using its `whyItMatters` text, and ask. Don't dump all
     fields at once; walk them in priority order, two or three at a time.
   - Optional: name them as available in one breath ("you can also add X or Y");
     don't push.
   Frame it honestly: "None of these are required, but the more we capture now,
   the less anyone re-investigates later."

5. **Answer questions inline.** If the user asks what a field means or whether
   it applies, answer from the resource doc — what it does, why it matters,
   what good looks like. Then return to collection.

6. **Respect schema gaps.** If `schema_gaps` lists fields the table can't store
   and the user offers that data, say it can't be saved yet and note it rather
   than silently dropping it. Don't pretend a column exists.

7. **Confirm before writing.** Never commit while `missing_required` is
   non-empty. When the card is complete and the user confirms, call
   `commit_agent_action(action_id, final_payload)`. Report the result honestly —
   only claim it's created after the commit returns success.

8. **Close with the postCreate step** (from the tool's `post_create`):
   - `insight` → run the manifest's insight queries and deliver a tight
     closing read: comparable records, budget/schedule exposure, intersecting
     risks. Three bullets, specific to this project. Not a recap of what was
     entered — new signal the user didn't ask for but will want.
   - `insight+route` → same insight, then kick the workflow (assign, route)
     and state the next owner and what's now pending.

## Hard rules

- No fabricated field values. If you don't know it, ask or leave it empty.
- Never invent a record number, status, or dollar figure.
- Never claim creation succeeded before `commit_agent_action` returns.
- Terminal entities (change event) close on insight. Workflow-start entities
  (RFI, submittal) close on insight **and** route — the manifest's `postCreate`
  tells you which; don't hardcode it.

## Adding a new entity

1. Author `manifests/<entity>.manifest.json` (fields, priorities, sections,
   postCreate, insightQueries, schemaGaps).
2. Author `resources/<entity>.md` (this skill's field dictionary).
3. Nothing else. The tool and this choreography already handle it.
