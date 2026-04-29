<!-- allow-outside-documentation -->

# Help Article Authoring

This folder is the source of truth for controlled app-help content. It is
separate from broad planning docs, onboarding drafts, database docs, and
engineering notes so the Help Center and AI assistant only use content that
intentionally opts into the help-article schema.

## Required Article Frontmatter

Every article under `docs/help/articles/` must start with frontmatter:

```md
---
title: Create a User
description: Add a new person to the company directory and assign access.
audience: client
visibility: published
module: admin
category: Users & Permissions
tags: [users, profile, permissions, onboarding]
featured: true
client_visible: true
ai_visible: true
order: 10
related_routes:
  - /admin/users
related_actions:
  - create_user
  - assign_permissions
---
```

## Related Actions

`related_actions` values must exist in
`frontend/src/lib/help-actions.ts`. This registry is the bridge between a
help article and any future AI assistant action.

Each action declares:

- `status`: `guide_only`, `planned`, `preview_ready`, or `executable`
- `safetyLevel`: `read_only`, `preview_confirm`, or `admin_confirm`
- `relatedRoutes`: app routes where the action belongs
- optional `toolName`: the assistant tool that executes it once implemented
- optional `unavailableReason`: what the assistant should say while the action
  is guidance-only or planned

Do not add action IDs directly to articles without registering them first. The
validator fails on unknown action IDs so docs cannot imply that the assistant
can perform a workflow that has not been reviewed.

## Visibility Rules

- `published` + `client_visible: true` means the article can appear in the
  curated Help Center only when the audience is also client-safe.
- `published` + `ai_visible: true` means the article can be considered for AI
  app-help retrieval only when the audience is also safe for default AI help.
- `draft`, `internal`, and `archived` articles must not appear in the default
  client-facing Help Center.
- `audience: client` and `audience: subcontractor` are client-safe.
- `audience: admin` and `audience: internal` are not client-safe and must not
  set `client_visible: true`.
- `audience: admin` and `audience: internal` must not set `ai_visible: true`
  until role-aware AI retrieval is implemented.
- App-help articles are not the same as company knowledge. Company strategy,
  lessons learned, preferences, and institutional memory belong in the company
  knowledge system, not here.

## Guardrail

Run this before publishing help docs:

```bash
npm run docs:validate-help
```

The validator fails when an article is missing required metadata or uses an
unsupported enum value.
