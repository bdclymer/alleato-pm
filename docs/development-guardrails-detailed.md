# Development Guardrail System (Full List)

## Mandatory Rules

**Rule 1:** Do not ship silent failures.
**Rule 2:** Do not return generic errors.
**Rule 3:** Do not fix a recurring bug without adding a guardrail.
**Rule 4:** Do not introduce one-off handling when a shared abstraction is warranted.
**Rule 5:** For every failure, explain cause, detection gap, and prevention step.
**Rule 6:** Before closing any task, ask: “How does this fail loudly?”
**Rule 7:** Before closing any bug, ask: “What makes this never happen again?”

> Do not give me another isolated fix. Standardize this at the system level. Add shared error handling, structured logging, actionable notifications, a regression test, and the appropriate pre-deploy or post-deploy guardrail. Also tell me what would have caught this before I did.

### Every issue falls into one of these buckets:

* **Should have been prevented** → add validation / constraints
* **Should have been caught pre-deploy** → add tests / CI
* **Should have been caught post-deploy** → add monitoring

### “What would have caught this before I did?”

- If the answer is “a test,” write the test.
- If the answer is “a deploy check,” add the deploy check.
- If the answer is “monitoring,” add the monitor.
- If the answer is “a process step,” automate it if possible.

### Any bug found twice is now a system failure, not an individual mistake.

1. **Catalog repeat failures**
   Keep a simple list of recurring bug types: broken endpoints, missing fields, auth failures, bad status codes, broken integrations, etc.

2. **Convert each repeat failure into an automated guardrail**
   Every escaped bug should leave behind a scar in the codebase: a test, a monitor, a lint rule, a schema check, a contract check.

3. **Make quality gates automatic**
   Don’t “remember to test.” Make deploys and merges prove they’re safe enough.

### Feedback Loop

When something breaks:

* detect it
* fix it
* **add a guardrail so it never happens again**

### Insturctions for every failure:

> “Fix this bug AND add a guardrail so this class of issue cannot happen again. Include tests, monitoring, or validation as appropriate.”

> “What would have caught this before it reached me? Implement that.”

## Tests

### 🔥 Core Reliability & Error Handling

1. Universal error handling wrapper
2. Structured logging everywhere
3. Real error notifications (fail loudly)
4. Correlation IDs and traceability
5. Standardized error response format (human + machine readable)
6. Central error catalog (common failure types + codes)

### 🧪 Testing & Verification

7. Endpoint smoke test suite
8. Regression test for every escaped bug
9. Automated test suite (unit + integration baseline)
10. API contract validation (response shape enforcement)
11. Post-deploy verification checks
12. Pre-deploy quality gate (tests, build, typecheck must pass)

### 🧠 Prevention & System Learning

13. Mandatory “what would have caught this earlier?” step
14. Bug fix completion rule (must include a guardrail)
15. Pattern-level fixes for repeated issues (no local band-aids)
16. Shared utility layer for repeated logic (no duplication)

### 📡 Monitoring & Observability

17. Monitoring for error rates, latency, and failures
18. Alert thresholds and severity levels (critical, high, medium, low)
19. Background job instrumentation (logs, retries, failures, alerts)
20. External service health monitoring

### 🔌 Integrations & Resilience

21. External dependency wrappers (retry, timeout, error normalization)
22. Timeout and retry standards (defined globally)
23. Circuit breaker or fail-fast patterns where appropriate

### 🧾 Data & Input Safety

24. Standardized input validation (types, required fields, ranges)
25. Output validation (ensure correct structure before returning)
26. Schema enforcement (shared types / contracts as source of truth)

### ⚙️ Environment & Configuration Safety

27. Environment/config validation at startup
28. Required env var enforcement (fail fast if missing)
29. Safe defaults and config sanity checks

### 🟦 TypeScript Discipline (Stop the Madness Layer)

30. Typecheck required on every change (no exceptions)
31. No unresolved TypeScript errors allowed
32. Centralized shared types (single source of truth)
33. No `any`, `@ts-ignore`, or unsafe assertions without justification
34. Pattern-level fixes for recurring type issues
35. Strong typing for API clients and responses

### 🎨 Design System Enforcement (Stop the Chaos Layer)

