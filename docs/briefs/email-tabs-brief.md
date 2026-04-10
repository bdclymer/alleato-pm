# Email Tabs Brief — Change Workflow

## Context

The PCO detail page, Prime CO detail page, and Commitment CO detail page all have (or should have) an "Emails" tab. Currently these are empty placeholders (`EmptyState`). A separate session is working on email configuration infrastructure.

## What Each Email Tab Needs

### Shared Behavior (all three entity types)

1. **List view**: Show emails related to this record, sorted newest-first
   - Sender, recipients, subject, date, preview snippet
   - Click to expand full email body inline
   - Attachments shown as download links

2. **Send email**: "Send Email" button opens a compose dialog
   - To/CC fields with contact autocomplete (from project directory)
   - Subject auto-filled: `[Project Name] - PCO #003: Title` (entity-specific)
   - Rich text body editor
   - Attach files (from record's attachments or upload new)
   - On send: store in our DB + send via configured email provider

3. **Auto-generated emails**: System emails (status change notifications, approval requests) should appear in this tab alongside manually-sent emails

### Data Model

Emails likely need a polymorphic association:

```
emails table:
  id, project_id, 
  entity_type ("pco" | "pcco" | "cco"),
  entity_id (FK to the record),
  from_address, to_addresses (jsonb), cc_addresses (jsonb),
  subject, body_html, body_text,
  sent_at, sent_by (user),
  direction ("inbound" | "outbound" | "system"),
  attachments (jsonb array of {name, url, size})
```

### Entity-Specific Details

| Entity | Tab Location | Subject Prefix |
|--------|-------------|----------------|
| PCO | `pcos/[pcoId]/page.tsx` → Emails tab | `PCO #XXX: {title}` |
| Prime CO | `change-orders/prime/[primeCoId]/page.tsx` → Emails tab | `CO #XXX: {title}` |
| Commitment CO | `change-orders/commitment/[commitmentCoId]/page.tsx` → Emails tab | `CCO #XXX: {title}` |

### API Routes Needed

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/projects/[projectId]/emails?entity_type=pco&entity_id=123` | List emails for a record |
| POST | `/api/projects/[projectId]/emails` | Send/create an email |
| GET | `/api/projects/[projectId]/emails/[emailId]` | Get full email detail |
| DELETE | `/api/projects/[projectId]/emails/[emailId]` | Delete an email |

### Integration Points

- **Email provider**: Whatever the email configuration session sets up (likely SendGrid, Resend, or SES)
- **Contact autocomplete**: Pull from project directory (`/api/projects/[projectId]/directory`)
- **Attachments**: Reuse Supabase Storage upload pattern from existing attachment sections
- **Notifications**: Tie into approve/reject/convert actions to auto-generate system emails

### Priority

Medium — the email infrastructure needs to be in place first. Once the email configuration session delivers the sending capability, wiring up these tabs is ~1 day of work per entity type (or less if a shared `<EmailsTab entityType="pco" entityId={id} />` component is built).

### Recommended Approach

Build one shared component:

```tsx
<EmailsTab
  projectId={projectId}
  entityType="pco" | "pcco" | "cco"
  entityId={recordId}
  subjectPrefix="PCO #003: Foundation Repair"
/>
```

This component handles the list, compose dialog, and display. Reuse across all three detail pages.
