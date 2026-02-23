# Bug Investigation Team — Conversation Summary

**Date:** 2026-02-23
**Sessions:** 2 (original session + continuation after context compaction)

---

## What Was Requested

The user wanted to find and build "agent teams" that a previous Claude Code session was supposed to set up but never did. The focus was on a **Bug Investigation Team** — a multi-agent system to independently verify that implemented features actually work correctly and match Procore's functionality.

The user's core frustration: agents had claimed features were "complete and tested" when they weren't, and code was being built on top of broken foundations with no independent verification.

### Specific Requirements

1. A team of specialized agents, not a single do-everything agent
2. One agent must be deeply knowledgeable about **what Procore features actually look like** (the "Feature Expert")
3. Verification must be evidence-based — screenshots, console errors, network failures, file paths
4. The team should use existing Playwright crawl data from Procore as the reference specification
5. The Feature Expert should be able to re-crawl Procore in real-time when static data is insufficient

---

## What Was Built

### Phase 1: Infrastructure Review (Session 1)

Explored the existing project to understand what was available:

| Resource | Finding |
|----------|---------|
| Agent files | 67+ files in `.claude/agents/` |
| Existing audit agents | `verifier-agent.md`, `design-system-auditor.md`, `security-auditor.md` |
| Crawl data (DOM) | 21 HTML snapshots in `scripts/screenshot-capture/outputs/dom/` |
| Crawl data (JSON) | 22 structured analysis files in `scripts/screenshot-capture/outputs/analysis-json/` |
| Crawler scripts | ~37 feature-specific crawlers in `scripts/screenshot-capture/scripts/crawlers/` |
| Implemented features | 30+ directories in `frontend/src/app/(main)/[projectId]/` |
| PRP directory | Empty (`docs-ai/contents/docs/PRPs/`) — data is in `scripts/` instead |
| Bug Investigation Team | **Did NOT exist** — needed to be created from scratch |

### Phase 2: Bug Investigation Team Creation (Sessions 1-2)

Created the complete team with 4 agents and a workflow command:

#### Files Created

| File | Purpose |
|------|---------|
| `.claude/agents/bug-team/README.md` | Team documentation |
| `.claude/agents/bug-team/procore-feature-expert.md` | Knows what Procore looks like from crawl data; can re-crawl when needed |
| `.claude/agents/bug-team/code-auditor.md` | Reads source code, finds gaps vs Procore reference |
| `.claude/agents/bug-team/live-tester.md` | Runs the app, tests CRUD, captures evidence |
| `.claude/agents/bug-team/investigation-orchestrator.md` | Coordinates the team, synthesizes findings |
| `.claude/commands/workflow/investigate.md` | Slash command: `/investigate budget`, `/investigate --all`, etc. |
| `.claude/investigations/triage/` | Output directory for investigation results |

#### Agent Specifications

**1. Procore Feature Expert** (`procore-feature-expert.md`)

- Model: sonnet
- Two-tier knowledge system:
  - **Tier 1 (Static)**: Uses existing DOM snapshots and analysis JSON — fast, works for High/Medium coverage features
  - **Tier 2 (Live Re-crawl)**: Runs crawler scripts when static data is Low, missing, or stale (>60 days old)
- Feature Coverage Map documenting data quality per feature (Budget=High, Schedule=Low, etc.)
- Produces structured reference specs: page layout, table columns, form fields, actions, key behaviors
- Crawler scripts auto-authenticate via `.env` — never asks user to log in

**2. Code Auditor** (`code-auditor.md`)

- Model: sonnet
- 3-phase audit: Inventory → Compare against reference → Generate report
- Checks: CRUD completeness, column parity, form field parity, pattern violations, database audit
- Severity system: Red (Critical), Yellow (High), Orange (Medium), Blue (Low)
- Produces scored audit report with file paths and line numbers

**3. Live Tester** (`live-tester.md`)

- Model: sonnet
- 6-test protocol: Page Loads → List Renders → Create → Edit → Delete → Validation
- Evidence required for every claim (screenshots, console errors, network failures)
- Uses Playwright MCP tools or existing E2E test scripts
- Auth is automatic (saved session in `tests/.auth/user.json`)
- Documents common failure patterns (loading spinner forever = FK mismatch, form submits but nothing happens = missing cache invalidation)

**4. Investigation Orchestrator** (`investigation-orchestrator.md`)

- Model: opus
- 5-phase workflow: Scope → Feature Expert → Code Audit → Live Test → Synthesize
- Three modes:
  - **Single Feature Deep Dive**: Full 4-agent investigation
  - **Triage All Features**: Quick sweep of all features, then deep dive worst 3-5
  - **Retest**: Skip expert/audit, run Live Tester only on previously-failed items
- Gate rules: Never skip Feature Expert, Code Audit before Live Test, evidence required, fix obvious bugs immediately

#### Workflow Command (`investigate.md`)

Usage:

```bash
/investigate budget              # Full deep dive on one feature
/investigate --all               # Triage all, deep dive worst features
/investigate commitments --retest # Re-test after fixes (live test only)
/investigate --triage             # Quick sweep only, no deep dives
```

Output structure:

