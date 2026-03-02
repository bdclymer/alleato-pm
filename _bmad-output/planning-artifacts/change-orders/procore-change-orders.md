---
title: procore change orders
description: procore change orders documentation
---

<!-- allow-outside-documentation -->
# Procore Change Orders (Prime Contract) - Key Workflow Notes

## Sources

- <https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/create-a-prime-contract-change-order>
- <https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/approve-or-reject-prime-contract-change-orders>
- <https://v2.support.procore.com/es-419/product-manuals/change-orders-project/tutorials>

## Create a Prime Contract Change Order (PCCO)

- **Required permissions:** Admin level on the project's Prime Contracts tool.
- **Prerequisite:** Prime contract exists (PCCO created from a specific prime contract).
- **Navigation path:** Prime Contracts → open contract → **Create Prime Contract CO**.
- **Field-level guidance surfaced in the tutorial/tooltips:**
  - Status (default statuses; used for workflow state).
  - Private (visibility restricted to admins or privacy list).
  - Due Date (for designated reviewer response).
  - Designated Reviewer (must be a project user with proper permissions; only one reviewer allowed).
  - Invoiced Date, Paid Date.
  - Description (detailed scope/justification).
  - Schedule Impact (number of days added).
  - Revised Substantial Completion Date (updated when status is Approved if enabled).
  - Executed (checkbox once fully executed).
  - Tiered Change Orders: Potential Change Orders (2-tier) or Change Order Requests (3-tier).
- **Submit actions:** Create, Create & Email, or Complete with DocuSign.

## Approve or Reject Prime Contract Change Orders

- **Prerequisite status:** Change order must be in **Pending - In Review** or **Pending - Revised**.
- **Designated Reviewer required:** only that user can submit a reviewer response.
- **Navigation options:**
  - Email notification with "View Online" link.
  - Prime Contracts → open contract → Change Orders tab → View.
  - Change Orders tool → Prime Contracts tab → View.
- **Reviewer response UI:** Reviewer’s Response text area (comments required for rejection). Buttons: **Reject this PCCO** or **Approve this PCCO**.
- **Post-action behavior:**
  - Status updated to Approved or Rejected.
  - Email notification sent to creator.
  - Reviewer name and Review Date recorded.

## Change Orders tutorials index (scope)

- Lists related flows: View change orders, Create, Edit, Approve/Reject for various CO types, and tool configuration (tiers, settings). Useful for future parity checks.
