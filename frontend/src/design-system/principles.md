# Design Principles

## Philosophy: Minimal With Personality

Alleato is a construction project management platform. The UI should feel like a premium tool built for professionals — not a generic SaaS template, and not a design experiment.

**We are:** Linear meets Procore. Clean structure, clear hierarchy, intentional details.
**We are not:** Generic Bootstrap. Purple-gradient SaaS. Decorative for the sake of it.

### The Three Rules

1. **Structure over decoration.** Layout and hierarchy do the heavy lifting. Not shadows, gradients, or borders.
2. **Consistency over creativity.** A boring-but-consistent page is better than a creative-but-inconsistent one. Save creativity for moments that matter (onboarding, celebrations, empty states).
3. **Components over custom.** If a design system component exists, use it. If you need something new, add it to the system first — then use it everywhere.

## Hard Constraints

These are non-negotiable. Every page, every component, every PR.

| Rule | Why |
|------|-----|
| Never nest cards (`Card` inside `Card`) | Creates visual noise, breaks hierarchy |
| Never wrap page sections in decorative cards | Cards are for grouped data, not scaffolding |
| Max 2 visual container levels (page shell + section) | Prevents nesting hell |
| No heavy shadows (`shadow-lg`, `shadow-xl`, glows) | We're minimal, not material design |
| 1px borders only | Thick borders add visual weight we don't want |
| One accent color per page | Prevents visual chaos |
| No custom className overrides on primitives | Breaks consistency at the source |
| No raw HTML elements in pages | Always use design system components |
| No inline styles (`style={{}}`) | Use Tailwind tokens only |
| No hardcoded colors (hex, rgb, gray-*) | Use semantic CSS variables |

## Visual Rhythm

All spacing follows an 8px cadence:

| Token | Value | Use |
|-------|-------|-----|
| `space-y-2` / `gap-2` | 8px | Tight groups (label + input) |
| `space-y-4` / `gap-4` | 16px | Items within a section |
| `space-y-6` / `gap-6` | 24px | Related sections |
| `space-y-8` / `gap-8` | 32px | Top-level page sections |

- Default section spacing: `space-y-8`
- Default group spacing: `space-y-4`
- Typography caps at `font-semibold` (no `font-bold` or `font-extrabold` in body content)

## Card Usage Policy

Cards are containers for grouped data. They are NOT page scaffolding.

**Allowed:**
- KPI metric tiles
- Compact mobile record tiles
- Isolated side modules (e.g., project checklist)
- Summary blocks within a dashboard

**Not allowed:**
- Wrapping entire page sections
- Nesting cards inside cards
- Using as form section wrappers (use `<section>` with border-b instead)
- Generic visual wrappers with no semantic purpose

## Responsive Baseline

- Design mobile-first (375px minimum)
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- All interactive elements must have visible keyboard focus states
- Touch targets minimum 44px on mobile

## When Creativity Is Welcome

Not everything needs to be a gray rectangle. These moments benefit from personality:

- **Empty states** — Help users understand value, add visual interest
- **Success celebrations** — Project created modal, milestone achievements
- **Onboarding flows** — First-time experiences
- **Error pages** — 404, 500 pages

For these, the construction/blueprint aesthetic is our brand identity. Navy/slate blues with terracotta/orange accents. Blueprint grid patterns. Monospace technical labels.

Everywhere else: clean, quiet, professional. Let the data speak.
