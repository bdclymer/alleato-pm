# Change Events Workflow & Business Rules

## Overview

Change Events in Procore manage the complete lifecycle of project scope changes, from initial identification through approval and potential conversion to change orders. This document details the workflows, state transitions, business rules, and user interactions.

## Workflow States

### State Diagram

```
[Created] → [Open] → [Pending Approval] → [Approved] → [Converted to Change Order]
                ↓           ↓                    ↓
              [Closed]   [Rejected]          [Closed]
```

### State Definitions

| Status | Description | Allowed Actions | Next States |
|--------|-------------|-----------------|-------------|
| **Open** | Initial state, change event is being drafted | Edit, Add Line Items, Attach Files, Submit for Approval, Close | Pending Approval, Closed |
| **Pending Approval** | Submitted for review by stakeholders | View, Add Comments, Approve, Reject | Approved, Rejected, Open (if recalled) |
| **Approved** | Change event has been approved | View, Convert to Change Order, Close | Converted, Closed |
| **Rejected** | Change event was not approved | View, Edit (to resubmit), Close | Open, Closed |
| **Closed** | Change event is finalized/archived | View only (read-only) | - |
| **Converted** | Change event became a change order | View only (read-only), View Related Change Order | - |

## Workflow Processes

### 1. Create Change Event

**User Roles:** Project Manager, Superintendent, Estimator

**Process:**
1. User navigates to Change Events tool
2. Clicks "+ Create" button
3. Fills out form:
   - Number (auto-generated, editable)
   - Title (required)
   - Type & Reason
   - Scope classification
   - Revenue expectation
   - Description
4. Optionally adds line items with cost/revenue estimates
5. Optionally attaches supporting documents
6. Clicks "Create" button
7. Change event is saved with status "Open"

**Business Rules:**
- Number must be unique within project
- Title is required (max 255 characters)
- Type and Scope must be selected
- System logs creation in audit trail
- Creator is automatically set as "created_by"

---

### 2. Edit Change Event

**User Roles:** Creator, Project Manager, Assigned Approvers

**Process:**
1. User opens existing change event
2. Clicks "Edit" button
3. Modifies fields
4. Saves changes

**Business Rules:**
- Only editable when status is "Open" or "Rejected"
- Cannot edit "Pending Approval", "Approved", "Converted", or "Closed" statuses
- Number can be changed but must remain unique
- All changes are logged in change_event_history table
- Updated_at timestamp is refreshed
- Updated_by is set to current user

---

### 3. Add Line Items

**User Roles:** Creator, Project Manager, Estimator

**Process:**
1. Open change event detail view
2. Scroll to "Line Items" section
3. Click "Add Line" button
4. Fill in line item details:
   - Budget Code (optional)
   - Description
   - Vendor (optional)
   - Contract (optional)
   - Quantity & Unit of Measure
   - Unit Cost
   - Revenue ROM (if expecting revenue)
   - Cost ROM
5. Save line item
6. Repeat for additional line items

**Business Rules:**
- Line items can be added when status is "Open" or "Rejected"
- Revenue fields only visible if "Expecting Revenue" = Yes
- Budget Code selection is optional but recommended
- Multiple line items can reference same budget code
- Totals automatically calculated at bottom
- Line items maintain sort order for display

**Bulk Operations:**
- "Add Lines for All Commitments" - Creates line items from all project commitments
- "Import Line Items from CSV" - Bulk upload from spreadsheet

---

### 4. Submit for Approval

**User Roles:** Creator, Project Manager

**Process:**
1. Open change event (status = "Open")
2. Click "Submit for Approval" button
3. System validates:
   - Title is present
   - At least one line item exists (recommended, not required)
   - All required fields completed
4. Status changes to "Pending Approval"
5. Notification sent to designated approvers
6. Approval workflow begins

**Business Rules:**
- Can only submit when status = "Open"
- Approvers are configured at project level (default: PM, Owner Rep)
- Notifications sent via email and in-app
- Change event becomes read-only during approval process
- Creator can recall submission (returns to "Open")

---

### 5. Approval Process

**User Roles:** Designated Approvers, Project Manager, Owner Representative

**Process:**
1. Approver receives notification
2. Opens change event
3. Reviews details, line items, attachments
4. Has three options:
   - **Approve**: Change event is approved
   - **Reject**: Returns to creator with comments
   - **Request Changes**: Add comments requesting modifications

