---
title: Knowledge Base
description: Save company knowledge, lessons learned, and process notes so the AI assistant can use them when answering questions.
audience: client
visibility: published
module: knowledge
category: AI & Intelligence
tags: [knowledge-base, company-knowledge, lessons-learned, ai, rag]
featured: false
client_visible: true
ai_visible: true
order: 625
related_routes:
  - /knowledge
  - /admin/company-info
related_actions: []
---

<!-- allow-outside-documentation -->

# Knowledge Base

The Knowledge Base is where your company's institutional knowledge lives — policies, lessons learned, vendor notes, process guides, and anything else the AI assistant should know when answering questions about how your company operates.

This is separate from project data (meetings, RFIs, budgets). Think of it as the manual your AI advisor has read before you ever start a conversation.

## What Belongs Here

- **Lessons learned** — "Always include a 10% contingency on tilt-up panel pours."
- **Vendor notes** — "Apex Electric has a 6-week lead time on custom switchgear."
- **Policies and processes** — "Change orders over $50K require VP approval."
- **Market intelligence** — competitive positioning, typical subcontractor markups, regional labor rates.
- **Company profile** — who you are, what you build, how you operate.

## Save Knowledge from Chat

The fastest way to add something is directly from the AI assistant.

1. Open Ask Alleato.
2. Tell it what to save: "Save this to the knowledge base: our standard retainage terms are 10% through substantial completion."
3. The assistant saves the entry immediately. Admin saves are searchable right away; non-admin saves wait for admin approval.

## Manage the Knowledge Base

1. Open **Knowledge** from the main sidebar (or go to `/knowledge`).
2. Browse articles by category: Company Profile, Lessons Learned, Vendor Intel, Market Intel, Policies, Processes, and more.
3. Create, edit, or delete entries.

### Admin Access

Admins can manage the full knowledge base at **Admin → Company Info**. The Company Info admin has three tabs:

- **Company Profile** — 9 core profile fields (company type, specialties, typical project size, regions, etc.)
- **Knowledge Articles** — categorized articles searchable by the AI
- **Documents** — uploaded files (PDFs, specs, reference docs) processed through the RAG pipeline

## How the AI Uses It

When you ask the assistant a question, it searches the knowledge base semantically alongside meetings, documents, and project data. Knowledge base answers are attributed as coming from "company knowledge" so you know the source.

For example:

> You: "What's our typical retention structure?"
> AI: "Based on your company knowledge: standard retainage is 10% through substantial completion, then reduced to 5% after the punchlist is signed off. [Source: Alleato Policies — Retention Terms]"

## Related Articles

- [AI Assistant Overview](/docs/ai-assistant-overview)
- [What the AI Assistant Can Do (Actions)](/docs/ai-assistant-actions)
