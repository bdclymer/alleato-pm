# Form Discovery: Prime Contracts
**Discovered:** 2026-03-22
**Tool:** prime-contracts
**Total Forms Found:** 9

## Coverage Notes
- All forms have API routes backing them
- All forms have Zod validation schemas
- Create/Edit use the same `ContractForm` component (30+ fields)
- 4 dialog forms live inside `PrimeContractDialogs.tsx` on the contract detail page
- Delete forms are confirmation-only (no input fields)

---

## Form: create_prime_contract

**Title:** Create Prime Contract
**URL Path:** /67/prime-contracts/new
**How to Open:** Direct page navigation (click "New Prime Contract" button on list page, or navigate directly)

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| contract_number | text | yes | "PC-GAUNTLET-001" |
| title | text | yes | "Gauntlet Test Contract" |
| status | select | no | "draft" |
| owner_client | select (company) | no | leave blank |
| contractor | select (company) | no | leave blank |
| architect_engineer | select (company) | no | leave blank |
| default_retainage | number | no | 10 |
| executed | checkbox | no | false |
| start_date | date | no | 2026-04-01 |
| estimated_completion_date | date | no | 2026-12-31 |
| description | textarea | no | "Automated form gauntlet test contract" |
| inclusions | textarea | no | leave blank |
| exclusions | textarea | no | leave blank |

### Submit Action
"Create Contract" button (or "Save" — check ContractForm submit label in create mode)

### Success Criteria
- [ ] Toast shows "Prime contract created"
- [ ] Browser redirects to /67/prime-contracts/[newId] (detail page)
- [ ] Contract "PC-GAUNTLET-001" appears in the prime contracts list at /67/prime-contracts

### Cleanup
yes — delete the test contract after verification (use delete_single_contract form)

---

## Form: edit_prime_contract

**Title:** Edit Prime Contract
**URL Path:** /67/prime-contracts/[contractId]/edit
**How to Open:** Navigate to an existing contract, find Edit button or navigate to /edit sub-route

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| title | text | yes | "Gauntlet Test Contract EDITED" |
| status | select | no | "approved" |
| description | textarea | no | "Updated by form gauntlet" |

(All other fields same as create — test only a few key edits)

### Submit Action
"Save Changes" or "Update Contract" button

### Success Criteria
- [ ] Toast shows success message
- [ ] Contract title shows "Gauntlet Test Contract EDITED" on the detail page
- [ ] Status badge shows "Approved" on the detail page

### Cleanup
no — leave in edited state; cleaned up when parent contract is deleted

---

## Form: configure_settings

**Title:** Configure Prime Contract Settings
**URL Path:** /67/prime-contracts/configure
**How to Open:** Direct navigation (Settings button on list page, or navigate directly)

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| co_tier_count | button toggle | no | 2 (click "2 Tiers") |
| allow_standard_users_create_pcco | toggle | no | true |
| allow_standard_users_create_pco | toggle | no | true |
| sov_always_editable | toggle | no | true |
| show_markup_on_co_pdf | toggle | no | false |
| show_markup_on_invoice_pdf | toggle | no | false |
| default_distribution_prime_contract | text | no | "test@alleato.com" |
| default_distribution_pcco | text | no | leave blank |
| default_distribution_pco | text | no | leave blank |

### Submit Action
"Save Settings" button (appears in header and at bottom of form)

### Success Criteria
- [ ] Toast shows "Settings saved"
- [ ] Page reloads with saved values (navigate away and back, values persist)

### Cleanup
yes — reset settings back to defaults after verification

---

## Form: delete_single_contract

**Title:** Delete Prime Contract (single)
**URL Path:** /67/prime-contracts
**How to Open:** Row action menu on a contract row → "Delete" option

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| (confirmation dialog — no input fields) | — | — | click "Delete" to confirm |

### Submit Action
"Delete" button in AlertDialog footer

### Success Criteria
- [ ] Toast shows success message (e.g. "Contract deleted")
- [ ] Contract no longer appears in the prime contracts table

### Cleanup
no — this IS the cleanup for create_prime_contract

---

## Form: bulk_delete_contracts

**Title:** Bulk Delete Prime Contracts
**URL Path:** /67/prime-contracts
**How to Open:** Select multiple contracts via checkboxes → bulk action "Delete Selected"

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| (confirmation dialog — no input fields) | — | — | click "Delete" to confirm |

### Submit Action
"Delete" button in AlertDialog footer

### Success Criteria
- [ ] Toast shows success for multiple deletes
- [ ] All selected contracts removed from table

### Cleanup
no — needs pre-existing test contracts to select; skip if no extras available

---

## Form: add_sov_line_item

**Title:** Add Schedule of Values Line Item
**URL Path:** /67/prime-contracts/[contractId]
**How to Open:** On contract detail page → "Add SOV Line" button (or similar) opens modal

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| budget_code | select | no | leave blank |
| line_number | number | yes | 1 |
| description | textarea | yes | "Gauntlet SOV Line Test" |
| quantity | number | no | 2 |
| unit_cost | number | no | 1000.00 |
| unit_of_measure | text | no | "SF" |

### Submit Action
"Add SOV Line" button

### Success Criteria
- [ ] Modal closes after submission
- [ ] New line item appears in the Schedule of Values table on the contract detail page
- [ ] Description shows "Gauntlet SOV Line Test"

### Cleanup
yes — delete the line item after verification (use delete_line_item form)

---

## Form: create_change_order

**Title:** Create Change Order
**URL Path:** /67/prime-contracts/[contractId]
**How to Open:** On contract detail page → "New Change Order" button opens modal

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| change_order_number | text | yes | "CO-GAUNTLET-001" |
| description | textarea | yes | "Gauntlet change order test" |
| amount | number | yes | 5000.00 |
| status | select | no | "draft" |

### Submit Action
"Create Change Order" button

### Success Criteria
- [ ] Modal closes after submission
- [ ] Change order "CO-GAUNTLET-001" appears in the change orders table/tab
- [ ] Amount shows $5,000.00

### Cleanup
yes — delete or reject the change order after verification

---

## Form: reject_change_order

**Title:** Reject Change Order
**URL Path:** /67/prime-contracts/[contractId]
**How to Open:** Change orders tab → row action on a "pending" change order → "Reject" opens modal

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| rejection_reason | textarea | yes | "Rejected by form gauntlet automated test" |

### Submit Action
"Reject Change Order" button (destructive variant)

### Success Criteria
- [ ] Modal closes after submission
- [ ] Change order status changes to "Rejected" in the table
- [ ] Rejection reason is persisted (visible on detail or in row)

### Cleanup
no — CO will be cleaned up when parent contract is deleted

---

## Form: delete_line_item

**Title:** Delete Schedule of Values Line Item
**URL Path:** /67/prime-contracts/[contractId]
**How to Open:** SOV table row → delete icon/action triggers confirmation modal

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| (confirmation dialog — no input fields) | — | — | click "Delete" to confirm |

### Submit Action
"Delete" button in confirmation modal footer

### Success Criteria
- [ ] Modal closes after deletion
- [ ] Line item no longer appears in the SOV table

### Cleanup
no — this IS the cleanup for add_sov_line_item
