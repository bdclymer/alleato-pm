# Alleato Design System

**This is the single source of truth for all UI decisions in this project.**

No other design document should exist outside this folder. If you find one, it's outdated — delete it and point here.

## Quick Start

Building a new page? Follow this decision tree:

1. **What type of page?** See [page-archetypes.md](./page-archetypes.md)
2. **What components should I use?** See [components.md](./components.md)
3. **What spacing/colors/typography?** See [tokens.md](./tokens.md)
4. **How do I handle loading/errors/modals?** See [patterns.md](./patterns.md)
5. **Why does it look like this?** See [principles.md](./principles.md)

## The Rules

1. **Every page uses a page archetype.** No exceptions. No custom layouts.
2. **Every component comes from `@/components/ui/` or `@/components/layout/`.** No custom styling on primitives.
3. **Every color, spacing value, and font size uses a design token.** No hex codes. No arbitrary values.
4. **Every interactive element uses a design system component.** No raw HTML (`<button>`, `<input>`, `<select>`).

## File Index

| File | What It Covers |
|------|---------------|
| [principles.md](./principles.md) | Design philosophy, aesthetic direction, what we value |
| [page-archetypes.md](./page-archetypes.md) | The 4 page types with copy-paste templates |
| [tokens.md](./tokens.md) | Colors, spacing, typography, shadows, borders |
| [components.md](./components.md) | Which component to use for what, decision trees |
| [patterns.md](./patterns.md) | Loading states, errors, empty states, modals, forms |

## Enforcement

The `/design:design-check` command validates any file against this system.
The `/design:design-audit` command audits the full codebase.
The `/design:design-fix-loop` command auto-fixes violations.

**Every PR that touches UI must pass a design check. No exceptions.**
