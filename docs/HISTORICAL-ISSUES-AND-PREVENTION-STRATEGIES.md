# Historical Issues & AI-Powered Prevention Strategies

**Date:** 2026-03-24
**Purpose:** Identify recurring problems from meeting transcripts, communications, and project records, then design AI-driven systems to prevent recurrence.

---

## Data Sources Analyzed

| Source | Coverage | Key Findings |
|--------|----------|--------------|
| Google Drive (Fireflies meeting transcripts) | Sep 2025 - Mar 2026 | 20+ meeting transcripts with documented issues |
| Notion (Linear tickets, project pages) | Jan 2026 - Mar 2026 | Project tracking data, Procore reference docs |
| Note | **Outlook emails and Teams messages** were not directly searchable — no MCP connector exists for these yet. Recommend connecting Microsoft 365 to Notion AI Search (supports Teams, SharePoint, OneDrive) to unlock this data in future analysis. |

---

## Category 1: Financial & Billing Errors

### Issue 1.1: Invoice Duplication / Inflated Billing (140% Completion Error)
- **Source:** Weekly Accounting Meeting (2026-03-17)
- **What happened:** Invoices showed inflated amounts due to 140% completion errors in billing calculations. Ongoing scrutiny is needed to prevent recurrence.
- **Impact:** Overpayment risk, incorrect financial reporting, damaged vendor trust.
- **Root cause:** Manual billing processes allow percentage completion to exceed 100% without automated validation.

### Issue 1.2: Double Retainage Billing Error (Acumatica/Job Planner)
- **Source:** Maria Calcetero meeting (2026-03-17), Alleato Group CSM meeting (2026-03-02)
- **What happened:** Retainage was deducted twice — once in Job Planner and again in Acumatica — because subcontractor bills were not correctly linked to subcontracts before syncing. Frustration after two weeks with partner Revive unable to resolve.
- **Impact:** Subcontractors underpaid, financial records inaccurate, bills needed to be reversed and recreated.
- **Root cause:** Incorrect subcontractor linkage in Job Planner before syncing to Acumatica; no validation check at sync time.

### Issue 1.3: Vendor Payment Delays ($18K Check)
- **Source:** Weekly Accounting Meeting (2026-03-17)
- **What happened:** $18,000 check delayed; dual cashing issues required switching to direct check printing in Indianapolis.
- **Impact:** Strained vendor relationships, potential project delays from unpaid suppliers.
- **Root cause:** Manual check processing with no tracking or alerting for delays.

### Issue 1.4: Disputed Change Order ($700K)
- **Source:** Westfield Collective Progress Update (2025-09-25)
- **What happened:** A significant change order valued at $700,000 was disputed, requiring urgent revision to avoid billing and financial tracking issues.
- **Impact:** Revenue recognition blocked, cash flow uncertainty, potential legal exposure.
- **Root cause:** Insufficient documentation at time of scope change; delayed formalization of verbal agreements.

### Issue 1.5: Invoice Coding Backlog
- **Source:** Cost Coding and Approval meeting (2026-03-16)
- **What happened:** Invoice coding and approvals not completed on time (needed by 5th for reports by 10th). February invoices backlogged.
- **Impact:** Delayed financial reporting, inability to track project costs in real-time.
- **Root cause:** No automated reminders or enforcement of coding deadlines.

---

## Category 2: Construction Quality & Defects

### Issue 2.1: Persistent Fire Alarm Faults
- **Source:** Fire Alarm Issues Phone Discussion (2026-01-06)
- **What happened:** Fire alarm faults persisting since October 30 — over 10 notifications indicating complex problems beyond a single component failure. Multiple vendors (Triangle Fire Protection, PennTex Construction, CEVA Logistics) coordinated to troubleshoot.
- **Impact:** Safety compliance risk, building occupancy at risk, multi-week resolution timeline.
- **Root cause:** Complex multi-vendor system with no single point of accountability for integrated troubleshooting.

### Issue 2.2: Welding Defects (10 Found)
- **Source:** Weekly OPS - Kebba & Alec (2026-02-09)
- **What happened:** 10 welding defects identified during quality assurance review. Promptly addressed.
- **Impact:** Rework costs, potential structural risk if not caught.
- **Root cause:** Insufficient in-process quality checks during welding phase.

