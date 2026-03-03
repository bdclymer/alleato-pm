# Financial Tools Bug Team

A multi-agent team that systematically investigates, fixes, and verifies all 7 Alleato financial tools.

## The 7 Financial Tools

| Tool | URL | Priority |
|------|-----|----------|
| Budget | /67/budget | Medium |
| Prime Contracts | /67/prime-contracts | High |
| Commitments | /67/commitments | Low (reference impl) |
| Change Events | /67/change-events | High |
| Change Orders | /67/change-orders | High |
| Direct Costs | /67/direct-costs | **Critical** (form hang) |
| Invoicing | /67/invoicing | **Critical** (needs full migration) |

## Team Members

| Agent | File | Role |
|-------|------|------|
| **Team Lead** | `financial-tools-lead.md` | Coordinates full cycle, orchestrates teammates |
| **Investigation Orchestrator** | `investigation-orchestrator.md` | Detailed investigation workflow |
| **Procore Feature Expert** | `procore-feature-expert.md` | Procore reference specs from crawl data |
| **Code Auditor** | `code-auditor.md` | Source code analysis vs Procore reference |
| **Live Tester** | `live-tester.md` | Browser testing with evidence |
| **Financial Implementor** | `financial-implementor.md` | Code fixes for confirmed issues |

## How to Start the Agent Team

### Prerequisites
1. Agent teams must be enabled (already done in `.claude/settings.json`)
2. Dev server should be running: `cd frontend && npm run dev`

### Start the Full Financial Tools Completion Cycle

In Claude Code, use this prompt to kick off the agent team:

```
Create an agent team to finalize all 7 Alleato financial tools.

The financial tools are: Budget, Prime Contracts, Commitments, Change Events, Change Orders, Direct Costs, and Invoicing.

Team structure:
1. Spawn 7 investigation teammates in PARALLEL — one per tool. Each investigator should:
   - Read .claude/agents/bug-team/procore-feature-expert.md for the Procore reference
   - Read .claude/agents/bug-team/code-auditor.md for the code audit protocol
   - Read .claude/agents/bug-team/live-tester.md for the live testing protocol
   - Produce investigation reports in .claude/investigations/{tool}/

2. After all investigations complete, spawn implementor teammates (start with Direct Costs and Invoicing in parallel — they're most critical):
   - Each implementor reads .claude/agents/bug-team/financial-implementor.md
   - Require plan approval before any implementor makes changes

3. After implementation, spawn verification teammates in parallel to confirm fixes work

4. Produce a final completion report at .claude/investigations/COMPLETION-REPORT.md

Dev server is at http://localhost:3000. Test project ID is 67.
Agent instructions are in .claude/agents/bug-team/financial-tools-lead.md
```

### Quick Single-Tool Investigation

```
Spawn an agent team to investigate and fix the Direct Costs tool only.
1. One investigator teammate: audit code + live test + produce report in .claude/investigations/direct-costs/
2. One implementor teammate: fix the form hang bug (priority 1) and any other confirmed issues
3. Verify the fix works in the browser

Read .claude/agents/bug-team/financial-implementor.md for the implementor's protocol.
Test at http://localhost:3000/67/direct-costs. Project ID: 67.
```

### Re-test After Fixes

```
Spawn a live tester teammate to re-test the {TOOL} tool.
Read .claude/agents/bug-team/live-tester.md for the full protocol.
Test at http://localhost:3000/67/{tool}. Project ID: 67.
Save results to .claude/investigations/{tool}/verification-report.md
```

## How It Works

```
Phase 1 (Parallel): Investigation
├── Investigator-Budget          → .claude/investigations/budget/
├── Investigator-Prime-Contracts → .claude/investigations/prime-contracts/
├── Investigator-Commitments     → .claude/investigations/commitments/
├── Investigator-Change-Events   → .claude/investigations/change-events/
├── Investigator-Change-Orders   → .claude/investigations/change-orders/
├── Investigator-Direct-Costs    → .claude/investigations/direct-costs/
└── Investigator-Invoicing       → .claude/investigations/invoicing/

Phase 2 (Priority Order): Implementation
├── 2a (Critical, Parallel): Direct Costs + Invoicing
├── 2b (High, Parallel): Prime Contracts + Change Events + Change Orders
└── 2c (Medium): Budget + Commitments (if needed)

Phase 3 (Parallel): Verification
└── Verifier-{Tool} for each tool that had fixes

Phase 4: Final report → .claude/investigations/COMPLETION-REPORT.md
```

## Key Principles

**Evidence over assumptions.** Every finding must have proof:
- Code Auditor: file paths and line numbers
- Live Tester: screenshots, console errors, network failures

**Fix confirmed issues only.** Implementors work from investigation reports, not guesses.

**Commitments is the gold standard.** All other tools should match its patterns:
- `frontend/src/features/commitments/feature-config.ts`
- `frontend/src/hooks/use-commitments.ts`

## Output Location

```
.claude/investigations/
├── triage/                         # Quick sweep results (if run)
├── {tool}/                         # Per-tool investigation
│   ├── procore-reference.md        # Procore spec
│   ├── code-audit.md               # Source analysis
│   ├── live-test.md                # Browser test results
│   ├── investigation-report.md     # Combined findings
│   ├── implementation-report.md    # What was fixed
│   └── verification-report.md      # Post-fix verification
└── COMPLETION-REPORT.md            # Final overall status
```

## Agent Teams vs Subagents

This team works in both modes:

**Agent Teams (recommended for full cycle):**
- Teammates run as separate Claude sessions
- Can investigate all 7 tools simultaneously
- Significantly faster but uses more tokens
- Enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings (already done)

**Subagents (for single-tool work):**
- Use the Task tool in your current session
- Lower token cost for focused work
- Sequential unless you spawn multiple Tasks in one message
