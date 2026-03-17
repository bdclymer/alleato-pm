# RFIs — Procore Reference & Best Practices

**Generated:** 2026-03-17

## Procore Official Features

- Create, edit, draft, close, reopen, and delete RFIs
- Ball in Court responsibility tracking
- Official response designation (RFI Manager selects one authoritative answer)
- Forward for Review (pass BIC to another user temporarily)
- Distribution lists with configurable email notifications
- Private RFI visibility controls
- Link RFIs to drawings (visual markup on drawing sheets)
- Link to spec sections and cost codes
- Create related items: Change Events, Correspondence, Instructions, PCOs
- Bulk edit actions (Admin only)
- Export to CSV and PDF (respects filters, sort, column order, custom fields)
- Custom fields (Admin-configured, reportable)
- Saved views (user, project, company levels)
- Inline editing in list view
- RFI Revisions (update previously closed RFIs)
- AI-powered Draft RFI Agent (generates subject, question, impact)
- Change History tab (Admin only)
- Overdue email reminders (daily, stops at 45 days)
- Project stage prefixes for RFI numbering
- Recycle bin with retrieval
- Mobile apps (iOS and Android)

## Form Fields (Create/Edit RFI)

### Request Section

| Field | Description | Required | Type |
|-------|-------------|----------|------|
| Subject | Descriptive title | Yes (Open) | Text |
| Question | The inquiry; rich text with background info | Yes (Open) | Rich Text |
| Attachments | Supporting files (up to 1000, 256 MB each) | No | File Upload |

### General Information

| Field | Description | Required | Type |
|-------|-------------|----------|------|
| Number | Auto-sequential; supports stage prefix | Yes (Open) | Auto/Manual |
| Due Date | Response deadline; auto from settings | Yes (Open) | Date |
| Assignees | Users responsible for responding; "Response Required" flag | Yes (Open) | Multi-user select |
| RFI Manager | Responsible user; defaults from project settings | Yes (all) | Dropdown |
| Distribution | Users notified on all activity | No | Multi-user select |
| Received From | Person who originated the question | No | Dropdown |
| Responsible Contractor | Auto-populated from Received From's company | No (auto) | Auto-field |
| Drawing Number | Manual reference to a drawing | No | Text |
| Spec Section | Section from spec book | No | Dropdown |
| Location | Project location; inline creation if enabled | No | Dropdown |
| Cost Code | Links to project budget | No | Dropdown |
| Project Stage | Company-level custom stages | No | Dropdown |
| Cost Impact | Yes ($), Yes (Unknown), No, TBD, N/A | No | Dropdown |
| Schedule Impact | Yes (days), Yes (Unknown), No, TBD, N/A | No | Dropdown |
| Sub Job | Required when Sub Jobs/WBS enabled | Conditional | Dropdown |
| Private | Restricts visibility; only Admin can remove | No | Yes/No |
| Reference | Free-text reference tag | No | Text |
| Custom Fields | Admin-configured; max 255 chars | Varies | Varies |

### Configurable Fields (Admin can set Required/Optional/Hidden)

Cost Code, Cost Impact, Distribution, Drawing Number, Location, Received From, Reference, Responsible Contractor, Spec Section, Sub Job, Project Stage, Schedule Impact

## List View Columns

| Column | Description |
|--------|-------------|
| RFI # | Sequential number (with optional stage prefix) |
| Subject | Clickable link to detail |
| Status | Draft, Open, Closed, Closed-Draft |
| Ball in Court | User(s) currently responsible |
| Assignees | Users designated to respond |
| RFI Manager | User managing the RFI |
| Due Date | Response deadline |
| Received From | Originator |
| Responsible Contractor | Company of originator |
| Cost Impact | Yes/No/TBD/N/A |
| Schedule Impact | Yes/No/TBD/N/A |
| Location | Project location |
| Spec Section | Specification reference |
| Drawing Number | Drawing reference |
| Cost Code | Budget link |
| Project Stage | Stage label |
| Reference | Free-text tag |
| Private | Yes/No |
| Created Date | Date created |
| Closed Date | Date closed |
| Custom Fields | Admin-configured |

## Detail View Sections/Tabs

| Tab/Section | Description |
|-------------|-------------|
| General Tab | Request (Subject + Question + Attachments) + General Information fields |
| Responses Card | All responses from assignees; official response indicator; Forward for Review button |
| Related Items Tab | Links to change events, submittals, drawings, etc. |
| Emails Tab | Forwarded emails and external correspondence |
| Change History Tab | Full audit trail (Admin only) |

## Workflow / Statuses

