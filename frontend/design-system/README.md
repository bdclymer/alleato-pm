# Alleato Design System — Superhuman-Inspired v2

**This is the single source of truth for all UI decisions in this project.**

No other design document should exist outside this folder. If you find one, it's outdated — delete it and point here.

## Design DNA

Inspired by **Superhuman's** zero-distraction email client:
- **Tonal elevation** replaces borders (bg-background #F6F6F8 → bg-card #FFFFFF)
- **Indigo-purple** (#5856D6) accent replaces Procore orange
- **Minimal shadows** (shadow-sm max, no shadow-lg/xl/2xl)
- **Spring animations** with Superhuman timing (100-200ms)
- **Five-shades-of-gray** dark mode (no pure black or white)
- **Inter** with OpenType features for premium typography

## Quick Start

Building a new page? Follow this decision tree:

1. **What type of page?** See [page-archetypes/](./page-archetypes/)
2. **What components should I use?** See [components.md](./components.md)
3. **What spacing/colors/typography?** See [tokens.md](./tokens.md)
4. **Exact Tailwind classes to copy?** See [UI_GUIDE.md](./UI_GUIDE.md)
5. **How do I handle loading/errors/modals?** See [patterns.md](./patterns.md)
6. **Why does it look like this?** See [DESIGN-PRINCIPLES.md](./DESIGN-PRINCIPLES.md)
7. **Full specification details?** See [Superhuman Design System Spec](../../docs-ai/contents/docs/design/SUPERHUMAN-DESIGN-SYSTEM-SPEC.md)

## The Rules

1. **Every page uses a page archetype.** No exceptions. No custom layouts.
2. **Every component comes from `@/components/ui/` or `@/components/ds/`.** Both are valid import sources.
3. **Every color, spacing value, and font size uses a design token.** No hex codes. No arbitrary values.
4. **Every interactive element uses a design system component.** No raw HTML (`<button>`, `<input>`, `<select>`).
5. **Cards don't have borders.** Use tonal elevation (bg-card on bg-background). The lightness difference IS the border.
6. **No heavy shadows.** Only `shadow-xs` (inputs) and `shadow-sm` (floating). Never `shadow-md`+.

## File Index

| File | What It Covers |
|------|---------------|
| [DESIGN-PRINCIPLES.md](./DESIGN-PRINCIPLES.md) | Philosophy, flow principles, border reduction protocol |
| [tokens.md](./tokens.md) | Colors, spacing, typography, shadows, animations, dark mode |
| [UI_GUIDE.md](./UI_GUIDE.md) | **READ FIRST** — Exact Tailwind classes, copy-paste patterns |
| [components.md](./components.md) | Which component to use for what, decision trees |
| [patterns.md](./patterns.md) | Loading states, errors, empty states, modals, forms |
| [premium-patterns.md](./premium-patterns.md) | Premium card, button, form, and metric patterns |
| [page-archetypes/](./page-archetypes/) | The 4 page types with copy-paste templates |
| [DESIGN-INDEX.md](./DESIGN-INDEX.md) | Complete index of design system files |

## Enforcement

The `/design:design-check` command validates any file against this system.
The `/design:design-audit` command audits the full codebase.
The `/design:design-fix-loop` command auto-fixes violations.

**ESLint enforces 3 design rules as ERRORS** — `no-hardcoded-colors`, `no-arbitrary-spacing`, `require-semantic-colors`. Violations BLOCK the build.

**Every PR that touches UI must pass a design check. No exceptions.**
