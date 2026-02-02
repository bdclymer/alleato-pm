# Documentation Standards & Organization

## Purpose

This document establishes the **single source of truth** for where and how all documentation should be created, organized, and maintained in the Alleato-Procore project.

**Last Updated:** 2026-01-08

---

## Documentation-Focused Agents

Claude Code has access to several specialized agents for documentation work:

### Primary Documentation Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **docs-architect** | Creates comprehensive technical documentation from existing codebases. Analyzes architecture, design patterns, and implementation details to produce long-form technical manuals and ebooks. | Use PROACTIVELY for system documentation, architecture guides, or technical deep-dives. |
| **api-documenter** | Create OpenAPI/Swagger specs, generate SDKs, and write developer documentation. Handles versioning, examples, and interactive docs. | Use PROACTIVELY for API documentation or client library generation. |
| **reference-builder** | Creates exhaustive technical references and API documentation. Generates comprehensive parameter listings, configuration guides, and searchable reference materials. | Use PROACTIVELY for API docs, configuration references, or complete technical specifications. |
| **tutorial-engineer** | Creates step-by-step tutorials and educational content from code. Transforms complex concepts into progressive learning experiences with hands-on examples. | Use PROACTIVELY for onboarding guides, feature tutorials, or concept explanations. |
| **mermaid-expert** | Create Mermaid diagrams for flowcharts, sequences, ERDs, and architectures. Masters syntax for all diagram types and styling. | Use PROACTIVELY for visual documentation, system diagrams, or process flows. |

### Supporting Documentation Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **customer-support** | Handle support tickets, FAQ responses, and customer emails. Creates help docs, troubleshooting guides, and canned responses. | Use PROACTIVELY for customer inquiries or support documentation. |
| **content-marketer** | Write blog posts, social media content, and email newsletters. Optimizes for SEO and creates content calendars. | Use PROACTIVELY for marketing content or social media posts. |
| **legal-advisor** | Draft privacy policies, terms of service, disclaimers, and legal notices. Creates GDPR-compliant texts, cookie policies, and data processing agreements. | Use PROACTIVELY for legal documentation, compliance texts, or regulatory requirements. |

---

## Directory Structure & Organization

### Core Documentation Locations

```
documentation/
├── DOCUMENTATION-STANDARDS.md         # This file (meta-documentation)
├── RULE-VIOLATION-LOG.md             # Global rule violations
├── SPACING-QUICK-REFERENCE.md        # Design system spacing reference
├── SPACING-SYSTEM-IMPLEMENTATION.md  # Design system implementation guide
├── CLAUDE-CODE-PERMISSIONS-GUIDE.md  # Claude Code usage guide
├── SUBAGENTS-INDEX.md                # Agent catalog and usage guide
│
├── docs/                             # PRIMARY DOCUMENTATION LOCATION
│   ├── database/                     # Database schema & architecture
│   │   ├── DATABASE_ARCHITECTURE.md
│   │   ├── RELATIONSHIPS.md
│   │   ├── db-schema.md
│   │   ├── database_tables.md
│   │   └── tables/                   # Individual table documentation
│   │       ├── qto_items.md
│   │       ├── rfis.md
│   │       └── ...
│   │
│   ├── development/                  # Development guides
│   │   ├── specs-change-events.md
│   │   ├── RULE-VIOLATION-LOG.md
│   │   ├── forms/                    # Form implementation docs
│   │   └── completion-reports/       # Feature completion reports
│   │
│   ├── procore/                      # Procore API & feature docs
│   │   ├── commitments/
│   │   ├── prime-contracts/
│   │   ├── direct-costs/
│   │   ├── change-orders/
│   │   ├── punch-list/
│   │   └── budget/
│   │
│   ├── context/                      # Context for AI agents
│   │   └── table-pages/              # Table implementation patterns
│   │
│   ├── plans/                        # Implementation plans
│   │   ├── general/
│   │   ├── design-system/
│   │   ├── meetings-implementation/
│   │   └── budget/
│   │
│   ├── sitemaps/                     # Sitemap documentation
│   ├── rules/                        # Rule documentation
│   ├── api/                          # API documentation
│   └── interactive-testing/          # Testing guides
│
├── directory/                        # Directory feature docs
├── forms/                            # Form-specific documentation
│   ├── IMPLEMENTATION_COMPLETE.md
│   ├── FORM_INVENTORY.md
│   └── test-runs/                    # Form test results
│
├── templates/                        # Documentation templates
└── need to review/                   # Temporary staging area
    ├── commitments/
    └── budget/
```

