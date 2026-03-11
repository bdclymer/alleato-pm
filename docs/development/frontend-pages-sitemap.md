# Alleato-Procore Frontend Sitemap

> **Last Updated:** 2026-03-11
> **Total Pages:** 97
> **Table Factory Pages:** 24 (25%)
> **View Mode Legend:** `Split View` = table + persistent detail sidebar, `Standard` = normal full-page table layout

## 1. GLOBAL PAGES

### Authentication & User Management

| Name | Slug | Type | Table Type | Notes |
|------|------|------|------------|-------|
| Login | `/auth/login` | Auth | N/A | User authentication with email/password |
| Sign Up | `/auth/sign-up` | Auth | N/A | New user registration |
| Forgot Password | `/auth/forgot-password` | Auth | N/A | Password recovery flow |
| Update Password | `/auth/update-password` | Auth | N/A | Password change after reset |
| Sign Up Success | `/auth/sign-up-success` | Auth | N/A | Registration confirmation page |
| Auth Error | `/auth/error` | Auth | N/A | Authentication error handler |
| Login 2 | `/auth/login2` | Auth | N/A | Alternative login page (deprecated?) |
| Profile | `/profile` | User Profile | N/A | User profile management |

### Dashboards & Portfolio

| Name | Slug | Type | Table Type | Notes |
|------|------|------|------------|-------|
| Portfolio Home | `/` | Dashboard | Custom | Project portfolio view with filters |
| Dashboard | `/dashboard` | Dashboard | DataTable (Legacy) | Overview dashboard with metrics |
| Executive Intelligence | `/executive` | Dashboard | N/A | Executive-level insights and reports |

### Company Directory Pages

| Name | Slug | Type | Table Type | View Mode | Notes |
|------|------|------|------------|-----------|-------|
| Directory Home | `/directory` | Directory | N/A | N/A | Directory navigation hub |
| Companies Directory | `/directory/companies` | Table | GenericDataTable | Split View | ✅ Global company management with infinite scroll |
| Vendors Directory | `/directory/vendors` | Table | GenericDataTable | Split View | ✅ Global vendor directory |
| Clients Directory | `/directory/clients` | Table | GenericDataTable | Change to Split View | ✅ Client listing (migrated 2026-01-10) |
| Contacts Directory | `/directory/contacts` | Table | GenericDataTable | Change to Split View | ✅ Contact directory (migrated 2026-01-10) |
| Users Directory | `/directory/users` | Table | GenericDataTable | Change to Split View | ✅ User management (migrated 2026-01-10) |
| Employees Directory | `/directory/employees` | Table | EmployeesDataTable | Change to Split View | ⏭️ Employee listing with avatars (needs factory support) |
| Groups Directory | `/directory/groups` | Table | **GenericDataTable** | Change to Split View | ✅ Distribution group management (migrated 2026-01-10) |

### Global Table Pages

