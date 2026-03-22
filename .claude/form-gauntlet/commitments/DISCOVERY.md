# Form Discovery: Commitments

Discovered 3 forms across the commitments feature.

---

## Form: create_subcontract

**Title:** Create Subcontract
**URL Path:** /67/commitments/new?type=subcontract
**How to Open:** Navigate directly OR from commitments list → "New Commitment" button → select Subcontract type

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| title | text | yes | "Test Subcontract SC-GAUNTLET-001" |
| contractNumber | text | yes | "SC-GAUNTLET-001" |
| status | select | yes | "Draft" |
| contractCompanyId | vendor select (combobox) | yes | first available vendor |
| executed | checkbox | no | false |
| defaultRetainagePercent | number | no | 10 |
| accountingMethod | select | no | "amount_based" |
| description | textarea | no | "Created by form gauntlet" |

### Submit Action
"Create Subcontract" button (or "Save" / primary submit button)

### Success Criteria
- [ ] Redirected to /67/commitments (list page)
- [ ] New subcontract appears in commitments list with title "Test Subcontract SC-GAUNTLET-001"
- [ ] No error toast or error message displayed

### Cleanup
yes — delete the created subcontract via the commitments list (if delete is available) or via recycle bin

---

## Form: create_purchase_order

**Title:** Create Purchase Order
**URL Path:** /67/commitments/new?type=purchase_order
**How to Open:** Navigate directly OR from commitments list → "New Commitment" button → select Purchase Order type

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| contractNumber | text | yes | "PO-GAUNTLET-001" |
| title | text | no | "Test PO PO-GAUNTLET-001" |
| status | select | yes | "Draft" |
| executed | checkbox | no | false |
| accountingMethod | select | no | "amount" |
| description | textarea | no | "Created by form gauntlet" |

### Submit Action
"Create Purchase Order" button (or primary submit button)

### Success Criteria
- [ ] Redirected to /67/commitments (list page)
- [ ] New purchase order appears in commitments list with number "PO-GAUNTLET-001"
- [ ] No error toast or error message displayed

### Cleanup
yes — delete via recycle bin or list delete action

---

## Form: edit_commitment

**Title:** Edit Commitment (Inline)
**URL Path:** /67/commitments/[commitmentId]?edit=1
**How to Open:** Navigate to a commitment detail page → click "Edit" button; OR navigate directly to /67/commitments/[commitmentId]?edit=1 (triggers edit mode)

### Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| contractNumber | text | yes | (existing value, append "-EDITED") |
| title | text | yes | (existing value + " EDITED") |
| contractCompanyId | combobox/select | no | (keep existing) |
| status | select | yes | "Draft" |
| accountingMethod | select | no | (keep existing) |
| description | textarea | no | "Updated by form gauntlet" |
| startDate | date | no | "2025-01-01" |
| completionDate | date | no | "2025-12-31" |

### Submit Action
"Save" button (or "Save Changes" in the edit header)

### Success Criteria
- [ ] Success toast shown (e.g. "Saved", "Changes saved", "Commitment updated")
- [ ] Edit mode exits (form becomes read-only view)
- [ ] Updated title/description is visible on the page

### Cleanup
no — editing existing data, revert would require re-editing
