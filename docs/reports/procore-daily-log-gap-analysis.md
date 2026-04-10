# Procore Research: Daily Log vs Our Implementation

**Date:** 2026-04-09
**Question:** Compare our daily logs to Procore functionality
**Sources used:** Tier 1 (RAG) | Tier 2 (Manifest) | Tier 3 (code read)

## Summary

Our Daily Log implementation is a **minimal shell** — a single table showing `date / weather / created_by`. Procore's Daily Log is a **structured daily journal** with 15+ distinct log-type sections, multi-view navigation (List/Calendar/Pending), day-level completion status, and report generation. The gap is very large.

## Procore Daily Log — Ground Truth

### Navigation / Views
Procore has three top-level tabs:
- **List** — view/add daily log entries (default)
- **Calendar** — month view; days marked complete highlighted green with checkmark
- **Pending** — pending entries awaiting approval (Approve/Reject workflow)

Plus a **Reports** dropdown to generate Daily Log reports.

### Day-level concept
A Daily Log is scoped to a **date**. For each day the user fills in zero or more entries across log-type sections, then marks the day **Complete**. Pending entries can be approved/rejected by permitted users.

### Log Type Sections (from Procore support + live DOM)
The Daily Log tool contains many sub-sections, each a distinct entry type with its own fields. Sections with `*` are enabled by default on new projects.

