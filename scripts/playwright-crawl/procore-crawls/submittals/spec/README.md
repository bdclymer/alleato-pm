# SUBMITTALS Spec

This folder contains specification artifacts for the **submittals** Procore module,
generated from comprehensive crawl data (12 screenshots, 6 pages, 737 system actions,
340 network requests).

## Files

| File | Description |
|------|-------------|
| `COMMANDS.md` | 24 domain commands, 5 navigation tabs, 12 table columns, 11 filter options |
| `FORMS.md` | Create/Edit form with 20+ fields, filter form with 11 fields |
| `MUTATIONS.md` | Write operations grouped by CRUD, status state machine, workflow responses |
| `schema.sql` | 8 tables: submittals, packages, workflow_steps, responses, distributions, recipients, attachments, linked_drawings |

## Data Sources

- **Screenshots:** 12 captured (list, 4 tabs, detail, edit form, create menu, export menu, filter panel, reports menu, actions menu)
- **System Actions:** 737 raw actions from Supabase `app_system_actions`
- **Network Requests:** 340 intercepted API calls (141 mutations, 49 unique endpoints)
- **Form Fields:** 14 HTML fields + div-based custom controls from edit form DOM

## Key Findings

### Entity Model

The submittals module has a richer entity model than a single table:

1. **Submittals** — main entity with 20+ fields
2. **Submittal Packages** — groups of related submittals
3. **Workflow Steps** — ordered approval chain
4. **Responses** — per-approver responses (Submitted, Pending, Approved, Approved as Noted)
5. **Distributions** — distribution events (From, To, Message, Attachments)
6. **Attachments** — polymorphic file storage (on submittals, responses, or distributions)
7. **Linked Drawings** — M2M relationship to drawings tool

### Status Lifecycle

```bash
Draft → Open → Distributed → Closed
```

### Tabs & Views

- **Items** — Main list (default), sortable table with 12 columns
- **Packages** — Submittals grouped by package
- **Spec Sections** — Submittals grouped by CSI spec section
- **Ball In Court** — Submittals grouped by responsible party
- **Recycle Bin** — Soft-deleted submittals

### Detail View Sub-tabs

- General (distribution summary, description, workflow responses)
- Related Items
- Emails
- Change History

## Next Steps

1. **Review schema.sql** — Adjust FK types, add missing constraints
2. **Review MUTATIONS.md** — Validate state transitions and side effects
3. **Fill in FORMS.md gaps** — Package creation form not captured
4. **Human approval required** before implementing any of these specs
5. **Generate PRP** — Run `/prp-create submittals` for full implementation plan
