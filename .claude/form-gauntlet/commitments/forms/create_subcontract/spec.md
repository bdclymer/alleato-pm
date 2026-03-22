# Form Spec: Create Subcontract

**form_id:** create_subcontract
**Title:** Create Subcontract
**URL Path:** /67/commitments/new?type=subcontract
**How to Open:** Navigate directly to the URL

## Fields
| Field | Type | Required | Test Value |
|-------|------|----------|------------|
| title | text | yes | "Test Subcontract SC-GAUNTLET-001" |
| contractNumber | text | yes | "SC-GAUNTLET-001" |
| status | select | yes | "Draft" |
| contractCompanyId | vendor combobox | yes | first available vendor in list |
| executed | checkbox | no | leave unchecked |
| defaultRetainagePercent | number | no | 10 |
| accountingMethod | select | no | "amount_based" |
| description | textarea | no | "Created by form gauntlet" |

## Submit Action
Primary submit button ("Create Subcontract" or "Save")

## Success Criteria
- [ ] After submit, browser redirects to /67/commitments
- [ ] New subcontract with title "Test Subcontract SC-GAUNTLET-001" or number "SC-GAUNTLET-001" appears in the commitments list table
- [ ] No error toast or error alert is shown

## Cleanup
Delete the test subcontract after verification (via row action or recycle bin)
