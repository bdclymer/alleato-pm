---
title: Project Intelligence
description: Review the AI-compiled intelligence packet with KPIs, insight cards, freshness status, and evidence citations for a project.
audience: client
visibility: published
module: intelligence
category: AI & Intelligence
tags: [intelligence, insights, ai, kpis, risk, decisions, blockers, financial-exposure]
featured: true
client_visible: true
ai_visible: true
order: 610
related_routes:
  - /[projectId]/intelligence
related_actions: []
---

<!-- allow-outside-documentation -->

# Project Intelligence

Project Intelligence is an AI-compiled snapshot of everything the platform knows about a project. It synthesizes meetings, emails, RFIs, change events, schedule data, and financials into a single page of structured insight cards with evidence citations.

## Open Project Intelligence

1. Select the project.
2. Open **Intelligence** from the sidebar.

## What You See

### KPI Summary

Key metrics at a glance:

- Schedule status (on track, at risk, late)
- Budget variance (revised budget vs. forecast)
- Open item counts (RFIs, submittals, change events, punch items)
- Recent activity (new meetings, emails, records in the last 7 days)

### Confidence Rating

A rating of how much underlying evidence supports the current intelligence — High, Medium, or Low. A Low rating usually means the project has limited recent activity in the system. A High rating means multiple sources (meetings, emails, project records) have contributed recent evidence.

### Freshness Status

Shows when the intelligence was last compiled and whether it is current.

- **Fresh** — compiled within the last 24 hours with recent source data
- **Stale** — older than 24 hours; trigger a recompile for the latest view
- **Partial** — some data sources were unavailable during the last compile
- **Failed** — the last compile attempt did not complete; retry from the page

### Insight Cards

Insights are grouped by type. Each card includes a short narrative, the source it was derived from, and a link to the underlying record.

| Card Type | What It Represents |
|-----------|-------------------|
| **Risk** | Something that may impact cost, schedule, or scope |
| **Decision** | A decision made or pending in recent communications |
| **Blocker** | Work that is waiting on someone or something to proceed |
| **Financial Exposure** | Potential cost impact from RFIs, change events, or commitments |
| **Schedule Risk** | Activities trending late or identified as blocked |
| **Change Management** | Open changes working through the approval lifecycle |
| **Open Question** | Unresolved questions surfaced from meetings or emails |
| **Project Update** | General status information extracted from recent sources |

## Evidence Citations

Every insight card cites at least one source. Click the citation to open the meeting transcript, email, document, RFI, or record it was derived from. Verify the source before acting on a high-impact card.

## Recompile

Intelligence recompiles automatically as new evidence arrives. Trigger a manual recompile from the page if you want the latest view immediately after a meeting or email sync.

## Difference from the AI Chat

Project Intelligence is a precompiled packet — it gives you a structured overview. The AI chat assistant is interactive — ask follow-up questions, drill into specifics, and request analysis across multiple projects. Use both together: start with Intelligence for the overview, then ask the assistant to go deeper on anything that needs attention.

## Related Articles

- [AI Assistant Overview](/docs/ai-assistant-overview)
- [Get a Project Briefing from the AI](/docs/ai-project-updates)
- [Proactive AI Alerts](/docs/ai-proactive-alerts)
- [Meetings](/docs/meetings)
