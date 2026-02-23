# PLANS - PRIME CONTRACTS

## Overview

The Prime Contracts tool in Procore allows you to easily create and manage a contract with an upstream client, and keep track of all change orders and related items.

Create a prime contract that includes a comprehensive schedule of values and manage contract access permissions

Import a schedule of values from CSV or add line items manually by cost code

Email completed contracts to key stakeholders and change the contract status when approved

Manage the Prime Contract Change Order (PCCO) process and approval workflow

## UI Pages

- **List View:** `/frontend/src/app/[projectId]/contracts/page.tsx` 🔴
- **Detail View:** `/frontend/src/app/[projectId]/contracts/[id]/page.tsx` 🔴
- **Create Form:** `/frontend/src/app/[projectId]/contracts/new/page.tsx` 🔴
- **Edit Form:** `/frontend/src/app/[projectId]/contracts/[id]/edit/page.tsx` 🔴

### Columns Visible

| Title                         | Description                                   | Formula / Value                                | Data Type        | Source / Dependency                     | UX / Notes                          |
| ----------------------------- | --------------------------------------------- | ---------------------------------------------- | ---------------- | --------------------------------------- | ----------------------------------- |
| Number                        | Unique identifier for the prime contract      | User-defined or auto-generated contract number | String           | `prime_contracts.number`                | Clickable → opens contract detail   |
| Owner / Client                | Entity that owns the contract (client)        | Selected organization / company                | Entity reference | `companies` / `clients` table           | Filterable                          |
| Title                         | Descriptive name of the prime contract        | Free-text title                                | String           | `prime_contracts.title`                 | Used heavily for search             |
| Status                        | Contract lifecycle state                      | Enum (Draft, Approved, Executed, etc.)         | Enum             | `prime_contracts.status`                | Controls editability                |
| Executed                      | Indicates if contract has been fully executed | Yes / No                                       | Boolean          | `prime_contracts.executed_at != null`   | Often gated by signatures           |
| Original Contract Amount      | Initial contract value before changes         | Base contract amount                           | Currency         | `prime_contracts.original_amount`       | Baseline for all calculations       |
| Approved Change Orders        | Sum of all **approved** change orders         | `SUM(approved CO amounts)`                     | Currency         | `change_orders WHERE status = approved` | Impacts revised contract            |
| Revised Contract Amount       | Total contract value including approved COs   | `Original + Approved COs`                      | Currency         | Derived                                 | **Key financial truth source**      |
| Pending Change Orders         | Sum of submitted but unapproved COs           | `SUM(pending CO amounts)`                      | Currency         | `change_orders WHERE status = pending`  | Forecast-only                       |
| Draft Change Orders           | Sum of draft COs                              | `SUM(draft CO amounts)`                        | Currency         | `change_orders WHERE status = draft`    | Internal planning only              |
| Invoiced                      | Total amount invoiced to date                 | `SUM(invoice line items)`                      | Currency         | `invoices`                              | Must reconcile with billing periods |
| Payments Received             | Total payments collected                      | `SUM(payments)`                                | Currency         | `payments`                              | Used for % Paid                     |
| % Paid                        | Portion of revised contract paid              | `Payments Received ÷ Revised Contract`         | Percentage       | Derived                                 | Should guard divide-by-zero         |
| Remaining Balance Outstanding | Amount still owed                             | `Revised Contract − Payments Received`         | Currency         | Derived                                 | Critical AR metric                  |
| Private                       | Visibility flag                               | Yes / No                                       | Boolean          | `prime_contracts.is_private`            | Controls permissions                |
| Attachments                   | Count of attached files                       | `COUNT(files)`                                 | Integer          | `attachments`                           | Opens attachment drawer             |