| Name | Slug | Type | Table Type | View Mode | Notes |
|------|------|------|------------|-----------|-------|
| Projects | `/(tables)/projects` | Table | GenericDataTable | Standard | ✅ Project listing (migrated 2026-01-10) |
| Infinite Projects | `/(tables)/infinite-projects` | Table | GenericDataTable | Standard | ✅ Projects with infinite scroll (migrated 2026-01-10) |
| Meetings | `/(tables)/meetings` | Table | GenericDataTable | Split View | ✅ Meeting records (migrated 2026-01-10) |
| Infinite Meetings | `/(tables)/infinite-meetings` | Table | GenericDataTable | Standard | ✅ Meetings with inline editing (migrated 2026-01-10) |
| Submittals | `/(tables)/submittals` | Table | GenericDataTable | Standard | ✅ Submittal tracking (migrated 2026-01-10) |
| Drawings | `/(tables)/drawings` | Table | GenericDataTable | Standard | ✅ Drawing management (migrated 2026-01-10) |
| Punch List | `/(tables)/punch-list` | Table | GenericDataTable | Standard | ✅ Punch list items (migrated 2026-01-10) |
| RFIs | `/(tables)/rfis` | Table | GenericDataTable | Standard | ✅ RFI management (migrated 2026-01-10) |
| Daily Log | `/(tables)/daily-log` | Table | GenericDataTable | Standard | ✅ Site daily logs (migrated 2026-01-10) |
| Photos | `/(tables)/photos` | Table | GenericDataTable | Standard | ✅ Photo gallery (migrated 2026-01-10) |
| Emails | `/(tables)/emails` | Table | GenericDataTable | Standard | ✅ Email correspondence (migrated 2026-01-10) |
| Employees | `/(tables)/employees` | Table | EmployeesDataTable | Standard | ⏭️ Employee records w/ photos (updates needed) |
| Documents | `/(tables)/documents` | Table | Custom | Standard | Placeholder - minimal implementation |
| Tasks | `/(tables)/tasks` | Table | GenericDataTable | Split View | ✅ Task tracking/management |
| Issues | `/(tables)/issues` | Table | GenericDataTable | Standard | ✅ Issue tracking |
| Daily Logs | `/(tables)/daily-logs` | Table | GenericDataTable | Standard | ✅ Construction daily logs |
| Daily Recaps | `/(tables)/daily-recaps` | Table | Custom | Change to Split View | Redirect to daily-logs |
| Daily Reports | `/(tables)/daily-reports` | Table | GenericDataTable | Standard | ✅ Daily reporting |
| Notes | `/(tables)/notes` | Table | GenericDataTable | Standard | ✅ Project notes |
| Opportunities | `/(tables)/opportunities` | Table | GenericDataTable | Standard | ✅ Business opportunities |
| Risks | `/(tables)/risks` | Table | GenericDataTable | Standard | ✅ Risk management |
| Insights | `/(tables)/insights` | Table | GenericDataTable | Standard | ✅ AI insights |
| Subcontractors | `/(tables)/subcontractors` | Table | GenericDataTable | Standard | ✅ Subcontractor directory |
| Meeting Segments | `/(tables)/meeting-segments` | Table | GenericDataTable | Standard | ✅ Meeting breakdowns |
| Meetings 2 | `/(tables)/meetings2` | Table | GenericDataTable | Standard | ✅ Alternative meeting view |
| Clients | `/(tables)/clients` | Table | GenericDataTable | Standard | ✅ Client management (migrated 2026-01-10) |
| Companies | `/(tables)/companies` | Table | GenericDataTable | Standard | ✅ Company listing (migrated 2026-01-10) |
| Contacts | `/(tables)/contacts` | Table | GenericDataTable | Standard | ✅ Contact listing (migrated 2026-01-10) |
| Decisions | `/(tables)/decisions` | Table | GenericDataTable | Standard | ✅ Decision tracking |

### Chat & AI Pages

| Name | Slug | Type | Table Type | Notes |
|------|------|------|------------|-------|
| Chat Admin View | `/(chat)/chat-admin-view` | Chat | N/A | Admin chat interface with agent panel |
| RAG Chat | `/(chat)/rag` | Chat | N/A | AI RAG-based chat with document context |
| Chat Tool | `/chat-tool` | Chat | N/A | Tool-calling chatbot interface |
| Chat Demo | `/chat-demo` | Chat | N/A | Demo chat interface |
| Simple Chat | `/simple-chat` | Chat | N/A | Simplified chat UI |
| Team Chat | `/team-chat` | Chat | N/A | Team collaboration chat |
| AI Chat | `/ai-chat` | Chat | N/A | AI assistant chat interface |

### Admin & Development Pages

| Name | Slug | Type | Table Type | Notes |
|------|------|------|------------|-------|
| Admin Tables | `/admin/tables` | Admin | N/A | Database table explorer hub |
| Admin Table Detail | `/admin/tables/[table]` | Admin | Custom | Individual table browser with CRUD |
| Admin Table New | `/admin/tables/[table]/new` | Admin | N/A | Create new table record form |
| Developer Tools | `/dev` | Dev Tool | N/A | Development utilities index |
| Table Generator | `/dev/table-generator` | Dev Tool | N/A | Auto-generate page configs |

### Demo & Reference Pages

| Name | Slug | Type | Table Type | Notes |
|------|------|------|------------|-------|
| Style Guide | `/style-guide` | Demo | N/A | Design system showcase |
| Components | `/components` | Demo | N/A | UI component library |
| Tables Directory | `/tables-directory` | Reference | N/A | Table page reference directory |
| Sitemap View | `/sitemap-view` | Reference | N/A | Visual site structure |
| Sitemap List | `/sitemap-list` | Reference | N/A | Sitemap listing page |
| Responsive Table Demo | `/responsive-table` | Demo | Custom | Responsive table showcase |
| Modal Demo | `/modal-demo` | Demo | N/A | Modal component examples |
| API Docs | `/api-docs` | Reference | N/A | OpenAPI/Swagger documentation |

