# Brandon Daily Update Execution Tasks

Last updated: 2026-05-02
Linear issue: `AAI-304`
Linear URL: https://linear.app/megankharrison/issue/AAI-304/redesign-executive-operating-brief-page-with-tasking-operational

## Goal

Ship a high-signal `/executive` operating surface for Brandon that is easy to scan, actionable, and grounded in the latest executive briefing packet.

## Workstreams

| Status | Workstream | Scope | Owned paths |
|---|---|---|---|
| Done | Executive page redesign | Replace the current long-form brief layout with an operating console structure and clearer section hierarchy. | `frontend/src/app/(main)/executive/**` |
| In Progress | Task drafting and assignment | Add drafted-task creation from executive items, show already-assigned work, and prevent duplicate task creation. | `frontend/src/app/(main)/executive/**`, `frontend/src/app/(main)/actions/**`, `frontend/src/lib/executive/**` |
| Done | Operational improvements model | Reuse the existing `initiative_cards` table as the durable operational-improvements layer and wire executive-page CRUD around it. | `frontend/src/app/(main)/executive/**`, `frontend/src/app/(main)/actions/**`, `frontend/src/app/api/initiative-cards/**` |
| In Progress | Executive-scoped AI chat | Embed the existing assistant UI on `/executive`, ground it in the latest executive brief packet, and add follow-up plan creation. | `frontend/src/components/ai-assistant/**`, `frontend/src/app/api/ai-assistant/chat/route.ts`, `frontend/src/app/(main)/executive/**` |
| Done | Financial recap and alerts | Add a compact financial lane with payments, blockers, alerts, and owner-level cash/retainage signals. | `frontend/src/app/(main)/executive/**`, `frontend/src/lib/executive/**` |
| In Progress | Verification | Run targeted lint/typecheck checks and focused page verification after the main slices land. | `frontend/**`, `docs/ops/handoffs/**` |

## Concrete Action Items

| Status | ID | Action item | Notes |
|---|---|---|---|
| Done | A1 | Redesign the `/executive` page into explicit lanes: `Needs Brandon Today`, `Already Assigned / In Flight`, `Financial Recap`, `Operational Breakdowns`, `Project Signals`, `Executive Chat`. | First shipping slice landed with an executive-chat placeholder panel instead of the embedded chat itself. |
| Done | A2 | Add a top-level operating summary with only the highest-signal counts and actions. | Replaced the oversized narrative headline emphasis with operating summary cards. |
| Done | A3 | Add drafted-task controls to executive items. | Implemented direct task drafting from executive items. |
| In Progress | A4 | Detect similar open tasks before creating a new one. | Current slice blocks duplicate drafts when the same source + exact generated description already exists; broader fuzzy duplicate detection remains. |
| Done | A5 | Surface already-assigned matching tasks inline. | Linked open tasks now show inline on executive items and in a dedicated in-flight section. |
| Done | A6 | Add a financial recap section. | First slice derives a financial lane from the executive packet; richer financial sourcing still remains. |
| Done | A7 | Add an operational breakdowns section. | First slice derives operations breakdowns from the executive packet and carry-forward follow-ups. |
| Done | A8 | Create durable operational-improvement storage and linked workflow. | Reused `initiative_cards` instead of adding a new table so executive-page improvements, manual creation, and AI-created cards share one object. |
| Done | A9 | Add an executive-scoped chat panel using the existing assistant UI. | Embedded `ExecutiveChatPanel` now reuses the shared assistant transport and injects the current executive packet as additive context. |
| In Progress | A10 | Add chat tools or actions to create follow-up plans and link them back to executive items. | Executive chat now instructs the assistant to use `createInitiativeCard` with executive linkage; next gap is tightening the save UX and verification evidence. |
| Done | A11 | Make “new vs carry-forward” explicit on the page. | Carry-forward risks now render as a dedicated section separate from live packet items. |
| In Progress | A12 | Run targeted verification and capture evidence in the handoff. | Focused lint passed; full frontend typecheck still reports unrelated repo debt. |

## Scope Cuts For The First Shipping Pass

- Defer automatic delivery/send workflow.
- Defer advanced cost-estimation logic beyond simple surfaced figures or stored amounts.
- Defer broad retrieval retuning unless the page cannot be grounded reliably with the current packet.
- Defer predictive change-event detection if the first pass can only support a placeholder lane.

## Success Criteria

- Brandon can scan the page in under a minute and understand what needs his attention.
- At least one executive item can be turned into a drafted task without leaving the page.
- The page shows existing assigned work so duplicate tasking is avoided.
- The page includes a clear financial lane and an operational-improvements lane.
- The page includes an embedded assistant that can answer follow-up questions using the current executive brief context.
- The remaining gap is durable follow-up-plan creation from chat, not page-level executive context access.