**Approval Logic:**
- If all required approvers approve → Status = "Approved"
- If any approver rejects → Status = "Rejected"
- If approver requests changes → Notification sent to creator, status remains "Pending Approval"

**Business Rules:**
- Multiple approvers can be configured (serial or parallel approval)
- Serial: Each approver must approve in sequence
- Parallel: All approvers can approve simultaneously
- Comments are required when rejecting
- Approval timestamp recorded in change_event_approvals table
- Original creator notified of approval/rejection

---

### 6. Handle Rejection

**User Roles:** Creator, Project Manager

**Process:**
1. Creator receives rejection notification
2. Opens change event (status = "Rejected")
3. Reviews rejection comments
4. Clicks "Edit" to make changes
5. Updates change event based on feedback
6. Re-submits for approval

**Business Rules:**
- Rejected change events can be edited
- Audit trail maintains rejection reason and comments
- New submission creates new approval request
- Previous approvals are cleared
- Rejection count tracked for reporting

---

### 7. Convert to Change Order

**User Roles:** Project Manager, Contracts Administrator

**Process:**
1. Open approved change event (status = "Approved")
2. Click "Convert to Change Order" button
3. System creates new change order:
   - Copies all line items
   - Copies description and attachments
   - Links back to original change event
   - Sets change order status to "Draft"
4. Change event status → "Converted"
5. User redirected to new change order

**Business Rules:**
- Can only convert when status = "Approved"
- One change event can generate multiple change orders (split by commitment)
- Original change event remains viewable
- Link maintained between change event and resulting change orders
- Line items copied with ROM values as initial estimates
- Budget codes preserved in conversion

---

### 8. Close Change Event

**User Roles:** Project Manager, Creator

**Process:**
1. Open change event
2. Click "Close" button
3. Confirm closure
4. Status → "Closed"

**Business Rules:**
- Can be closed from any status except "Converted"
- Closed change events are read-only
- Still visible in lists with filter
- Can be reopened by project manager
- Closing requires confirmation dialog

---

## Revenue Calculation Methods

### 1. Match Revenue to Latest Cost
- System automatically sets Revenue ROM = Cost ROM × (1 + Prime Contract Markup %)
- Recalculates whenever cost changes
- Uses markup percentage from selected prime contract
- Most common method for T&M changes

### 2. Manual Entry
- User enters revenue amounts directly
- No automatic calculation
- Used when pricing is negotiated separately
- Gives full control over revenue estimates

### 3. Percentage Markup
- User sets custom markup percentage
- Revenue = Cost × (1 + Custom Markup %)
- Different from prime contract markup
- Used for specific change types

### 4. Fixed Amount
- Revenue is a flat amount regardless of cost
- Used for lump-sum changes
- Cost can vary, revenue stays fixed

---

## Business Rules Summary

### Access Control
| Role | Create | Edit | Submit | Approve | Convert | Delete |
|------|--------|------|--------|---------|---------|--------|
| Project Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Superintendent | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Estimator | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Owner Rep | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| View Only | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Numbering Rules
- Format: 001, 002, 003... (3 digits, zero-padded)
- Auto-increments from last change event in project
- User can override but must be unique
- Cannot have gaps (001, 002, 004 is invalid)
- Leading zeros maintained (035, not 35)

### Line Item Rules
- Minimum 0 line items (but approval typically requires at least 1)
- No maximum limit on line items
- Each line item has sort_order for display
- Budget code is optional but recommended
- Vendor/Contract are optional references
- Quantity and cost can be estimates (ROM)

### Attachment Rules
- Max file size: 10MB per file
- Unlimited number of files
- Supported formats: PDF, JPG, PNG, XLSX, DOCX, DWG
- Files stored in project document storage
- Same permission model as change event
- Can be added/removed while status = "Open"

### Notification Rules
- Email sent when:
  - Change event submitted for approval
  - Approval granted
  - Approval rejected
  - Comments added
  - Status changed
  - Converted to change order
- In-app notifications for same events
- Digest emails available (daily/weekly)

### Audit Trail Rules
- ALL changes recorded in change_event_history
- Tracks: field name, old value, new value, user, timestamp
- Status changes always logged
- Line item additions/edits logged
- Cannot be deleted or modified
- Visible to project managers

---

## Integration Points

### Budget Module
- Line items can reference budget codes
- Approved change events can create budget modifications
- Budget impact visible on budget detail page
- Budget forecasts include pending change events

### Change Orders Module
- Change events convert to change orders
- Link maintained between entities
- Change order references original change event number
- Line items and attachments copied over

