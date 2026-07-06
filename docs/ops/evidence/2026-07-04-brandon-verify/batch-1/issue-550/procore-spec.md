# Procore Spec Notes: Change Events

**Sources**
- Procore Change Events overview: https://v2.support.procore.com/product-manuals/change-events-project
- Create Change Events: https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-change-events
- Edit Change Events: https://v2.support.procore.com/product-manuals/change-events-project/tutorials/edit-change-events
- View Change Events: https://en-gb.support.procore.com/products/online/user-guide/project-level/change-events/tutorials/view-change-events
- Configurable views / list filters: https://v2.support.procore.com/product-manuals/admin-company/tutorials/set-up-configurable-views-for-the-change-events-list-view

## What Procore exposes on the list route

- Change Events is primarily a list surface with columns for status, scope, type, change reason, origin, and revenue/cost-related columns.
- Procore’s documented list view supports configurable views and filters, but the settings workflow is documented as admin/company configuration, not as a simple table-layout popover.
- The tool’s workflow connects to RFQs, commitments, and potential change orders.

## Relevant documented fields

### List view
- Status
- Scope
- Type
- Change Reason
- Origin
- Prime PCO
- Prime PCO Title
- Cost ROM
- RFQ Title
- Commitment
- Commitment Title

### Create/Edit Change Event
- Budget Code
- Description
- Vendor
- Contract
- Unit of Measure
- Quantity
- Unit Cost
- Revenue ROM
- Non-Committed Cost

## Settings implication for issue #550

The Procore materials support configurable views and admin-level Change Management configuration. They do not imply that the exact list route should present a generic table-settings UI as a substitute for real tool settings.