### Misc Global Pages

| Name | Slug | Type | Table Type | View Mode | Notes |
|------|------|------|------------|-----------|-------|
| Privacy Policy | `/privacy` | Legal | N/A | N/A | Privacy policy content |
| Pipeline | `/pipeline` | Dashboard | N/A | N/A | Sales/project pipeline |
| Stats | `/stats` | Analytics | N/A | N/A | Application statistics |
| Change Orders | `/change-orders` | Table | Custom | Standard | Global change order view |
| Billing Periods | `/billing-periods` | Table | Custom | Standard | Billing period management |
| Supabase Manager | `/supabase-manager.disabled` | Admin | N/A | N/A | Database manager (disabled) |

### Global Form Pages

| Name | Slug | Type | Table Type | Notes |
|------|------|------|------------|-------|
| Form: Contract | `/(forms)/form-contract` | Form | N/A | Contract creation form |
| Form: Project | `/(forms)/form-project` | Form | N/A | New project wizard |
| Form: Purchase Order | `/(forms)/form-purchase-order` | Form | N/A | PO creation form |
| Form: Subcontracts | `/(forms)/form-subcontracts` | Form | N/A | Subcontract creation |
| Form: Invoice | `/(forms)/form-invoice` | Form | N/A | Invoice creation form |
| Form: RFI | `/(forms)/form-rfi` | Form | N/A | RFI submission form |

---

## 2. PROJECT-SPECIFIC PAGES

### Project Home & Navigation

| Name | Slug | Type | Table Type | Notes |
|------|------|------|------------|-------|
| Project Home | `/[projectId]/home` | Dashboard | N/A | Project overview with widgets and activity |
| Project Admin | `/[projectId]/admin` | Admin | N/A | Project administration settings |
| Setup Wizard | `/[projectId]/setup` | Wizard | N/A | Initial project configuration wizard |

### Financial Management

| Name | Slug | Type | Table Type | View Mode | Notes |
|------|------|------|------------|-----------|-------|
| Budget | `/[projectId]/budget` | Table/Dashboard | Custom | Standard | Complex budget UI with 8+ tabs and modals |
| Budget V2 | `/[projectId]/budget-v2` | Table | Custom | Standard | Alternative budget view |
| Budget Setup | `/[projectId]/budget/setup` | Form | N/A | N/A | Budget initialization wizard |
| Budget Line Item New | `/[projectId]/budget/line-item/new` | Form | N/A | N/A | Add new budget line |
| Change Orders | `/[projectId]/change-orders` | Table | GenericDataTable | Standard | ✅ Change order tracking (migrated 2026-01-10) |
| Change Events | `/[projectId]/change-events` | Table | GenericDataTable | Standard | ✅ Change event management (migrated 2026-01-10) |
| Commitments | `/[projectId]/commitments` | Table | GenericDataTable | Standard | ✅ PO & subcontract listing (migrated 2026-01-10) |
| Commitment Detail | `/[projectId]/commitments/[commitmentId]` | Detail | N/A | N/A | Individual commitment detail view |
| Contracts | `/[projectId]/contracts` | Table | GenericDataTable | Standard | ✅ Prime contract management (migrated 2026-01-10) |
| Direct Costs | `/[projectId]/direct-costs` | Table | GenericDataTable | Split View | ✅ Direct cost tracking (migrated 2026-01-10) |
| Invoices | `/[projectId]/invoices` | Table | Custom | Standard | Invoice management and tracking |
| Schedule of Values | `/[projectId]/sov` | Table | GenericDataTable | Standard | ✅ SOV line items (migrated 2026-01-10) |

### Project Operations

