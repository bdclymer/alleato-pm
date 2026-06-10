# Union Collective Transcript Gap Analysis - 2026-06-09

## Scope

Manual review target: Union Collective project `1009` / project number `26-119`, covering Fireflies meeting transcripts from 2026-05-11 through 2026-06-05.

This review pulled the full transcript bodies from the RAG Supabase store into `tmp/union-collective-transcript-review/` and compared them with the current Project Intelligence read and the live `tasks` table.

## Evidence Set

| Date | Meeting | Extracted length |
| --- | --- | ---: |
| 2026-05-11 | Union Collective: Design Meeting | 231,514 chars |
| 2026-05-12 | Union Collective: Interior Design Vision | 181,064 chars |
| 2026-05-13 | Union Collective: Architectural and Civil Design Approval | 133,305 chars |
| 2026-05-14 | Union Collective: OAC | 161,056 chars |
| 2026-05-19 | Pre Application Meeting: Boone County: Union Collective | 194,967 chars |
| 2026-05-22 | Union Collective: OAC | 155,268 chars |
| 2026-05-26 | Union Collective: Design Meeting | 221,122 chars |
| 2026-05-27 | Solaroof: Union Collective Meeting | 208,745 chars |
| 2026-05-28 | Union Collective: OAC | 150,839 chars |
| 2026-06-04 | Union Collective: OAC | 176,307 chars |
| 2026-06-05 | Union Collective: Solaroof Discussion | 222,020 chars |

RAG chunk coverage also exists for all 11 transcripts. The app database only had direct `raw_text` for a subset, but the RAG source has enough source text for a complete synthesis pass.

## Bottom Line

Project Intelligence is directionally right about Union Collective: the project is in a coordination-heavy pre-permit/design phase, with approvals, utility/civil coordination, financing, procurement, and the solar roof path still creating execution risk.

The gap is that Project Intelligence compresses too much operational control detail into broad themes. The transcript set contains 196 Fireflies action items across 11 meetings, but the live `tasks` table only has 4 tasks directly tied to those meeting metadata IDs, all from the 2026-06-05 Solaroof discussion. That is roughly 2% naive task coverage for explicit meeting action items.

## What Project Intelligence Misses Or Underweights

### 1. The project is really a phased entitlement problem

The current intelligence correctly says approvals and civil coordination matter, but the transcripts show a more specific phasing problem:

- Food hall first.
- Distillery and volleyball later.
- Distillery zoning/text-amendment path expected to take months.
- Volleyball also appears to require later zoning/text-amendment work.
- Traffic study expectations may differ by phase, with Old Union Road and US 42 having different timing and evidence burdens.
- Site plan approval is coupled to encroachment permits, utility/fire/water reviews, City of Union comments, KYTC, and county engineer review.

Recommended intelligence framing: "Food hall can potentially move first, but the site plan must preserve later distillery/volleyball entitlement needs and future road/traffic obligations."

### 2. City and county relationship management is a critical path

The packet treats jurisdictional coordination as a generic approval risk. The transcripts name specific relationship dependencies:

- Amy and Mayor Larry Solomon need drawings and review.
- Laura has local leverage and is connected to city/county conversations.
- Michael Schwartz and Boone County pre-application coordination shape the official approval path.
- City of Union, Union Fire District, Sanitation District 1, Boone County Water District, KYTC, and county engineer routing are all in play.

Recommended intelligence framing: "Permitting is not just a submittal task; it is a managed stakeholder sequence with named reviewers and political/local relationship dependencies."

### 3. Duke Energy is not just a utility task

The transcript details make Duke a schedule and constructability constraint:

- Existing power pole removal was described as possibly not happening until September.
- Demo was desired before August, creating a mismatch with the utility removal path.
- Net metering assumptions materially affect the solar business case.
- Existing service capacity and trunk-line constraints need electrical confirmation.

Recommended intelligence framing: "Duke is a schedule dependency, demolition constraint, and solar ROI variable."

### 4. Title, easements, and property-control issues are underweighted

The meetings repeatedly mention:

- A title commitment missing a property portion.
- Northwestern property/title questions.
- Need for Patrick/title source follow-up.
- Grading and access permission issues involving neighboring property or easements.
- A possible 90-foot piece from US 42 to the property line.

Recommended intelligence framing: "Property control must be cleared before civil assumptions are treated as executable."

### 5. Solar is a business-model and constructability decision, not a feature

The Project Intelligence theme of "solar roof path" is right, but too shallow. The transcripts indicate:

- Sole Roof certification path matters; Boone County expects US-acceptable certification, with UL preferred or underway.
- It may be the first US installation, creating installer, warranty, and inspection risk.
- Roof obstruction changes can reduce capacity from early sizing assumptions.
- Energy use is roughly in the same order as projected solar production, but not enough to make sizing automatic.
- Duke net metering may not be favorable enough to justify oversizing.
- Battery/inverter footprint, critical-load segmentation, and secure placement all affect electrical-room planning.
- The cost model includes solar roof cost, potential tie-in roofing cost, tax credits, accelerated depreciation, resiliency value, and product lead times.

Recommended intelligence framing: "Solar roof decision should be tracked as a board-level commercial decision with design, utility, code, procurement, tax, and operations inputs."

### 6. Design is more settled in some areas than the packet implies

The broad packet can make everything sound unresolved. Transcript review shows some decisions are becoming concrete:

