# API Contracts — Frontend (Next.js Route Handlers)

> Generated: 2026-03-22 | Scan level: deep
> Base path: `frontend/src/app/api/`

All routes use Next.js App Router Route Handlers (`route.ts`). Parameter naming convention: `[projectId]`, `[companyId]`, `[contractId]` — never generic `[id]`.

---

## Authentication & Session

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create new user account |
| GET/POST | `/api/auth/admin-check` | Check admin status |
| GET | `/api/auth/post-login-redirect` | Determine post-login destination |

Auth pattern: Supabase SSR session via `proxy.ts` → `updateSession()`. All requests checked for valid Supabase JWT.

---

## Admin

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/admin/company-context` | Get/set company-wide context for AI |
| GET/POST | `/api/admin/company-knowledge` | Manage company knowledge base |
| POST | `/api/admin/set-admin-status` | Grant/revoke admin privileges |
| POST | `/api/dev/make-admin` | Dev-only: elevate user |
| GET | `/api/dev/schema` | Dev-only: introspect schema |

---

## Projects

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects` | List all projects / create project |
| GET/PATCH/DELETE | `/api/projects/[projectId]` | Get / update / delete project |
| POST | `/api/projects/bootstrap` | Bootstrap new project with defaults |

---

## Budget

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/[projectId]/budget` | Get budget summary |
| POST | `/api/projects/[projectId]/budget/export` | Export budget as CSV/Excel |
| GET/POST | `/api/projects/[projectId]/budget/line-items` | List / create budget line items |
| PATCH/DELETE | `/api/projects/[projectId]/budget/line-items/[lineItemId]` | Update / delete line item |
| GET/POST | `/api/projects/[projectId]/budget/modifications` | Budget modifications |
| GET | `/api/projects/[projectId]/budget/history` | Budget change history |

---

## Prime Contracts

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[projectId]/prime-contracts` | List / create prime contracts |
| GET/PATCH/DELETE | `/api/projects/[projectId]/prime-contracts/[contractId]` | Get / update / delete |
| GET/POST | `/api/projects/[projectId]/prime-contract-change-orders` | List / create PCCOs |
| GET/PATCH/DELETE | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]` | Get / update / delete PCCO |
| POST | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/approve` | Approve PCCO |
| POST | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/reject` | Reject PCCO |
| GET/POST | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments` | Manage attachments |
| DELETE | `/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments/[attachmentId]` | Delete attachment |
| GET | `/api/projects/[projectId]/prime-contract-change-orders/export` | Export PCCOs |
| GET/POST | `/api/projects/[projectId]/vertical-markup` | Get / set vertical markup |
| POST | `/api/projects/[projectId]/vertical-markup/calculate` | Recalculate markup |

---

## Commitments (Subcontracts / Purchase Orders)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/commitments` | List / create commitments |
| GET/PATCH/DELETE | `/api/commitments/[id]` | Get / update / delete commitment |
| GET/POST | `/api/commitments/[id]/change-orders` | List / create commitment change orders |
| GET/PATCH/DELETE | `/api/commitments/[id]/change-orders/[changeOrderId]` | Get / update / delete CCO |
| POST | `/api/commitments/[id]/change-orders/[changeOrderId]/approve` | Approve CCO |
| GET/POST | `/api/commitments/[id]/attachments` | Manage attachments |
| DELETE | `/api/commitments/[id]/attachments/[attachmentId]` | Delete attachment |
| GET/POST | `/api/commitments/[id]/invoices` | List / create commitment invoices |
| GET/POST | `/api/commitments/[id]/advanced-settings` | Advanced settings |
| POST | `/api/commitments/[id]/email` | Email commitment |
| GET | `/api/commitments/[id]/export` | Export commitment |
| POST | `/api/commitments/[id]/restore` | Restore soft-deleted commitment |
| DELETE | `/api/commitments/[id]/permanent-delete` | Hard delete |
| POST | `/api/projects/[projectId]/subcontracts` | Create subcontract |
| GET/POST | `/api/projects/[projectId]/purchase-orders` | Purchase orders |

---

## Change Events

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[projectId]/change-events` | List / create change events |
| GET/PATCH/DELETE | `/api/projects/[projectId]/change-events/[changeEventId]` | Get / update / delete |
| GET/POST | `/api/projects/[projectId]/change-events/[changeEventId]/rfqs` | RFQ management |
| POST | `/api/projects/[projectId]/change-events/[changeEventId]/approve` | Approve change event |

---

## Direct Costs

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[projectId]/direct-costs` | List / create direct costs |
| GET/PATCH/DELETE | `/api/projects/[projectId]/direct-costs/[costId]` | Get / update / delete |

---

