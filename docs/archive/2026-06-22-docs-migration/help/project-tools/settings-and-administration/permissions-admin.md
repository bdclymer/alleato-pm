---
title: Permissions and Access Control
description: Configure role-based permissions, capability flags, and per-user overrides at the project level.
audience: admin
visibility: published
module: permissions
category: Settings & Administration
tags: [permissions, admin, roles, capabilities, audit]
featured: false
client_visible: false
ai_visible: false
order: 910
related_routes:
  - /[projectId]/admin
related_actions:
  - assign_permissions
  - update_permission_template
---

<!-- allow-outside-documentation -->

# Permissions and Access Control

Each project has its own permissions configuration. You can apply a template to a user, override specific modules per user, and toggle granular capability flags. Every change is recorded in an audit log.

## Open Project Permissions

1. Select the project.
2. Open **Admin** from the sidebar.
3. Select the **Permissions** tab.

## Permission Templates

A template sets a baseline access level for each module. The platform ships with four standard templates:

- **None** — no access.
- **Read** — view only.
- **Write** — create and edit.
- **Admin** — full control including delete and approval.

Templates can be customized per project to match your workflow.

## Per-User Overrides

After applying a template, override specific modules for a user without changing the template:

1. Open the user's permission record.
2. Select the module (Budget, RFIs, etc.).
3. Choose a different access level (None, Read, Write, Admin).
4. Save the override.

## Capability Flags

Eight capability flags control sensitive actions independently of module access:

- **approve_change_orders**
- **approve_invoices**
- **approve_progress_reports**
- **delete_records**
- **export_financial**
- **manage_permissions**
- **publish_drawings**
- **release_communications**

These are toggled per user from the same panel.

## Audit Log

The Audit Log records every permission change with timestamp, actor, target user, and what changed. Use it to investigate access changes or for compliance reviews.

## Related Articles

- [Manage User Access](/docs/manage-permissions)
- [Create or Invite a User](/docs/create-or-invite-a-user)
