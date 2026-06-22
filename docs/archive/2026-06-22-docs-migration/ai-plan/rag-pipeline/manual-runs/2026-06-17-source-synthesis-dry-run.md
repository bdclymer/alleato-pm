# 2026-06-17 Source Synthesis Dry Run

Manual rehearsal of the process the automated intelligence pipeline should perform before creating cards, packets, tasks, daily briefs, and assistant context.

## 1. Source Inventory Pulled

Window: June 17, 2026 business day.

### Meetings

| Source | Project | Status | Manual action |
| --- | --- | --- | --- |
| Sprinkler Division Morning Huddle | Alleato Internal Ops, project 90 | Full transcript available in RAG metadata | Backfilled full transcript chunks: 33 chunks |
| Westfield Collective: Updated OAC | Westfield Collective, project 1068 | Full transcript available in RAG metadata | Backfilled full transcript chunks: 57 chunks |
| Hillsdale Holdings // Alleato Weekly | Vermillion Rise Warehouse, project 67 | No transcript marker and user confirmed meeting did not happen | Soft-deleted as `deleted_no_transcript` |

### Outlook Emails

21 Outlook email rows were pulled for the day. High-signal project groups:

| Project | Count | Themes |
| --- | ---: | --- |
| Uniqlo Phillipsburg NJ, project 31 | 4 | ASRS consulting replacement, Day 1 vs Day 2 scope coordination, fire alarm completion, design/sprinkler responsibility |
| Vermillion Rise Warehouse, project 67 | 4 | Cancelled invoice/payment, W9/COI, PO/job planner/invoice processing, permit set distribution |
| Park Collective, project 1097 | 3 | Updated plan questions, parking pressure, patio/FDC/hydrant constraints, mezzanine/mechanical questions |
| Union Collective, project 1009 | 2 | Geotech report incomplete; finalized report with appendices expected same morning |
| Alleato Leads, project 756 | 5 | Asset Alliance relationship meeting scheduled at Brandon's office |
| Superior Beverage Exotec, project 178 | 1 | PO forthcoming; owner selected larger heads for open-top boxes |
| Exol Morrisville, project 876 | 1 | Weekly milestone review agenda |
| Unassigned | 1 | Morrow discussion prep |

### Documents / Attachments

68 document/attachment rows were pulled.

High-signal groups:

| Project | Count | Themes |
| --- | ---: | --- |
| Uniqlo Phillipsburg NJ, project 31 | 45 | Permit/bid set, structural/hydraulic calculations, EXOTEC/rack docs, electrical sheets, LOI/owner contract, change request docs. Several PDFs are OCR failed and need separate remediation. |
| Sprinkler/Internal Ops, project 90 | 4 | Daily superintendent/site lead checklist, expense coding guide, check cutting SOP |
| Vermillion Rise Warehouse, project 67 | 2 | Architectural and PE drawing attachments |
| Westfield Collective, project 43 | 1 | Equity Purchase Agreement attachment |
| Eye Surgeons of Indiana, project 1033 | 1 | Budget/proposal attachment |
| Alleato Finance, project 60 | 5 | SOPs for checks, vendors, credit card transactions, reconciliation |
| Unassigned | 10 | Huddle agendas and FMDS documents |

### Teams

2 Teams DM rows were pulled.

| Source | Status | Decision |
| --- | --- | --- |
| Teams DM Conversation: 19:05e7f199- | skipped low content | Do not include in project intelligence |
| Teams DM Conversation: 19:81e9018c- | embedded, non-project conversation | Do not include in project intelligence |

## 2. Manual Embedding / Vectorization Actions

Performed:

- Backfilled `meeting_transcript` chunks for `Westfield Collective: Updated OAC`.
- Backfilled `meeting_transcript` chunks for `Sprinkler Division Morning Huddle`.
- Soft-deleted the Hillsdale shell row because it had no transcript and the user confirmed the meeting did not happen.

Observed:

