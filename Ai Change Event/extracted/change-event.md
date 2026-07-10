# Change Event — field dictionary

A change event is the **intake record** for any potential change in cost or
scope. It is upstream of RFQs and change orders: it captures that something
changed and its rough impact, before the contractual paperwork exists. It is a
terminal intake (no workflow to route) — close it with insight.

Created 'open'. Number auto-assigned (CE-###). Creator from session. Never ask
for those.

## Fields to collect

**title** — required.
The change event's identity in every downstream list and document. Reject
placeholders. Good: "Added roof drains per owner request, east bay." Bad:
"Change 1". If the user gives something vague, ask what specifically changed and
where.

**description** — recommended, pursue.
The scope narrative the RFQ and change order will inherit. Capture the trigger
(who/what caused it) and the scope it touches. One solid paragraph saves a field
re-interview later. Worth pushing for even though it's not required.

**commitment** — recommended, pursue hard.
The contract/subcontract this change affects. Linking it is what lets the change
roll into the right contract's revised amount and the right budget line. Left
empty, the change event floats with no financial home and someone reconciles it
by hand. If the user is unsure which commitment, offer to list the project's
commitments.

**rom_cost_impact** — recommended, pursue.
Rough order-of-magnitude dollar impact. This is the number that decides whether
the change becomes a change order and whether it eats budget headroom. A rough
estimate beats null — ask for a best guess if there's no firm figure.

**rom_schedule_impact** — recommended, pursue.
Estimated schedule hit in days. Feeds delay tracking and any time-extension
claim. Capture it now so the delay isn't discovered three weeks downstream.

## Schema gaps — cannot be stored yet

The current `change_events` table has no column for these standard Procore
fields. If the user offers this information, tell them it can't be saved yet and
flag it; don't drop it silently.

- **origin** — where the change came from (RFI, observation, owner directive,
  prime CO).
- **change reason** — design development, owner-requested, unforeseen condition,
  code compliance.
- **scope** — in / out / TBD; drives billability and contingency netting.

Adding these three columns is the highest-value schema change for change-event
fidelity.

## Closing insight (postCreate: insight)

After commit, deliver three specific reads, not a recap:
1. Comparable change events on this project and how they resolved.
2. Budget headroom on the affected commitment's cost codes vs this ROM cost.
3. Any open risks this change intersects.