| Section | Key fields (from live Procore DOM) |
|---|---|
| **Observed Weather Conditions*** | Time Observed, Sky, Temperature, Calamity, Average, Precipitation, Wind, Ground/Sea, Comments |
| **Manpower*** | Company, Workers*, Hours*, Total Hours, Location, Comments, Issue? flag |
| **Timecards** | Employee, Cost Code, Type, Billable?, Regular Time, Hours |
| **Equipment*** | Equipment Name, Hours Operating, Hours Idle, Inspected, Inspection Time |
| **Visitors*** | Visitor, Start*, End*, Company, Comments |
| **Phone Calls*** | Call From, Call To, Start, End, Comments |
| **Inspections*** | Inspection Type, Inspecting Entity, Inspector Name, Inspection Area, Time* |
| **Deliveries*** | Time*, Delivery From, Tracking Number, Contents |
| **Safety Notices*** | Subject, Safety Notice, Issued To, Compliance Due |
| **Accidents*** | Party Involved, Company Involved, Comments |
| **Quantities*** | Quantity, Units, Location |
| **Productivity*** | Contract, Line Item (#-Description-Qty Units)*, Previously Delivered, Quantity Delivered*, Quantity Put-in-Place* |
| **Deliveries / Waste** | # Delivered*, # Removed*, Material, Disposed By, Method of Disposal, Disposal Location, Approximate Quantity* |
| **Plan Revisions** | Revision number, Title, Category, Comments |
| **Dumpsters / Waste** | Material, Disposed By, Method, Location, Quantity |
| **No-Shows** | Resource, Scheduled tasks, Showed?, Reimbursement, Rate ($) |
| **Delays** | Delay Type, Start Time, End Time, Duration (Hours) |
| **Notes*** | Free text + Issue? flag |

All entries support **Attachments** and **Related Items** (RFIs, submittals, etc.). All entries have an **Area** + **Location** selector and an **Issue?** flag.

### Toolbar / Page-level actions
- **Create** (entries for the selected date)
- **Export** (PDF / CSV)
- **Reports** dropdown
- **Email** (send the day's log)
- **Copy** (copy previous day's entries forward)
- **Collapse All** sections
- **Date picker** — navigate any day
- **All Areas** filter
- **Search**
- **Add Related Items**
- Mark day **Complete** / **Approve-Reject Pending**

### List view columns (live DOM)
Area, Company, Time Observed*, Delay, Location, Sky, Temperature, Calamity, Average, Precipitation, Wind, Ground/Sea, Comments, Attachments, Related Items

---

## Our Implementation — What Exists

**Files:**
- `frontend/src/app/(main)/[projectId]/daily-log/page.tsx` (server, 30 lines)
- `frontend/src/app/(main)/[projectId]/daily-log/daily-log-client.tsx` (273 lines)

**Data model** (`daily_logs` table):
- `id`, `log_date`, `weather_conditions` (unknown/jsonb), `created_by`, `created_at`, `updated_at`

**UI:**
- `UnifiedTablePage` with 3 visible columns: Date, Weather, Created By (+ 2 hidden: Created, Updated)
- Single "New Log Entry" button → `/[projectId]/daily-log/new`
- Search by date/author text
- Row delete
- Views: table / card / list
- **Disabled:** filters, bulk delete, row selection, export

**That's it.** There is no concept of log types, sections, attachments, related items, calendar view, pending/approval, mark complete, copy-forward, reports, email, or any of the 15+ sub-entry types.

---

## Gap Analysis

| Area | Procore | Ours | Gap |
|---|---|---|---|
| Views | List / Calendar / Pending | Table only | **Missing Calendar + Pending** |
| Log type sections | 15+ distinct section types | 0 (only a freeform `weather_conditions` blob) | **Entire domain model missing** |
| Day completion | Mark Complete workflow | None | Missing |
| Approval | Pending → Approve/Reject | None | Missing |
| Attachments | Per entry | None | Missing |
| Related Items (RFIs/Submittals/etc.) | Per entry | None | Missing |
| Area / Location selector | Yes | None | Missing |
| Copy previous day | Yes | None | Missing |
| Export PDF/CSV | Yes | Disabled | Missing |
| Email daily log | Yes | None | Missing |
| Reports | Yes | None | Missing |
| Weather data | Structured (Sky, Temp, Precip, Wind, Ground/Sea, Calamity) | Single unknown/jsonb blob | **Not structured** |
| Manpower tracking | Company + Workers + Hours + Cost Code + Location | None | Missing |
| Equipment tracking | Equipment + Hours Operating/Idle + Inspection | None | Missing |
| Visitors, Phone Calls, Inspections, Deliveries, Safety Notices, Accidents, Quantities, Productivity, Delays, No-Shows, Notes | All present | None | Missing |
| List columns | 15 construction-specific columns | 3 generic metadata columns | Doesn't reflect daily-log domain |
| Filters | Date range, Area, log type | None | Missing |

## Recommendations (priority order)

1. **Redesign the data model.** `daily_logs` should be a *day header* (project_id, log_date, status [open/pending/complete], completed_by, completed_at). Each log-type section becomes its own child table: `daily_log_manpower`, `daily_log_equipment`, `daily_log_visitors`, `daily_log_weather`, `daily_log_notes`, etc. — all FK'd to `daily_logs.id`.
2. **Implement the most-used defaults first** (matching Procore's `*` sections): Weather, Manpower, Notes, Equipment, Visitors, Deliveries, Safety Notices, Inspections, Accidents, Quantities, Productivity.
3. **Rebuild the page around a date.** Primary UX is "pick a date → see/add all entries for that date," not a generic table of logs.
4. **Add Calendar view** with green-checkmark for completed days.
5. **Add Mark Complete + Pending approval workflow.**
6. **Add Attachments and Related Items** to each entry type (reuse existing patterns from RFIs/Submittals).
7. **Add Copy-from-previous-day** action for Manpower/Equipment (matches Procore's `Set Hours and Workers values to 0 on copy` setting).
8. **Add Export (PDF/CSV) and Email day report.**
9. **Only after the above is in place**, structure list columns to match Procore (Area, Company, Time Observed, etc.) or retire the flat list in favor of date-centric navigation.

## Sources

- https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/daily-log-types
- https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/view-a-daily-log-in-the-list-view
- https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/view-daily-logs-in-the-calendar-view
- https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/view-pending-daily-log-entries
- https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/create-manpower-entries
- https://v2.support.procore.com/product-manuals/daily-log-project/tutorials/mark-a-daily-log-as-complete
- https://v2.support.procore.com/process-guides/analytics-2.0-report-pages/daily-logs-report
- Live DOM: `.claude/procore-manifests/daily-log/manifest.json`
