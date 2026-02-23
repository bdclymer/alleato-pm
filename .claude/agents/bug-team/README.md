# Bug Investigation Team

A multi-agent team that systematically audits features against Procore reference data to find real bugs with evidence.

## The Problem This Solves

Agents have claimed features were "complete and tested" when they weren't. Code was built on top of broken foundations. This team exists to independently verify that what's built actually works.

## Team Members

| Agent | File | Role |
|-------|------|------|
| **Procore Feature Expert** | `procore-feature-expert.md` | Knows what Procore looks like from crawl data |
| **Code Auditor** | `code-auditor.md` | Reads source code, finds gaps vs Procore reference |
| **Live Tester** | `live-tester.md` | Runs the app, tests CRUD, captures evidence |
| **Orchestrator** | `investigation-orchestrator.md` | Coordinates the team, synthesizes findings |

## Usage

```bash
# Full investigation of a single feature
/investigate budget

# Quick triage of all features
/investigate --all

# Re-test after fixes
/investigate commitments --retest
```

## How It Works

1. **Feature Expert** reads Procore crawl data (DOM snapshots, analysis JSON) to produce a reference specification of what the feature should look like
2. **Code Auditor** compares our source code against that reference — finds missing CRUD operations, wrong columns, broken patterns
3. **Live Tester** runs the actual app and tests everything works — captures evidence for every claim
4. **Orchestrator** combines findings into a prioritized report

## Key Principle

**Evidence over assumptions.** Every finding must have proof:
- Code Auditor: file paths and line numbers
- Live Tester: screenshots, console errors, network failures
- No "it seems like" or "it might be" — only confirmed facts

## Crawl Data Sources

The Feature Expert draws from:
- `scripts/screenshot-capture/outputs/dom/` — Full HTML snapshots of Procore pages
- `scripts/screenshot-capture/outputs/analysis-json/` — Structured metadata extractions
- `scripts/screenshot-capture/outputs/{feature}/` — Feature-specific crawl data
- `scripts/screenshot-capture/scripts/crawlers/` — Crawler scripts (show URL patterns and flows)

## Output Location

All investigation results go to `.claude/investigations/`:
```
.claude/investigations/
├── triage/                     # Quick sweep results per feature
├── {feature}/                  # Deep dive results
│   ├── procore-reference.md    # What Procore looks like
│   ├── code-audit.md           # Source code analysis
│   ├── live-test.md            # Browser test results
│   └── investigation-report.md # Combined prioritized findings
└── INVESTIGATION-SUMMARY.md    # Cross-feature overview
```

## When to Use This Team

- After a batch of features has been "completed" by development agents
- Before a demo or release
- When the user suspects something is broken
- Periodically as a health check
- After significant refactoring