- Westfield OAC full transcript had about 162k characters in RAG metadata before backfill and produced 57 transcript chunks.
- Sprinkler Huddle full transcript had about 102k characters in RAG metadata before backfill and produced 33 transcript chunks.
- The app `document_metadata.content` had only short summaries for the two meetings, while RAG metadata had the full transcript. The automated process must synthesize from the full RAG content, not only the app summary.

## 3. Full-Source Synthesis

### Westfield Collective: Updated OAC

Source type: Fireflies transcript.

Current assignment: project 1068, `Westfield Collective`.

Important routing issue: project 43 is also named `Westfield Collective` and is the page previously verified. This transcript may not appear in the expected project intelligence page unless project identity is resolved.

#### Executive Read

The project is in active design/site-planning mode with several decisions that affect site layout, permit timing, parking yield, patio usability, and owner cost exposure. The meeting was not just a status update; it created decisions and follow-ups around grading, parking, patio enclosure strategy, interior design responsibility, solar evaluation, and permit dates.

#### What Changed

- Site concept now targets a raised building pad around elevation 857 to reduce export/haul-off and balance grading.
- Parking is around 251 spaces, with 250 treated as the minimum requirement.
- Dirt stockpile and grading strategy may shift toward the volleyball court area to reduce slope severity.
- Dumpster location should move west from the current concept to reduce odor/logistics concerns.
- Patio/railing direction is becoming more concrete: glass railings plus accordion doors are being discussed for year-round patio use.
- Glass railing material cost was discussed around $26,000 plus about $7,000 shipping.
- Fire access and parking conflict remains unresolved; team is exploring partial fire lane abandonment, seasonal patio layouts, or road vacation.
- Solar remains exploratory; local installers should provide projection/pricing, with ROI discussed around a long 30-year horizon.
- Permit submission target discussed for August 17-21, with Michigan/site layout submission target around June 28.
- Eli should be brought into regular OAC/interior discussions.

#### Risks / Decisions

- Parking versus patio/fire access is a real design constraint, not a cosmetic issue.
- Raising the building pad solves one problem but creates ADA/entry/grade implications.
- Patio concept may trigger egress, enclosure, fire lane, and rough opening coordination issues.
- Solar may be a distraction unless pricing/ROI is grounded quickly.
- Interior finish responsibility needs to be nailed down before it becomes a late owner/GC scope dispute.

#### Recommended Project Intelligence Update

Westfield Collective moved into a more defined site-planning and design-coordination phase. The current concept preserves about 251 parking spaces and raises the building pad to about 857 to reduce dirt export, but the team still needs decisions on grading around the volleyball court, dumpster location, patio enclosure/fire access, interior design responsibilities, and solar feasibility. Permit timing is now visible, with late-August permit submission discussed and a June 28 site-layout milestone. The most important management issue is not schedule alone; it is preventing design preferences from creating avoidable permitting, fire access, parking, or cost conflicts.

### Sprinkler Division Morning Huddle

Source type: Fireflies transcript.

Current assignment: project 90, `Alleato Internal Ops`.

#### Executive Read

This meeting was operationally dense. It surfaced immediate field procurement issues, pressure-test documentation needs, leak repair urgency, branch-line progress, delivery logistics, budget/permit blockers, and a potentially material change-order/cost exposure on subpanel changes.

#### What Changed

- Accufire screws appear defective or unsuitable because they are breaking during installation.
- Home Depot screws appear to work and may be a short-term procurement alternative.
- Approximate screw need was discussed as 1,400 screws; boxes were discussed around $15.55 with 50-60 screws per pack depending on size.
- Hydrostatic pressure test was underway; team needs timestamped gauge photos for a 230 psi, 2-hour test.
- Branch line installation is progressing and the team expects to continue toward weekly completion despite racking issues.
- The team needs exact strut spacing measurements and photo documentation.
- Nexcom budget work is delayed but prioritized.
- K22 permit/materials are urgent for a July 6 start.
- Leak repairs on new verticals need coordination with technicians/TJ/Mike.
- Monday delivery logistics need parking/access confirmation.
- Subpanel change costs were discussed as exceeding $34,000, creating a need for cost reduction before executive delay.
- Procurement logs need cleanup to match new fabrication drawings and actual material requirements.