| Status | Description | How Entered | How Exited |
|--------|-------------|-------------|------------|
| Draft | Not yet active; BIC with RFI Manager | Standard user "Send for Review" or Admin chooses Draft | Admin/Manager opens it → Open |
| Open | Active; BIC with Assignees | RFI Manager/Admin opens | Closed by Manager/Admin → Closed |
| Closed | Resolved; official response designated | Closed from Open | Reopened → Open |
| Closed-Draft | System-generated when Draft is closed directly | Closed from Draft | Reopened → Draft |

**Ball in Court Flow:**
1. Draft created → BIC: RFI Manager
2. Opened → BIC: Assignees
3. Assignees respond → BIC: RFI Manager
4. Manager selects official response → Closed
5. If reopened → back to Open, BIC: Assignees

**Forward for Review:** Temporarily transfers BIC to one person; after they respond, BIC reverts to original Assignee.

## Permissions

| Action | Read Only | Standard | Admin |
|--------|-----------|----------|-------|
| View RFIs | Yes* | Yes* | Yes |
| Create Draft | No | Yes | Yes |
| Create Open | No | Yes* | Yes |
| Edit | Yes* | Yes* | Yes |
| Delete | No | No | Yes |
| Configure Settings | No | No | Yes |
| Bulk Actions | No | No | Yes |
| Respond | Yes* | Yes* | Yes |
| Close/Reopen | Yes* | Yes* | Yes |
| Choose Official Response | Yes* | Yes* | Yes |
| Forward for Review | No | Yes* | Yes* |
| Export CSV/PDF | Yes | Yes | Yes |
| View Change History | No | No | Yes |

*Granular permissions apply (e.g., "Act as RFI Manager")

## Ball in Court

- Draft: BIC = RFI Manager
- Open: BIC = Assignees
- After all assignees respond: BIC = RFI Manager
- Forward for Review: BIC temporarily transfers, then reverts
- Manual shift: "Return to Assignee's Court" / "Return to RFI Manager's Court"

## Linked Tools

| Tool | Integration |
|------|-------------|
| Drawings | Link to sheets; create RFIs from drawings; view on markup layer |
| Specifications | Link via Spec Section dropdown |
| Change Events | Create directly from an RFI |
| PCOs | Create from RFI (when Change Events disabled) |
| Correspondence | Create from RFI |
| Instructions | Create from RFI |
| Budget/Cost Codes | Link via Cost Code field |
| Reports | Custom RFI reports; custom fields reportable |
| Coordination Issues | Elevate to RFI |

## Settings/Configuration

| Setting | Description |
|---------|-------------|
| Default RFI Manager | Default manager for new RFIs |
| Days to Answer RFI | Auto-populates due date |
| Assignees' Responses Required by Default | Auto-checks "Response Required" |
| Only Show Official Response to Standard/Read Only | Hides non-official responses |
| Enable Private RFIs | Allows privacy marking |
| Set New RFIs to Private by Default | Auto-marks private |
| Overdue Email Reminders | Daily emails, stops at 45 days |
| Default Distribution List | Auto-added to new RFIs |
| Email Notifications Matrix | Per-event toggles |
| Enable Revisions | Allow revisions on closed RFIs |
| RFI Number Prefix by Stage | Stage-based numbering |
| Custom Fields | Admin-configurable |
| Field Configurability | Required/Optional/Hidden per field |

## Industry Best Practices

- Average response time: 9.7 days industry-wide
- Typical contractual deadlines: 5-14 business days
- Average 9.9 RFIs per $1M construction value
- Average project spends $859,680 on RFI-related costs
- Link every RFI to drawings and spec sections at creation
- Convert cost-impacting responses to change events immediately
- Hold weekly RFI reviews to surface stalled items
- Track metrics: avg response time, open count by age, cost/schedule impact totals
- Unresolved RFIs are a leading cause of construction claims and disputes

## Sources

- https://support.procore.com/products/online/user-guide/project-level/rfi
- https://support.procore.com/products/online/user-guide/project-level/rfi/tutorials/create-an-rfi
- https://support.procore.com/products/online/user-guide/project-level/rfi/tutorials/respond-to-an-rfi
- https://support.procore.com/products/online/user-guide/project-level/rfi/tutorials/forward-an-rfi-for-review
- https://support.procore.com/products/online/user-guide/project-level/rfi/permissions
- https://support.procore.com/products/online/user-guide/project-level/rfi/tutorials/configure-advanced-settings-rfis
- https://support.procore.com/faq/which-fields-in-the-rfis-tool-can-be-configured-as-required-optional-or-hidden
- https://developers.procore.com/reference/rest/rfis?version=latest
