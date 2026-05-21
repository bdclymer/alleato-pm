# Microsoft Operator Feature — Architecture Reference

**Last verified: 2026-05-21**

Read this before touching anything related to Outlook drafts, Teams messages, Brandon's mailbox, or the approval/confirmation gate on write tools. This document answers every question that would otherwise require re-reading 3,700 lines of `action-tools.ts`.

---

## What this feature is

The Microsoft Operator feature lets the AI assistant act on behalf of Brandon (the company owner/operator) inside Microsoft 365. Today it covers two channels:

1. **Outlook** — create reply drafts and new message drafts in Brandon's mailbox via Microsoft Graph
2. **Teams** — send proactive direct messages to internal team members via the Archon bot

The feature is intentionally **write-cautious**. The AI never sends email — it creates drafts that Brandon reviews and sends himself from Outlook. Teams messages have a confirmation gate.

---

## Current tool inventory

Both tools live in:
```
frontend/src/lib/ai/tools/action-tools.ts
```

### `draftOutlookEmail` (line 3378)

**What it does:** Creates a draft in Outlook via Microsoft Graph. The draft lands in Brandon's Drafts folder. The AI never sends the email — sending is left to the human.

**Key inputs:**
| Field | Type | Notes |
|---|---|---|
| `mailboxUserId` | `string?` | Graph user ID or email. Falls back to `OUTLOOK_MAIL_USER` env var via `resolveOutlookMailboxUserId()` |
| `replyToGraphMessageId` | `string?` | When set, creates a reply draft to that message. When absent, creates a new message draft |
| `subject` | `string` | Draft subject |
| `body` | `string` | Draft body — written in Brandon's voice |
| `toRecipients` | `OutlookMailRecipient[]` | Recipients. For replies, can be inferred from original message |
| `ccRecipients` / `bccRecipients` | `OutlookMailRecipient[]?` | Optional |
| `importance` | `"low" \| "normal" \| "high"` | Default `"normal"` |
| `projectId` | `number?` | Associates draft with a project for audit |
| `confirmed` | `boolean` | Default `false`. Set to `true` only after user confirms the preview |

**Two-step flow:**
1. AI calls with `confirmed: false` → tool returns a preview with an adaptive card and `"Reply **confirm** to save it to Outlook drafts."` — nothing is created in Outlook
2. User types "confirm" → AI calls again with `confirmed: true` → `createOutlookMailDraft()` is called → draft appears in Outlook Drafts folder

**Brandon voice:** The tool description instructs the model to apply Brandon's communication profile docs before composing:
- `docs/ai-plan/brandon-email-voice-profile.md` — tone and voice
- `docs/ai-plan/brandon-operating-profile.md` — owner/operator judgment
- `docs/ai-plan/brandon-email-drafting-playbook.md` — reply patterns

**Graph library:** `frontend/src/lib/microsoft-graph/mail.ts` — `createOutlookMailDraft()`, `resolveOutlookMailboxUserId()`

