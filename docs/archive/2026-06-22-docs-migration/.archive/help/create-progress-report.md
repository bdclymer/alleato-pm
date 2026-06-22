---
title: How to Create a Progress Report
description: Three ways to generate weekly progress reports — manually, through the AI chat, or on a scheduled cron trigger — with AI-drafted content from meetings, emails, OneDrive, and Teams.
audience: client
visibility: published
module: progress-reports
category: How-To Guides
tags: [progress-reports, create, weekly, ai, pdf, scheduled, automation]
featured: false
client_visible: true
ai_visible: true
order: 930
related_routes:
  - /progress-reports
  - /[projectId]/progress-reports
related_actions: []
---

<!-- allow-outside-documentation -->

# How to Create a Progress Report

Progress Reports are weekly, client-ready summaries drafted automatically from your project's activity — meeting transcripts, emails, OneDrive documents, and Teams messages. Every process has been built to support as much control or automation as you want. The default saves reports as a **draft** that a project manager or admin must approve before sending to the client.

---

## Three Ways to Create a Report

### Option 1 — Manually from the project

The most common path. Use this when you want to create a report on demand.

**From inside a project:**
1. Open the project from the sidebar.
2. Select **Progress Reports** from the project navigation.
3. Click **+ Create This Week's Draft** in the top right.

**From the global Progress Reports page:**
1. Click **Progress Reports** in the left sidebar (cross-project view).
2. The table shows reports across all projects — use this to review or create reports without being inside a specific project.

---

### Option 2 — Through the AI Chat

You can ask the AI assistant to create a progress report in plain language from anywhere in the platform.

Examples:
- *"Create this week's progress report for Vermillion Rise Warehouse"*
- *"Generate a progress report for this project"*

The AI will create the draft, populate all sections from available project data, and return a link to the new report for your review.

---

### Option 3 — Scheduled / Cron Trigger

For teams that want fully automated weekly reports, a scheduled action can be configured to generate a report at a specific day and time each week — for example, every Friday at 4:00 PM.

The report is created in **draft mode** automatically. No manual action is needed. The PM or admin receives a notification to review and approve before it goes to the client.

This is the recommended setup for active projects with consistent weekly reporting cadences.

---

## What the AI Drafts Automatically

When a report is created (by any method), the AI uses RAG (Retrieval-Augmented Generation) to pull from recent company documents and project data:

| Source | What it contributes |
|---|---|
| **Meeting transcripts** | Decisions made, action items, discussion summaries |
| **Emails** | Key communications, approvals, outstanding items |
| **OneDrive** | Uploaded documents, plans, submittals |
| **Teams messages** | Real-time coordination, site updates |
| **Project photos** | Automatically pulled in if uploaded to the project |
| **Project data** | Project manager, superintendent, construction start, scheduled completion |

The AI populates three narrative sections:
- **Past week's highlights** — what was accomplished
- **Upcoming week's activities** — planned work for next week
- **Open items** — outstanding issues, blockers, pending decisions

All fields remain fully editable after generation.

---

## Inside the Report Editor

Once a draft is created, the editor gives you full control over every section.

### Report Details

| Field | Description |
|---|---|
| Report title | Auto-named for the week — edit as needed |
| Week start / end | The reporting period |
| Status | `Draft` → `Ready` → `Sent` |
| Construction start | Pulled from project settings |
| Scheduled completion | Target substantial completion date |
| Weather days lost | Days lost to weather this week |

### AI Generate

Click **AI Generate** at any time to re-draft the three narrative sections from the latest project data. Useful if new meetings or emails have come in since the report was created.

### Photos

Project photos uploaded during the reporting week are automatically surfaced. Click any photo to include or exclude it. Click **Add all from this week** to include everything at once. Add captions directly on each selected photo.

### Client Delivery

Enter recipient email addresses and an optional personal note, then click **Email PDF** to send the branded PDF directly to the client. The report status updates to **Sent** automatically.

### Project Contacts

Names and contact details added here appear in the report footer on the PDF.

---

## Approval Flow

The default workflow requires a PM or admin to approve before the report reaches the client:

1. **Draft** — AI-generated, under review by the PM
2. **Ready** — Reviewed and approved internally
3. **Sent** — Emailed to the client; PDF delivered

To send: open the report → click **Edit** → set status to **Ready** → add recipients → click **Email PDF**.

---

## Exporting

| Action | How |
|---|---|
| Download PDF | Click **Download PDF** from the report view |
| Email to client | Click **Email PDF** from the edit screen |

---

## Related Articles

- [Progress Reports overview](/docs/progress-reports)
