# AI Assistant Eval Suite Quality Audit

Date: 2026-05-19

## Bottom Line

Do not treat the current `assistant-eval-suite.json` as a factual accuracy gate yet.

The prompt set is directionally good: it uses real owner/operator wording, short executive questions, project-specific questions, source-health checks, inbox triage, and write-safety scenarios. The scoring layer is not strong enough to prove the assistant is giving accurate business answers. It mostly proves routing, tool use, metadata persistence, forbidden-tool safety, and generic-answer avoidance.

## What Is Ready To Run

These are useful as regression checks:

- `deep-agents-executive-regression`: verifies broad no-project prompts route through `backendDeepAgentExecutiveBriefing` and do not trigger write tools.
- `inbox-outlook-regression`: verifies inbox prompts route through structured Outlook intake instead of source-specific RAG.
- `source-sync-teams-regression`: verifies source-health prompts expose source freshness/staleness instead of pretending coverage is complete.
- `task-action-items-regression`: verifies common owner phrasing routes to task/action-item retrieval.

Use these to answer: "Did the system take the right path?"

Do not use them alone to answer: "Was the business answer factually correct?"

## Main Quality Gaps

1. The suite has 108 cases, but many are structural checks only.
   - 84 cases have `expectedToolNames`, but only 32 require all critical tools via `expectedAllToolNames`.
   - 15 cases require metadata paths.
   - 2 cases require a minimum response-quality score.
   - 1 case requires minimum source quality.

2. The current answer assertions are mostly phrase checks.
   - `mustInclude` and `mustIncludeAny` often check for generic words like `task`, `risk`, `budget`, `open`, or `process`.
   - Those checks can pass even when the answer contains fabricated specifics.

3. Prior passing Deep Agents executive output showed likely hallucinated details.
   - The previous passing run at `docs/ai-plan/evals/runs/2026-05-14T21-24-36-746Z-792745ba/summary.md` passed all 4 Deep Agents executive cases.
   - The `realworld-waiting-on-team` answer included `Sean Miller`, `Dana Li`, `Structural Steel Shop Drawings`, and `HVAC Coordination Layout Review`.
   - A live database spot-check found no exact `Sean Miller` or `Dana Li` person records.
   - Current recent task records instead point to payroll export, Acumatica/Venture integration, cost codes, Maria Calcetero, and Jesse Dawson.

4. Some project references are correct, but not all prompts have durable ground truth.
   - Verified current project IDs include:
     - `43`: Westfield Collective
     - `67`: Vermillion Rise Warehouse
     - `1009`: Union Collective
     - `761`: Ulta Beauty Fresno
   - Several prompts mention project names without a selected project ID, which is useful for resolver testing but weaker for factual answer scoring unless the expected resolved project is explicit.

5. The eval runner does not currently support source-backed answer keys.
   - It scores tool names, metadata paths, substring includes/excludes, response length, response quality metadata, and latency.
   - It does not validate returned claims against expected source IDs, row IDs, names, totals, dates, or required citations.

## What Should Change Before Accuracy Evals

Create two separate eval layers:

### 1. Routing Regression Suite

Keep the current suite mostly intact, but label it as routing/behavior regression. It is still valuable because it catches:

- wrong intent routing
- missing required tools
- unsafe write tools firing on read-only prompts
- stale fallback language
- missing metadata
- timeout/latency regression

### 2. Golden Accuracy Suite

Add a smaller vetted suite before using evals to decide whether Deep Agents is "better":

- 10 to 15 high-value questions only.
- Each case must have a checked source basis: table, row ID, project ID, source title, source date, or known DB count.
- Each case should have required facts and forbidden hallucinations.
- Each case should require source metadata or cited evidence, not just answer length.
- Cases should be refreshed when the underlying source data changes.

Recommended first golden cases:

1. `realworld-most-important-tasks`
   - Ground truth from current `tasks` rows.
   - Should mention payroll export / Venture / Acumatica / cost-code follow-ups if those remain the newest open tasks.

2. `realworld-waiting-on-team`
   - Ground truth from open task assignees and actionable insights.
   - Must forbid fabricated names unless they exist in source rows.

3. `realworld-business-risks`
   - Ground truth from `project_risk_current` plus source-health status.
   - Should include top current risks by score and source freshness caveats.

4. `source-freshness-rag-health`
   - Ground truth from source-health metadata.
   - Must distinguish Teams, Outlook, meetings, packets, and embedding backlog separately.

5. `memory-recall`
   - Ground truth from `ai_memories`.
   - Should prove Deep Agents recall tools surface existing user/project/team memory, not generic chat memory language.

## Recommended Gate Before Running Full Evals

Before running the full suite, run a short preflight:

1. Confirm the target endpoint is explicit: production or localhost.
2. Confirm auth and database connection work.
3. Confirm the suite mode:
   - routing regression
   - golden factual accuracy
   - latency/performance
4. For golden factual cases, snapshot the expected source facts before execution.

## Current Recommendation

Run the existing bundles only as routing/behavior smoke tests.

Do not use their pass/fail result to decide that the AI is accurate or production-ready. First add the golden accuracy layer above, or at minimum manually review the 4 Deep Agents executive outputs against source rows after each run.

## Implemented Follow-Up

The eval runner now supports optional LLM judge rubrics for answer quality. Two judge-backed bundles were added:

- `strategic-advisor-quality` — measures whether answers have an executive point of view, business judgment, clear implications, concrete next steps, and non-generic advisor tone.
- `email-operator-quality` — measures whether Brandon inbox answers separate urgent messages from noise, identify reply/delegate/watch actions, and produce review-ready draft guidance without claiming anything was sent.

Run with:

```bash
npm run rag:verify:strategic-advisor-evals:prod
npm run rag:verify:email-operator-evals:prod
```

Set `AI_EVAL_JUDGE_ENABLED=false` to run only the structural routing checks for those bundles.