---

## Documentation Standards by Type

### 1. Feature Documentation

**Location:** `documentation/docs/[feature-area]/`

**Format:**
```markdown
# [Feature Name]

## Overview
Brief description of the feature and its purpose.

## Implementation Status
- [ ] Planning
- [ ] In Progress
- [ ] Complete
- [ ] Verified

## Architecture
How the feature is architected (use Mermaid diagrams when helpful).

## Key Files
- [file.ts](../path/to/file.ts) - Description
- [component.tsx](../path/to/component.tsx) - Description

## API Reference
API endpoints, parameters, and responses.

## Testing
How to test this feature.

## Known Issues
Any known limitations or issues.

## Related Documentation
Links to related docs.
```

**When to Create:**
- After implementing a significant feature
- When documenting external API integration (e.g., Procore)
- When creating reusable patterns

**Agent to Use:** `docs-architect` or `tutorial-engineer`

---

### 2. Database Documentation

**Location:** `documentation/docs/database/`

**Format:**
- **Schema overview:** `DATABASE_ARCHITECTURE.md`
- **Relationships:** `RELATIONSHIPS.md`
- **Individual tables:** `tables/[table_name].md`

**Standards:**
- Always generate from TypeScript types using: `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts`
- Document RLS policies
- Document triggers and functions
- Include relationship diagrams (Mermaid)

**Agent to Use:** `reference-builder` or `docs-architect`

---

### 3. API Documentation

**Location:** `documentation/docs/api/`

**Format:**
- Use OpenAPI/Swagger specs when possible
- Include request/response examples
- Document authentication
- Document rate limits
- Document error codes

**Agent to Use:** `api-documenter`

---

### 4. Implementation Plans

**Location:** `documentation/docs/plans/[category]/`

**Format:**
```markdown
# [Plan Name]

## Status
- [ ] Planning
- [ ] Implementation
- [ ] Testing
- [ ] Complete

## Objectives
What we're trying to achieve.

## Implementation Steps
1. Step 1
2. Step 2
...

## Success Criteria
How we know we're done.

## Testing Plan
How we'll verify.

## Related Files
Links to implementation.
```

**When to Create:**
- Before starting multi-file features
- For major refactoring work
- For breaking changes

**Agent to Use:** `Plan` agent (built-in)

---

### 5. Completion Reports

**Location:** `documentation/docs/development/completion-reports/`

**Format:**
```markdown
# [Feature] - Completion Report

## Summary
What was completed.

## Changes Made
- File changes
- New components
- Database changes

## Testing Results
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing complete

## Verification
How to verify the feature works.

## Known Issues
Any remaining issues.

## Next Steps
Follow-up work needed.
```

**When to Create:**
- After completing a major feature
- Before marking a task as done
- When handing off work

**Agent to Use:** `docs-architect`

---

### 6. Tutorial/Guide Documentation

**Location:** `documentation/docs/[category]/`

**Format:**
- Step-by-step instructions
- Code examples
- Screenshots when helpful
- Common pitfalls section
- FAQ section

**Agent to Use:** `tutorial-engineer`

---

### 7. Architecture Documentation

**Location:** `documentation/docs/[category]/`

**Format:**
- High-level overview
- Mermaid diagrams (flowcharts, sequence diagrams, architecture diagrams)
- Design decisions and rationale
- Trade-offs considered
- Future considerations