### Commitments Module
- Line items can reference specific commitments
- "Add Lines for All Commitments" bulk action
- Vendor selection filtered to project directory
- Contract selection filtered to active commitments

### RFI Module
- Change events can be created from RFI
- Link to originating RFI maintained
- RFI details copied to description

### Daily Log Module
- Daily logs can reference change events
- Change event activity tracked in project timeline
- Weather/conditions at time of change captured

---

## Reporting & Analytics

### Standard Reports
1. **Change Event Log** - Complete list with status, amounts
2. **Pending Change Events** - All awaiting approval
3. **Change Event Impact** - Revenue vs. cost analysis
4. **Change Event by Type** - Breakdown by category
5. **Change Event Trend** - Volume over time
6. **Approval Turnaround Time** - Days from submission to approval

### Key Metrics
- Total number of change events
- Total revenue ROM
- Total cost ROM
- Potential profit (revenue - cost)
- Average approval time
- Approval rate (approved / total submitted)
- Conversion rate (converted to CO / approved)

---

## Best Practices

### For Project Managers
1. Establish clear approval thresholds
2. Set up automatic numbering
3. Require line items before submission
4. Use consistent type/reason classifications
5. Link to source documents (RFIs, drawings)
6. Review regularly to prevent backlog

### For Estimators
1. Use budget codes for all line items
2. Be conservative with ROM estimates
3. Reference commitments when known
4. Include markup in revenue calculations
5. Document assumptions in description
6. Update estimates as design clarifies

### For Owners
1. Respond to approval requests promptly
2. Provide clear rejection reasons
3. Use comments for questions
4. Review supporting documentation
5. Consider schedule impact
6. Understand cost vs. revenue implications

---

## Common Workflows

### Workflow 1: Owner-Requested Addition
```
1. PM creates change event (Type: Owner Requested)
2. Estimator adds line items with costs
3. PM adds revenue markup
4. PM submits for owner approval
5. Owner reviews and approves
6. PM converts to prime contract change order
7. Change event status → Converted
```

### Workflow 2: Design Change
```
1. Superintendent identifies design discrepancy
2. Creates change event (Type: Design Change)
3. Links to RFI documenting issue
4. Estimator calculates impact
5. PM submits to architect/owner
6. Owner rejects (wants value engineering)
7. Estimator revises with VE options
8. PM resubmits with options
9. Owner approves option B
10. PM converts to change order
```

### Workflow 3: Allowance
```
1. PM creates change event (Type: Allowance)
2. References allowance in contract
3. Adds line items as selections are made
4. Tracks against allowance budget
5. When complete, closes change event
6. No conversion needed (already budgeted)
```

### Workflow 4: Out of Scope Item
```
1. Foreman identifies out-of-scope work
2. Creates change event (Scope: Out of Scope)
3. Adds photos as attachments
4. Estimator prices work
5. PM adds markup
6. PM submits to owner
7. Owner approves
8. PM converts to PCO (potential change order)
9. Negotiation begins
10. When finalized, converts to change order
```

---

## Troubleshooting

### Change Event Won't Submit
- Check that title is filled in
- Verify user has submit permission
- Ensure status is "Open"
- Check for network connectivity

### Can't Edit Change Event
- Verify status is "Open" or "Rejected"
- Check user permissions
- Ensure not locked by another user

### Revenue Not Calculating
- Verify "Expecting Revenue" is set to Yes
- Check that prime contract is selected
- Ensure line items have cost entered
- Verify markup percentage is configured

### Approvals Not Working
- Check approval workflow configuration
- Verify approvers have correct permissions
- Ensure notifications are enabled
- Check email settings

---

## Future Enhancements

Potential improvements to the change events workflow:

1. **AI-Powered Estimates** - Suggest costs based on historical data
2. **Automated Approvals** - Auto-approve below threshold amounts
3. **Mobile App Integration** - Create/approve from field
4. **Photo Markup** - Annotate photos directly
5. **Schedule Impact** - Calculate critical path effects
6. **Budget Forecasting** - Predict final cost with pending changes
7. **Workflow Templates** - Predefined workflows by change type
8. **Bulk Actions** - Approve/reject multiple changes at once

---

## Related Documentation

- [Change Events Schema](./schema-change-events.md)
- [Create Change Event Form](./forms/form-create-change-event.md)
- [Change Orders Integration](../change-orders/integration.md)
- [Budget Module](../budget/README.md)
