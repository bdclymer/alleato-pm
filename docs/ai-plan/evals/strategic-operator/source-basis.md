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
- The ASRS sprinkler case still needs direct meeting/email/Teams source IDs before it becomes a factual golden case.
- Until those IDs are attached, this remains a behavioral strategic RAG case that checks source coverage, synthesis, and honesty.

## Microsoft Office Operator

The seed cases are behavior-first because Office messages are live/time-sensitive.

Required behavior:

- Use the Microsoft Executive Assistant path for Microsoft Office retrieval.
- Expose `microsoft_graph_live` in the tool trace for live Office reads.
- Separate urgent or business-important items from routine inbox/Teams noise.
- Recommend reply, delegate, watch, schedule, or ignore.

Existing related guardrail:

- `inbox-outlook-regression` in `docs/ai-plan/evals/assistant-eval-suite.json`

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