#### Risks / Decisions

- Defective screw procurement could slow installation if not canceled/replaced quickly.
- Pressure test documentation must be captured correctly or compliance proof may be weak.
- Leak repairs are urgent enough to affect project momentum.
- K22 permit/material timing creates schedule risk for July 6 start.
- Subpanel change cost above $34,000 is a change-order/cost-control flag.
- Procurement log inaccuracies can cause wrong orders, missed pipe types, and site delays.

#### Recommended Project Intelligence Update

The Sprinkler operation has several immediate field execution risks: defective Accufire screws need cancellation/replacement, hydro test documentation must be captured at 230 psi for two hours, leak repairs on new verticals need active coordination, and procurement logs must be reconciled against updated fabrication drawings. The work appears to be progressing, but procurement and documentation discipline are now critical. K22 permit/material lead time and a subpanel change cost above $34,000 should be escalated as schedule/cost risks.

## 4. Project Intelligence Updates That Should Be Written

### Westfield Collective

Recommended packet/card updates:

- Current status: Active site design coordination, parking/fire access/patio design decisions pending.
- Needs attention: Resolve project identity conflict between project 1068 and project 43 before packet write.
- Risk: Parking yield and fire access may constrain patio/seasonal enclosure concept.
- Cost exposure: Glass railing/accordion door concept has quoted material/shipping magnitude and may expand scope.
- Schedule: Permit submission target August 17-21; site-layout/Michigan submission target June 28.
- Decision needed: Confirm grading/dirt stockpile approach and whether parking/fire lane/patio strategy is acceptable.
- Evidence sources: Fireflies transcript `01KTSNJTJT19676PBC0BGJ42NN`.

### Sprinkler Division / Internal Ops

Recommended packet/card updates:

- Current status: Branch line work progressing, hydro test underway, procurement/permit/logistics issues need action.
- Urgent risk: Accufire screws failing; replacement source needed immediately.
- Compliance risk: Hydro test gauge photos must be timestamped for 230 psi / 2 hours.
- Schedule risk: K22 permit/material readiness for July 6 start.
- Cost/change-order signal: Subpanel change cost above $34,000 needs cost-reduction strategy.
- Documentation risk: Procurement logs must be updated to avoid wrong material ordering.
- Evidence sources: Fireflies transcript `01KTRMWN3KSSSGESHXY51191Y7`.

### Uniqlo Phillipsburg NJ

Recommended packet/card updates:

- Current status: Heavy document intake occurred today: permit/bid set, structural/hydraulic calculations, FP/electrical sheets, LOI/contract/change request docs.
- Risk: Several drawing/PDF rows failed OCR, so document intelligence is incomplete until OCR repair succeeds.
- Decision/scope signal: Owner requested alternative ASRS consulting firm because internal approval for TPG required comparison.
- Coordination signal: Day 1 vs Day 2 scope coordination includes fire alarm completion and final inspection coordination.
- Evidence sources: Outlook email threads and OneDrive documents from June 17.

### Vermillion Rise Warehouse

Recommended packet/card updates:

- Current status: Permit set sent minus HVAC and sprinkler updates; conap architectural/PE drawings added; cancelled invoice process active.
- Financial action: Brandon instructed Tony to create PO in Job Planner and process 100% invoice so accounting can cut a check.
- Required follow-up: Vendor W9/COI requested and W9 later received.
- Evidence sources: Outlook email thread and attachments.

### Union Collective

Recommended packet/card updates:

- Current status: Geotech report received incomplete; Andrew flagged missing boring log and asked when complete report would be sent.
- Follow-up: UES said finalized version with appendices would be sent that morning.
- Risk: Design/project decisions should not rely on incomplete geotech report until appendices/boring logs arrive.