**No `sendOutlookEmail` tool exists.** This is intentional. Email send is out of scope for AI action. The human sends from Outlook. Any future addition of a send tool must include a hard approval gate (see [Planned work](#planned-work) below).

---

### `sendTeamsMessage` (line 3580)

**What it does:** Sends a proactive DM to an internal team member via the Archon bot. The recipient must have previously messaged the Archon bot to establish a conversation reference.

**Key inputs:**
| Field | Type | Notes |
|---|---|---|
| `recipientName` | `string` | Full name or first name. Resolved against `people` table |
| `recipientEmail` | `string?` | Optional — speeds up lookup |
| `message` | `string` | Message text |
| `confirmed` | `boolean` | Default `false`. Preview gate |

**Two-step flow (same pattern as email draft):**
1. AI calls with `confirmed: false` → returns a preview showing recipient + message, asks user to reply "confirm"
2. User confirms → AI calls with `confirmed: true` → `sendProactiveMessage(supabaseUserId, message)` fires

**Recipient resolution chain:**
1. Query `people` table by name/email
2. Cross-reference `user_profiles` to get Supabase user ID
3. Check `teams_conversation_refs` — if no ref, recipient hasn't linked their Teams account and the message cannot be sent

**Delivery:** `frontend/src/lib/bot/teams-chat.ts` → `sendProactiveMessage()`

---

## The approval/confirmation mechanism

All write tools in this codebase use the same two-layer pattern:

### Layer 1 — AI SDK `needsApproval`

```ts
needsApproval: needsConfirmedWriteApproval,
```

Where:

```ts
function needsConfirmedWriteApproval(input: { confirmed?: boolean }): boolean {
  return input.confirmed === true;  // line 427
}
```

This is the Vercel AI SDK v6 `needsApproval` hook. The SDK calls this function before executing the tool. If it returns `true`, the SDK marks the tool call as "approved/confirmed" for its internal state tracking.

### Layer 2 — Runtime gate inside `execute`

Every write tool checks `confirmed` at the start of its execute function:

```ts
if (!input.confirmed) {
  return { action: "preview", message: "...", preview: { ... } };
}
```

This is the actual gate. When `confirmed` is `false`, the execute function returns a preview object immediately without making any external write. The model sees the preview, shows it to the user, and calls the tool again with `confirmed: true` after the user types "confirm."

### Idempotency

Every confirmed write is deduplicated via `resolveIdempotencyKey()` + `getReplayResponse()`. If the same tool is called twice with the same inputs, the second call returns the cached response without re-executing. This prevents double-sends if the model retries.

### Audit log

Every write (success or error) is written to the `ai_tool_write_audits` table via `recordWriteAudit()`. Fields: `user_id`, `tool_name`, `idempotency_key`, `project_id`, `request_payload`, `response_payload`, `status`.

---

## Infrastructure

### Microsoft Graph credentials (env vars)

| Var | Purpose |
|---|---|
| `MICROSOFT_CLIENT_ID` | App registration client ID |
| `MICROSOFT_CLIENT_SECRET` | App registration client secret |
| `MICROSOFT_TENANT_ID` | Azure AD tenant ID |
| `OUTLOOK_MAIL_USER` | Default mailbox email/user ID (Brandon's mailbox) |

All resolved in `frontend/src/lib/microsoft-graph/mail.ts` → `graphEnv()`.

### Graph permissions required

- `Mail.ReadWrite` or `Mail.ReadWrite.Shared` — to create drafts
- `Mail.Read` family — to read inbox/threads
- Teams: Archon bot credentials (separate from Graph app registration)

### Brandon-specific configuration

The `BRANDON_EMAIL_VOICE_PROFILE` constant (line 76 of `action-tools.ts`) is attached to every draft tool response and passed to the model as context. It points to three docs:

```
docs/ai-plan/brandon-email-voice-profile.md
docs/ai-plan/brandon-operating-profile.md
docs/ai-plan/brandon-email-drafting-playbook.md
```

Drafts from any mailbox use these docs. There is no per-mailbox voice profile switching yet.

---

## What does NOT exist yet (as of 2026-05-21)

| Capability | Status | Notes |
|---|---|---|
| `sendOutlookEmail` (send, not draft) | **Does not exist** | Intentional. Human sends from Outlook. Future addition needs hard approval gate |
| `sendUrgentTeamsEscalation` (no-confirm path) | **Does not exist** | Proposed in handoff — not implemented |
| Per-channel approval policy map | **Does not exist** | All write tools use identical `needsConfirmedWriteApproval` |
| Approval audit (who confirmed, when) | **Partial** | `ai_tool_write_audits` records success/error but not the approval event itself |
| Teams urgent vs. standard classification | **Does not exist** | `sendTeamsMessage` treats all messages identically |

---

## Planned work — approval policy split

The pending task (from handoff, 2026-05-21) is to split the approval policy so:

- **Outlook draft creation** → no explicit approval needed (current behavior, keep)
- **Outlook email send** → hard approval required (new tool to be added)
- **Urgent Teams escalation** → no explicit approval (new tool variant)
- **Standard Teams message** → confirm gate (current behavior, keep)

### Implementation notes for whoever picks this up

**Do not add a `sendOutlookEmail` tool without verifying:**
1. The Microsoft Graph `POST /messages/{id}/send` endpoint is accessible with current app permissions (`Mail.Send` or `Mail.Send.Shared` must be granted)
2. An approval state exists that is NOT just a `confirmed: boolean` in the tool input — the current `confirmed` flag is guessable from prompt drift. A send tool needs a stronger gate.

**For urgent Teams escalation:**
- The tool should be a separate entry from `sendTeamsMessage`, not a flag on the existing tool
- Urgency classification must be validated server-side, not taken from the model's input
- Must log the triggering source item (email ID / thread ID) in the audit record
- Content guardrails: short, factual, no invented claims, no confidential spillover

**Centralize the policy before adding tools:**
```ts
// Proposed location: frontend/src/lib/ai/tools/outbound-action-policy.ts
export const OUTBOUND_ACTION_POLICY = {
  outlook_email_draft:            { requiresApproval: false },
  outlook_email_send:             { requiresApproval: true },
  teams_message_urgent_escalation:{ requiresApproval: false },
  teams_message_standard:         { requiresApproval: true },
} as const;
```

All tool `needsApproval` functions should derive from this map, not implement ad hoc logic.

---

## Key files

| File | Purpose |
|---|---|
| `frontend/src/lib/ai/tools/action-tools.ts` | All write tools including `draftOutlookEmail` (L3378) and `sendTeamsMessage` (L3580) |
| `frontend/src/lib/microsoft-graph/mail.ts` | Graph client — `createOutlookMailDraft`, `resolveOutlookMailboxUserId`, `listOutlookMessages` |
| `frontend/src/lib/bot/teams-chat.ts` | Archon bot — `sendProactiveMessage`, `sendProactiveCard` |
| `frontend/src/lib/bot/teams-proactive.ts` | Alternative proactive DM path — `sendProactiveTeamsDM` |
| `frontend/src/lib/microsoft-graph/calendar-invites.ts` | Calendar invite creation (separate from mail) |
| `docs/ai-plan/brandon-email-voice-profile.md` | Brandon's communication voice guide |
| `docs/ai-plan/brandon-email-drafting-playbook.md` | Reply pattern playbook |
| `docs/ai-plan/brandon-operating-profile.md` | Owner/operator judgment guide |

---

## Related architecture docs

- [`AI-TOOLS-INVENTORY.md`](./AI-TOOLS-INVENTORY.md) — full catalog of all 133+ AI tools (read for system-wide context)
- [`AI-RAG-ARCHITECTURE.md`](./AI-RAG-ARCHITECTURE.md) — system architecture overview
- [`COMMUNICATIONS-DATA-PIPELINE.md`](./COMMUNICATIONS-DATA-PIPELINE.md) — Outlook sync pipeline (read path, not write path)
