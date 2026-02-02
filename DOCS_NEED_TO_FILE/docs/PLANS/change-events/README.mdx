# Change Events Module - Complete Documentation

## Table of Contents

**Project Management**
- [Tasks](./TASKS-CHANGE-EVENTS.md) - Task tracking and implementation checklist
- [Progress](./PROGRESS-CHANGE-EVENTS.md) - Current implementation status
- [Plans](./PLANS-CHANGE-EVENTS.md) - Implementation plan and roadmap
- [Workflow](./WORKFLOW-CHANGE-EVENTS.md) - Business rules and workflow documentation
- [Audit Report](./AUDIT-REPORT-2026-01-09.md) - Latest audit and compliance review

**Technical Specifications**
- [Schema v2](./specs/SCHEMA-CHANGE-EVENTS-V2.md) - Database schema (latest version)
- [Schema v1](./specs/SCHEMA-CHANGE-EVENTS.md) - Database schema (original)
- [API Specification](./specs/API-CHANGE-EVENTS.md) - API endpoints and contracts
- [Forms Specification](./specs/FORMS-CHANGE-EVENTS.md) - Form fields and validation
- [Complete Specs](./specs/SPECS-CHANGE-EVENTS.md) - Comprehensive specifications

**Capture Documentation**
- [Capture Summary](./crawl-change-events/CAPTURE-SUMMARY.md) - Overview of captured data
- [Create Form Details](./crawl-change-events/form-create-change-event.md) - Detailed form field mapping
- [API Implementation](./crawl-change-events/change-events-api-implementation.md) - API implementation notes

## Overview

This directory contains comprehensive documentation for Procore's Change Events module, captured through systematic analysis of the live application on **2026-01-08**. This documentation provides everything needed to rebuild this feature without access to Procore's source code.

### 1. [Database Schema](./schema.md)

- `change_events`
- `change_event_line_items`
- `change_event_attachments`
- `change_event_history`
- `change_event_approvals`
- `change_events_summary` materialized view with aggregates

### 2. Pages