### Park Collective

Recommended packet/card updates:

- Current status: Updated plan review raised parking, patio, FDC/hydrant, mezzanine, and mechanical-feed questions.
- Risk: Patio concept near trail may be hard to approve because FDC and hydrant are in that area.
- Decision: Ownership likely values max parking; layout with 99 spaces was preferred in comments.

## 5. Daily Brief Draft Brandon Should See

### Start Here

1. Westfield OAC created real design decisions, but the transcript is assigned to project 1068 while the verified Westfield Project Intelligence page is project 43. Fix the project identity before trusting the packet.
2. Sprinkler huddle needs immediate field follow-through: cancel/replace defective Accufire screws, capture hydro test photos, resolve leak repair coordination, and clean up procurement logs.
3. Uniqlo had heavy document intake and owner coordination today. OCR failures on several important PDFs mean the assistant may miss document details until OCR is repaired.

### Needs Brandon

- Decide or delegate who resolves Westfield project identity duplication so today's OAC transcript updates the right Project Intelligence page.
- Watch Sprinkler subpanel change cost above $34,000; the team needs a cost-reduction path before it becomes an executive delay.
- Confirm Tony completed the Vermillion PO/job planner/100% invoice path so accounting can cut the cancelled-invoice check.
- Decide how Alleato wants to respond to Uniqlo's request for an alternative ASRS consultant proposal.

### Waiting On Others

- Douglas/Andrew: Westfield grading, parking/fire access, patio enclosure, and site concept follow-ups.
- Phil/factory: Westfield glass railing/accordion door rough opening details.
- Greg/Kebba/Mike: Sprinkler screw replacement, pressure-test documentation, leak repair updates, inspection timing, and Monday delivery access.
- UES/Troy: Complete Union geotech report with appendices and boring logs.
- Tony/accounting/vendor: Vermillion W9/COI, PO, invoice, and check processing.

### Risks / Change-Order Signals

- Sprinkler subpanel change cost over $34,000.
- Westfield patio/glass enclosure/fire access/parking design may create scope and permitting exposure.
- Uniqlo ASRS consulting replacement could change design responsibility/scope.
- Union geotech is incomplete until appendices/boring logs are received.
- OCR failures on Uniqlo documents create source-confidence risk.

### Source Confidence

- High confidence for Westfield OAC and Sprinkler Huddle because full transcripts were read and full transcript chunks were backfilled.
- Medium confidence for email-derived items because only thread previews were manually reviewed in this dry run.
- Medium-low confidence for Uniqlo document details where OCR failed.
- Excluded Hillsdale because no transcript exists and user confirmed the meeting likely did not happen.

## 6. Task Candidates

These are dry-run task candidates only; they were not inserted into the task table.

