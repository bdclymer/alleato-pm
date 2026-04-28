# Alleato AI — Persona, Memory & Profiles

> Two layers worth keeping separate:
>
> 1. **Persona** — how the AI sounds. Same for every user. System prompt.
> 2. **Memory** — what the AI knows about *this* user. Per-user context.
>
> Mixing them is the most common failure mode. Persona never bends per user.
> Memory never overrides persona's voice.

This document complements the existing `frontend/src/lib/ai/soul.ts` and
`frontend/src/lib/ai/identity.ts` — those define the foundation; this layers
in user memory and per-tester calibration.

---

## Layer 1 — Persona additions for the system prompt

The current `rag-assistant-prompt.ts` builds a strong persona via `soul` +
`identity`. This adds two things missing today:

### 1a. The "I don't know" reflex (mandatory)

Add to the system prompt, near the top of the response philosophy section:

```
THE "I DON'T KNOW" REFLEX (MANDATORY)
If a question is outside the knowledge base or requires data you don't
have access to, do NOT guess. Say something like:

  "I don't have that yet. Want to flag it as feedback so we add it?"

Then offer to log it as a Confusion-tagged feedback item.

A wrong answer about platform behavior, construction practice, or
project data breaks more trust than a missing one. This rule overrides
the "be opinionated" guidance for any factual question outside your
known data.
```

### 1b. Per-user calibration block

Inject *after* `identity`, *before* operational instructions:

```
USER CONTEXT
You are speaking with: {{display_name}} ({{role}} at {{company}}).
Communication style: {{communication_style}}
Pet topics: {{pet_topics}}
Notes: {{context_notes}}

Calibrate to this user. Match their style. Pick examples that resonate
with their interests when natural. Never volunteer the notes back at
them — use them as background.
```

If the user has no profile yet, omit this block entirely. Do not invent.

---

## Layer 2 — Memory architecture

Three retrieval surfaces, each with a different lifetime:

### 2a. User Profile (persistent, manually edited)

Things the team knows about a user that the AI can't infer from chat.
Structured fields plus a free-text `context_notes` field.

**Schema (Supabase):**

```sql
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- Professional
  display_name text,
  role text,
  company text,
  years_in_industry int,
  primary_specialty text,
  current_project_ids uuid[],

  -- Personal context (the wow — fill manually)
  context_notes text,
  communication_style text,
  pet_topics text[],

  -- Inferred (auto-populated from conversation memory)
  recent_focus_areas text[],
  recurring_pain_points text[],

  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

alter table public.user_profiles enable row level security;

-- Users can read their own profile
create policy "user_profiles_self_read"
  on public.user_profiles for select
  using (user_id = auth.uid());

-- Admins can read/write all profiles
create policy "user_profiles_admin_all"
  on public.user_profiles for all
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );
```

**Injection format (in the system prompt):**

```
<user_profile>
Name: Brandon Collier
Role: Project Manager at Alleato Group
Years in industry: 15
Current projects: Tampa Restaurant
Communication style: Dry, sarcastic — match it. Skip pleasantries.
Pet topics: [whatever's listed]
Notes: [context_notes]
</user_profile>
```

### 2b. Conversation Memory (persistent, auto-extracted)

After each conversation, run a small extraction job to pull durable facts
into a memory table:

```sql
create table public.conversation_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  fact text not null,
  category text check (category in ('preference','context','project','relationship')),
  source_conversation_id uuid,
  confidence float,
  created_at timestamptz default now(),
  superseded_by uuid references public.conversation_memory(id)
);

create index idx_conversation_memory_user on public.conversation_memory(user_id, created_at desc);

alter table public.conversation_memory enable row level security;

create policy "conversation_memory_self_read"
  on public.conversation_memory for select
  using (user_id = auth.uid());
```

At query time, retrieve top-k by embedding similarity to the current
question, plus the most recent N regardless of relevance.

**Extraction prompt** (run after each conversation, async):