- [Change Events Table](http://localhost:3002/60/change-events/)
- [Create Change Event Form](http://localhost:3002/60/change-events/new)


### 3. [Workflows](./workflow.md)

This is how the tool will be used in real scenarios. 

  1. Create Change Event
  2. Edit Change Event
  3. Add Line Items
  4. Submit for Approval
  5. Approval Process
  6. Handle Rejection
  7. Convert to Change Order
  8. Close Change Event

## Tool's Purpose

Change Events track potential changes to project scope, budget, or schedule **before** they become formal Change Orders. This provides:

1. **Early Impact Analysis** - Rough Order of Magnitude (ROM) cost/revenue estimates
2. **Approval Workflow** - Structured review and approval by stakeholders
3. **Budget Visibility** - Track pending changes separate from committed costs
4. **Audit Trail** - Complete history of all scope change discussions
5. **Change Order Pipeline** - Convert approved changes to formal change orders

## Key Features Documented

### List View
- **Columns**: #, Title, Scope, Type, Reason, Status, Origin, ROM totals, Prime/Commitment totals
- **Filters**: Search, Add Filter dropdown
- **Actions**: Recover, View per row
- **Tabs**: Detail, Summary, RFQs, Recycle Bin
- **Export**: Multiple format options
- **Create**: + Create button

### Create Form (12 Primary Fields)

1. **Number** - Auto-generated sequential (001, 002...), editable
2. **Title** - Required text, max 255 chars
3. **Status** - Dropdown (Open, Pending Approval, Approved, Rejected, Closed)
4. **Origin** - Optional, project-specific list
5. **Type** - Required, 8 options (Owner Change, Design Change, etc.)
6. **Change Reason** - Required, filtered by Type
7. **Scope** - Required (TBD, In Scope, Out of Scope)
8. **Expecting Revenue** - Yes/No radio buttons
9. **Line Item Revenue Source** - Conditional dropdown (4 methods)
10. **Prime Contract** - Conditional, for markup calculations
11. **Description** - Rich text editor with formatting
12. **Attachments** - Drag & drop, 10MB max per file

### Line Items Grid (10 Fields per Row)

1. Budget Code (select from project budget)
2. Description (text)
3. Vendor (select from project companies)
4. Contract (select from project commitments)
5. Unit of Measure (text - SF, LF, EA, etc.)
6. Quantity (number)
7. Unit Cost (money)
8. Revenue ROM (money, conditional on Expecting Revenue)
9. Cost ROM (money)
10. Non-Committed Cost (money)

## 🗄️ Database Schema Summary

### Primary Table: `change_events` (20 columns)

**Identifiers:**
- id (uuid, PK)
- project_id (uuid, FK → projects)
- number (varchar, unique per project)

**Content:**
- title, type, reason, scope, origin, description (text)

**Revenue Configuration:**
- expecting_revenue (boolean)
- line_item_revenue_source (varchar)
- prime_contract_id (uuid, FK → contracts)

**Status & Audit:**
- status, created_at, updated_at, created_by, updated_by, deleted_at

**Relationships:**
- → projects, contracts, users
- ← line_items, attachments, history, approvals

### Supporting Tables

| Table | Rows per Change Event | Purpose |
|-------|----------------------|---------|
| change_event_line_items | 5-50 | Cost/revenue line items with budget code references |
| change_event_attachments | 0-20 | File attachments (PDFs, images, etc.) |
| change_event_history | 10-100 | Complete audit trail of all changes |
| change_event_approvals | 1-5 | Approval workflow state and responses |

**Total: 5 tables, ~60 total columns**

## 🔄 Workflow States

```
[Created] → [Open] → [Pending Approval] → [Approved] → [Converted]
                ↓           ↓                    ↓
             [Closed]   [Rejected]          [Closed]
```

**Allowed Transitions:**
- Open → Pending Approval, Closed
- Pending Approval → Approved, Rejected, Open
- Approved → Converted, Closed
- Rejected → Open, Closed
- Closed → Open (reopen, requires permission)

**Forbidden Transitions:**
- Open → Approved (must go through Pending Approval)
- Rejected → Approved (must return to Open first)
- Converted → Any (final state)

## 🔗 Integration Points

| Module | Integration Type | Data Exchange |
|--------|-----------------|---------------|
| **Budget** | Line item references | Budget codes, cost/revenue amounts |
| **Change Orders** | One-click conversion | All data, maintains link |
| **Commitments** | Contract references | Vendors, contracts, line items |
| **Prime Contracts** | Markup calculations | Markup %, revenue formulas |
| **RFI** | Origin linking | Create from RFI, maintain reference |
| **Documents** | File storage | Shared storage, same permissions |

## 📈 Business Rules

### Auto-Numbering
```
Format: 001, 002, 003... (3 digits, zero-padded)
Logic: MAX(number) + 1 per project
Editable: Yes, but must remain unique
Gaps: Not allowed (sequential only)
```

### Revenue Calculation (4 Methods)

1. **Match Revenue to Latest Cost**
   ```
   Revenue = Cost × (1 + Prime Contract Markup %)
   Auto-updates when cost changes
   Most common method
   ```

2. **Manual Entry**
   ```
   User enters revenue directly
   No automatic calculation
   Used for negotiated amounts
   ```

3. **Percentage Markup**
   ```
   Revenue = Cost × (1 + Custom Markup %)
   User specifies markup
   Independent of prime contract
   ```

4. **Fixed Amount**
   ```
   Revenue = Fixed value
   Cost can vary
   Used for lump-sum changes
   ```

### Scope Classification

| Scope | Meaning | Revenue Expected | Typical Use Case |
|-------|---------|------------------|------------------|
| **TBD** | To be determined | Unknown | Initial entry, investigating |
| **In Scope** | Within original contract | No | Design clarifications |
| **Out of Scope** | Beyond original contract | Yes | Additional work, owner requests |
| **Allowance** | Contract allowance | Maybe | Pre-allocated budget items |

## 🚀 Implementation Roadmap

### Phase 1: Foundation
- [ ] Create database tables and indexes
- [ ] Implement basic CRUD operations
- [ ] Build list view with sorting/filtering
- [ ] Create form UI (no logic yet)

### Phase 2: Core Functionality
- [ ] Form validation and submission
- [ ] Line items data grid
- [ ] File upload/attachment handling
- [ ] Type/Reason cascading logic

### Phase 3: Revenue Logic
- [ ] Revenue toggle functionality
- [ ] 4 calculation methods
- [ ] Prime contract integration
- [ ] Auto-calculation engine

### Phase 4: Workflow
- [ ] Status management
- [ ] Approval workflow engine
- [ ] Notifications (email + in-app)
- [ ] Audit trail tracking

### Phase 5: Integrations
- [ ] Budget module integration
- [ ] Change order conversion
- [ ] Commitments linking
- [ ] RFI integration

### Phase 6: Polish
- [ ] Reports and analytics
- [ ] Bulk operations
- [ ] Import/export
- [ ] Mobile responsive
- [ ] Performance optimization

## 📝 Field Count Summary

| Category | Count | Details |
|----------|-------|---------|
| **Primary Form Fields** | 12 | Number, Title, Status, Origin, Type, Reason, Scope, Revenue toggle, Revenue source, Prime contract, Description, Attachments |
| **Line Item Fields** | 10 | Budget Code, Description, Vendor, Contract, UOM, Quantity, Unit Cost, Revenue ROM, Cost ROM, Non-Committed Cost |
| **Database Columns** | ~60 | Across 5 tables |
| **Form Groups** | 6 | General Info, Classification, Revenue, Description, Attachments, Line Items |
| **Validation Rules** | 10+ | Title required, Type/Reason match, Revenue conditionals, etc. |
| **Status States** | 6 | Open, Pending, Approved, Rejected, Closed, Converted |
| **Type Options** | 8 | Owner Change, Design Change, Allowance, etc. |
| **Revenue Methods** | 4 | Match Cost, Manual, Percentage, Fixed |

## 🎯 Testing Checklist

### Form Testing
- [ ] All 12 primary fields render correctly
- [ ] Auto-numbering increments properly
- [ ] Type/Reason cascade works
- [ ] Revenue toggle shows/hides fields correctly
- [ ] Prime contract dropdown populates
- [ ] Rich text editor works (bold, italic, lists)
- [ ] File upload accepts valid files
- [ ] File upload rejects files > 10MB

### Line Items Testing
- [ ] Add line item works
- [ ] Edit line item works
- [ ] Delete line item works
- [ ] Budget code dropdown populates
- [ ] Vendor dropdown filtered to project
- [ ] Contract dropdown filtered to project
- [ ] Quantity × Unit Cost calculates correctly
- [ ] Revenue auto-calculates (if enabled)
- [ ] Totals row sums correctly
- [ ] Sort order maintained

### Workflow Testing
- [ ] Create change event (status = Open)
- [ ] Edit while Open
- [ ] Cannot edit while Pending/Approved/Closed
- [ ] Submit for approval transitions to Pending
- [ ] Approvers receive notifications
- [ ] Approve transitions to Approved
- [ ] Reject transitions to Rejected
- [ ] Convert creates change order
- [ ] Close from any valid state
- [ ] Audit trail records all changes

### Integration Testing
- [ ] Budget codes load from budget module
- [ ] Vendors load from directory
- [ ] Contracts load from commitments
- [ ] Prime contract provides markup %
- [ ] Convert to change order works
- [ ] Change order links back to change event
- [ ] Attachments stored in document storage

### Performance Testing
- [ ] List view loads < 2 seconds with 500 change events
- [ ] Form loads < 1 second
- [ ] Line items grid handles 50+ rows
- [ ] File upload handles 10MB files
- [ ] Audit trail query < 1 second
- [ ] Summary view aggregations < 2 seconds

## 📚 Related Documentation

### Internal Links
- [Change Events Schema](./schema.md) - Complete database design
- [Create Form Mapping](./forms/form-create-change-event.md) - Field-by-field documentation
- [Workflow & Rules](./workflow.md) - Complete workflow documentation

### Related Modules
- [Budget Module](../budget/) - Budget integration
- [Change Orders Module](../change-orders/) - Conversion target
- [Commitments Module](../commitments/) - Contract references
- [Prime Contracts Module](../prime-contracts/) - Markup source

### Capture Metadata
- **Captured Date**: 2026-01-08
- **Procore URL**: https://us02.procore.com/562949954728542/project/change_events
- **Project**: 24-104 - Goodwill Bart (ID: 562949954728542)
- **Capture Method**: Playwright automated browser capture + manual analysis
- **Screenshots**: `scripts/screenshot-capture/change-events-capture/`
- **Total Captures**: 2 main views + form sections + metadata

## 🔍 Keywords

change events, change management, scope changes, ROM estimates, rough order of magnitude, change orders, budget modifications, approval workflow, project changes, construction changes, design changes, owner changes, allowances, scope gaps, unforeseen conditions, value engineering, constructability issues, change tracking, change log, change register

**Last Updated**: 2026-01-08 by Claude (Automated Capture System)

### 3. [Forms](./forms.md)

There was a forms.md file originally but it looks like it was deleted. This file should begin with listing in the forms that were created, and then having a table for each of the forms that has a column for the name, description, field type, ect.