### Issue 2.3: Door Frame Defects with Unresponsive Supplier
- **Source:** Job Planner - Scopes of Work (2026-03-02)
- **What happened:** Critical defects in door frames causing delays and functional failures. Supplier not responding to communications.
- **Impact:** Schedule delays, potential rework, blocked downstream trades.
- **Root cause:** No escalation protocol for unresponsive suppliers; no contractual SLA for defect response time.

### Issue 2.4: Failed Electrical Inspection
- **Source:** Weekly OPS - Nick & Andrew (2026-02-23)
- **What happened:** Failed electrical inspection at Tremont Noblesville (quickly resolved). Drywall and flooring nearing completion for final sign-off.
- **Impact:** Short delay, rework required before re-inspection.
- **Root cause:** Pre-inspection self-check not performed or not thorough enough.

### Issue 2.5: Punch List Delays (Subcontractor Issues)
- **Source:** Weekly OPS - Nick & Andrew (2026-02-02)
- **What happened:** Nearly 75% of first floor punch list complete but delays due to onboarding issues and subcontractor coordination problems. Back charges to EGI due to communication gap on tile sourcing.
- **Impact:** Project completion delayed, back charges create dispute risk.
- **Root cause:** Poor handoff communication between teams; subcontractor onboarding not formalized.

---

## Category 3: Schedule & Weather Delays

### Issue 3.1: Weather-Related Demo Schedule Disruption
- **Source:** Alleato/Radial MTV Weekly Status Call (2026-01-28)
- **What happened:** Ice storms in Indiana disrupted demo crew travel. A second snowstorm threatened to postpone American Express equipment moves, further delaying demo schedules.
- **Impact:** Multi-day schedule slippage, cascading delays to downstream trades.
- **Root cause:** No weather contingency planning; no pre-positioned backup crews.

### Issue 3.2: Construction Progress Stalled by Inspections
- **Source:** Weekly OPS - Nick & Andrew (2026-02-16)
- **What happened:** Inspections blocking progress. New ceiling plans requiring Goodwill's approval to prevent unnecessary rework.
- **Impact:** Idle crews, cost overruns from waiting.
- **Root cause:** Inspection scheduling not integrated with construction schedule; approval dependencies not tracked.

---

## Category 4: Subcontractor & Scope Management

### Issue 4.1: Change Orders from Unaccounted Scope
- **Source:** Weekly OPS - Nick & Andrew (2026-02-16)
- **What happened:** Change orders needed for soffits and ceilings due to unaccounted lighting fixtures. $750 change order for window area stiffening due to unclear framing details in plans.
- **Impact:** Budget overruns, schedule disruption, scope creep.
- **Root cause:** Incomplete design review before construction start; plan details not validated against field conditions.

### Issue 4.2: Subcontractor Scope Disputes
- **Source:** Scopes of Work meeting (2026-02-02)
- **What happened:** Emphasized need for precise scopes of work and change orders to prevent disputes. Line-by-line scope reviews with subcontractors needed to prevent gaps and budget overruns.
- **Impact:** Disputes, budget overruns, delayed close-outs.
- **Root cause:** Ambiguous scope language; no standardized scope review process before signing.

### Issue 4.3: Communication Gap Causing Back Charges
- **Source:** Weekly OPS - Nick & Andrew (2026-02-02)
- **What happened:** Project team now sourcing ice cream bar tiles; back charges to EGI due to communication gap about who was responsible for sourcing.
- **Impact:** Financial dispute, delayed material procurement.
- **Root cause:** Responsibility matrix not defined or communicated for material sourcing.

---

## Category 5: Technology & Software Issues

### Issue 5.1: Acumatica/Job Planner Integration Errors
- **Source:** Alleato Group CSM meeting (2026-03-02)
- **What happened:** Integration errors between Job Planner and Acumatica causing incorrect retainage calculations, double deductions, and need to reverse/recreate bills.
- **Impact:** Hours of manual correction, inaccurate financial records.
- **Root cause:** No validation layer between the two systems; sync proceeds even with incorrect data linkages.

### Issue 5.2: Microsoft Office License Blocking Employee Access
- **Source:** Misty's Laptop Microsoft (2026-02-09)
- **What happened:** Employee blocked from Office Suite access due to conflicting user session and shared basic license limitations. Required direct Microsoft support call.
- **Impact:** Employee unable to work, workflow bottleneck.
- **Root cause:** Shared basic license creating contention; no IT monitoring for license conflicts.