```
.claude/investigations/
├── triage/                     # Quick sweep results
├── {feature}/                  # Deep dive results
│   ├── procore-reference.md    # What Procore looks like
│   ├── code-audit.md           # Source code analysis
│   ├── live-test.md            # Browser test results
│   └── investigation-report.md # Combined prioritized findings
└── INVESTIGATION-SUMMARY.md    # Cross-feature overview
```

---

## Key Architectural Decision: Real-Time Re-Crawling

### The Question

The user asked whether the Procore Feature Expert should re-crawl Procore in real-time instead of relying only on static crawl data.

### The Answer: Hybrid Approach (Tier 1 + Tier 2)

**Yes — the Feature Expert should have re-crawling capability**, but as an optional escalation, not the default:

| Tier | When | Speed | Data Quality |
|------|------|-------|-------------|
| **Tier 1: Static** (default) | High/Medium coverage features | Seconds | Good for basic reference |
| **Tier 2: Live Re-crawl** (escalation) | Low/no coverage, stale data, needs interactive states | 2-5 minutes | Captures current state |

**Why static alone isn't enough:**

1. Coverage gaps — RFIs, Schedule, Submittals are all LOW coverage in static data
2. Static HTML misses interactive states — form dialogs, dropdowns, validation errors
3. Procore evolves — UI changes make static data stale
4. Infrastructure exists — ~37 crawler scripts already handle auth automatically

**Tier 2 triggers:**

- No DOM snapshot exists for the feature
- Coverage is "Low" in the Feature Coverage Map
- Investigation needs form fields/dialog content not in static HTML
- Crawl data is >60 days old
- Code Auditor found suspicious gaps needing verification

The Feature Expert was updated to support this hybrid approach in the current session.

---

## Crawl Data Coverage Summary

| Feature | DOM Snapshot | Analysis JSON | Detailed Crawl | Coverage | Notes |
|---------|-------------|---------------|----------------|----------|-------|
| Budget | Yes | Yes | Extensive | **High** | Good reference data |
| Commitments | Yes | Yes | Yes | **High** | Good reference data |
| Daily Log | Yes | Yes | Yes | **High** | |
| Prime Contracts | Yes | Yes | Yes | **High** | |
| Punch List | Yes | Yes | Yes | **High** | |
| Meetings | Yes | Yes | Yes | **High** | |
| Directory | Yes | Yes | No | Medium | Missing detailed crawl |
| Documents | Yes | Yes | Yes | Medium | |
| Forms | Yes | Yes | No | Medium | |
| Incidents | Yes | Yes | No | Medium | |
| Reports | Yes | No | Yes | Medium | |
| Specifications | Yes | No | Yes | Medium | |
| Transmittals | Yes | No | Yes | Medium | |
| Drawings | No | No | Yes | **Low** | Needs re-crawl |
| Emails | No | No | Yes | **Low** | Needs re-crawl |
| Photos | No | No | Yes | **Low** | Needs re-crawl |
| RFIs | No | No | Crawler exists | **Low** | Needs re-crawl |
| Schedule | No | No | Crawler exists | **Low** | Needs re-crawl |
| Submittals | No | No | Crawler exists | **Low** | Needs re-crawl |
| Timesheets | Yes | No | No | **Low** | |

---

## Implemented Features in the App

30+ feature directories exist in `frontend/src/app/(main)/[projectId]/`:

**Critical Path:** budget, commitments, direct-costs, directory, change-orders, prime-contracts
**Secondary:** rfis, schedule, submittals, drawings, specifications, invoicing
**Tertiary:** daily-log, meetings, photos, emails, transmittals, punch-list, documents
**Other:** action-plans, bidding, coordination-issues, forms, incidents, inspections, observations, project-management, reports, timesheets, time-and-materials, waste-and-sustainability

---

## What Hasn't Been Done Yet

1. **No investigation has been run yet** — The team is built but untested. Running `/investigate --triage` would be the first real test.
2. **No re-crawling has been triggered** — Tier 2 capability exists in the agent definition but hasn't been exercised.
3. **Low-coverage features need crawler runs** — Drawings, RFIs, Schedule, Submittals have insufficient reference data.
4. **PRP directory remains empty** — Feature crawl data lives in `scripts/screenshot-capture/outputs/`, not in `docs-ai/contents/docs/PRPs/` as some older agent specs expected.

---

## Files Modified in This Session

| File | Action | Description |
|------|--------|-------------|
| `.claude/agents/bug-team/procore-feature-expert.md` | Modified | Added Tier 2 live re-crawling capability |
| `.claude/agents/bug-team/investigation-orchestrator.md` | Modified | Added gate rule about Feature Expert re-crawling |
| `.claude/commands/workflow/investigate.md` | Modified | Added data quality assessment and re-crawl step to Feature Expert phase |
| `.claude/investigations/CONVERSATION-SUMMARY.md` | Created | This file |

## Recommended Next Steps

1. **Run `/investigate --triage`** to get a health check across all features
2. **Run crawler scripts for Low-coverage features** before deep-diving those features
3. **Deep dive the worst 3-5 features** identified by triage
4. **Fix critical bugs** found (per FIX-FIRST-REPORT-LATER rule)
5. **Re-test fixed features** with `/investigate {feature} --retest`