**Agent to Use:** `docs-architect` + `mermaid-expert`

---

## Workflow for Creating Documentation

### Standard Process

1. **Identify Documentation Need**
   - New feature completed
   - Complex implementation that needs explanation
   - API integration documented
   - Architecture decision made

2. **Choose Appropriate Agent**
   - Use the table above to select the right agent
   - Consider using multiple agents for comprehensive docs

3. **Determine Correct Location**
   - Use the directory structure guide above
   - Create new directories if needed under `documentation/docs/[category]/`

4. **Create Documentation**
   - Use the appropriate template from this guide
   - Include diagrams where helpful (use `mermaid-expert`)
   - Link to related files using markdown link syntax: `[file.ts](path/to/file.ts)`
   - Link to specific lines: `[file.ts:42](path/to/file.ts#L42)`

5. **Review & Verify**
   - Ensure all links work
   - Ensure diagrams render correctly
   - Run `npm run quality --prefix frontend` if code examples included
   - Move from `need to review/` to final location when verified

6. **Index Documentation**
   - Update relevant index files
   - Add to table of contents if applicable
   - Link from related documentation

---

## File Naming Conventions

### Documentation Files

- **Use UPPERCASE for important meta-docs:** `README.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`
- **Use lowercase for specific features:** `budget-setup.md`, `change-events.md`
- **Use hyphens for multi-word names:** `database-architecture.md` (not `database_architecture.md`)
- **Be descriptive:** `budget-verification-final-report.md` (not `report.md`)

### Avoid These Patterns

- ❌ `file_v2.md`, `file_final.md`, `file_FINAL_FINAL.md`
- ❌ `untitled.md`, `temp.md`, `notes.md`
- ❌ `file-old.md`, `file-backup.md`, `file-copy.md`

**Instead:**
- ✅ Use version control (git) for history
- ✅ Delete obsolete files
- ✅ Keep one canonical version

---

## Temporary Documentation Location

**Location:** `documentation/need to review/`

**Purpose:**
- Staging area for documentation that needs review
- Work-in-progress documentation
- Documentation that needs to be reorganized

**Rules:**
1. **DO NOT** leave documentation here permanently
2. **DO** move to final location within 7 days
3. **DO** delete if no longer relevant
4. **DO** consolidate duplicates when moving

**Cleanup Process:**
```bash
# Review files older than 7 days
find documentation/need\ to\ review/ -type f -mtime +7

# Move to final location or delete
# (Don't let this directory grow unbounded)
```

---

## Documentation Quality Checklist

Before marking documentation as complete, ensure:

- [ ] **Accurate:** Information is correct and verified
- [ ] **Complete:** All necessary sections filled out
- [ ] **Clear:** Written in plain language, avoids jargon
- [ ] **Consistent:** Follows templates and standards in this guide
- [ ] **Linked:** Related files and docs are linked using markdown links
- [ ] **Diagrams:** Complex flows/architecture include Mermaid diagrams
- [ ] **Examples:** Code examples are included where helpful
- [ ] **Tested:** Code examples have been verified to work
- [ ] **Indexed:** Added to relevant index/table of contents
- [ ] **Located:** Stored in correct directory per this guide

---

## Special Cases

### When Documentation Doesn't Fit Standard Categories

1. **Check existing directories first** - Is there a similar category?
2. **Create new category under `documentation/docs/`** - Use descriptive name
3. **Update this guide** - Add new category to directory structure
4. **Create README.md in new category** - Explain what goes there

### When Updating Existing Documentation

1. **Edit in place** - Don't create `_v2` or `_updated` files
2. **Update "Last Updated" date** - At top of document
3. **Add changelog section** - For major changes
4. **Preserve git history** - Don't delete and recreate

### When Documentation Conflicts Exist

1. **Identify canonical source** - Which is most complete/accurate?
2. **Merge unique content** - Consolidate into canonical source
3. **Delete duplicates** - Remove obsolete versions
4. **Update links** - Ensure all references point to canonical source
5. **Log in RULE-VIOLATION-LOG.md** - Document the consolidation

