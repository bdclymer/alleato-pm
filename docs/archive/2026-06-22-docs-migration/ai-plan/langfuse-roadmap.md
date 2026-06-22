# Langfuse Roadmap — alleato-ai

Living checklist for what we use in Langfuse (project `alleato-ai`, us.cloud) and what
to build next. Grounded in the Langfuse product surface (llms.txt, 2026-06-10).

**Credentials:** `.env` → `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_HOST=https://us.cloud.langfuse.com`.
**CLI:** `npx langfuse-cli api <resource> <action>`. **MCP:** added (local scope) — tools load on next Claude Code restart.

---

## Status legend
✅ live · 🟡 partial / in progress · ❌ not set up

## Tier 0 — Foundation (live)
| Feature | Status | Notes |
|---|---|---|
| Tracing / observations / sessions | ✅ | 806+ `ai-assistant-chat` traces, 776 sessions |
| Token & cost tracking | ✅ | 169 custom model prices configured |
| Releases / versioning | 🟡 | traces carry `release` = git SHA; no formal release dashboards |
| **Online scores** `response_quality`/`answered`/`tool_failure` | ✅ | shipped 2026-06-10 (`score-response-quality.ts` → `langfuse-trace.ts`), no extra LLM cost |
| **Eval dataset** `assistant-eval-suite` (142 cases) | ✅ | synced via `npm run langfuse:sync-dataset` (idempotent) |

## Tier 1 — Highest impact (do next)
| Feature | Status | Benefit | alleato-ai use case |
|---|---|---|---|
| **LLM-as-a-Judge (online evals)** | ❌ (1 rule "Conciseness" produces 0 scores — broken) | Semantic quality heuristics can't see (hallucination, off-topic, ungroundedness) | Groundedness judge flags unsupported citations; relevance judge catches the source-health-hijack class semantically. Sample 10–20% for cost. |
| **Dataset Experiments + CI/CD gate** | ❌ | Regression detection before deploy; run-to-run diffs | Run the 142-case suite as a Langfuse experiment; gate PRs with `langfuse/experiment-action` so the routing fixes (hijack, web-search) stay guarded |
| **User feedback scores** (thumbs/ratings) | ✅ (2026-06-10) | Cheapest, most trustworthy label | Existing chat thumbs now also write a `user_feedback` score on the trace via `scoreUserFeedback()` (handler persists `langfuse_trace_id` → feedback route looks it up) |
| **Code-owned LLM judge** (`llm_relevance`/`specificity`/`completeness`) | ✅ off by default | Semantic quality the heuristics miss | `LANGFUSE_LLM_JUDGE_ENABLED=true` + sample rate to enable |
| **PII masking** (emails/SSN/card/phone) | ✅ (2026-06-10) | Privacy — real emails/contacts sent to 3rd-party cloud | masked on both OTel + v3 egress paths; financials deliberately preserved |

## Tier 1.5 — Privacy (don't skip)
| Feature | Status | Why it matters here |
|---|---|---|
| **PII / data masking** | ❌ | Traces include **Brandon's Outlook email content** and **financial data** (AR aging, vendor spend) sent to a 3rd-party cloud. Mask emails/amounts/names, or self-host. |

## Tier 2 — High value
| Feature | Status | Benefit | Use case |
|---|---|---|---|
| **Prompt management** | ❌ (prompts hardcoded in `strategist.ts`, `system-prompt.ts`) | Version, A/B test, edit without deploy, link prompt-version → quality | Tune routing prompts and watch `answered` move per version; instant rollback |
| **Custom dashboards + Metrics API** | ❌ | Exec visibility; early regression spotting | "answered-rate by intent", "cost per session", "assistantSourceHealth firing spike" (would've shown the hijack) |
| **Alerting / webhooks (spend + quality → Slack/Teams)** | ❌ | The "catch-post-deploy" guardrail (matches CLAUDE.md) | Alert when answered-rate drops post-deploy or daily LLM spend spikes |

## Tier 3 — Workflow & depth
| Feature | Status | Use case |
|---|---|---|
| Annotation queues + comments/corrections | ❌ | Weekly human triage of `deflected` traces → golden set + judge calibration |
| Playground | ❌ | Replay a bad trace against a tweaked prompt/model to debug before shipping |
| Environments | 🟡 (all `default`) | Split `production`/`eval`/`experiment` so eval traffic stops polluting prod metrics |
| Agent graphs | ❌ | Visualize the deep-agent 11-sub-reader fan-out / "absorption" pattern |

## Tier 4 — Governance / scale (later)
| Feature | Use case |
|---|---|
| Sampling | Cost control on traces/judges as volume grows |
| Data retention / deletion | Compliance lifecycle for email/financial trace data |
| RBAC / SSO / SCIM / audit logs | Team access control |
| Self-hosting | Ultimate answer to the PII concern — keep email/financial traces in-house |

---

## Recommended sequence
1. Fix + add LLM judges (semantic quality on real traffic) ← biggest lever
2. Experiments + CI gate (lock in the regressions already fixed)
3. User-feedback thumbs (ground truth)
4. PII masking (real emails/financials → 3rd-party cloud)
5. Prompt management → dashboards → alerting

## Known issues
- **"Conciseness" online eval rule: 0 scores since 2026-05-12** — filter targets `type=GENERATION`; not producing output. Diagnose/replace before adding new judges.
- All traces use `environment=default` — eval-runner (prod) traffic mixes into production metrics.