## Invoicing

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/invoices` | List / create invoices |
| GET/POST | `/api/projects/[projectId]/invoicing/owner` | Owner invoicing (SOV-based) |
| GET/PATCH/DELETE | `/api/projects/[projectId]/invoicing/owner/[invoiceId]` | Get / update / delete invoice |
| POST | `/api/projects/[projectId]/invoicing/owner/[invoiceId]/submit` | Submit invoice for approval |
| GET/POST | `/api/projects/[projectId]/billing-periods` | Billing periods |

---

## Drawings

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[projectId]/drawings` | List / create drawings |
| GET/PATCH/DELETE | `/api/projects/[projectId]/drawings/[drawingId]` | Get / update / delete drawing |
| GET/POST | `/api/projects/[projectId]/drawing-sets` | Drawing sets |
| GET/POST | `/api/projects/[projectId]/drawing-areas` | Drawing areas |
| POST | `/api/projects/[projectId]/drawings/upload` | Upload drawing file |

---

## Specifications

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[projectId]/specifications` | List / create spec sections |
| GET/PATCH/DELETE | `/api/projects/[projectId]/specifications/[sectionId]` | Get / update / delete section |
| GET/POST | `/api/projects/[projectId]/specifications/[sectionId]/revisions` | Spec revisions |
| GET/PATCH/DELETE | `/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]` | Single revision |
| GET | `/api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/download` | Download spec file |
| GET/POST | `/api/projects/[projectId]/specifications/areas` | Specification areas |
| GET/PATCH/DELETE | `/api/projects/[projectId]/specifications/areas/[areaId]` | Get / update / delete area |

---

## Submittals

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[projectId]/submittals` | List / create submittals |
| GET/PATCH/DELETE | `/api/projects/[projectId]/submittals/[submittalId]` | Get / update / delete submittal |

---

## RFIs

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[projectId]/rfis` | List / create RFIs |
| GET/PATCH/DELETE | `/api/projects/[projectId]/rfis/[rfiId]` | Get / update / delete RFI |

---

## Scheduling

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[projectId]/scheduling/tasks` | List / create schedule tasks |
| GET/PATCH/DELETE | `/api/projects/[projectId]/scheduling/tasks/[taskId]` | Get / update / delete task |
| POST | `/api/projects/[projectId]/scheduling/tasks/bulk` | Bulk task operations |
| POST | `/api/projects/[projectId]/scheduling/tasks/import` | Import tasks (CSV/Excel) |

---

## Punch Items

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[projectId]/punch-items` | List / create punch items |
| GET/PATCH/DELETE | `/api/projects/[projectId]/punch-items/[punchItemId]` | Get / update / delete |

---

## Meetings

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[projectId]/meetings` | List / create meetings |
| GET/PATCH/DELETE | `/api/projects/[projectId]/meetings/[meetingId]` | Get / update / delete meeting |
| GET | `/api/projects/[projectId]/meetings/[meetingId]/digest` | AI-generated meeting digest |
| GET/POST | `/api/projects/[projectId]/meetings/[meetingId]/prep` | Meeting prep document |
| POST | `/api/projects/[projectId]/meetings/[meetingId]/prep/generate` | Generate AI meeting prep |
| GET | `/api/meetings/[meetingId]` | Global meeting endpoint |

---

## Directory

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/directory/companies` | List / create directory companies |
| GET/PATCH/DELETE | `/api/directory/companies/[companyId]` | Get / update / delete company |
| GET | `/api/directory/companies/[companyId]/details` | Detailed company info |
| POST | `/api/directory/companies/[companyId]/add-to-project` | Add company to project |
| GET/POST | `/api/directory/project-companies` | Project-company associations |
| GET/POST | `/api/companies` | All companies (global) |
| GET/POST | `/api/contacts` | Contacts |
| GET/POST | `/api/people` | People directory |
| GET/POST | `/api/clients` | Client companies |

---

## Permissions

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects/[projectId]/permissions` | Project permissions |
| POST | `/api/projects/[projectId]/permissions/assign` | Assign role to user |
| POST | `/api/projects/[projectId]/permissions/override` | Override permission |
| GET/POST | `/api/permissions/templates` | Permission templates |
| GET/POST | `/api/projects/[projectId]/vendors` | Project vendors |

---