### Issue 5.3: Meeting Platform Technical Failures
- **Source:** Alleato Group LinkedIn SMM Updates meeting (2025-09-08)
- **What happened:** Multiple participants had audio and connection issues, requiring switch to Zoom mid-meeting.
- **Impact:** Wasted meeting time, loss of momentum.
- **Root cause:** No standardized meeting platform; no pre-meeting tech check.

---

## Category 6: Supply Chain & Vendor Management

### Issue 6.1: Manufacturing Delays (CEC Certification)
- **Source:** ArcEdge weekly calls (Dec 2025 - Mar 2026), Zach Solar Sales Update (2026-01-29)
- **What happened:** CEC certification delays blocking new solar panel orders until spring 2026. High production costs in Taiwan. Alternative manufacturers (Sol Roof, Met Solar) being explored.
- **Impact:** Sales pipeline frozen, revenue delayed, customer commitments at risk.
- **Root cause:** Single-source dependency on manufacturer with regulatory delays; no parallel certification track.

### Issue 6.2: Homeowner Installation Rejection ($17K)
- **Source:** ArcEdge weekly call (2025-12-15)
- **What happened:** Homeowner in Utah rejected a $17,000 solar installation, causing delays and frustration.
- **Impact:** Lost revenue, wasted installation crew time, increased frustration.
- **Root cause:** Insufficient pre-installation customer alignment; no formal pre-approval checkpoint.

### Issue 6.3: Price Increase Risk from Order Delays
- **Source:** ArcEdge/Roofit.Solar Update calls (Mar 2026)
- **What happened:** Delays into 2027 would trigger $0.10/unit price increase. 50% prepayment required 3 months before production. Firm commitment needed by April 30 to maintain exclusivity.
- **Impact:** Material cost increases, cash flow pressure, potential loss of exclusivity.
- **Root cause:** No automated deadline tracking for supplier commitments; manual follow-up only.

---

## AI-Powered Prevention Systems

### System 1: Automated Financial Validation Layer

**Prevents:** Issues 1.1, 1.2, 1.3, 1.5

**How it works:**
- AI agent monitors Job Planner and Acumatica data in real-time
- **Rule-based validation** before any sync: completion % cannot exceed 100%, retainage must match linked subcontract, duplicate invoices flagged
- **Invoice coding deadline enforcer**: automated Slack/Teams reminders at day 1, 3, and 5 of each month; escalation to PM if not coded by day 5
- **Payment tracking**: AI monitors check issuance dates and flags payments not cleared within 7 days

**Implementation:**
- Cron job polling Acumatica/Job Planner APIs daily
- Rules engine with configurable thresholds
- Slack notifications via Chat SDK for alerts
- Dashboard in Alleato PM showing financial health metrics

---

### System 2: Pre-Inspection AI Checklist Generator

**Prevents:** Issues 2.2, 2.4, 2.5

**How it works:**
- Before any scheduled inspection, AI generates a project-specific checklist based on:
  - Code requirements for the jurisdiction
  - Common failure points from historical inspection data
  - Current trade work in progress
- Field team completes checklist on mobile device
- AI flags incomplete items and blocks inspection scheduling until resolved

**Implementation:**
- RAG system indexing building codes and past inspection results
- Mobile-friendly form (Job Planner or Alleato PM integration)
- Integration with project schedule to auto-trigger 48 hours before inspection

---

### System 3: Scope Clarity Analyzer

**Prevents:** Issues 4.1, 4.2, 4.3

**How it works:**
- When a subcontract or scope of work document is uploaded, AI analyzes it for:
  - **Ambiguous language** (vague terms like "as needed", "typical", "per plans")
  - **Missing responsibility assignments** (who sources materials, who handles X)
  - **Gaps compared to similar past scopes** (RAG comparison to historical scopes)
  - **Mismatches with design documents** (lighting counts vs electrical plans)
- Generates a "Scope Risk Report" with specific items to clarify before signing

**Implementation:**
- Document upload trigger in Alleato PM or Job Planner
- LLM analysis using Claude with RAG over historical scopes database
- Output as structured report with red/yellow/green risk ratings

---

### System 4: Supplier Response & Escalation Tracker

**Prevents:** Issues 2.3, 6.1, 6.2, 6.3

**How it works:**
- AI tracks all open supplier communications (RFIs, defect reports, order commitments)
- **Auto-escalation**: If no response in 48 hours, sends follow-up. If no response in 96 hours, escalates to PM and recommends backup supplier.
- **Deadline watchdog**: Monitors contractual deadlines (e.g., April 30 exclusivity commitment) and sends progressive alerts at 30, 14, 7, and 3 days out
- **Supplier scorecard**: Tracks response times, defect rates, and delivery reliability