| Name | Slug | Type | Table Type | View Mode | Notes |
|------|------|------|------------|-----------|-------|
| Meetings | `/[projectId]/meetings` | Table | GenericDataTable | Standard | ✅ Meeting records with transcripts (migrated 2026-01-10) |
| Tasks | `/[projectId]/tasks` | Table | Custom | Standard | Project task management |
| Daily Log | `/[projectId]/daily-log` | Table | GenericDataTable | Standard | ✅ Site daily logs (migrated 2026-01-10) |
| Schedule | `/[projectId]/schedule` | Table | Custom | Standard | Gantt chart / project schedule |
| Specifications | `/[projectId]/specifications` | Table | Custom | Standard | Project specifications |
| Submittals | `/[projectId]/submittals` | Table | GenericDataTable | Standard | ✅ Submittal management (migrated 2026-01-10) |
| Transmittals | `/[projectId]/transmittals` | Table | Custom | Standard | Transmittal tracking |
| RFIs | `/[projectId]/rfis` | Table | GenericDataTable | Standard | ✅ Request for Information (migrated 2026-01-10) |
| Punch List | `/[projectId]/punch-list` | Table | GenericDataTable | Standard | ✅ Punch list items (migrated 2026-01-10) |
| Reporting | `/[projectId]/reporting` | Report | N/A | N/A | Project reports and analytics |

### Project Documents & Media

| Name | Slug | Type | Table Type | View Mode | Notes |
|------|------|------|------------|-----------|-------|
| Documents | `/[projectId]/documents` | Table | Custom | Standard | Project document library |
| Drawings | `/[projectId]/drawings` | Table | GenericDataTable | Standard | ✅ Engineering drawings (migrated 2026-01-10) |
| Photos | `/[projectId]/photos` | Table | GenericDataTable | Standard | ✅ Project photography (migrated 2026-01-10) |
| Emails | `/[projectId]/emails` | Table | GenericDataTable | Standard | ✅ Email correspondence (migrated 2026-01-10) |

### Project Directory

| Name | Slug | Type | Table Type | View Mode | Notes |
|------|------|------|------------|-----------|-------|
| Directory Home | `/[projectId]/directory` | Directory | N/A | N/A | Project directory navigation |
| Directory Companies | `/[projectId]/directory/companies` | Table | GenericDataTable | Split View | ✅ Project-specific companies (migrated 2026-01-10) |
| Directory Contacts | `/[projectId]/directory/contacts` | Table | GenericDataTable | Standard | ✅ Project contacts (migrated 2026-01-10) |
| Directory Employees | `/[projectId]/directory/employees` | Table | GenericDataTable | Standard | ✅ Project team members (migrated 2026-01-10) |
| Directory Users | `/[projectId]/directory/users` | Table | GenericDataTable | Standard | ✅ Project users (migrated 2026-01-10) |
| Directory Groups | `/[projectId]/directory/groups` | Table | GenericDataTable | Standard | ✅ Project groups (migrated 2026-01-10) |
| Directory Settings | `/[projectId]/directory/settings` | Settings | N/A | N/A | Directory configuration |

### Project Forms

| Name | Slug | Type | Table Type | Notes |
|------|------|------|------------|-------|
| Change Event New | `/[projectId]/change-events/new` | Form | N/A | Create new change event |
| Change Order New | `/[projectId]/change-orders/new` | Form | N/A | Create new change order |
| Commitment New | `/[projectId]/commitments/new` | Form | N/A | Create new commitment (PO/Subcontract) |
| Contract New | `/[projectId]/contracts/new` | Form | N/A | Create new prime contract |
| Invoice New | `/[projectId]/invoices/new` | Form | N/A | Create new invoice |

---

## 3. STATISTICS & SUMMARY

### Pages by Type

| Type | Count | Percentage |
|------|-------|------------|
| Table/List Views | 51 | 53% |
| Forms | 17 | 18% |
| Dashboard/Home | 8 | 8% |
| Directory | 14 | 14% |
| Chat/AI | 7 | 7% |
| Admin/Dev/Demo | 12 | 12% |
| Auth | 7 | 7% |
| Other | 11 | 11% |
| **TOTAL** | **97** | **100%** |

### Table Implementation Breakdown

| Implementation | Count | Status |
|----------------|-------|--------|
| **GenericDataTable** | **46** | ✅ Standardized |
| DataTable (Legacy) | 1 | ⚠️ Needs migration |
| EmployeesDataTable | 1 | ⏭️ Waiting for avatar support |
| DataTablePage Template | 0 | Migrated away |
| Custom Implementation | 3 | Complex use cases |
| **Total Table Pages** | **51** | |

