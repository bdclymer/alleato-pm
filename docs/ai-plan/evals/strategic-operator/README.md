# Strategic Operator Eval v1

This folder contains a LangSmith-ready seed dataset for evaluating whether the assistant behaves like an operator, not just a retriever.

The first slice is based on three high-value user needs:

- ASRS sprinkler design RAG: "What is the most time-consuming part of designing the ASRS sprinkler systems based on meetings, emails, and messages?"
- Microsoft Office operator triage: "Can the Office agent retrieve and separate important items from noise?"
- Weekly intelligence: "Tell me the biggest insights, risks, or hurdles from the past week's meetings."

## Dataset File

- `langsmith-strategic-rag-v1.json`
- `source-basis.md`

The file is a JSON array of LangSmith examples. Each example has:

- `inputs.query`: the user prompt.
- `inputs.required_source_types`: the source families the assistant should retrieve or explicitly attempt.
- `outputs.expected_behavior`: observable strategic behaviors.
- `outputs.anti_patterns`: answer shapes that should fail even if they sound polished.
- `outputs.judge_dimensions`: dimension-level scoring anchors for an LLM judge.
- `metadata.category`: the eval family.
- `metadata.priority`: initial importance.

## Why This Is Not A Normal Golden Answer Dataset

Strategic usefulness is not one exact answer. The point is to test whether the assistant:

1. Retrieves the right source families.
2. Filters signal from noise.
3. Synthesizes across sources.
4. Ranks by business impact.
5. Gives a concrete next action.
6. Names source gaps without hiding behind them.

That is why the expected output is behavior and rubric data, not a single reference paragraph.

## Suggested LangSmith Upload

```bash
langsmith dataset upload docs/ai-plan/evals/strategic-operator/langsmith-strategic-rag-v1.json \
  --name "Strategic Operator Eval v1" \
  --api-key "$LANGSMITH_API_KEY"
```

Check `.env` or the shell for `LANGSMITH_PROJECT` before running experiments so results land against the intended project.

## Judge Scoring

Use a 0-4 score per dimension:

- `4`: Strong strategic operator answer. Cross-source, ranked, evidence-aware, action-oriented.
- `3`: Useful answer with one meaningful gap.
- `2`: Partially useful but generic, weakly ranked, or thinly grounded.
- `1`: Surface-level answer that mostly restates retrieved facts.
- `0`: Wrong, fabricated, unsafe, or ignores the requested source/time scope.

Recommended pass condition:

- Average score >= 3.25.
- No `source_integrity` or `honesty` dimension below 3.
- No triggered anti-patterns.

## Repo Runner

Four of the seed prompts are also wired into the repo's existing assistant eval suite as `strategic-rag-operator-quality`.

Run locally:

```bash
npm run rag:verify:strategic-rag-operator-evals
```

Run against production:

```bash
npm run rag:verify:strategic-rag-operator-evals:prod
```

These checks are intentionally expensive because they use live assistant calls and LLM judging. Delegate them to a verification worker when running as part of a larger implementation task.

## Next Calibration Pass

This seed dataset should be calibrated against real traces. The first review pass should check:

- Whether ASRS sprinkler wording matches the actual project/source language.
- Whether Microsoft Office source labels match the active specialist/tool trace names.
- Whether time-window phrasing maps cleanly to current retrieval filters.
- Whether any examples should become factual golden cases with source IDs, meeting IDs, message IDs, or email thread IDs.