36. Mandatory reuse of existing design-system components
37. No custom UI if an approved component exists
38. Design tokens only (no hardcoded styles)
39. Approved UI pattern library (forms, tables, modals, etc.)
40. Design-system compliance check for every UI change
41. Visual verification (screenshots or review) for UI tasks

### 🧱 Workflow & Process Rules

42. Every task must pass: build, lint, test, typecheck
43. No silent failures allowed anywhere
44. No generic error messages (“something failed”)
45. No one-off implementations when a shared solution is appropriate
46. Every failure must include cause, detection gap, and prevention step
47. Every repeated issue must trigger system-level improvement

### ⚡ If you had to enforce ONLY the highest impact ones first

1. Universal error handling wrapper
2. Structured logging + correlation IDs
3. Real alerts (fail loudly)
4. Typecheck enforcement (no errors allowed)
5. Endpoint smoke tests
6. Regression test rule
7. Design system enforcement (reuse + tokens)

### 🧠 One-line philosophy to anchor everything

> If a system allows the same mistake twice, it is designed to fail.

**If a thing breaks often, stop relying on humans to notice it.**
Turn it into a check.
Run the check automatically.
Fail loudly.

**Auditing** finds defects after the fact.
**Debugging** explains defects after they happen.
**Prevention** adds constraints and automated checks so the defect class becomes harder to create.
**Proactive engineering** watches for drift before users feel it.

That usually means a stack like:

* automated endpoint smoke tests
* regression tests for every bug that escaped once
* pre-merge checks in CI
* post-deploy verification
* alerts on failures and degraded behavior
* ownership for fixing root causes, not just symptoms
* a short “how did this get through?” review after repeats

# 🧱 The “Bare Minimum” Stack (your no-BS checklist)

## 1. 🔁 Endpoint Smoke Test (your exact example)

> “Run all endpoints and see if anything fails”

**Should exist:**

* Script hits every API endpoint
* Verifies status codes (200, 401, etc.)
* Runs:

  * on every deploy
  * optionally on a schedule

**If missing → immediate red flag**

## 2. 🧪 Regression Tests for Every Bug

Rule of the universe:

> A bug that happened once should be immortalized as a test.

If an endpoint broke 10 times, there should be **10 tests guarding that behavior now**.

If not, the system has no memory. It’s basically goldfish engineering 🐠

## 3. 🚦 CI/CD Quality Gates

Before code goes live, something should be asking:

> “Prove you didn’t break things.”

**Minimum checks:**

* tests pass
* endpoints respond
* no obvious errors

If AI agents are “deploying” without this, they are skipping the immune system.

## 4. 📡 Monitoring + Alerts (“Fail loudly” in production)

Even with tests, things slip.

So production should scream when something breaks:

* endpoint failure rate spikes
* errors increase
* latency explodes

If you only find bugs manually, you are the monitoring system. That’s… not scalable 😄

## 5. 🔍 Post-Deploy Verification

After deployment:

> “Did reality match expectations?”

This is like a final roll call:

* are endpoints alive?
* is the app responding?
* are key flows working?

## 6. 🧩 Contract Testing (this is a big one people miss)

This checks:

> “Did we accidentally change what this API returns?”

Even if the endpoint *works*, the **shape of the response** might break everything downstream.

This is how “it works on my end” bugs sneak in.

## 7. 🧠 Feedback Loop (the missing soul)

When something breaks:

* detect it
* fix it
* **add a guardrail so it never happens again**

# 🧰 How you can steer them (this is your power move)

> “Fix this bug AND add a guardrail so this class of issue cannot happen again. Include tests, monitoring, or validation as appropriate.”

> “What would have caught this before it reached me? Implement that.”


## Implement immediately

### 1. Universal error handling wrapper

This is the one you just described, and yes, it should already exist. Every API route, background job, workflow step, and external integration call should go through a shared wrapper that:

* catches errors consistently
* logs the full context
* returns a structured error object
* includes a human-readable reason
* includes a machine-readable code
* includes correlation/request ID
* triggers notification when severity warrants it

Without this, every failure becomes a scavenger hunt in a haunted corn maze. Minimum output shape:

* `success: false`
* `error_code`
* `error_message`
* `where_it_failed`
* `request_id`
* `timestamp`
* optional `details`

### 2. Structured logging everywhere

No more “failed” and vibes. Every major action should log:

