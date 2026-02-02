# Why Separate Audit and Fix Commands?

## The Unix Philosophy: Do One Thing Well

The separation of `/audit-docs` and `/fix-docs` follows the Unix philosophy and provides significant benefits:

## Comparison Table

| Aspect | Single Combined Command | Separate Commands |
|--------|------------------------|-------------------|
| **Safety** | Risk of unintended changes | Audit is always read-only |
| **CI/CD** | Can't use in PR checks (modifies files) | Audit perfect for PR validation |
| **Review** | Changes happen immediately | Human review between audit & fix |
| **Flexibility** | All or nothing | Selective fixing possible |
| **Debugging** | Hard to identify what went wrong | Clear separation of concerns |
| **Rollback** | Complex (mixed operations) | Simple (only fix command changes) |
| **Permissions** | Needs write access always | Audit works with read-only |
| **Speed** | Slower (always does both) | Fast audit, optional fix |
| **Testing** | Difficult to test separately | Each command tested independently |

## Real-World Scenarios

### Scenario 1: Pull Request Check
```bash
# ✅ With separate commands (SAFE)
/audit-docs ./docs  # Read-only, perfect for CI

# ❌ With combined command (DANGEROUS)
/audit-and-fix-docs ./docs  # Would modify files in PR!
```

### Scenario 2: Morning Standup
```bash
# ✅ With separate commands
/audit-docs ./PLANS/  # Quick health check
# Team discusses findings
/fix-docs --only "STATUS.md"  # Fix only what team agrees on

# ❌ With combined command
/audit-and-fix-docs ./PLANS/  # Changes everything immediately
# Team: "Wait, why did you change that?"
```

### Scenario 3: Production Documentation
```bash
# ✅ With separate commands
/audit-docs /prod/docs > report.md
# Send report to technical writer
# Technical writer reviews and approves specific fixes
/fix-docs report.md --approved-by "tech-writer"

# ❌ With combined command
/audit-and-fix-docs /prod/docs  # Auto-changes production docs!
```

## Benefits of Separation

### 1. **Composability**
```bash
# Can chain with other tools
/audit-docs ./docs | grep "critical" | /fix-docs --stdin

# Can save audits for later
/audit-docs ./docs > audit-2024-01-18.json
# ... next day ...
/fix-docs audit-2024-01-18.json
```

### 2. **Progressive Disclosure**
```bash
# Level 1: Just check
/audit-docs ./docs

# Level 2: Fix safe issues
/fix-docs --auto --safe-only

# Level 3: Interactive fixing
/fix-docs --interactive

# Level 4: Full automation
/fix-docs --all --no-backup --force  # Dangerous but possible
```

### 3. **Audit Trail**
```bash
# Clear history of what happened when
[2024-01-18 09:00] Ran: /audit-docs - Found 15 issues
[2024-01-18 09:30] Ran: /fix-docs --critical - Fixed 3 issues
[2024-01-18 14:00] Ran: /fix-docs --warnings - Fixed 8 issues
```

### 4. **Different Permissions**
- Junior devs can run `/audit-docs` (read-only)
- Senior devs can run `/fix-docs` (write access)
- CI/CD can run `/audit-docs` in PR checks
- Only release manager can `/fix-docs --production`

### 5. **Mental Model**
- **Audit = Doctor's Diagnosis** (non-invasive)
- **Fix = Surgery** (requires consent and preparation)

You wouldn't want your doctor to start surgery immediately after diagnosis without discussion!

## Implementation Pattern

```javascript
// Clean separation of concerns
class DocumentationAuditor {
  audit(path) {
    // Read-only operations
    // Returns findings
  }
}

class DocumentationFixer {
  fix(auditReport, options) {
    // Modifying operations
    // Takes audit output as input
  }
}

// vs Combined (messy)
class DocumentationAuditorAndFixer {
  auditAndFix(path, options) {
    // Mixed responsibilities
    // Hard to test
    // Can't audit without fixing
  }
}
```

## Best Practices

### DO ✅
- Run `/audit-docs` frequently (safe)
- Review audit reports before fixing
- Use `/fix-docs` with specific options
- Create backups before major fixes
- Test fixes in development first

### DON'T ❌
- Never run `/fix-docs --all --force` without review
- Don't fix production docs without approval
- Don't skip audit before fixing
- Don't fix everything at once

## Example Workflow

```bash
# 1. Daily health check (automated)
0 9 * * * /audit-docs /docs > /reports/daily-audit.md

# 2. Weekly review meeting
# Team reviews weekly audit trends

# 3. Sprint planning
# Add documentation fixes to sprint based on audit

# 4. During development
git checkout -b docs/fix-accuracy-issues
/fix-docs --type accuracy --interactive
git commit -m "docs: fix accuracy issues from audit"

# 5. Before release
/audit-docs /docs --severity critical
# Must be zero critical issues before release
```

## Conclusion

Separating audit and fix commands provides:
1. **Safety** through read-only auditing
2. **Flexibility** in choosing what to fix
3. **Control** over when changes happen
4. **Clarity** in what each command does
5. **Composability** with other tools

This separation is a fundamental best practice that makes the documentation maintenance process safer, more flexible, and more reliable.