### Recent Migration (2026-01-10)

**Pages Migrated to GenericDataTable:** 14 pages

- ✅ Submittals, Meetings, Drawings, Punch List
- ✅ RFIs, Users, Daily Log, Emails, Photos
- ✅ Infinite Meetings, Infinite Projects, Projects
- ✅ Contacts, Clients

**Held Off:**

- ⏭️ Employees (1 page) - Requires image/avatar column support in factory

### Table Factory Adoption Rate

| Category | Total | Using Factory | Adoption % |
|----------|-------|---------------|------------|
| Global Tables | 27 | 24 | 89% |
| Project Tables | 24 | 22 | 92% |
| **OVERALL** | **51** | **46** | **90%** |

---

## 4. MIGRATION STATUS

### ✅ Completed Migrations

All eligible table pages have been migrated to `GenericDataTable` following standardized patterns:

- Consistent UI/UX across all pages
- Search, filter, sort, export on every table
- Column visibility controls
- Responsive card/list views
- Infinite scroll pagination
- Delete functionality with confirmation

### ⏭️ Pending Migrations

| Page | Reason for Hold | Next Steps |
|------|----------------|------------|
| Employees | Requires avatar/image support | Add image column type to factory |
| Dashboard | Uses specialized metrics | Keep custom (not pure table) |

### 🚫 Won't Migrate

| Page | Reason | Alternative |
|------|--------|------------|
| Budget | Complex 8-tab UI with specialized modals | Custom implementation required |
| Schedule | Gantt chart visualization | Specialized component |
| Executive | Intelligence dashboard | Custom visualization |

---

## 5. NAVIGATION STRUCTURE

### Primary Navigation Groups

```text
├── Portfolio (/)
├── Directory
│   ├── Companies
│   ├── Clients
│   ├── Contacts
│   ├── Users
│   ├── Employees
│   └── Groups
├── Projects
│   └── [Project]
│       ├── Home
│       ├── Financial
│       │   ├── Budget
│       │   ├── Change Orders
│       │   ├── Commitments
│       │   └── Contracts
│       ├── Operations
│       │   ├── Meetings
│       │   ├── Tasks
│       │   ├── RFIs
│       │   └── Submittals
│       ├── Documents
│       │   ├── Drawings
│       │   ├── Photos
│       │   └── Emails
│       └── Directory
│           ├── Companies
│           ├── Contacts
│           └── Users
├── Tables
│   ├── Projects
│   ├── Meetings
│   ├── Tasks
│   ├── Issues
│   └── [... 20+ more]
├── Chat & AI
│   ├── RAG Chat
│   ├── Chat Admin
│   └── AI Chat
└── Admin
    ├── Tables Explorer
    └── Developer Tools
```

---

## 6. KEY PATTERNS & CONVENTIONS

### URL Patterns

| Pattern | Example | Purpose |
|---------|---------|---------|
| `/(route-group)/` | `/(tables)/projects` | Route grouping without URL segment |
| `/[projectId]/` | `/abc-123/budget` | Dynamic project routes |
| `/resource/[id]` | `/clients/456` | Resource detail pages |
| `/resource/new` | `/projects/new` | Resource creation |
| `/(forms)/` | `/(forms)/form-contract` | Form pages group |

### File Naming

All page files: `page.tsx` (Next.js 15 App Router convention)

### Component Patterns

| Pattern | Files | Notes |
|---------|-------|-------|
| GenericDataTable | 46 pages | Declarative config-based tables |
| Server Components | Project home, budgets | Server-side data fetching |
| Client Components | All table pages | Interactive UI with hooks |
| Form Components | 17 form pages | Dedicated form classes |

---

## NOTES

- **Last Major Migration:** 2026-01-10 (14 pages to GenericDataTable)
- **Browser Tested:** All migrated pages verified with Playwright (16/16 tests passing)
- **Quality Checks:** All pages pass TypeScript + ESLint with zero errors
- **Design System:** All migrated pages use Heading, Text, Badge, Button components
- **Table Factory Pattern:** Based on companies/page.tsx reference implementation

---

**Document Maintained By:** Claude Code
**Source:** `/Users/meganharrison/Documents/github/alleato-procore/frontend/src/app/**/*`
**Generation Date:** 2026-01-10