* what started
* what succeeded
* what failed
* input identifiers, not sensitive raw data
* timing
* dependency used
* request or trace ID

This is the difference between:
“something broke”
and
“POST /api/orders failed because upstream auth token expired at 2:14 PM for tenant X.”

### 3. Real error notifications

If something important breaks, the system should yell. Set alerts for:

* failed API requests above threshold
* repeated exceptions
* job failures
* external integration failures
* auth failures
* deploy failures
* sudden spike in 4xx/5xx
* schema/contract mismatches

And the alert should include useful context, not “Task failed. Good luck.”

### 4. Endpoint smoke test suite

Yes, run all endpoints in one batch. At minimum:

* call every critical endpoint
* verify expected status code
* verify basic response shape
* verify auth-protected endpoints fail correctly when unauthorized
* run on deploy
* run on schedule

This catches the “how did nobody notice this endpoint is dead again” species of bug.

### 5. Regression test for every escaped bug

This needs to become law. Any bug that made it to you should leave behind a permanent guardrail:

* unit test
* integration test
* contract test
* smoke test
* validation rule
* monitor

If the bug is fixed but nothing was added to prevent recurrence, then it was not fully fixed.

### 6. Pre-deploy quality gate

Nothing ships unless basic checks pass. Minimum gate:

* lint/build passes
* tests pass
* endpoint smoke tests pass
* migrations validate
* env/config checks pass

No “looks good, deploy it.” The computer should decide whether basic safety conditions are met.

### 7. Post-deploy verification

After deploy, verify reality. Immediately check:

* app is up
* key endpoints respond
* background jobs still run
* core user flow works
* error rate did not spike

This catches the special little goblin where deployment succeeds but the product is quietly broken.

### 8. Standardized input validation

Bad input should fail early and clearly. Every entry point should validate:

* required fields
* types
* ranges
* enum values
* null/empty edge cases
* malformed payloads

And errors should say what was wrong. Not “processing failed.” That message belongs in a museum of bad decisions.

### 9. API contract validation

Working is not enough. The response shape has to stay stable.

Add checks for:

* required fields present
* field names unchanged
* types unchanged
* nested objects valid
* versioning respected

This prevents “endpoint returns 200 but broke the frontend anyway.”

### 10. External dependency wrappers

Anything touching third-party services should be wrapped consistently. That wrapper should handle:

* timeout
* retry policy
* backoff
* circuit breaking or fail-fast rules
* normalized error output
* fallback behavior where appropriate

Without this, every integration invents its own chaos dialect.

### 11. Timeout and retry standards

Every networked call should have explicit timeout behavior. Need a standard for:

* max timeout
* whether retries are allowed
* how many retries
* backoff pattern
* what errors are retryable
* what errors should fail immediately

### 12. Correlation IDs and traceability

Every request or workflow run should have an ID that follows it through logs, errors, and alerts.

That means when something fails, you can trace the entire path instead of reconstructing a crime scene from confetti.

### 13. Background job instrumentation

Jobs should not fail in the shadows. Every job needs:

* start log
* completion log
* failure log
* duration
* retry count
* dead-letter or failed queue visibility
* alerting on repeated failure

Silent job failures are productivity sinkholes with a nice disguise.

### 14. Standard failure messages for humans

Every failure surfaced to the operator should answer:

* what failed
* where it failed
* likely reason
* what to check next
* whether retry is safe

That alone can save absurd amounts of time.

### 15. Central error catalog

Create a shared list of recurring failures:

* auth expired
* missing env var
* invalid payload
* upstream timeout
* schema mismatch
* endpoint missing route binding
* DB migration mismatch

For each one, define:

* error code
* human explanation
* typical cause
* prevention rule
* alert severity

Now errors stop being folklore.

### 16. Mandatory “what would have caught this earlier?” step

Every time something breaks, require the agent to answer:

* what should have prevented this?
* what should have detected this sooner?
* what guardrail am I adding now?

### 17. Bug fix completion rule

A bug fix is not complete unless it includes at least one of these:

* test
* validation
* monitor
* alert
* wrapper improvement
* documentation of failure mode

### 18. Common utility layer for repeated patterns

Anything repeated three times should become shared infrastructure. Examples:

* error wrapper
* API response formatter
* validation helper
* retry helper
* logging helper
* auth check helper
* notification helper

