# GPT-5.5 vs GPT-5.4-mini Comparison

Use this pack before re-enabling scheduled model work. It supports two modes:

1. Manual Playground review: copy a case's `system`, `user`, and `sourceContext` into the OpenAI Playground and run both models.
2. API runner: run the same cases through `npm run eval:compare-models` and review the generated JSON/Markdown artifacts.

## Commands

```bash
npm run eval:compare-models -- --dry-run
npm run eval:compare-models
npm run eval:compare-models -- --case executive-assistant-inbox-triage
npm run eval:compare-models -- --models gpt-5.5,gpt-5.4-mini
```

The runner prefers `AI_GATEWAY_API_KEY` and `https://ai-gateway.vercel.sh/v1`. It falls back to `OPENAI_API_KEY` only when no gateway key is configured.

Outputs are written under:

```text
docs/ai-plan/evals/model-comparison/runs/<timestamp>/
```

## Review Rubric

Score each model pass/fail against the weighted rubric in `prompt-pack.json`:

- Correct facts from source: 40
- Finds risks, decisions, owners, and next actions: 25
- Avoids unsupported claims: 20
- Clear Brandon-ready formatting: 10
- Latency and cost are acceptable for the job: 5

Prefer pass/fail notes over vague averages. If `gpt-5.4-mini` misses a decision, owner, or risk that `gpt-5.5` catches, record the exact missing item. If `gpt-5.5` is only wordier, keep the cheaper model.

## Re-enable Rule

Do not re-enable scheduled Executive Assistant or source-intelligence crons from this comparison alone. Re-enable only after:

- The model choice is explicit in Render env.
- The scheduled path has a daily budget guard.
- The path fails loudly on quota/provider errors.
- The selected model passes enough real redacted cases for the job it owns.
