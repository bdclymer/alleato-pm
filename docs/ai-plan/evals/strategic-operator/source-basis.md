# Strategic Operator Source Basis

This file records the current source basis for the seed cases. It is intentionally separate from the LangSmith JSON because the underlying meeting/email/message corpus can change.

## ASRS Sprinkler Design

Current canonical project target:

- Project name: `Exol Wilmer`
- Project ID: `760`
- Project number: `26-103`
- Acumatica project ID: `26103`

Current local evidence:

- `docs/ai-plan/evals/runs/2026-05-19T06-13-15-043Z-12edee9a/realworld-business-risks.json`
- `docs/ai-plan/evals/runs/2026-05-12T19-14-11-931Z/cross-project-comparison.json`

Seed facts visible in those artifacts:

- Existing eval artifacts identify `Exol Wilmer` as project number `26-103`.
- `Exol Wilmer - Review on GC's` appears as a Fireflies source on 2026-05-18.
- The Wilmer review evidence mentions a year-long schedule, 50-60% drawing completion before finalizing, approximately $30 million project value, bid collection, access issues, and scope clarification.

Important correction:

- Do not use Vermillion Rise sprinkler evidence for this ASRS test.
- Do not use Exol Morrisville / Exol PA evidence as Exol Wilmer evidence.
- Do not use Pratt & Whitney, Exotec, Superior Beverage, or generic FM Global ASRS material as project-specific Exol Wilmer proof.
- The ASRS sprinkler case still needs direct meeting/email/Teams source IDs before it becomes a factual golden case.
- Until those IDs are attached, this remains a behavioral strategic RAG case that checks source coverage, synthesis, and honesty.

## First Strategic Eval Run

Run:

- `docs/ai-plan/evals/runs/2026-05-19T11-03-49-986Z-1cfff01c/summary.md`

Result:

- The case passed structurally and passed the LLM judge, but the pass was too permissive.
- The assistant used `Exol Morrisville Kick Off`, `Weekly design coordination Exol PA`, and other adjacent ASRS examples to produce a plausible answer.
- That is strategic-sounding but not source-clean for Exol Wilmer.

Correction:

- The runnable eval now requires Exol Wilmer / 26-103 anchoring and explicit evidence-gap language.
- The runnable eval now forbids known adjacent-project leakage terms.
- The LangSmith examples now include project-scope integrity expectations and anti-patterns.

Second run:

- `docs/ai-plan/evals/runs/2026-05-19T11-07-15-069Z-89fe2e34/summary.md`

Result:

- The answer behaved correctly: it stayed on Exol Wilmer, said direct Exol Wilmer ASRS sprinkler evidence was not available, and did not use adjacent projects as proof.
- The structural gate failed only because the evidence-gap substring list was too narrow. The expected phrase list now accepts `do not have direct` and `direct evidence`.

Third run:

- `docs/ai-plan/evals/runs/2026-05-19T11-10-39-734Z-88222626/summary.md`

Result:

- Passed after the project-scope tightening.
- The assistant explicitly said the direct Exol Wilmer / 26-103 ASRS sprinkler evidence is missing.
- The assistant did not use another project as proof.
- Judge score was 4/4 overall, with project-scope integrity scored 5/5.
- Runtime was 60.177s, above the 30s warning budget but below the 75s max budget.

## Microsoft Office Operator

The seed cases are behavior-first because Office messages are live/time-sensitive.

Required behavior:

- Use the Microsoft Executive Assistant path for Microsoft Office retrieval.
- Expose `microsoft_graph_live` in the tool trace for live Office reads.
- Separate urgent or business-important items from routine inbox/Teams noise.
- Recommend reply, delegate, watch, schedule, or ignore.
- Distinguish confirmed user-owned action from items that merely exist in the inbox.
- Avoid unsupported certainty about urgency, phishing, Teams escalation, or "ignore" recommendations.

Existing related guardrail:

- `inbox-outlook-regression` in `docs/ai-plan/evals/assistant-eval-suite.json`

First strategic run:

- `docs/ai-plan/evals/runs/2026-05-19T11-16-44-188Z-9a77e16d/summary.md`

Result:

- Failed.
- The route did delegate to `consultMicrosoftExecutiveAssistant`, but the persisted trace did not prove `microsoft_graph_live`.
- Judge score was 3/4 because the answer included useful triage but overclaimed several judgments and did not clearly separate Brandon-owned actions from ordinary inbox items.

Correction:

- The email operator judge rubric now explicitly penalizes unsupported urgency/phishing/ignore certainty.
- The case remains red until the Microsoft Executive Assistant trace proves live Graph source and the answer is more carefully calibrated.

Second strategic run:

- `docs/ai-plan/evals/runs/2026-05-19T11-22-37-369Z-4769350a/summary.md`

Result:

- Failed as expected.
- The assistant used `consultMicrosoftExecutiveAssistant`, but the persisted trace still did not include `microsoft_graph_live`.
- Judge score remained 3/4 because the answer overclaimed live Outlook status and inferred thread details/ownership that were not proven.
- Runtime was 52.699s, above the 45s warning budget.

## Weekly Meeting Insights

The seed cases are behavior-first because "past week" changes continuously.

Required behavior:

- Use meeting retrieval scoped to the requested time window.
- Filter to the highest-impact insights, risks, and hurdles.
- Avoid chronological meeting dumps.
- Include owner/action framing and source freshness caveats.

Existing related guardrails:

- `recent-meetings-portfolio`
- `realworld-todays-meetings`
- `ceo-meetings-what-happened`
- `ceo-meetings-promised-to-do`

First strategic run:

- `docs/ai-plan/evals/runs/2026-05-19T11-16-44-188Z-9a77e16d/summary.md`

Result:

- Passed.
- Judge score was 5/4 and the answer gave a strong executive synthesis.
- The run warned that the `meetings` family was not represented even though `getMeetingIntelligence` fired.

Correction:

- `getMeetingIntelligence` is now mapped into the `meetings` family.

Second strategic run:

- `docs/ai-plan/evals/runs/2026-05-19T11-22-37-369Z-4769350a/summary.md`

Result:

- Passed.
- Judge score was 5/4.
- The previous meeting-family warning is gone.

## Cross-Source Open Loops

First strategic run:

- `docs/ai-plan/evals/runs/2026-05-19T11-16-44-188Z-9a77e16d/summary.md`

Result:

- Passed by judge, but too loosely.
- The prompt asked for meetings and Office messages, yet the assistant did not use the Microsoft Executive Assistant.
- The answer mixed domain/project-adjacent synthesis with weekly open-loop claims.

Correction:

- The cross-source case now requires `consultMicrosoftExecutiveAssistant` and `microsoft_graph_live` trace evidence.

Second strategic run:

- `docs/ai-plan/evals/runs/2026-05-19T11-22-37-369Z-4769350a/summary.md`

Result:

- Failed as expected.
- The answer was strategically useful, but it did not use `consultMicrosoftExecutiveAssistant`.
- The case now catches this as a hard failure because the prompt explicitly asks for Office messages.
