# Procore Prime Contracts — Reference Specification
Generated: 2026-02-23 (from static crawl data)

## 1. Page Layout & Navigation

- **Path**: `/tools/contracts/prime_contracts`
- **Layout**: Global nav → Toolbar → Filter Panel (collapsible) → AG-Grid table → Pagination

### Toolbar Actions
| Button | Type | Purpose |
|--------|------|---------|
| Create | Primary CTA | Launch create form |
| Export | Dropdown | CSV / Excel download |
| Filters | Toggle | Show/hide filter panel |
| Configure | Toggle | Customize visible columns |
| Clear All Filters | Secondary | Reset active filters |
| Search (Cmd+K) | Icon | Global search |

---

## 2. List View — Table Columns

| Column | Type | Sortable | Filterable |
|--------|------|----------|-----------|
| Contract Number | Text | Yes | Yes |
| Contract Name / Title | Text | Yes | Yes |
| Contractor / Vendor | Text | Yes | Yes |
| Owner / Client | Text | Yes | Yes |
| Status | Enum | Yes | Yes |
| ERP Status | Enum | Yes | Yes (system-managed) |
| Amount | Currency | Yes | Yes |
| Start Date | Date | Yes | Yes |
| End Date / Estimated Completion | Date | Yes | Yes |
| Executed | Boolean | Yes | Yes |

### Status Values
Draft → Out for Bid → Out for Signature → Approved → Complete → Terminated → Executed

### Table Capabilities
- Pagination (configurable rows per page)
- Multi-column sort
- Multi-select filters
- Column reordering via Configure
- CSV / Excel export

---

## 3. Create / Edit Form Fields

| # | Field | Type | Required | Notes |
|---|-------|------|----------|-------|
| 1 | Contract # | Text | No | Auto-generated or manual |
| 2 | Title | Text | **Yes** | Primary identifier |
| 3 | Owner / Client | Select | No | Company picker |
| 4 | Status | Enum | **Yes** | Default: Draft |
| 5 | Executed (toggle) | Boolean | No | Marks contract as executed |
| 6 | Default Retainage % | Number | No | 0–100 |
| 7 | Contractor | Select | No | Company picker |
| 8 | Architect / Engineer | Select | No | Company picker |
| 9 | Description | Rich Text | No | TinyMCE editor |
| 10 | Attachments | File Upload | No | PDF, DOC, XLS, images, max 10MB |
| 11 | Schedule of Values | Repeating Section | No | Add Group → Add Line (Budget Code, Description, Amount) |
| 12 | Inclusions | Rich Text | No | |
| 13 | Exclusions | Rich Text | No | |
| 14 | Start Date | Date | No | |
| 15 | Estimated Completion Date | Date | No | |
| 16 | Substantial Completion Date | Date | No | |
| 17 | Actual Completion Date | Date | No | |
| 18 | Signed Contract Received Date | Date | No | |
| 19 | Contract Termination Date | Date | No | |
| 20 | Privacy | Boolean | No | Default: Private |

### SOV (Schedule of Values) Structure
- Group → Lines
- Line fields: #, Budget Code, Description, Amount, Billed to Date, Amount Remaining
- Import via CSV or Excel
- Totals row: Amount / Billed / Remaining

---

## 4. Row-Level Actions
- Click row → Detail / Edit view
- Context menu: View, Edit, Delete (inferred)
- Multi-select → Bulk export / delete

---

## 5. Key Behaviors
- Form validation fires on submit (Contract # and Title required)
- SOV accounting method: Amount-based by default; can switch to Unit/Quantity
- Private by default (admin + selected users only)
- 0 console errors observed in live form test

---

## 6. Data Relationships
```
Prime Contract
├── Schedule of Values (SOV line items)
├── Change Orders
├── Owner Invoices
└── Attachments
```

---

## 7. Required API Endpoints
- GET  /api/projects/[projectId]/prime-contracts          — List
- POST /api/projects/[projectId]/prime-contracts          — Create
- GET  /api/projects/[projectId]/prime-contracts/[contractId] — Detail
- PUT  /api/projects/[projectId]/prime-contracts/[contractId] — Update
- DELETE /api/projects/[projectId]/prime-contracts/[contractId] — Delete
