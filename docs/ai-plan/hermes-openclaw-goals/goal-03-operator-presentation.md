# Goal 3 - Operator Presentation

## Outcome

Alleato has a portable operator message envelope that can render approval/action prompts into Teams Adaptive Cards now and future Outlook or Slack surfaces later without duplicating channel-specific payload logic.

## Source Material

ADAPT source:

- `openclaw/src/interactive/payload.ts`
- `openclaw/src/interactive/payload.test.ts`
- `openclaw/src/channels/plugins/message-capabilities.ts`
- `openclaw/src/channels/plugins/message-action-names.ts`
- `openclaw/src/channels/plugins/types.adapters.ts`

Alleato target/current files:

- `frontend/src/lib/ai/operator/presentation.ts` (new)
- Existing Teams Adaptive Card builder/sender modules, discovered before implementation.

## Acceptance Criteria

- `OperatorMessage` is Alleato-native and includes `operatorId`, `approvalId`, title/body, actions, priority, and channel capability metadata.
- Validation uses Zod, not OpenClaw's typebox approach.
- Teams rendering produces a deterministic Adaptive Card payload.
- Unsupported affordances are dropped with inspectable metadata, not generic errors.
- The model is additive at first; existing Teams delivery keeps working until migrated.

## Failure-Loudly Behavior

- Invalid operator payloads fail validation with field-level errors.
- Channel capability drops are recorded in metadata so missing buttons are explainable.
- Snapshot tests catch accidental payload shape changes.

## Verification

Main-thread targeted checks:

- Unit tests for Zod validation.
- Snapshot tests for Teams Adaptive Card rendering.
- Tests for unsupported affordance handling.

Delegated verification:

- `npm run quality`

## Archive/Deletion Rule

Do not delete existing Teams card builders in this goal unless the new presentation adapter fully owns their current behavior with tests. Later channel-specific payload builders can be retired one by one.
