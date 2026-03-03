# Design System Audit

Run a comprehensive design system audit on the specified scope.

## Usage
```
/design-audit [scope]
```

**Scopes:**
- `all` - Full codebase audit (default)
- `ui` - Core UI components only
- `layout` - Layout components only
- `tables` - Table pages and components
- `forms` - Form pages and components
- `domain` - Domain-specific components
- `file:path/to/file.tsx` - Single file audit

## Instructions

You are performing a design system audit. Follow these steps:

1. **Read the design system rules** from `.claude/design-audit/design-system-rules.md`

2. **Determine scope** from the argument: $ARGUMENTS
   - If empty or "all", audit all sections
   - If a specific section, focus on that section
   - If "file:path", audit only that file

3. **For each file in scope**, check for violations of:
   - Color tokens (use design system colors, not raw hex or wrong Tailwind classes)
   - Spacing (8px grid, no arbitrary values like p-[10px])
   - Typography (use text-xs through text-4xl, not text-[14px])
   - Border radius (use rounded-sm/md/lg, not arbitrary)
   - Component usage (use ShadCN components, not raw HTML)
   - Layout patterns (use established classes like .page-container)
   - Responsive design (mobile-first, proper breakpoints)
   - Dark mode support (colors adapt properly)
   - Accessibility (focus states, aria labels, contrast)

4. **Output violations** to `.claude/design-audit/violations.json` in the schema format

5. **Generate a summary** showing:
   - Total violations by category
   - Total violations by severity
   - Top 10 files with most violations
   - Recommended fix priority

6. **If violations are found**, ask if the user wants to:
   - Fix them automatically (use /design-fix)
   - Review them first
   - Export to a different format