**Implementation:**
- Integration with email/Teams (when connectors available) or manual entry
- Cron-based reminder system
- Supplier performance database in Supabase

---

### System 5: Weather-Aware Schedule Optimizer

**Prevents:** Issues 3.1, 3.2

**How it works:**
- AI integrates weather forecast data for all active project locations
- 7-day forecast analysis against scheduled outdoor/weather-sensitive activities
- **Proactive rescheduling suggestions**: "Ice storm forecast Thursday — recommend moving demo crew to indoor work at Site B"
- **Backup crew coordination**: Auto-identifies available crews within driving distance when weather blocks primary crew

**Implementation:**
- Weather API integration (OpenWeatherMap or similar)
- Project schedule data from Job Planner/Procore
- Slack notifications with suggested schedule adjustments

---

### System 6: Change Order Early Warning System

**Prevents:** Issues 1.4, 4.1

**How it works:**
- AI monitors meeting transcripts (via Fireflies) for phrases indicating scope changes: "we need to add", "that wasn't in the plans", "change order", "not accounted for"
- When detected, automatically creates a draft change order record in the system
- PM receives notification: "Potential scope change detected in [meeting name] — review and formalize"
- Prevents verbal agreements from going undocumented

**Implementation:**
- Fireflies API integration (webhooks on new transcript)
- NLP extraction of change-related language
- Auto-creation of draft records in Alleato PM / Job Planner

---

### System 7: IT License & Access Monitor

**Prevents:** Issues 5.1, 5.2, 5.3

**How it works:**
- Monitors Microsoft 365 admin center for license conflicts, session contention, and access blocks
- Proactively alerts IT when an employee is blocked from software access
- Maintains a meeting platform standardization policy (auto-generates calendar events with correct platform links)

**Implementation:**
- Microsoft Graph API integration for license monitoring
- Automated alerting via Slack/Teams
- Calendar event templates with standardized meeting links

---

### System 8: Cross-Meeting Intelligence (RAG-Powered)

**Prevents:** All categories — systemic visibility

**How it works:**
- All meeting transcripts (Fireflies), emails (when connected), and Teams messages are indexed into a vector database
- AI can answer questions like:
  - "What issues have occurred on the Vermillion Rise project in the last 30 days?"
  - "Which subcontractors have the most defects reported against them?"
  - "What change orders are still undocumented from recent meetings?"
  - "Which vendor payments are overdue across all projects?"
- Weekly AI-generated "Risk Briefing" sent to leadership highlighting emerging patterns

**Implementation:**
- Supabase pgvector for embeddings storage
- Fireflies webhook for automatic transcript ingestion
- Microsoft Graph API for email/Teams when connectors available
- Scheduled AI analysis generating weekly reports

---

## Priority Implementation Roadmap

| Priority | System | Effort | Impact | Prevents |
|----------|--------|--------|--------|----------|
| 1 | Financial Validation Layer | Medium | High | Invoice errors, double retainage, payment delays |
| 2 | Change Order Early Warning | Low | High | Undocumented scope changes, disputed COs |
| 3 | Cross-Meeting Intelligence (RAG) | High | Very High | All categories — systemic visibility |
| 4 | Scope Clarity Analyzer | Medium | High | Scope disputes, budget overruns |
| 5 | Supplier Response Tracker | Low | Medium | Unresponsive suppliers, missed deadlines |
| 6 | Pre-Inspection Checklist | Low | Medium | Failed inspections, rework |
| 7 | Weather-Aware Scheduling | Medium | Medium | Weather delays |
| 8 | IT License Monitor | Low | Low | Employee access issues |

---

## Immediate Next Steps

1. **Connect Microsoft 365 to Notion AI Search** — This unlocks Outlook emails and Teams messages for future analysis. The current analysis is limited to meeting transcripts in Google Drive.
2. **Set up Fireflies webhook** — Automatically ingest transcripts as they're generated, building the RAG corpus over time.
3. **Implement Financial Validation Layer** — Highest ROI, prevents the most costly recurring errors (invoice duplication, double retainage).
4. **Deploy Change Order Early Warning** — Low effort, high impact. Start with keyword detection on Fireflies transcripts.
5. **Schedule quarterly re-analysis** — Re-run this search across all communication channels to identify new patterns and validate that prevention systems are working.