## AI Assistant

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai-assistant/chat` | Stream AI chat response (Vercel AI SDK) |
| GET/POST | `/api/ai-assistant/conversations` | List / create conversations |
| GET/DELETE | `/api/ai-assistant/conversations/[sessionId]` | Get / delete conversation |
| GET | `/api/ai-assistant/messages/[sessionId]` | Get conversation messages |
| POST | `/api/ai-assistant/feedback` | Submit response feedback |
| GET/POST | `/api/ai-assistant/memories` | AI memory management |
| DELETE | `/api/ai-assistant/memories/[id]` | Delete memory |
| GET | `/api/ai-assistant/usage-stats` | Usage statistics |

---

## RAG Chat

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/rag-chat` | RAG-enhanced chat (Next.js route handler) |
| POST/GET | `/api/rag-chatkit` | OpenAI ChatKit-compatible endpoint |
| POST | `/api/rag-chatkit/bootstrap` | Bootstrap RAG chat session |
| GET/POST | `/api/rag-chatkit/state` | Chat session state |
| POST | `/api/tool-calling` | Generic tool-calling endpoint |
| POST | `/api/primitives/tool-calling` | Primitive tool test endpoint |

---

## Documents & Files

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/documents/upload` | Upload document |
| POST | `/api/documents/trigger-pipeline` | Trigger RAG ingestion pipeline |
| POST | `/api/documents/status` | Check document processing status |
| POST | `/api/documents/[docId]/assign-project` | Assign doc to project |
| POST | `/api/document-center/[recordType]/[recordId]/pdf` | Generate PDF |
| POST | `/api/document-center/[recordType]/[recordId]/email` | Email document |
| GET/POST | `/api/document-center/[recordType]/[recordId]/recipients` | Manage email recipients |
| GET | `/api/files/read` | Read file contents |

---

## Procore Docs / Knowledge

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/procore-docs/ask` | Ask question against Procore docs RAG |
| GET | `/api/docs-search` | Search documentation |
| GET | `/api/docs/check` | Check doc availability |
| GET/POST | `/api/knowledge` | Knowledge base management |

---

## Liveblocks (Real-time Collaboration)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/liveblocks-auth` | Authenticate Liveblocks session |
| GET/POST | `/api/liveblocks/rooms` | Manage collaboration rooms |
| GET/POST | `/api/liveblocks/users` | User presence |
| GET | `/api/liveblocks/users/search` | Search users |
| POST | `/api/liveblocks/webhook` | Liveblocks webhook handler |

---

## ERP Sync (Acumatica)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sync/acumatica/ar-invoices` | Sync AR invoices from Acumatica |
| POST | `/api/sync/acumatica/ar-payments` | Sync AR payments |
| POST | `/api/sync/acumatica/commitments` | Sync commitments/POs |
| POST | `/api/sync/acumatica/direct-costs` | Sync direct costs |
| POST | `/api/sync/acumatica/vendors` | Sync vendor list |

---

## Monitoring & Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check endpoint |
| GET | `/api/monitoring/dashboard` | Monitoring metrics |
| POST | `/api/monitoring/notify` | Send monitoring notification |
| GET | `/api/monitoring/todo-integration` | TODO integration status |
| WebSocket | `/api/monitoring/websocket` | Real-time monitoring feed |
| POST | `/api/notifications/trigger` | Trigger user notification |

---

## Financial Insights

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/financial-insights/alerts` | Get financial alerts |
| POST | `/api/financial-insights/scan` | Run financial scan |
| POST | `/api/financial-insights/cross-reference` | Cross-reference financial data |

---

## Misc / Dev Tools

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/avatar/[personId]` | Generate/fetch avatar |
| POST | `/api/company/logo` | Upload company logo |
| GET | `/api/estimates` | Estimates |
| GET | `/api/estimates/stats` | Estimate statistics |
| GET | `/api/cron/decay-memories` | Cron: decay old AI memories |
| POST | `/api/table-insert` | Generic table insert (dev) |
| POST | `/api/table-update` | Generic table update (dev) |
| POST | `/api/table-delete` | Generic table delete (dev) |
| GET | `/api/table-metadata` | Get table metadata |
| GET | `/api/database-tables-catalog/[schemaName]/[tableName]` | Browse table schema |
| GET | `/api/dev-tools/check-routes` | Check for route conflicts |
| POST | `/api/dev-tools/clear-cache` | Clear Next.js cache |
| POST | `/api/dev-tools/regenerate-types` | Regenerate Supabase types |
| GET/POST | `/api/tasks` | Global task management |
| GET/PATCH/DELETE | `/api/tasks/[taskId]` | Single task |
| POST | `/api/tasks/bulk` | Bulk task operations |
| GET | `/api/og/fetch` | Open Graph metadata fetch |
| GET | `/api/og/proxy` | Open Graph image proxy |
| GET | `/api/supabase-proxy/[...path]` | Supabase REST proxy |

---

## Summary

| Metric | Count |
|--------|-------|
| Total route files | ~150+ |
| API domains | 30+ |
| Project-scoped routes | ~80 |
| Global routes | ~70 |
| AI/RAG routes | 15+ |
| ERP sync routes | 5 |
| GitHub Actions workflows | 9 |