- Walk-in cooler/freezer moved near commissary / Vendor F area.
- Parking target around 265 spaces was discussed.
- Building rotation, entry points, detention, and grading were actively refined.
- Patio slope, columns, roof slope, mechanical screening, exhaust shielding, fireplaces, lighting, stage, ice cream bar, and vendor windows were discussed as implementation details rather than abstract concepts.

Recommended intelligence framing: separate "settled enough to coordinate" from "still open," instead of grouping all design work as generic refinement.

## Task-Control Coverage Gap

Live direct tasks tied to the 11 meeting metadata IDs:

| Date | Meeting | Fireflies action items | Direct tracked tasks |
| --- | --- | ---: | ---: |
| 2026-05-11 | Design Meeting | 28 | 0 |
| 2026-05-12 | Interior Design Vision | 17 | 0 |
| 2026-05-13 | Architectural/Civil Approval | 9 | 0 |
| 2026-05-14 | OAC | 17 | 0 |
| 2026-05-19 | Boone County Pre-App | 15 | 0 |
| 2026-05-22 | OAC | 24 | 0 |
| 2026-05-26 | Design Meeting | 32 | 0 |
| 2026-05-27 | Solaroof | 22 | 0 |
| 2026-05-28 | OAC | 14 | 0 |
| 2026-06-04 | OAC | 9 | 0 |
| 2026-06-05 | Solaroof Discussion | 9 | 4 |

The four tracked tasks from 2026-06-05 are useful, but incomplete:

- Send updated roof layout drawings showing kitchen exhaust fans and roof hatch.
- Add critical loads to the next OAC agenda.
- Send Greg Oliver the site plan, renderings, and equipment schedule.
- Finalize essential loads for battery/inverter sizing.

Missing from tracked tasks even on 2026-06-05:

- Distribute meeting minutes/documents.
- Initiate metal roofing subcontractor arrangements.
- Analyze load data and provide inverter/battery sizing.
- Coordinate battery product availability and lead times.

## High-Value Backfill Candidates

These should become tracked tasks or checked against existing task records:

- Confirm walk-in cooler/freezer location with food vendors and update layout.
- Schedule and manage Boone County / Michael Schwartz meeting with Laura included.
- Send drawings to Amy and Mayor Larry Solomon.
- Follow up Duke power-pole removal and demolition workaround.
- Investigate title commitment missing property portion / northwestern parcel issue.
- Obtain or verify traffic counts for Old Union Road and US 42.
- Clarify encroachment permit timing before site plan approval.
- Route solar certification questions through Boone County electrical inspector and Tony.
- Get Mike's annual energy consumption and critical-load list for solar sizing.
- Coordinate Greg Oliver solar/battery assumptions and revised roof layout around exhaust/hatch conflicts.
- Verify gas/sewer line conditions and Viox connection path.
- Confirm entity naming / LLC formation path for Union Food Park.
- Restore revised parking count and approve updated site plan.
- Lock ice cream vendor window dimensions and related electrical/layout impacts.

## Root Cause

Cause: the transcript corpus is available, but downstream synthesis and task extraction are not enforcing meeting-level completeness. Project Intelligence can summarize broad risk themes from partial or compressed evidence, while the task system does not guarantee every transcript action-item section is represented in live project tasks.

Detection gap: there is no visible coverage gate that compares Fireflies transcript action items against persisted `tasks` rows by `metadata_id`.

Prevention step: add an ingestion-quality check that fails loudly when a meeting transcript has action items but the project has no corresponding task rows, or when task extraction fails for a known model/API parameter issue.

## Recommended Guardrails

1. Add a meeting action-item coverage gate.
   - Input: Fireflies/RAG transcript metadata IDs and action-item counts.
   - Output: task rows by `metadata_id`.
   - Fail condition: explicit action items exist but no task rows exist, or coverage falls below an accepted threshold.

2. Add a Project Intelligence "control points" extractor.
   - Trigger terms: title, easement, encroachment, utility pole, Duke, KYTC, traffic study, mayor, city, county, fire district, water district, sanitary district, certification, lead time.
   - Output: separate card for land/control/jurisdiction dependencies, not just generic risk prose.

3. Backfill task extraction for the 10 older meetings and missing 2026-06-05 items.
   - Use the existing rewriter/extraction pipeline if it can be replayed by metadata ID.
   - Preserve source links and transcript section provenance.

4. Fix the task extraction API parameter mismatch seen in recent metadata processing.
   - Recent logs showed `max_tokens` being rejected for a newer model path; extraction should use `max_completion_tokens` where required.
   - This matters because email/meeting task extraction failures silently reduce Project Intelligence usefulness.

5. Add due-date and owner confidence fields.
   - Many transcript actions include relative timing like "by next Wednesday," "by weekend," "today/tomorrow," or "early next week."
   - The extraction should persist inferred due dates with confidence and original phrase evidence.

## Strategic Read After Manual Review

Union Collective is not blocked by lack of activity. It is at risk because many active commitments are living in meetings instead of the control system. The project needs a stronger operating layer:

- named stakeholder follow-ups,
- explicit jurisdictional sequencing,
- visible title/easement/property-control closure,
- Duke and solar assumptions tracked as commercial schedule risks,
- and action-item extraction that makes meeting commitments impossible to miss.

The current Project Intelligence is good as an executive summary. It is not yet good enough as a project-control system.
