# CHANGE EVENT FORMS

## Form 1: Change Event Creation Form
- Location: Change Events > Create
- Permissions: Standard, Admin
- Processing: Insert into change_events table

### Form Fields

| Field Name                          | Type                  |    Required | Default                      | Validation                           | Notes                              |
| ----------------------------------- | --------------------- | ----------: | ---------------------------- | ------------------------------------ | ---------------------------------- |
| Number                              | Text (Auto-generated) |          No | System Generated             | Unique format `###-###`              | Read-only display                  |
| Title                               | Text                  |         Yes | Empty                        | Max 255 chars                        | Core identifier                    |
| Type                                | Select                |         Yes | Owner Change                 | Owner Change / GC Change / SC Change | Dropdown                           |
| Change Reason                       | Select                |        Yes* | *(configurable)*             | Predefined list                      | Configurable per company           |
| Scope                               | Select                |         Yes | In Scope                     | In Scope / Out of Scope              | Budget impact                      |
| Status                              | Select                |          No | Open                         | Open / Closed / Void                 | System-managed initially           |
| Description                         | Text Area             |          No | Empty                        | Max 2000 chars                       | Detailed explanation               |
| Origin                              | Select                |          No | Internal                     | Internal / RFI / Field               | Tracking source                    |
| Expecting Revenue                   | Toggle                |          No | No                           | Boolean                              | Yes/No field                       |
| Line Item Revenue Source            | Select                | Conditional | Match Revenue to Latest Cost | Allowed values list                  | Shows when Expecting Revenue = Yes |
| Prime Contract for Markup Estimates | Link                  |          No | Empty                        | Project Contracts                    | Linked reference                   |
| Vendor                              | Link                  |          No | Empty                        | Directory                            | Contractor/vendor reference        |
| Attachments                         | File Upload           |          No | None                         | Allowed types                        | Multiple files                     |
| Custom Fields                       | Varies                | Conditional | Varies                       | Per configuration                    | Fieldsets                          |


### Form Actions

- Save: Insert/update record
- Save & Add Line Item: Save and navigate to line items
- Save & Create RFQ: Save and open RFQ creation
- Cancel: Return to list without saving
- Delete: Remove change event (soft delete to recycle bin)


## Form 2: Change Event Edit Form
Location: Change Events > {Event} > Edit
Permissions: Standard (own only), Admin
Processing: Update change_events record
Editable Fields

Title
Description
Type
Change Reason
Scope
Expecting Revenue
Line Item Revenue Source
Prime Contract for Markup Estimates
Vendor
Status (Admin only)

Non-Editable Display Fields

Number
Origin
Created Date
Created By
Last Modified Date
Last Modified By


## Form 3: Change Event Line Item Form
Location: Change Events > {Event} > Add Line Item
Permissions: Standard, Admin
Processing: Insert into change_event_line_items table

### Form Fields

| Field Name          | Type      | Required | Default    | Validation                           | Notes                    |
| ------------------- | --------- | -------: | ---------- | ------------------------------------ | ------------------------ |
| Cost Code           | Select    |      Yes | Empty      | Project cost codes                   | WBS hierarchy            |
| Cost Type           | Select    |      Yes | Labor      | Labor / Material / Equipment / Other | Financial categorization |
| Description         | Text      |      Yes | Empty      | Max 500 chars                        | Item details             |
| Unit of Measure     | Select    |      Yes | LS         | Standard units                       | Hour, Day, LS, SF, etc.  |
| Quantity            | Number    |      Yes | 0          | `> 0` decimal                        | Production quantity      |
| Unit Price          | Currency  |      Yes | 0.00       | `>= 0`                               | Individual item cost     |
| Extended Amount     | Currency  |       No | Calculated | Read-only                            | Qty × Unit Price         |
| Markup %            | Number    |       No | 0          | 0–100                                | Financial markup         |
| Commitment          | Link      |       No | Empty      | Project commitments                  | PO/SC link               |
| Production Quantity | Number    |       No | 0          | Decimal                              | Tracking                 |
| Revenue ROM         | Currency  |       No | 0.00       | `>= 0`                               | Revenue potential        |
| Notes               | Text Area |       No | Empty      | Max 1000 chars                       | Additional details       |


Calculation Logic

```
Extended Amount = Quantity × Unit Price
Total with Markup = Extended Amount × (1 + Markup% / 100)
ROM Impact = Extended Amount × Scope Impact Factor
```

## Form 4: RFQ Creation Form
Location: Change Events > {Event} > Create RFQ
Permissions: Standard, Admin
Processing: Insert into rfqs table

### Form Fields

| Field Name      | Type        | Required | Default    | Validation    | Notes              |
| --------------- | ----------- | -------: | ---------- | ------------- | ------------------ |
| Line Item       | Display     |       No | Inherited  | Read-only     | Item quoted        |
| Unit Price      | Currency    |      Yes | 0.00       | `>= 0`        | Collaborator price |
| Extended Amount | Currency    |       No | Calculated | Read-only     | Auto-calculated    |
| Notes           | Text Area   |       No | Empty      | Max 500 chars | Additional notes   |
| Attachment      | File Upload |       No | None       | Multiple      | Supporting docs    |
| Submit Response | Button      |        — | —          | —             | Marks as responded |


### Calculation Logic

Default Due Date = Current Date + 7 days
Total RFQ Amount = Sum of line item extended amounts
Status = Draft → Sent → Response Received → Closed

## Form 5: RFQ Response Form (Collaborator View)
Location: Email Link > RFQ Response
Permissions: Assigned collaborator with Standard+ on Commitments
Processing: Insert into rfq_responses table

### Form Fields

Field NameTypeRequiredDefaultValidationNotesLine ItemDisplayNoInheritedRead-onlyItem being quotedUnit PriceCurrencyYes0.00>= 0Collaborator's priceExtended AmountCurrencyNoCalculatedRead-onlyAuto-calculatedNotesText AreaNoEmptyMax 500 charsAdditional notesAttachmentFile UploadNoNoneMultiple filesSupporting docsSubmit ResponseButton---Mark as responded
