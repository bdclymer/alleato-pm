# Goal 1 - Net Policy Closeout

## Outcome

C2 net-policy hardening is fully published to `origin/main`: the OpenClaw-derived SSRF egress and URL secret-redaction guard is committed, pushed, and verified without carrying unrelated repo dirt.

## Current Status

The research checklist says the C2 code slice is implemented and targeted tests passed, but closeout is incomplete. Treat this goal as a finish-and-publish goal, not a fresh design task.

Remaining checklist from `_bmad-output/planning-artifacts/research/tasks.md`:

- Clear or isolate the pre-existing typecheck errors blocking the quality gate.
- Commit type-error fixes separately if they are unrelated to C2.
- Commit C2 to `main`.
- Push to `origin/main`.

## Source Material

COPY source:

- `openclaw/packages/net-policy/src/ip.ts`
- `openclaw/packages/net-policy/src/ipv4.ts`
- `openclaw/packages/net-policy/src/redact-sensitive-url.ts`
- `openclaw/packages/net-policy/src/url-userinfo.ts`
- `openclaw/packages/net-policy/src/*.test.ts`

Alleato target/current files:

- `frontend/src/lib/net-policy/`
- `frontend/src/lib/fetch-with-guardrails.ts`
- `frontend/src/lib/__tests__/fetch-with-guardrails-egress.test.ts`
- `frontend/package.json`
- `frontend/pnpm-lock.yaml` or the active lockfile used by this workspace

## Acceptance Criteria

- All copied OpenClaw-derived files have MIT attribution headers.
- `fetchWithGuardrails` checks outbound URLs before request execution.
- Private, loopback, link-local, reserved, IPv4-mapped IPv6, octal/hex localhost, and cloud metadata addresses are blocked by default.
- Intentional private-host callers require an explicit escape hatch.
- Blocked URL errors are `GuardrailError` or equivalent specific errors, not generic failures.
- Any logged, traced, or returned blocked URL is redacted for userinfo and sensitive query params.
- Existing intentional public fetches keep working.
- No wholesale `openclaw/` or `hermes-agent/` clone files are staged.

## Failure-Loudly Behavior

- Unsafe egress attempts throw a specific guardrail error before network I/O.
- Error metadata includes a redacted URL and a reason category.
- Tests fail on new bypass encodings or unredacted secret-bearing URLs.

## Verification

Main-thread targeted checks:

- Run the net-policy unit tests.
- Run the `fetch-with-guardrails` egress integration test.
- Inspect `git diff --stat` and `git status --short` to ensure only task-owned files are staged.

Delegated verification:

- `npm run quality` from the appropriate package/root.
- Any broader build or predeploy gate only if C2 touches shared runtime behavior beyond the listed files.

Publish:

```bash
npm run codex:finish -- --message "Add guarded outbound URL egress policy" --files <exact C2 files>
```

## Done Evidence Required

- Targeted test command and result.
- Delegated quality report.
- `codex:finish` result showing commit, push, and `HEAD == origin/main`.
- If unrelated type errors remain, exact command, concise error lines, owner files, and whether unrelated repo debt.

## Recommended Next Prompt

Finish Goal 1 from `docs/ai-plan/hermes-openclaw-goals/goal-01-net-policy-closeout.md`. Use the local `openclaw/` clone as source reference if needed, do not commit the clone, create/link the required task markdown and Linear issue before code changes, run targeted net-policy tests, delegate quality verification, then publish through `codex:finish`.