| Project | Task | Owner | Priority | Source |
| --- | --- | --- | --- | --- |
| Westfield Collective | Resolve duplicate Westfield project assignment: confirm whether OAC transcript belongs to project 43 or 1068 and repair source attribution. | Megan/Admin | Urgent | Manual dry run finding |
| Westfield Collective | Send VOX/site plan comments about dirt relocation near volleyball courts and grading balance. | Douglas Franklin | High | Westfield OAC |
| Westfield Collective | Review feasibility of reducing slope near volleyball area from about 10 feet to about 4 feet. | Douglas Franklin | High | Westfield OAC |
| Westfield Collective | Confirm patio enclosure/fire access/exiting strategy with architect before design proceeds. | Douglas Franklin / Andrew Cannon | High | Westfield OAC |
| Westfield Collective | Schedule interior design feedback call with Eli and add Eli to Tuesday OAC calls. | Andrew Cannon | Medium | Westfield OAC |
| Westfield Collective | Compile and send furniture/lighting responsibility spreadsheet before next OAC. | Andrew Cannon | Medium | Westfield OAC |
| Westfield Collective | Get solar installer pricing/projection from trusted local vendors. | Tony Frisone / Andrew Cannon | Low | Westfield OAC |
| Sprinkler/Internal Ops | Cancel defective Accufire screw order and confirm replacement source. | Gregory Davis | Urgent | Sprinkler Huddle |
| Sprinkler/Internal Ops | Confirm exact strut spacing and send photos. | Gregory Davis | High | Sprinkler Huddle |
| Sprinkler/Internal Ops | Capture timestamped hydro test gauge photos at 230 psi for two hours. | Gregory Davis | Urgent | Sprinkler Huddle |
| Sprinkler/Internal Ops | Update procurement log to match fabrication drawings, pipe designations, and actual shipment needs. | Gregory Davis / Brandon Clymer | High | Sprinkler Huddle |
| Sprinkler/Internal Ops | Confirm inspection timing and aim for afternoon availability. | Kebba Mass / Mike Parsons | High | Sprinkler Huddle |
| Sprinkler/Internal Ops | Coordinate leak repair updates with TJ/Mike/site technicians. | Kebba Mass / Mike Parsons | High | Sprinkler Huddle |
| Sprinkler/Internal Ops | Confirm Monday delivery parking/access with GC. | Mike Parsons | High | Sprinkler Huddle |
| Sprinkler/Internal Ops | Reduce or validate subpanel change cost above $34,000 before executive delay. | Brandon Clymer / PM | Urgent | Sprinkler Huddle |
| Uniqlo Phillipsburg NJ | Respond to owner request for alternative ASRS consulting proposal and clarify scope being replaced. | Brandon Clymer | High | Outlook |
| Uniqlo Phillipsburg NJ | Repair OCR failures for key Uniqlo PDFs so document intelligence is complete. | AI Ops | High | OneDrive |
| Vermillion Rise Warehouse | Create PO in Job Planner and process 100% invoice for cancelled invoice payment. | Tony Courtney | High | Outlook |
| Vermillion Rise Warehouse | Confirm W9/COI received and accounting has everything needed to cut check. | Tony Courtney / Accounting | High | Outlook |
| Union Collective | Confirm complete geotech report with appendices and boring logs was received. | Andrew Cannon | High | Outlook |
| Park Collective | Review FDC/hydrant conflict with patio concept and document approval risk. | Douglas Franklin | High | Outlook |

## 7. Exact Automated Process This Dry Run Proves

1. Pull all source rows for the day by source family: Fireflies, Outlook, Teams, OneDrive/SharePoint, attachments.
2. Exclude false positives explicitly, with an auditable status. Example: Hillsdale was marked `deleted_no_transcript`.
3. Verify each source has raw full content, not just app summary fields.
4. For Fireflies, backfill or verify `meeting_transcript` chunks from full transcript content.
5. For Outlook/Teams/Docs, verify chunks and embeddings exist; if not, run bounded embedding repair.
6. Generate one source-level synthesis artifact per meaningful source using the full source text.
7. Generate a project-level daily delta by combining source-level syntheses for the same project.
8. Generate task/risk/change-order/urgent candidates from the project delta and full-source evidence.
9. Update Project Intelligence from the project delta plus structured candidates.
10. Build the daily brief from source-level syntheses, project deltas, and current project intelligence.
11. Make the AI assistant start with the project narrative and packet, then drill into full source/transcript when a high-stakes claim needs evidence.
12. Fail loudly if any source is only partially available, misassigned, OCR failed, unembedded, or not represented in the expected project packet.

## 8. What This Revealed

- The missing value is the source-level synthesis layer. Cards and packets are useful, but they should not be the first time the system tries to understand the raw source.
- Full transcripts are already available in RAG metadata for important meetings, but the app summary fields can be much thinner. The automated synthesis must read the RAG full content.
- Project assignment is as important as embedding. Westfield OAC was rich and embedded, but may be assigned to the wrong duplicate project.
- Daily brief quality should be judged against this source-synthesis output, not just whether a `daily_recaps` row exists.
- Task generation should come from the source/project synthesis, then link back to exact source evidence.

