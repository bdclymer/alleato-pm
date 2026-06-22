# Strategic Operator Judge Rubric

Use this rubric when judging `Strategic Operator Eval v1` examples in LangSmith or an internal eval runner.

## Global Failure Conditions

Fail the answer if any of these are true:

- It fabricates names, dates, source titles, meeting outcomes, code requirements, costs, or schedule impacts.
- It claims to have checked meetings, emails, Teams, calendar, or files when the trace/source evidence does not show that access.
- It answers a cross-source prompt from only one source type without saying coverage is incomplete.
- It gives generic construction, AI, RAG, or productivity advice instead of using the retrieved evidence.
- It treats all retrieved items as equally important.

## Core Dimensions

Score each dimension from 0 to 4.

### Source Integrity

Does the answer use the required source families or clearly disclose access gaps?

### Signal Filtering

Does the answer separate important evidence from routine noise, FYIs, repeated chatter, and stale context?

### Strategic Synthesis

Does the answer connect evidence into a clear operational story instead of summarizing source items one by one?

### Prioritization

Does the answer rank by time, money, schedule, owner risk, urgency, or decision impact?

### Actionability

Does the answer give concrete next actions, decisions, verification steps, or questions?

### Honesty And Calibration

Does the answer name uncertainty, source gaps, weak evidence, or incomplete time windows without using those caveats as an excuse to be vague?

## Category-Specific Expectations

### ASRS Sprinkler RAG

A strong answer identifies the dominant design time sink, explains the mechanism causing design cycles, and shows whether that conclusion is supported by meetings, emails, and messages.

### Microsoft Office Operator

A strong answer uses the Office retrieval path, ranks items by importance, separates urgent work from noise, and recommends reply, delegate, watch, schedule, or ignore.

### Weekly Meeting Insights

A strong answer stays inside the requested time window, filters meetings down to the top insights/risks/hurdles, and converts them into owner-level implications and follow-up actions.

## Recommended Overall Score

Use this summary score after dimension scoring:

- `4`: Clear executive/operator judgment with source-backed synthesis and concrete next actions.
- `3`: Useful but missing one important dimension.
- `2`: Plausible but generic, shallow, or weakly prioritized.
- `1`: Mostly a source dump or generic advice.
- `0`: Hallucinated, wrong-source, unsafe, or ignores the prompt.
