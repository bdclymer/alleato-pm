# Ask Alleato Widget Plan

## Implementation Slice

The global production feedback mount now becomes a single Ask Alleato widget. It keeps the existing backend surfaces:

- AI chat: `/api/ai-assistant/chat` via AI SDK v6 `useChat` and `DefaultChatTransport`.
- Conversation creation: `/api/ai-assistant/conversations`.
- Feedback submission: `/api/admin/feedback` with the existing `admin_feedback_items` table and screenshot payload shape.

## Consolidation Decisions

- `AdminFeedbackWidget` remains in source for now but is unmounted from `frontend/src/app/layout.tsx`.
- Screenshot capture was extracted to `frontend/src/lib/admin-feedback/screenshot.ts` so both old and new widgets use the same helper.
- `OPEN_ADMIN_FEEDBACK_COMPOSER_EVENT` still opens the new panel on the Send feedback tab.
- Feedback tags map as required: Bug to `bug`, Idea to `change_request`, Confused to `question`.
- `Cmd/Ctrl+I` opens the widget without visual shortcut copy.

## Remaining

- Add deterministic E2E coverage for actual feedback row creation once test DB cleanup rules are confirmed.
- Add compact source/citation rendering for streamed AI responses if the widget needs parity with the full `/ai-assistant` page.
