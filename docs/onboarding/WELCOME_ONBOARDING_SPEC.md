# Welcome Onboarding Spec

**Status:** Spec complete · Implementation pending
**Owner:** Megan
**Last updated:** 2026-04-27

---

## Purpose

Replace the current intercom-style onboarding widget on `AlleatoAiOnboarding.tsx` with a 4-step guided modal that:

1. Reframes testers as co-creators (not critics) before they hit any rough edges.
2. Delivers one undeniable AI wow moment grounded in their real meeting data.
3. Demonstrates the unified "Ask Alleato" widget (AI + feedback) so testers know help is one click away on every page.
4. Routes them into a single guided CTA — create a test project — instead of branching choices.

---

## The 4-Step Flow

### Step 1 — The Foundation
**Headline:** "You're not testing software. You're shaping it."

**Body (one paragraph, three sentences — do not expand):**
> Whatever you've ever wanted a platform like this to do — this is where it gets built. Some of what's here will feel rough. That's the point: you're seeing it in the bones, so what gets built next is what you actually need.

**Single panel — "The Tester Pact":**
Three checkbox items, pre-checked, in a single panel with an orange/primary left-accent border and muted background:

- I'll click Ask Alleato instead of guessing.
- I'll say specifically what's missing — especially for construction.
- I'll watch how fast things move when I speak up.

**Bottom strip:** Live momentum counters — `X fixes shipped this month · Y testers active · Z launches this week`.

**Why this structure (do not change without re-approval):** the original approved prototype had a single panel with three items. A two-column six-item grid was tested and rejected — it competes with the headline and crowds the layout. Sparse layout is what makes Step 1 ceremonial; bullets are not a feature, they're a tax. If new commitments are needed in the future, replace one of the three rather than add a fourth.

**Why this copy:** removes the negative-priming "frustrated" language. Removes any personal name attribution. Frames responsiveness as a platform commitment, with speed itself as the verifiable promise — a dare the dry/skeptical audience will respect.

---

### Step 2 — The Wow

**Eyebrow badge:** "What Procore can't do"
**Headline:** "Hey [Name]. I read your last 14 meetings."

**Body:** Three insight cards stream in (Pattern / Risk / Decision), pulled from real Fireflies transcripts via the RAG pipeline. Each card has:
- Color-coded category tag
- One-sentence insight
- Source meta ("4 projects · trending up", "Surfaced from transcripts", "Auto-extracted")

**Closer:** "This isn't a one-time demo. Your AI assistant lives in the bottom-right of every page — ask it anything, anytime."

**Data source:** `getOnboardingInsights(userId)` — pulls last 14 attended meetings, runs them through the RAG endpoint with a structured-output prompt, returns 3 insights. Cache 24h. Falls back to seeded Tampa-restaurant insights if user has zero attended meetings.

---

### Step 3 — One Widget, Two Superpowers

**Headline:** "One widget. Two superpowers."

**Body:** "The pill in the bottom-right travels with you on every page. Ask the AI anything, or send feedback when something's off."

**Live preview of the dual-tab widget** — testers can click between the two tabs:
- **Ask AI tab** (default, signals which is primary): example questions + input bar
- **Send feedback tab:** textarea + 3 tags (Bug · Idea · Confused)

**Why 3 feedback tags, not 2 or 4:** Three maps to distinct triage paths (broken / missing / unclear). Two collapses ideas with bugs. Four felt cluttered; "industry-specific" was a flag, not a category.

---

### Step 4 — Set Up Your First Test Project

**Eyebrow badge:** "Ready when you are"
**Headline:** "Set up your first test project."

**Body:** "Walk through it like a real project — create it, add a meeting, run an RFI. Note what feels off as you go. Tell us in the widget."

**Single primary CTA:** large dark button with orange accent badge — "Create your first test project / Takes about 90 seconds. Real workflow, real data."

**Helper card:** "**Stuck or confused?** Click **Ask Alleato** in the bottom-right corner. The AI knows your projects, your meetings, and how the platform works. Use it like a teammate."

**Footer note:** "At the end of today, you'll see how much time the AI saved you."

**On click:** close modal, persist completion in `localStorage`, fire `onCreateTestProject` callback that routes to project creation flow.

---

## Behavior

- **Self-gating:** modal opens once per user via `localStorage` key `alleato_onboarding_completed_v3`. Bumping the key forces re-show after major redesigns.
- **Force-open mode:** `?onboarding=1` query param or `forceOpen` prop — for demos.
- **Skip tour:** explicit skip button in footer marks complete (no half-finished tours).
- **Dot indicator:** active step is a wide orange pill, completed steps are small filled dots, future steps are small ghost dots.
- **Persistent pill:** the floating "Ask Alleato" button only renders once the modal is closed/dismissed, so testers see it land into their muscle memory at exactly the moment the modal teaches them about it.
- **Power-user shortcut:** `Cmd/Ctrl+I` opens the Ask Alleato panel from anywhere. Not surfaced visually — power-user discoverability only.

---

## Why these choices over what existed

The current `AlleatoAiOnboarding.tsx` is intercom-style chat that scrolls. Two problems:
1. Long copy gets dismissed by busy testers in <5 seconds.
2. It doesn't reframe the tester's role before exposing them to bugs.

The 4-step modal trades length for ceremony. It earns 90 seconds of attention by being a clear, finite ritual — and it explicitly performs the reframe (Step 1) before any wow attempt (Step 2). Sequence matters.

---

## Related docs

- `docs/ai-plan/AI_PERSONA_AND_MEMORY.md` — system prompt, memory architecture, sample profiles
- `docs/ai-plan/AI_KNOWLEDGE_BASE.md` — Q&A corpus to ground the assistant
- `docs/codex/codex-tasks/CODEX-TASK-WELCOME-ONBOARDING.md` — implementation task
- `docs/codex/codex-tasks/CODEX-TASK-ASK-ALLEATO-WIDGET.md` — widget unification task
- `docs/codex/codex-tasks/CODEX-TASK-USER-PROFILES-MEMORY.md` — memory infra task
- `docs/codex/codex-tasks/CODEX-TASK-AI-KNOWLEDGE-BASE.md` — KB wiring task

---

## Reference component code

A complete reference implementation is at:
`docs/onboarding/WelcomeOnboarding.reference.tsx`

Codex should treat this as a starting point and adapt to existing project conventions (auth, telemetry, Supabase wiring, existing `AlleatoAiOnboarding.tsx` patterns). Do not blindly copy the reference — it does not know about your auth fixtures, profile hooks, or feedback widget conventions.