```
You are a memory extractor for Alleato AI. Read this conversation and
extract durable facts about the user that would be useful in future
conversations.

ONLY extract:
- Stable preferences ("prefers email over Slack")
- Project context ("manages the Tampa restaurant build")
- Relationship context ("works closely with [person]")
- Domain expertise signals ("specializes in cold storage ASRS")

DO NOT extract:
- Transient state ("currently asking about RFI #47")
- Things already in the user profile
- Speculation without strong support

Return JSON: { "facts": [{ "fact": "...", "category": "...", "confidence": 0.x }] }
If nothing durable was learned, return { "facts": [] }.
```

### 2c. RAG-retrieved KB & data (per-query)

The actual platform data is retrieved via the existing RAG pipeline. This
is separate from "memory" — don't conflate the two.

---

## Putting it together: full system prompt assembly

```
[soul.ts content]
+
[identity.ts content]
+
[USER CONTEXT block — Layer 1b, fetched per user]
+
[KB EXCERPTS — top-k from AI_KNOWLEDGE_BASE.md, retrieved by query]
+
[REMEMBERED CONTEXT — Layer 2b, top-k by relevance + last N by recency]
+
[Operational instructions from rag-assistant-prompt.ts]
+
[RETRIEVED PROJECT DATA — RAG over project/meeting/submittal data]
+
[USER MESSAGE]
```

---

## Sample profile — Brandon Collier

```yaml
display_name: Brandon Collier
role: Project Manager
company: Alleato Group
years_in_industry: # FILL — Megan's call
primary_specialty: # FILL — ASRS? Restaurant builds? Both?
current_projects:
  - Tampa Restaurant / Bar (design-build)

communication_style: |
  Dry, sarcastic. Direct. Doesn't suffer fluff. Treat him as a peer with
  more construction experience than the AI. When he pushes back, he's
  usually right about the construction part. He's been part of the
  testing process from early on, so he's used to the platform's rough
  edges.

pet_topics:
  # FILL — Megan, what does Brandon talk about outside work?
  -
  -

context_notes: |
  Has worked closely with Megan on the Tampa restaurant build, which is
  the platform's seed dataset. Familiar with how the AI surfaces work.
  Will be a power user — calibrate to that. He's the construction-domain
  authority for the platform; defer to him on industry practice.

  When he flags something as broken, he's usually identified a real
  workflow gap, not a misunderstanding. Take it seriously.
```

---

## Sample profile — Jesse Lou (template)

```yaml
display_name: Jesse Lou
role: # FILL — PM? Owner? Superintendent? Subcontractor?
company: # FILL
years_in_industry: # FILL
primary_specialty: # FILL
current_projects:
  - # FILL

communication_style: |
  Dry, sarcastic — same wavelength as Brandon. Match it. Skip "Great
  question!" or any chipper preamble. He'll see right through it.

pet_topics:
  - fishing  # ← Megan flagged this
  - # FILL — what else?

context_notes: |
  # FILL — Megan, write a paragraph here about Jesse. What's his
  # background? What does he care about outside the job? What's he
  # opinionated on? Any relationships with other testers? Anything that
  # would make a sharp colleague feel like they actually know him?
```

---

## Admin UI

A screen at `/admin/users/[id]` where Megan can edit profiles directly.
Three tabs:

1. **Profile** — structured fields above
2. **Memory** — view/edit/delete extracted facts (audit + privacy)
3. **Activity** — recent questions, "I don't know" rate, KB gaps

The admin profile editor is the lowest-effort, highest-payoff piece of the
whole memory system. Build that first.

---

## Operational principles

1. **The persona never bends per user.** Even if a user is curt or rude,
   the AI stays the AI. Tone shortens; voice doesn't change.
2. **Memory degrades gracefully.** If memory retrieval fails, the AI still
   works — it sounds slightly more generic. Never block a query on memory.
3. **Privacy is per-user by default.** A user's memory and profile are
   visible only to that user and to admins. Never leaked into another
   user's context.
4. **Profile edits are audited.** `updated_by` exists for a reason.
5. **Opt-out is non-negotiable.** Users can clear their conversation memory.
   The admin-edited profile is a separate matter.

---

The emotional target — excitement about possibility, time back, money,
legacy — is encoded in the **persona**, not memory. It shows up in *what*
the AI chooses to flag (time-saved counters, decisions worth preserving,
patterns that compound) and *how* it frames the stakes. Memory makes
delivery feel personal. Persona makes it feel real.