### 19. Environment and config validation at startup

On startup, verify:

* required env vars exist
* secrets are present
* service URLs are valid
* ports/config formats are valid
* incompatible config combos are blocked

This avoids the classic farce where the app starts “fine” and only explodes when a user touches the one broken path.

### 20. A severity model

Not every issue deserves the same reaction. Define at least:

* critical: service broken, alert immediately
* high: major feature broken
* medium: degraded but usable
* low: minor issue, log only


## TypeScript errors

Most recurring TypeScript errors come from a pretty small zoo:

* wrong or missing prop types
* `undefined` / `null` handling
* mismatched API response shapes
* bad imports / exports
* inconsistent shared types
* optional fields treated as guaranteed
* union types not narrowed
* event handler typing mess
* “just use `any` and pray” fallout

### TypeScript rules

1. Every task must end with lint, build, and typecheck.
2. No unresolved TypeScript errors may remain.
3. No `any`, `as any`, `@ts-ignore`, random type assertions to silence errors or unsafe assertion without explicit justification.
4. Repeated type issues must trigger shared-type refactoring, not local patching.
5. API contracts and shared models must come from a single source of truth.
6. Add strict typing rules and keep them on
7. Centralize shared types: API payloads, domain models, component props, form data, and config types should not be re-invented in ten places like cursed fan fiction. There should be:

* one source of truth for shared types
* one source of truth for API contracts
* one source of truth for component prop interfaces where reusable

#### Must explain repeated type errors by category

Not just “fixed TypeScript errors.” They should report:

* root cause
* pattern category
* whether this suggests a shared type mismatch
* what reusable fix prevents recurrence

#### Create pattern-level fixes

If the same prop mismatch happens five times, stop patching five files and create:

* better shared interfaces
* typed helper functions
* wrapper utilities
* typed API client
* typed form schema
* stricter reusable components

### The questions your agent should be forced to answer every time

* What category of TypeScript issue was this?
* Why did it happen?
* What shared fix prevents this pattern from recurring?

## Design System

### Rule:

* check existing component library first
* reuse before creating
* no custom button/card/modal/input if sanctioned version exists

### Create a hard “design system compliance” check**

Every UI task should require the agent to answer:

* which existing components were reused?
* what tokens were used?
* what new patterns were introduced, and why were existing ones insufficient?

### Use design tokens only

Spacing, colors, typography, radius, shadows, breakpoints, states. All of it should come from tokens or theme variables. No:

* random hex colors
* arbitrary spacing
* made-up font sizes
* rogue border radii from the outer darkness

### Create a small approved pattern catalog**

Not just components, but patterns:

* form layout
* table actions
* cards
* modals
* empty states
* alerts
* tabs
* loading states
* error states

Agents are often terrible at “stylistic memory.” Give them a tray of approved shapes and say: pick from these.

### Add UI linting / review rules where possible

This can be literal or procedural:

* no inline styles unless approved
* no hardcoded colors
* no custom typography scales
* no new component variants without justification

### Require screenshot or visual comparison for UI tasks

If something affects UI, the task should not be “done” without a visual check.
Otherwise the agent can claim compliance while serving a Frankenstein canapé.

### Design-system rules

1. Reuse existing components before creating new ones.
2. Use only approved tokens for color, spacing, typography, radius, and states.
3. No custom UI patterns without justification.
4. Every UI change must declare which design-system components and tokens were used.
5. UI tasks require visual verification, not just “code complete.”

### The questions your agent should be forced to answer every time

* Which existing design-system components did you reuse?
* Which tokens did you use?
* What did you deliberately avoid inventing?
* How did you verify visual consistency?

### The practical translation

> Do not invent local fixes for systemic problems.
> Do not invent UI when the design system already provides patterns.
> Do not leave TypeScript errors unresolved.
> Do not silence errors instead of correcting the source.
> Do not create a new component, type, or styling pattern without checking whether one already exists.
> When a problem repeats, elevate the fix to shared infrastructure.

### Your agents need three cages:

**1. A compiler cage** If typecheck fails, they’re not done.

**2. A design-system cage** If they don’t use approved components/tokens, they’re not done.

**3. A systems-thinking cage** If they fix the symptom without adding prevention, they’re not done.