---

## Agent Usage Examples

### Example 1: Document New API Integration

```bash
# Use api-documenter agent
Task: "Document the Procore Commitments API integration. Include authentication, endpoints, request/response formats, and error handling. Store in documentation/docs/procore/commitments/"
Agent: api-documenter
```

### Example 2: Create Architecture Guide

```bash
# Use docs-architect + mermaid-expert
Task: "Create comprehensive architecture documentation for the budget calculation system. Include data flow diagrams, component relationships, and database interactions. Store in documentation/docs/development/"
Agents: docs-architect, mermaid-expert
```

### Example 3: Write Tutorial

```bash
# Use tutorial-engineer
Task: "Create a step-by-step tutorial for implementing a new table page using our GenericDataTable pattern. Include code examples and common pitfalls. Store in documentation/docs/development/"
Agent: tutorial-engineer
```

### Example 4: Generate Reference Documentation

```bash
# Use reference-builder
Task: "Generate exhaustive reference documentation for all database functions and triggers. Include parameter descriptions, return types, and usage examples. Store in documentation/docs/database/"
Agent: reference-builder
```

---

## Enforcement

### Claude Code MUST:

1. **Always use this guide** when creating documentation
2. **Always choose correct location** per directory structure
3. **Always use appropriate agent** from the table above
4. **Always follow naming conventions** specified here
5. **Never create duplicate documentation** without consolidating
6. **Never leave documentation in `need to review/`** for more than 7 days
7. **Always update index files** when adding new documentation
8. **Always use markdown link syntax** for file references

### Violations:

Any violation of these standards MUST be logged in:
```
documentation/RULE-VIOLATION-LOG.md
```

---

## Quick Reference

### "Where do I put...?"

| Documentation Type | Location | Agent |
|-------------------|----------|-------|
| Feature completion report | `documentation/docs/development/completion-reports/` | docs-architect |
| API documentation | `documentation/docs/api/` | api-documenter |
| Database schema | `documentation/docs/database/` | reference-builder |
| Implementation plan | `documentation/docs/plans/[category]/` | Plan (built-in) |
| Tutorial/guide | `documentation/docs/[category]/` | tutorial-engineer |
| Architecture diagrams | `documentation/docs/[category]/` | docs-architect + mermaid-expert |
| Procore integration docs | `documentation/docs/procore/[feature]/` | api-documenter |
| Form documentation | `documentation/forms/` | docs-architect |
| Testing guides | `documentation/docs/interactive-testing/` | tutorial-engineer |

### "Which agent do I use...?"

| Task | Agent |
|------|-------|
| Comprehensive technical documentation | docs-architect |
| API/SDK documentation | api-documenter |
| Reference documentation (exhaustive) | reference-builder |
| Step-by-step tutorials | tutorial-engineer |
| Visual diagrams (Mermaid) | mermaid-expert |
| Planning before implementation | Plan (built-in) |
| Customer-facing help docs | customer-support |
| Legal/compliance docs | legal-advisor |

---

## Maintenance

This documentation standard should be reviewed and updated:

- **After major refactoring** - Ensure directory structure still makes sense
- **When new categories emerge** - Add to directory structure and templates
- **Quarterly** - Review and consolidate `need to review/` directory
- **When agents are added/removed** - Update agent table

**Owner:** Project maintainers
**Last Review:** 2026-01-08
**Next Review:** 2026-04-08

---

## Summary

1. **Use specialized agents** for documentation work (docs-architect, api-documenter, etc.)
2. **Follow directory structure** - Everything has a place
3. **Use templates** - Consistency matters
4. **Link properly** - Use markdown link syntax with file paths
5. **Clean up** - No duplicates, no abandoned docs in `need to review/`
6. **Quality matters** - Use the checklist before marking complete

**No evidence → no reasoning.**
**No standard → no documentation.**

Obey the standards or STOP and ask.
