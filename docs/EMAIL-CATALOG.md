# Alleato Email Catalog

All transactional emails sent by the platform. Organized by category with trigger location, template details, configuration, and build status.

**Provider:** [Resend](https://resend.com) via `RESEND_API_KEY`  
**From address:** `notifications@alleato.app` (set by `EMAIL_FROM_ADDRESS` env var)  
**Template system:** React Email components in `frontend/src/emails/`  
**Central sender:** `frontend/src/lib/email/send.ts` — logs every send to `email_events` table  
**Observability:** All sends logged to `email_events` (status: queued → sent/failed, resend_id, idempotency_key)

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Built | React component exists, API route wired, tested |
| ⚠️ Partial | Component exists but trigger incomplete or stubbed |
| 🔲 Planned | Listed in `EmailTemplate` union but no component or route yet |

---

## 1. Auth & Account Emails

| # | Trigger Page | Name | Template ID | Subject Line | Recipients | Body Summary | Component | Attachment | Idempotency | Status |
|---|-------------|------|-------------|-------------|------------|-------------|-----------|-----------|-------------|--------|
| 1 | `/settings/users` → Invite User dialog | **Platform Invitation** | `user-invite` | "You've been invited to Alleato" | Invitee email address | Inviter name, invitee name, role, accept link, 24h expiry | `emails/auth/InviteUser.tsx` | None | `user-invite/{email}` | ✅ Built |
| 2 | `/auth/forgot-password` (Supabase Auth form) | **Password Reset** | `forgot-password` | "Reset your Alleato password" | Requesting user | Reset link, expiry time (60 min), requesting IP | `emails/auth/ForgotPassword.tsx` | None | Per-request | ✅ Built |
| 3 | `/auth/signup` (auto-triggered by Supabase) | **Email Confirmation** | *(Supabase managed)* | "Confirm your email" | Signing-up user | Supabase default — confirmation link | Supabase default template | None | Supabase managed | ✅ Built |
| 4 | Account settings (planned) | **Welcome Email** | `welcome` | TBD | New user | Welcome message, getting-started links | **Not built** | None | — | 🔲 Planned |
| 5 | Password change flow (planned) | **Password Changed** | `password-changed` | TBD | Account owner | Security confirmation of password change | **Not built** | None | — | 🔲 Planned |

### Auth Email Configuration

```env
RESEND_API_KEY=re_...
EMAIL_FROM_ADDRESS="Alleato <notifications@alleato.app>"
NEXT_PUBLIC_APP_URL=https://app.alleato.com
```

**Trigger code:**
- Platform Invitation → `POST /api/settings/users/invite` (`frontend/src/app/api/settings/users/invite/route.ts:95`)
- Password Reset → component ready, no standalone API route yet (Supabase handles delivery)

---

## 2. Schedule of Values (SOV) Emails

| # | Trigger Page | Name | Template ID | Subject Line | Recipients | Body Summary | Component | Attachment | Idempotency | Status |
|---|-------------|------|-------------|-------------|------------|-------------|-----------|-----------|-------------|--------|
| 6 | `/[projectId]/commitments/[commitmentId]?tab=subcontractor-sov` → "Send Notification" button (PM only) | **SOV Invitation** | `sov-invitation` | "Submit your Schedule of Values — {commitment#}" | Invoice contacts on commitment | Commitment #, contract amount, due date (14 days out), submission link, PM name | `emails/subcontractor/SOVInvitation.tsx` | None | `sov-invite/{submissionId}/{email}` | ✅ Built |
| 7 | `/[projectId]/commitments/[commitmentId]?tab=subcontractor-sov` → "Submit" button (subcontractor) | **SOV Submitted — PM Review** | `sov-submitted-to-pm` | "Subcontractor SOV submitted — {commitment#} — review needed" | All Project Managers on project | Subcontractor name, commitment #, contract amount, review link | `emails/subcontractor/SSOVSubmittedToPM.tsx` | None | `sov-submitted/{submissionId}/{pmEmail}` | ✅ Built |
| 8 | SOV approval action (planned) | **SOV Approved** | `sov-approved` | TBD | Invoice contacts | SOV approved confirmation | **Not built** | None | — | 🔲 Planned |
| 9 | SOV rejection action (planned) | **SOV Rejected / Revise & Resubmit** | `sov-rejected` | TBD | Invoice contacts | SOV returned for revision with notes | **Not built** | None | — | 🔲 Planned |
| 10 | Scheduled job (planned) | **SOV Reminder** | `sov-reminder` | TBD | Invoice contacts with pending SOV | Reminder that SOV has not been submitted | **Not built** | None | — | 🔲 Planned |

### SOV Email Details

**Who are "invoice contacts"?** The `invoice_contact_ids` array on a `subcontracts` row — these are people from the project directory designated to submit billing. Set via the commitment detail page.

**PMs are found by:** querying `project_directory_memberships` where `role` contains "project manager" or equals "pm".

**Trigger code:**
- SOV Invitation → `POST /api/projects/[projectId]/commitments/[commitmentId]/subcontractor-sov` with `action: "send_notification"` (`subcontractor-sov/route.ts:697`)
- SOV Submitted to PM → same route, `action: "submit"`, fires `notifyPMsOfSsovSubmission()` fire-and-forget (`subcontractor-sov/route.ts:822`)

---

## 3. Subcontractor Invoice Emails

| # | Trigger Page | Name | Template ID | Subject Line | Recipients | Body Summary | Component | Attachment | Idempotency | Status |
|---|-------------|------|-------------|-------------|------------|-------------|-----------|-----------|-------------|--------|
| 11 | `/[projectId]/invoicing/subcontractor/[invoiceId]` → "Submit for Review" button | **Invoice Submitted — PM Review** | `invoice-submitted-to-pm` | "Invoice {#} from {subcontractor} — review needed" | All Project Managers on project | Subcontractor name, project, invoice #, amount, billing period, review link | `emails/subcontractor/InvoiceSubmittedToPM.tsx` | None | `invoice-submitted/{invoiceId}/{pmEmail}` | ✅ Built |
| 12 | Invoice approval workflow (planned) | **Invoice Approved** | `invoice-approved` | TBD | Invoice submitter / subcontractor | Invoice approved notification | **Not built** | None | — | 🔲 Planned |
| 13 | Invoice rejection workflow (planned) | **Invoice Rejected / Revise & Resubmit** | `invoice-rejected` | TBD | Invoice submitter / subcontractor | Invoice returned for revision | **Not built** | None | — | 🔲 Planned |

### Invoice Email Details

**Trigger code:** `POST /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/submit` → fires `notifyProjectManagersOfInvoiceSubmission()` fire-and-forget on status transition to `under_review` (`submit/route.ts:110`)

**Email log table:** `subcontractor_invoice_emails` — all manual invoice emails also logged via `POST /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/emails`

---

## 4. Owner Invoice Emails

| # | Trigger Page | Name | Template ID | Subject Line | Recipients | Body Summary | Component | Attachment | Idempotency | Status |
|---|-------------|------|-------------|-------------|------------|-------------|-----------|-----------|-------------|--------|
| 14 | `/[projectId]/invoicing/owner/[invoiceId]` → "Send Email" button | **Owner Invoice** | *(raw HTML, no template ID)* | "Invoice #{invoiceNumber}" (customizable) | User-specified recipients + optional CC | Custom message, project name, invoice # | Inline HTML (no React component) | PDF of invoice (`invoice-{#}.pdf`) | None | ⚠️ Partial |
| 15 | Invoice issued event (planned) | **Owner Invoice Issued** | `owner-invoice-issued` | TBD | Owner contacts | Formal invoice issuance notification | **Not built** | PDF | — | 🔲 Planned |

### Owner Invoice Email Details

**Trigger code:** `POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/email` (`invoicing/owner/[invoiceId]/email/route.ts`)

**PDF generation:** Uses `renderInvoicePdfBuffer()` from `@/lib/invoice-pdf` via `@react-pdf/renderer`. Requires Node.js runtime (`export const runtime = "nodejs"`).

**From address override:** Uses `RESEND_FROM_EMAIL` or `DIGEST_FROM_EMAIL` env var; falls back to `onboarding@resend.dev` in dev.

---

## 5. Change Event Emails

| # | Trigger Page | Name | Template ID | Subject Line | Recipients | Body Summary | Component | Attachment | Idempotency | Status |
|---|-------------|------|-------------|-------------|------------|-------------|-----------|-----------|-------------|--------|
| 16 | `/[projectId]/change-events/[changeEventId]` → "Send Email" button | **Change Event PDF Email** | *(raw HTML, no template ID)* | User-specified | User-specified recipients | Custom message, project name, CE # and title | Inline HTML (no React component) | PDF of change event (`change-event-{#}.pdf`) | None | ⚠️ Partial |
| 17 | Change order signature request (planned) | **Change Order Signature Request** | `change-order-signature` | TBD | Approvers / signatories | Signature link for change order | **Not built** | PDF | — | 🔲 Planned |
| 18 | Owner CO workflow (planned) | **Owner Change Order** | `owner-change-order` | TBD | Owner contacts | Change order for owner review/approval | **Not built** | PDF | — | 🔲 Planned |

### Change Event Email Details

**Trigger code:** `POST /api/projects/[projectId]/change-events/[changeEventId]/email` (`change-events/[changeEventId]/email/route.ts`)

**PDF generation:** Uses Puppeteer (`puppeteer.launch`) to render an HTML page to PDF. Requires `--no-sandbox` flag. PDF is base64-encoded and sent as attachment.

**Requires permission:** `change_orders` / `write`

**Body includes:** CE number/title, origin, type, scope, reason, description, creator, all line items with revenue/cost/over-under columns, project info, grand totals.

---

## 6. Commitment Emails (Manual Send)

| # | Trigger Page | Name | Template ID | Subject Line | Recipients | Body Summary | Component | Attachment | Idempotency | Status |
|---|-------------|------|-------------|-------------|------------|-------------|-----------|-----------|-------------|--------|
| 19 | `/[projectId]/commitments/[commitmentId]` → "Send Email" button | **Commitment Details Email** | *(raw HTML, no template ID)* | User-specified | User-specified recipients | Custom message, contractor name, status, type, financial summary (contract amount, billed to date, balance to finish), optional SOV breakdown | Inline HTML (no React component) | Optional PDF (flag in request; **PDF not yet generated — route stubs it**) | None | ⚠️ Partial |
| 20 | Commitment issued workflow (planned) | **Commitment Issued** | `commitment-issued` | TBD | Subcontractor contacts | Formal commitment/contract issuance | **Not built** | PDF | — | 🔲 Planned |

### Commitment Email Notes

**Current status:** `POST /api/commitments/[commitmentId]/email` builds the HTML but **does not actually call Resend** — it returns a success response without sending. The route has a `// In a production environment, you would send the email here` comment (`commitments/[commitmentId]/email/route.ts:162`).

**Email log:** Emails linked to commitments are stored in `project_emails` table with `related_tool = "commitment"`, queried via `GET /api/commitments/[commitmentId]/emails`.

---

## 7. Document Center Emails (Multi-Record Type)

| # | Trigger Page | Name | Template ID | Record Types | Subject Line | Recipients | Body Summary | Component | Attachment | Status |
|---|-------------|------|-------------|-------------|------------|-------------|-----------|-----------|-------------|--------|
| 21 | Prime contract detail → "Send Email" button | **Prime Contract Email** | *(document email)* | `prime-contract` | User-specified | Custom message + sender name | `renderDocumentEmailHtml()` + `renderDocumentEmailText()` | PDF of document | ✅ Built |
| 22 | Commitment detail → "Send Email" button | **Commitment Document Email** | *(document email)* | `commitment` | User-specified | Custom message + sender name | Same as above | PDF of document | ✅ Built |
| 23 | Change order detail → "Send Email" button | **Change Order Document Email** | *(document email)* | `change-order` | User-specified | Custom message + sender name | Same as above | PDF of document | ✅ Built |
| 24 | Prime CO detail → "Send Email" button | **Prime CO Document Email** | *(document email)* | `prime-contract-change-order` | User-specified | Custom message + sender name | Same as above | PDF of document | ✅ Built |

### Document Center Email Details

**Trigger code:** `POST /api/document-center/[recordType]/[recordId]/email` (`document-center/[recordType]/[recordId]/email/route.ts`)

**PDF generation:** `renderPdfFromHtml()` from `@/lib/documents/pdf`; HTML rendered by `renderDocumentHtml()` from `@/lib/documents/record-documents`.

**Subject:** User-supplied (required). Recipients validated with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.

**Filename:** `bundle.filename` — set by `getDocumentBundle()` per record type.

**From address:** Uses `RESEND_FROM_EMAIL` or `DIGEST_FROM_EMAIL`; falls back to `onboarding@resend.dev` in dev.

---

## 8. RFI Emails

| # | Trigger Page | Name | Template ID | Subject Line | Recipients | Body Summary | Component | Attachment | Idempotency | Status |
|---|-------------|------|-------------|-------------|------------|-------------|-----------|-----------|-------------|--------|
| 25 | Auto-triggered when RFI status → "closed" via `PATCH /api/projects/[projectId]/rfis/[rfiId]` | **RFI Closed Notification** | `rfi-closed` | TBD (not yet wired) | RFI assignees / creator | RFI #, subject, project, closed by, view link | `emails/rfi/RFIClosedNotification.tsx` | None | Per-RFI | ⚠️ Partial |
| 26 | RFI creation or assignment (planned) | **RFI Notification** | `rfi-notification` | TBD | Assignees / RFI manager | New RFI assigned or updated | **Not built** | None | — | 🔲 Planned |

### RFI Email Notes

The `RFIClosedNotification` component is complete but the PATCH route (`rfis/[rfiId]/route.ts`) imports it and `sendEmail` but **does not yet call sendEmail on status change** — the trigger logic needs to be wired. The component is ready to use.

---

## 9. Directory / Project Membership Emails

| # | Trigger Page | Name | Template ID | Subject Line | Recipients | Body Summary | Component | Attachment | Status |
|---|-------------|------|-------------|-------------|------------|-------------|-----------|-----------|--------|
| 27 | `/[projectId]/directory` → Reinvite button | **Directory Reinvite** | `user-invite` (reuses) | "You've been invited to Alleato" | Person being re-invited | Same as platform invitation | `emails/auth/InviteUser.tsx` | None | ✅ Built |
| 28 | `/[projectId]/directory` → Resend Invite (alternate route) | **Directory Resend Invite** | *(none — stubbed)* | — | Person being re-invited | **TODO comment** in route — not yet sending | **Not built** | None | ⚠️ Partial |

### Directory Email Notes

Two routes handle reinvite:
- `POST /api/projects/[projectId]/directory/people/[personId]/reinvite` → uses `InviteService.resendInvite()` (functional)
- `POST /api/projects/[projectId]/directory/people/[personId]/resend-invite` → updates DB timestamp but has `// TODO: Send actual invitation email` comment (not sending)

---

## 10. Planned Emails (Template IDs Reserved, Not Yet Built)

These template IDs are declared in `EmailTemplate` union (`frontend/src/lib/email/send.ts:25`) but have no React component or API trigger wired:

| Template ID | Intended Purpose | Priority Notes |
|-------------|-----------------|----------------|
| `welcome` | Welcome email after account creation | Low — Supabase confirmation covers it |
| `password-changed` | Security notification after password change | Medium — good security practice |
| `sov-reminder` | Reminder to subcontractors with pending SOV | Medium — reduces PM follow-up |
| `sov-approved` | Notify subcontractor their SOV was approved | High — closes the loop on approval workflow |
| `sov-rejected` | Notify subcontractor their SOV needs revision | High — closes the loop on rejection workflow |
| `invoice-approved` | Notify subcontractor their invoice was approved | High — closes the loop on approval workflow |
| `invoice-rejected` | Notify subcontractor their invoice needs revision | High — closes the loop on rejection workflow |
| `commitment-issued` | Formal subcontract/PO issuance notification | High — replaces manual email workflow |
| `change-order-signature` | Signature request for change orders | High — enables digital approval workflow |
| `owner-invoice-issued` | Formal owner invoice issuance (react template) | Medium — currently done via raw HTML |
| `owner-change-order` | Owner change order notification | Medium |
| `daily-digest` | Daily project activity digest | Medium — AI master plan feature |
| `rfi-notification` | New RFI created or assigned | Medium — closes RFI communication loop |
| `submittal-notification` | Submittal created, updated, or responded to | Medium |
| `mention-notification` | Tagged in a comment or note | High — real-time collaboration |
| `status-report` | Automated project status report | Low — AI master plan Phase 2 |

---

## Configuration Reference

| Env Var | Purpose | Required |
|---------|---------|----------|
| `RESEND_API_KEY` | Resend API key for all transactional email | Yes |
| `EMAIL_FROM_ADDRESS` | Default from address (`Alleato <notifications@alleato.app>`) | Yes (production) |
| `NEXT_PUBLIC_APP_URL` | Base URL for links in emails (`https://app.alleato.com`) | Yes |
| `RESEND_FROM_EMAIL` | Override from address for document/invoice emails | Optional |
| `DIGEST_FROM_EMAIL` | Fallback from address for digest emails | Optional |

---

## Email Observability

Every send via `sendEmail()` is logged to the `email_events` Supabase table:

| Column | Description |
|--------|-------------|
| `template` | Template ID string |
| `to_email` | Primary recipient |
| `from_email` | Sender address |
| `subject` | Email subject |
| `status` | `queued` → `sent` or `failed` |
| `resend_id` | Resend message ID (for tracking/webhooks) |
| `entity_type` / `entity_id` | Business entity this email relates to |
| `user_id` | User who triggered the send |
| `idempotency_key` | Deduplication key (24h TTL via Resend) |
| `sent_at` | Timestamp of successful send |
| `error` | JSONB error detail if send failed |
| `metadata` | Arbitrary extra context |

Resend webhooks handled at: `POST /api/webhooks/resend`

---

## Testing

Dev-only test endpoint to preview any built template:

```bash
# List available templates
curl http://localhost:3000/api/dev/test-email

# Send a test email (defaults to Resend's delivered@resend.dev test inbox)
curl -X POST http://localhost:3000/api/dev/test-email \
  -H "Content-Type: application/json" \
  -d '{"template": "user-invite", "to": "your@email.com"}'
```

Available test templates: `user-invite`, `forgot-password`, `sov-invitation`, `invoice-submitted-to-pm`
