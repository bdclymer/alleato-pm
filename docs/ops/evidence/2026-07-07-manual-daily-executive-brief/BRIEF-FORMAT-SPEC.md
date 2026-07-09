# Daily Executive Brief — Format Spec (v2)

*Agreed 2026-07-09. Sample output: `2026-07-08/brief-revised.md` (rebuilds the 7/8 data in this format). Supersedes the 9-section layout in `2026-07-08/brief.md`.*

## Why v2

The v1 layout had 9 sections and restated the same fact in up to 7 of them (the four "Candidate" sections — Risk / Decision / Task / Initiative — re-filed facts already stated above). It also had no memory: items hot on prior days silently disappeared. v2 fixes both.

## The rules

1. **One fact, one home.** Organize by *project*, not by category. Each project's status, money, next action, and risk live together in a single block. No parallel category sections.
2. **Carry state forward.** Maintain an open-items ledger across days. Every item has an explicit status; the brief shows what's still open, flags true silent-drops, and notes same-day resolutions.
3. **Preserve owner voice.** *(ruling 2026-07-09.)* When the owner gives an instruction or asks an open question, **quote it verbatim** — do not paraphrase directives into neutral status prose. Brandon's *"I want that on the 14th"* and Andrew's unanswered *"Any battery storage?"* are the decision-grade content; the current generator smooths exactly this away. Neutral prose is fine for pure status (field progress, permit state). Worked example: `2026-07-08/brief-richer-0708.md`.
4. **Line-item the money that drives a decision.** If a number is the thing being approved (paving $11k, R.A.D. steel $950,109 line items), carry the line items, not just a rounded headline.
5. **Voice = strategic advisor speaking to Brandon.** *(ruling 2026-07-09.)* The brief is addressed **to** the owner in second person ("**you**"), the way a business partner would brief him — NOT a third-person news report. Never write *"Brandon wants dirt moving."* Write *"Union is your money leak this week"* / *"this one has left the PM's hands — getting Yusuke's approval is yours to drive."* Corollary to rule 3: quote **other people** verbatim (Andrew's *"Any battery storage?"*, Yusuke's *"We cannot do that, need option-B"*, Greg's questions); render the **owner's own** directives as his calls ("You've told Andrew to…"), not as quotes at him.
6. **Write in plain, complete sentences — this is the one that keeps failing.** *(ruling 2026-07-09.)* The brief must read like a person explaining the day, not compressed notes. Megan on the shorthand draft: *"the way it's written it's like I don't even understand what I'm actually reading… it doesn't make any sense."* Hard requirements:
   - **No telegraphic dash-fragments as whole lines.** Not *"UQ — cost breakdown due 7/17 — open since 6/30."* Instead: *"Uniqlo needs our cost breakdown by July 17. This has been open since June 30."*
   - **Spell out every abbreviation and internal shorthand.** "Uniqlo," not "UQ." "Certificate of insurance," not "COI." "Letter of intent," not "LOI." Write out dates ("July 6," not "7/6") and say the age in words ("open since July 6, three days now").
   - **One idea per sentence.** Don't stack three facts with em-dashes and parentheticals. Break them into sentences.
   - **Quotes are introduced, not jammed in.** Lead into a quote so the reader knows who said it and why, then quote it.
   - Bold lead-in phrases for scannability are fine — but what follows the bold must be a real sentence, not a fragment.
   Worked example (v3): `2026-07-08/brief-richer-0708.md`.
7. **Every claim links to its source.** *(standing rule — [[feedback_claims_must_link_to_source]].)* Each source tag is a real hyperlink to the underlying record (email deep link, Fireflies transcript URL), not an opaque `S12` code. Worked example uses markdown reference links: `[S53]` in text → `[S53]: <url>` defined at the foot. **Gap to close:** Teams items (e.g. `S247`) currently have no deep link — the corpus stores `URL: none`. Teams messages need permalinks so they can be cited like emails; until then the brief must note the gap, not drop the citation.

## Structure — ONE stream of project blocks, then tasks (revised 2026-07-09)

**This replaced the earlier multi-section layout.** Megan: *"there is no reason to have things split into different sections… it seems like it's done and then you bring it up again in the next section and then you bring it up again in the next section."* The old layout (The read / Needs you / Carryover / Projects needing action / Projects on track) split every project across up to five places — that IS the duplication. Kill all of it. There is no standalone "read" section and no standalone "decisions" section; both fold into the project block.

The brief opens with a decision index, then a single stream of project blocks, then a short loose-ends list.

**No format-explainer line.** *(ruling 2026-07-09.)* The production brief goes straight from the `# Daily Executive Brief — <date>` title to `## Your calls today`. It must NOT carry a "how to read this" / "projects are ordered most urgent first…" intro paragraph — that's design scaffolding, not content Brandon needs daily, and it's exactly the explanatory noise the format exists to remove. (The golden sample keeps that note only as a non-rendering HTML comment.)

### `Your calls today` — a decision index at the very top (added 2026-07-09)

A short list at the top titled `## Your calls today`, holding **only the decisions that need Brandon**, one line each. It exists because his decisions are otherwise scattered across six project blocks and he can't see "everything that needs me" in one glance — especially on a phone. Each line links to its project block for the context.

**The rule that keeps this from becoming the old duplication (LOCKED):** this list carries the **decision as a question, and nothing else** — no status, no context/why, no team tasks. The moment a line starts explaining the situation, that sentence belongs in the project block, not here. This is a table of contents of his decisions, not a second telling.

- This is NOT the retired "The read" paragraph or "Needs you today" section. Those re-narrated every project (context and all) before the reader reached it — that was the duplication Megan killed. `Your calls today` is decisions-only, his-only, one line each. The difference is re-explaining (banned) vs. indexing (fine — Megan: "a terse index reads as a TOC, not duplication").
- Include only lines that have a real `**You**` action item somewhere below; mark genuinely optional calls `(optional)`. If a project has two decisions, they can share one line.
- Order it to match the project stream below (most urgent first) so tapping is intuitive.

### Project blocks — one per project, ordered most urgent → least, each ACTION-FIRST

- **Order by urgency/criticality.** Projects with a live decision and active money/schedule exposure come first (Union, Uniqlo…); "on track, nothing needed" and "resolved today" come last.
- **Lead every block with an `Action Items` list — this is the top of the section, above the prose.** *(ruling 2026-07-09: "tasks at the top of each section… Brandon's gonna get really annoyed with the long-windedness without any direct 'this is what needs to be done'.")* Brandon must be able to act from the top lines alone and never read the paragraph. Each action item carries:
  - an **owner** — `**You**` for Brandon's own decisions/approvals, a person's name for anyone else;
  - a **real due date** when one exists (`Due July 14`), otherwise the honest urgency (`Blocking submittals; as soon as possible`). Never invent a date;
  - its source link.
  - Render as checkboxes (`- [ ]`). On the project-brief **page** these become the per-project **task side panel** (Megan's UI direction) — the markdown is the data, the page styles it.
- **Then the context prose underneath** — the explanation in clear "read"-quality voice, the money, the schedule, the carryover age ("open since July 6"), any same-day resolution — stated once, for whoever wants the why. If a project needs nothing, the action line says so ("Action Items — nothing, resolved today").
- Carryover and "resolved today" are woven into the block inline, not broken out.

### Collapse the no-decision projects (revised 2026-07-09)

Projects where Brandon has **no `**You**` action item** — only team tasks and status (on-track jobs, "resolved today," early-stage) — move into a **collapsible group near the bottom**, under a heading like `## Also moving — nothing needed from you`. In markdown this is a `<details><summary>` block; on the project-brief page the design renders it as a collapsed section. Its project headings drop to `###` inside the block. The main stream above stays limited to projects that have a genuine Brandon decision, so his skim of the top is only things he owns.

- A project earns its way *out* of the collapse the moment it has one real `**You**` item — e.g. Goodwill Brookville stays up top because the "should Tony escalate the signature" call is his to make, even though the execution is a team task.

### Loose ends — the only thing grouped separately

A short `## Loose ends — yours to chase` list at the very end, for items that **don't belong to any project** (the old "went silent" cluster — the $160k wire, Natali's 1099, the hazmat escalation). Anything that *does* belong to a project goes in that project's action list, not here.

**Dropped entirely:** the standalone "The read," "Needs you today," "Carryover," "Projects needing action / on track," "Ideas worth a decision later," the global two-checklist `# Tasks` section, and "Automation Instructions Learned." Their content now lives at the top of each project block (actions), inside the block prose (narrative/decision/carryover), or in the single loose-ends list. **Do not add a global task section** — every task already sits at the top of its project; a global list would just repeat them (the app side panel aggregates instead).

## Carryover ledger (the build work)

*(ruling: track resolution explicitly — do NOT infer purely from day-to-day text diff.)*

The generator persists an open-items ledger keyed by project + item. Each item carries a status — but note (revised 2026-07-09) these now surface **inside the relevant project block or the task checklists**, not in a standalone Carryover section:

- `open` — surfaced, not resolved. Stated inside its project block with age ("open since July 6, three days now").
- `resolved` — closed; noted once inside its project block as good news ("Resolved today — …"), then drops.
- `dropped` — deliberately abandoned; stops carrying.
- `silent` — was `open`, no supporting source today → becomes a **check-on-it task on Brandon's checklist** ("Confirm whether the $160k wire cleared — no update since June 18"), not a separate section.

## Input hygiene (upstream of format — for the corpus builder, not the writer)

Reading the raw 7/8 corpus surfaced input problems that cap format quality no matter how good the writer prompt is. These are **upstream of the writer** — fix them in the corpus builder/classifier, not by asking the writer to compensate.

- **Deduplicate — HARD PRE-WRITE GATE (locked 2026-07-09).** `S260` and `S307` are the identical email under two S-tags; "188 emails" overcounts. Dedup by message id / content hash **before anything is written**. Non-negotiable.
- **Normalize fidelity.** The corpus mixes raw full email threads, pre-summarized "This document is an email thread about…" blurbs, and multi-layer Fireflies transcripts. The blurbs strip the decision-grade specifics the raw threads keep — prefer raw (trimmed of signatures/quoted chains/CAUTION banners) over pre-summarizing.
- **Fix project attribution at the classifier — confirmed defect.** The 7/8 "Westfield Collective" item is actually **Shawnee Collective** (Megan confirmed 2026-07-09) — the thread title literally says "Shawnee Collective Reconnect" (`S301`), yet the classifier stamped the wrong project and the writer inherited it verbatim.

### Why the generator misses what a human catches instantly

Megan's question — *"you have the same intelligence as the models we use, how come you can see it's the wrong project but our system can't?"* It is **not** an intelligence gap. Same model class. The generator underperforms because:

1. **It's handed the wrong answer as ground truth.** The writer prompt says "organize by project / refer to projects by name," and it's fed a pre-computed `project=` field. So it trusts the field and never reads the title against it. A human reading raw content with no project field pre-filled notices the mismatch immediately — because nobody told them the answer.
2. **No verification step exists.** There is no "does the title/body agree with the assigned project?" check in the pipeline. Add that one instruction and the model catches it every time.
3. **Attention is spread across a bulk pass.** One summarize-everything pass over 300+ (duplicated) sources dilutes the narrow cross-checks. Those checks work as their own discrete step, not buried in a mega-prompt.

**Fix (two moves):** (a) fix attribution at the classifier stage — best; (b) backstop in the writer: instruct it to sanity-check each source's assigned project against its title/content and **flag** low-confidence attributions rather than assert them.

A quietly-closed item isn't nagged as "went silent." Age = today − first-seen date.

## Anti-duplication check (generator self-test before emit)

The single-stream structure makes this almost automatic, but still assert it: **each project is discussed in exactly one place — its block.** A fact about a project must not appear both in its block and anywhere else. The task checklists may name the project and the action, but must not re-explain the situation already covered in the block (the checklist is the *action*, the block is the *why*). If you catch yourself writing about the same project in two spots, collapse it into the block.

## Preserved from v1

- Source tags inline and exact, but rendered as **hyperlinks** (rule 6), not bare backtick codes.
- Projects by name only; no numeric project references.
- If a source lane is thin, say which lane.
- Priority order: owner decisions → money exposure → schedule risk → client/vendor blockers → recap.
