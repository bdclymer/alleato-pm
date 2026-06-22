---
title: Brandon Daily Update
description: Review the executive daily brief that turns recent communication evidence into decisions, blockers, and business signals.
audience: internal
visibility: published
module: executive
category: Features
tags: [brandon, daily-update, executive, ai-strategist, rag]
featured: true
client_visible: false
ai_visible: false
order: 300
related_routes:
  - /executive
related_actions: []
---

<!-- allow-outside-documentation -->

# Brandon Daily Update

The Brandon Daily Update is the executive brief on [/executive](/executive).
It is built to read like a report from the AI business strategist, not a raw
RAG dump. The page should help answer what needs a decision, what is waiting on
someone else, and what changed across the business.

## What It Should Show

- Items that need your attention, approval, confirmation, or follow-up.
- Items currently blocked by vendors, clients, finance, estimating, design, or
  the project team.
- Important business signals that may become schedule, cost, relationship, or
  operational issues.
- Open follow-ups that carried forward from prior briefs.
- Source evidence and source links so every statement can be checked.

## Retrieval Order

The update searches recent source activity first. This keeps stale knowledge
from overpowering what happened today.

1. Recent email evidence.
2. Recent Teams direct and channel messages.
3. Recent meeting transcripts and summaries.
4. Recent document metadata and chunks as fallback.
5. Older knowledge only as secondary context.

## Writing Standard

The brief should translate extracted evidence into useful business language.
Raw labels like "drawings pending" are not enough. A good item should say who is
waiting, what is needed, the actual due date when one exists, why it matters,
and the recommended next move.

Examples of the expected format:

- Revised HVAC drawings are due next Wednesday, May 6, and electrical drawing
  updates are needed early next week for owner review.
- A vendor quote is still missing; follow up before it blocks pricing or
  approval.
- A client decision is needed before the project team can release the next work
  package.

## Review Workflow

The current workflow is review-first:

1. Open [/executive](/executive).
2. Review the generated brief and source evidence.
3. Expand evidence excerpts when the recommendation needs verification.
4. Create task drafts from executive items when a follow-up should become
   tracked work.
5. Approve or send only when the content is clear enough to stand on its own.

## Source And Trust Requirements

Every item should have enough attribution to build trust:

- source type, such as meeting, email, Teams, or document;
- source title or conversation name;
- source date;
- linked source when the source system provides a usable URL;
- a short evidence excerpt.

Dates should be explicit. If the source says "next Wednesday," the brief should
include the actual calendar date as well, such as "next Wednesday, May 6."

## Engineering Reference

The detailed implementation document lives at
`docs/briefs/brandon-daily-update.md`.
