# Strategic Operator Source Basis

This file records the current source basis for the seed cases. It is intentionally separate from the LangSmith JSON because the underlying meeting/email/message corpus can change.

## ASRS Sprinkler Design

Current strongest local evidence comes from production RAG smoke artifacts for project `67`, Vermillion Rise Warehouse:

- `docs/ai-plan/evals/prod-rag-smoke/2026-05-13T23-01-34-663Z/report.md`
- `docs/ai-plan/evals/prod-rag-smoke/2026-05-13T23-01-34-663Z/05-project-filtered.json`
- `docs/ai-plan/evals/prod-rag-smoke/2026-05-13T22-51-02-565Z/05-project-filtered.json`

Seed facts visible in those artifacts:

- The project was design/contract coordination heavy.
- Final review drawing sets were expected by Friday, with structural confirmation still pending.
- The 5/13 Hillsdale Holdings / Alleato weekly meeting surfaced urgent sprinkler design issues.
- The sprinkler design reportedly lacked double block valves, creating water damage/flooding exposure.
- Fire protection was apparently reduced from four zones to two, with no documented agreement supporting that change.
- Sprinkler header placement was flagged as a concern.
- Electrical drawing review and A141 contract coordination were adjacent coordination burdens.

Current inferred answer direction:

- The likely time-consuming driver is not "sprinkler design" generically. It is repeated design coordination/review caused by unresolved fire-protection design assumptions and missing/changed protection requirements.
- A strong answer should still verify meetings, emails, and Teams/messages before stating this as the final answer because the local artifacts above are RAG smoke outputs, not direct source rows.

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
