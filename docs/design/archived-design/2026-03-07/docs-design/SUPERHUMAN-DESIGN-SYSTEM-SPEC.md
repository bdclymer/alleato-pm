# Alleato Design System v2: Superhuman-Inspired Specification

> **Status:** Design Specification (Pre-Implementation)
> **Author:** Claude Code + Megan Harrison
> **Date:** 2026-03-07
> **Reference:** Superhuman Mail by Rahul Vohra & Teresa Man

---

## Executive Summary

This specification defines the evolution of Alleato PM's design system from its current "Linear meets Procore" aesthetic to a **Superhuman-inspired premium experience**. The goal is to create the same feeling Superhuman users describe: **"a place where I feel in control"** — clean, fast, navigable, and worth paying premium prices for.

Superhuman charges $30/month for email — something available for free — because the *experience* is worth it. We apply the same philosophy: Alleato should feel so much better than legacy construction PM tools that users would choose it even if alternatives existed.

### What Changes

| Dimension | Current (v1) | Target (v2) |
|---|---|---|
| Primary color | Orange `#DB802D` (Procore brand) | Muted indigo-purple (Superhuman "Mysteria") |
| Font | Inter (system generic) | Inter (tuned) + OpenType features enabled |
| Borders | Liberal — cards, sections, dividers | Minimal — background toning replaces borders |
| Shadows | `shadow-xs`, `shadow-sm` allowed | `shadow-sm` only on floating elements |
| Navigation | Sidebar always visible | Collapsible to icons, keyboard-first |
| Detail view | Navigate to new page | Right sidebar panel (persistent) |
| Tables | Full page with toolbar | Center column + detail panel split |
| Command palette | Not implemented | Cmd+K for all actions |
| Animations | CSS transitions only | Spring physics, optimistic UI |
| Performance target | "Fast enough" | 100ms or less for every interaction |

### What Stays

- Next.js 15, Tailwind CSS, shadcn/ui foundation
- Component architecture (`@/components/ds/`, `@/components/ui/`)
- React Query data fetching
- Supabase backend
- Page archetypes concept (refined, not replaced)
- StatusBadge auto-resolution system (enhanced colors)

---

## 1. Design Philosophy

### The Three Principles for Flow (from Rahul Vohra)

**1. Make the next action obvious.**
When a user completes an action (approves a change order, archives a document), the next logical item auto-focuses. The user never returns to an indeterminate state. There is always a clear next thing.

**2. Give clear and immediate feedback with no distraction.**
Every interaction responds in under 100ms. Status changes are optimistic — the UI reflects the change immediately and syncs with the server asynchronously. No spinners for common actions. No confirmation dialogs for reversible actions.

**3. Minimize visual distraction.**
Detail views don't show the list simultaneously in a competing way. The primary column claims focus. Navigation is accessible but not always visible. Every pixel earns its place.

### The Anti-Noise Mandate

> "Every border must justify its existence. Every shadow must serve comprehension. Every color must communicate state, not decoration."

**Concrete rules:**

- Color is for **status and state only** — never for decoration or section differentiation
- Borders exist only where structural separation is mandatory
- Use background color toning (2–4% lightness shift) instead of borders for visual separation
- No shadow heavier than `shadow-sm`, and only on floating/elevated elements
- No nested cards — maximum 2 visual container levels (page shell + content section)

---

## 2. Color System

### 2.1 Light Theme ("Snow")

The light theme uses a warm-neutral base with a sophisticated accent color that "straddles blue and purple" — what Superhuman calls "Mysteria."

#### Core Surface Tokens

| Token | HSL | Hex (approx) | Usage |
|---|---|---|---|
| `--background` | `240 5% 97%` | `#FFFFFF` | Page background — NOT pure white, a subtle cool tint |
| `--foreground` | `240 6% 12%` | `#1D1D22` | Primary text — warm near-black |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card/panel surfaces — true white for elevation |
| `--card-foreground` | `240 6% 12%` | `#1D1D22` | Card text |
| `--muted` | `240 5% 95%` | `#F6F6F8` | Subtle backgrounds, hover states |
| `--muted-foreground` | `240 4% 46%` | `#6F7075` | Secondary text (~60% opacity effect) |
| `--border` | `240 5% 91%` | `#E6E6EC` | Structural borders (use sparingly) |

#### Accent System

| Token | HSL | Hex (approx) | Usage |
|---|---|---|---|
| `--primary` | `245 58% 52%` | `#8A71BD` | Primary actions, active states, focus rings |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` | Text on primary |
| `--accent` | `245 40% 94%` | `#EDEDFA` | Hover backgrounds, subtle accent tints |
| `--accent-foreground` | `245 58% 42%` | `#3F3DA6` | Accent text on accent bg |
| `--ring` | `245 58% 52%` | `#5856D6` | Focus ring color (matches primary) |

**Why indigo-purple?** It's neither blue (too corporate/generic) nor pure purple (too playful). It occupies a unique visual space that reads as "premium tool" — the same territory Superhuman, Linear, and Arc occupy. It replaces the Procore orange which signals "Procore clone" rather than "premium alternative."

#### Status Colors (State Only — Never Decorative)

| Token | HSL | Hex | Usage |
|---|---|---|---|
| `--status-success` | `152 69% 37%` | `#1DB954` | Approved, on-track, complete |
| `--status-warning` | `38 92% 50%` | `#F59E0B` | Pending, at-risk, needs attention |
| `--status-error` | `0 72% 51%` | `#DC2626` | Rejected, overdue, critical |
| `--status-info` | `217 91% 60%` | `#3B82F6` | Informational, synced, linked |

#### Destructive

| Token | HSL | Hex |
|---|---|---|
| `--destructive` | `0 72% 51%` | `#DC2626` |
| `--destructive-foreground` | `0 0% 100%` | `#FFFFFF` |

### 2.2 Dark Theme ("Carbon")

Built using Superhuman's five-shades-of-gray system where **closer surfaces are lighter** (mimicking light from above).

| Token | HSL | Hex (approx) | Elevation Level |
|---|---|---|---|
| `--background` | `240 6% 9%` | `#151518` | Deepest — page background |
| `--card` | `240 5% 13%` | `#1F1F24` | Mid — content surfaces |
| `--muted` | `240 5% 16%` | `#272730` | Near — hover, active states |
| `--popover` | `240 5% 18%` | `#2C2C35` | Closest — tooltips, dropdowns |
| `--foreground` | `0 0% 92%` | `#EBEBEB` | Primary text (not pure white) |
| `--muted-foreground` | `0 0% 65%` | `#A6A6A6` | Secondary text (65% opacity equivalent) |
| `--border` | `240 5% 19%` | `#2E2E38` | Subtle structural borders |
| `--primary` | `245 58% 62%` | `#7B79E5` | Accent — slightly lighter/more saturated for dark bg |

**Key principle:** No pure black (`#000`) or pure white (`#FFF`) anywhere. The darkest surface is `#151518`. The brightest text is `#EBEBEB`. This prevents eye strain in low-light conditions.

### 2.3 Brand Color

The existing Procore orange (`#DB802D`) is **retained** as a secondary brand identifier but demoted from `--primary` to `--brand`:

| Token | HSL | Usage |
|---|---|---|
| `--brand` | `29 71% 52%` | Logo accent, Procore integration badges only |
| `--brand-light` | `29 71% 95%` | Procore-specific status backgrounds |

It no longer drives buttons, focus rings, or primary actions.

---

## 3. Typography

### 3.1 Font Stack

```css
--font-sans: 'Inter', 'Inter Variable', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;
```

Inter remains the primary font. The key upgrade is **enabling OpenType features** and tightening the typographic system:

```css
body {
  font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

h1, h2, h3, .text-heading {
  letter-spacing: -0.01em;  /* Tighter headings like Superhuman */
}
```

### 3.2 Type Scale (Streamlined)

Three tiers only — enough to convey hierarchy, not enough to create noise:

| Tier | Size | Weight | Color | Tracking | Usage |
|---|---|---|---|---|---|
| **Primary** | 14px (`text-sm`) | 500 (`font-medium`) | `text-foreground` | normal | Names, titles, actionable text |
| **Secondary** | 14px or 13px | 400 (`font-normal`) | `text-muted-foreground` | normal | Descriptions, values, body text |
| **Tertiary** | 11px (`text-[11px]`) | 500 | `text-muted-foreground/50` | `tracking-wider` | Timestamps, metadata, labels |

**Additional scales for specific contexts:**

| Context | Size | Weight | Notes |
|---|---|---|---|
| Page title | 20px (`text-xl`) | 600 (`font-semibold`) | `tracking-tight` |
| Section heading | 14px (`text-sm`) | 600 | Uppercase, `tracking-wider` |
| KPI value (hero) | 28px (`text-[28px]`) | 600 | `tabular-nums`, `tracking-tight` |
| KPI value (compact) | 18px (`text-lg`) | 600 | `tabular-nums` |
| Table header | 11px | 600 | Uppercase, `tracking-wider`, `text-muted-foreground` |
| Monospace data | 13px | 400 | `font-mono`, `tabular-nums` |

### 3.3 Line Height

| Context | Line Height | Ratio |
|---|---|---|
| UI text (14px base) | 20px | 1.43 |
| Body/reading text | 24px | 1.5 |
| Headings | 1.1–1.2 | Tight |
| Compact (tables) | 18px | 1.29 |

---

## 4. Layout Architecture

### 4.1 The Three-Column Pattern (New Default for Table Pages)

Adapted from Superhuman's inbox layout for construction PM:

```
┌──────────┬──────────────────────────────┬────────────────┐
│ Project  │     Primary Data List        │   Detail       │
│   Nav    │     (widest column)          │   Panel        │
│          │                              │                │
│ [tools]  │  [search + filters]          │  [selected     │
│ [budget] │  ┌─────────────────────────┐ │   record       │
│ [commit] │  │ Row 1 (focused) ▶       │ │   details]     │
│ [change] │  ├─────────────────────────┤ │                │
│ [direct] │  │ Row 2                   │ │  [actions]     │
│ [sched]  │  ├─────────────────────────┤ │                │
│ [dir]    │  │ Row 3                   │ │  [history]     │
│          │  └─────────────────────────┘ │                │
└──────────┴──────────────────────────────┴────────────────┘
```

**Column widths:**

- Left nav: 56px collapsed (icon-only) / 240px expanded
- Center list: flex-1 (takes remaining space)
- Right detail panel: 380px fixed / collapsible to 0

**Key behaviors:**

- Clicking a row in the center list opens its details in the right panel WITHOUT navigating away
- J/K keys move focus through the list
- Enter opens the full detail page (for complex records)
- Escape closes the detail panel
- The detail panel shows: key fields, status, actions, recent activity

### 4.2 Page Archetypes (Refined)

| Archetype | Layout | Detail Panel | Use Case |
|---|---|---|---|
| **List Page** | 3-column | Yes (right sidebar) | Budget, Commitments, Directory, Change Orders, Direct Costs, Schedule |
| **Detail Page** | 2-column (content + sidebar) | N/A (IS the detail) | Individual record view, project settings |
| **Form Page** | Centered, 640px max | No | Create/edit modals or full-page forms |
| **Dashboard Page** | Full-width, grid sections | No | Project home, executive views |

### 4.3 Spacing System

The 8px grid continues but with tighter defaults to match Superhuman's density:

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Icon-to-text gaps, minimal separation |
| `--space-2` | 8px | Related items (label + value, badge clusters) |
| `--space-3` | 12px | Compact list items, table cell padding |
| `--space-4` | 16px | Section internal spacing |
| `--space-6` | 24px | Between related sections |
| `--space-8` | 32px | Between major page sections |

**Table row density (default):**

- Row height: 44px (compact but readable)
- Cell padding: `px-3 py-2.5`
- This is tighter than current (53px) — matches Superhuman's information density

---

## 5. Border & Shadow Policy

### 5.1 The Border Reduction Protocol

**Current state:** Cards with `border border-border rounded-lg` everywhere.
**Target state:** Borders only where structurally necessary.

| Element | Current | Target |
|---|---|---|
| Page sections | `border border-border rounded-lg` | No border — use `bg-card` on `bg-background` |
| Table rows | `divide-y divide-border` | Keep — rows need visual separation |
| Table header | `border-b border-border` | Keep — structural |
| Cards in grids | `border border-border` | Remove most — use whitespace + bg difference |
| Form inputs | `border border-input` | Keep — interactive elements need borders |
| Sidebar nav | `border-r border-border` | Remove — use background color shift |
| KPI row | `border border-border rounded-lg` | Remove border — use `bg-card shadow-sm` |

**The rule:** If two adjacent elements have different background colors (e.g., `bg-card` on `bg-background`), a border is redundant. The tonal shift is the separator.

### 5.2 Shadow System

| Token | Value | Usage |
|---|---|---|
| (none) | No shadow | 90% of elements — the default |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Floating elements: dropdowns, tooltips, command palette |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` | Modals, sheets (elevated overlays only) |

**Banned:** `shadow-lg`, `shadow-xl`, `shadow-2xl`, any glow effects.

### 5.3 Border Radius

| Token | Value | Usage |
|---|---|---|
| `rounded-md` (6px) | Default for inputs, buttons, small cards |
| `rounded-lg` (8px) | Page-level containers, panels, modals |
| `rounded-xl` (12px) | Command palette, major overlays |
| `rounded-full` | Avatars, badges, status dots, pills |

---

## 6. Navigation Model

### 6.1 Keyboard-First Design

Every table page must support these keyboard shortcuts:

| Key | Action | Context |
|---|---|---|
| `J` / `↓` | Focus next row | Table/list view |
| `K` / `↑` | Focus previous row | Table/list view |
| `Enter` | Open focused record detail panel | Table/list view |
| `Escape` | Close detail panel / Close modal | Everywhere |
| `E` | Primary action (approve, mark done) | When record focused |
| `Cmd+K` | Open command palette | Global |
| `Cmd+/` | Toggle keyboard shortcut help | Global |
| `G then B` | Go to Budget | Global (vim-style "go to") |
| `G then C` | Go to Commitments | Global |
| `G then D` | Go to Directory | Global |
| `G then S` | Go to Schedule | Global |
| `G then H` | Go to Home | Global |
| `Z` | Undo last action | After any action |
| `N` | Create new record | Table/list view |
| `/` | Focus search input | Table/list view |
| `Tab` | Next section/split | Navigation |

### 6.2 Command Palette (Cmd+K)

The command palette is the single most important new component:

**Visual design:**

- Centered horizontally, positioned at upper-third of viewport
- Width: 560px max
- Background: `bg-card` with `shadow-md` and `rounded-xl`
- Backdrop: `bg-black/30` (semi-transparent overlay)
- Search input: 16px, no border, full-width, placeholder: "Type a command or search..."
- Results: icon + label + shortcut badge (right-aligned, monospace, muted)
- Focused result: `bg-accent` highlight

**Animation:**

- Open: spring animation, 200ms, slight overshoot (scale 0.98 → 1.0 with cubic-bezier)
- Close: 150ms fade-out
- Results: instant filter (no loading state)

**Functionality:**

- Searches: records, contacts, actions, navigation, settings
- Every result shows its keyboard shortcut — passive education
- Natural language: "go to budget" → navigates, "create change order" → opens form
- Recent actions shown when palette is empty

### 6.3 Collapsible Sidebar

The project navigation sidebar collapses to icon-only (56px) by default on desktop, expanding on hover or toggle:

| State | Width | Shows |
|---|---|---|
| Collapsed (default) | 56px | Tool icons only, tooltip on hover |
| Expanded (hover/toggle) | 240px | Full labels + icons |
| Mobile | 0px (hidden) | Sheet overlay on hamburger |

**Transition:** 200ms ease-out, no content reflow in center column.

---

## 7. Component Refinements

### 7.1 Table Rows

```
Focused row:  2px left accent border (--primary), bg-accent/5
Hovered row:  bg-muted (subtle — 2-3% shift)
Selected row: bg-accent/10, left checkmark
Default:      bg-card, text-foreground/text-muted-foreground
```

Row focus is driven by keyboard (J/K) or click. Only one row can be focused at a time. Focused row auto-opens in the right detail panel.

### 7.2 Status Badges (Enhanced)

Current `StatusBadge` auto-resolution stays. Colors shift to match new palette:

| Variant | Light Theme | Dark Theme |
|---|---|---|
| success | `bg-emerald-50 text-emerald-600` | `bg-emerald-900/30 text-emerald-400` |
| warning | `bg-amber-50 text-amber-600` | `bg-amber-900/30 text-amber-400` |
| error | `bg-red-50 text-red-600` | `bg-red-900/30 text-red-400` |
| info | `bg-blue-50 text-blue-600` | `bg-blue-900/30 text-blue-400` |
| neutral | `bg-muted text-muted-foreground` | Same (auto from tokens) |

### 7.3 KPI Blocks

Remove the border from `KpiRow`. Replace with:

```tsx
<div className="rounded-lg bg-card p-1">
  <div className="grid grid-cols-4 divide-x divide-border">
    {/* KpiBlock items */}
  </div>
</div>
```

The container uses `bg-card` against a `bg-background` page — the tonal shift IS the border.

### 7.4 Empty States

Current pattern is good. Enhancement: add a "completion ceremony" for empty states that result from completing work (e.g., all RFIs reviewed → show a congratulatory illustration, not a sad empty icon).

### 7.5 Undo Toast (New Component)

```tsx
// After every reversible action (status change, archive, delete)
<UndoToast
  message="Change order marked as approved"
  action={{ label: "Undo", shortcut: "Z", onClick: handleUndo }}
  duration={5000}  // auto-dismiss after 5 seconds
/>
```

**Design:**

- Fixed bottom-center, `rounded-lg bg-foreground text-background` (inverted)
- No close button — self-dismisses
- Shows keyboard shortcut: "Press Z to undo"
- Replaces confirmation dialogs for reversible actions

---

## 8. Animation System

### 8.1 Performance Targets

| Interaction | Target | Current |
|---|---|---|
| Page navigation | < 100ms | ~300ms |
| Filter application | < 50ms | ~200ms |
| Row focus change | < 16ms | Not tracked |
| Modal open | < 100ms | ~200ms |
| Status update | < 50ms (optimistic) | ~500ms (waits for server) |
| Command palette open | < 50ms | N/A |
| Search results | < 100ms | ~400ms |

### 8.2 Transition Tokens

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `--transition-instant` | 0ms | — | Active/pressed states |
| `--transition-fast` | 100ms | `ease-out` | Hover states, focus rings |
| `--transition-normal` | 150ms | `ease-out` | Panel open/close, row slide |
| `--transition-spring` | 200ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Command palette, modal entrance |

### 8.3 Optimistic UI Pattern

```typescript
// Every mutation follows this pattern:
async function updateStatus(id: string, newStatus: string) {
  // 1. Update UI immediately
  queryClient.setQueryData(['records', id], (old) => ({
    ...old,
    status: newStatus,
  }));

  // 2. Show undo toast
  showUndoToast(`Status changed to ${newStatus}`);

  // 3. Sync with server (background)
  try {
    await supabase.from('records').update({ status: newStatus }).eq('id', id);
  } catch {
    // 4. Revert on failure
    queryClient.invalidateQueries(['records', id]);
    showErrorToast('Failed to update status');
  }
}
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. Update CSS variables in `globals.css` — new color palette
2. Enable OpenType features on body
3. Tighten typography: heading letter-spacing, text hierarchy
4. Remove unnecessary borders from cards and sections
5. Update `tailwind.config.ts` with new tokens

### Phase 2: Components (Week 3-4)

1. Build `CommandPalette` component
2. Build `UndoToast` component
3. Build `DetailPanel` (right sidebar) component
4. Update `KpiRow` — remove border, use bg elevation
5. Update `DataTable` — keyboard navigation (J/K), focused row state
6. Update sidebar — collapsible to icon-only mode

### Phase 3: Page Patterns (Week 5-6)

1. Convert Budget page to 3-column layout with detail panel
2. Convert Commitments page
3. Convert Directory page
4. Add keyboard shortcut system (global handler)
5. Add "go to" navigation (G+B, G+C, etc.)

### Phase 4: Polish (Week 7-8)

1. Optimistic UI on all status mutations
2. Spring animations on command palette and modals
3. Completion ceremonies for milestone achievements
4. Dark mode refinement with five-shade gray system
5. Performance audit — ensure 100ms target on all interactions

---

## 10. Migration Guide: Current → v2

### CSS Variable Changes

```css
/* BEFORE (v1) */
--primary: 29 71% 52%;          /* Orange */
--ring: 215 20% 65%;            /* Blue-gray */
--background: 0 0% 100%;       /* Pure white */

/* AFTER (v2) */
--primary: 245 58% 52%;         /* Indigo-purple */
--ring: 245 58% 52%;            /* Matches primary */
--background: 240 5% 97%;       /* Warm off-white */
```

### Component Migration

| Current | Action | Target |
|---|---|---|
| `border border-border rounded-lg` on sections | Remove | `bg-card` (tonal shift replaces border) |
| `shadow-xs` on cards | Remove | No shadow on non-floating elements |
| `hover:bg-muted` on rows | Keep | Add `focus:bg-accent/5` + left accent border |
| Orange primary buttons | Auto-updates | Indigo-purple (via token change) |
| Confirmation dialogs | Replace | Optimistic UI + Undo toast |
| Full-page navigation | Augment | Right detail panel for quick views |

### What NOT to Change

- StatusBadge auto-resolution system — works perfectly, just update badge colors
- DataTable column definition API — stable, just add keyboard nav
- PageContainer / ProjectPageHeader — structure stays, styling auto-updates via tokens
- Form validation patterns — independent of visual system
- React Query hooks — data layer unchanged

---

## Appendix A: Superhuman Research Sources

### Official Superhuman Design Resources

- [How to design delightful dark themes](https://blog.superhuman.com/how-to-design-delightful-dark-themes/) — Teresa Man
- [How Superhuman chooses Inbox Zero images](https://blog.superhuman.com/how-superhuman-chooses-inbox-zero-images/) — Teresa Man
- [How to build a remarkable command palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- [The 3 design principles for creating flow](https://blog.superhuman.com/how-to-design-for-flow/) — Rahul Vohra
- [How to hack beautiful flourishes into your font](https://blog.superhuman.com/how-to-hack-beautiful-flourishes-into-your-font/)
- [Game design, not gamification](https://blog.superhuman.com/game-design-not-gamification/) — Rahul Vohra

### Design Teardowns & Case Studies

- [Superhuman: Speed as the Product](https://blakecrosley.com/guides/design/superhuman)
- [How Superhuman Engineered a Beloved Email Experience](https://zetetikos.substack.com/p/case-study-how-superhuman-engineered)
- [Superhuman User Onboarding](https://growth.design/case-studies/superhuman-user-onboarding) — Growth.design
- [Supercharging Email Productivity: UX Case Study](https://cooldeep-eth.medium.com/supercharging-email-productivity-a-ux-design-case-study-on-superhumans-approach-to-user-666cae82e251)

### Visual References

- [Superhuman on Dribbble](https://dribbble.com/superhuman) — Official shots by Teresa Man
- [Mobbin — 185 Superhuman screens](https://mobbin.com/explore/screens/85b28b16-cb18-4a3c-824e-8f4fab7ba110)
- [Nicely Done Club — 34 Superhuman components](https://nicelydone.club/apps/superhuman/components)
- [Carbon 2.0 update](https://new.superhuman.com/carbon-2-0-91173)
- [Alfred Superhuman theme](https://github.com/chrismessina/alfred-theme-superhuman)

### Specific Color References

- Carbon 2.0 label colors: `#aeb1dd`, `#b4e3cc`, `#d3b9c5`, `#b0bdd1`, `#c5bbda`, `#f3b9da`, `#bdd1b0`
- Dribbble palette extractions: `#3038DD` (primary indigo), `#5856D6` (app accent), `#543798`, `#332270`
- Brand identity: "Mysteria" (blue-purple) + "Heart" (deep maroon)

### Typography

- Primary UI font: Inter (product UI) / Adelle Sans (email body, 15 fonts tested)
- OpenType features: `kern`, `dlig`, `liga`, `calt`
- Key insight: 6 months spent on typography alone

---

## Appendix B: Current Alleato v1 Token Reference

For migration reference, the complete current token set:

```css
/* v1 Current Values (to be replaced) */
--primary: 29 71% 52%;           /* #DB802D — Procore orange */
--background: 0 0% 100%;         /* Pure white */
--foreground: 0 0% 15%;          /* #262626 */
--muted: 0 0% 96.1%;             /* #F5F5F5 */
--muted-foreground: 0 0% 45.1%;  /* #737373 */
--border: 0 0% 89.8%;            /* #E5E5E5 */
--ring: 215 20% 65%;             /* #8DA0BA */
--card: 0 0% 100%;               /* Pure white (no elevation) */
--accent: 0 0% 96.1%;            /* Same as muted */
```

Note: v1 has no tonal differentiation between `--background` and `--card` — both are pure white. This is why borders are needed everywhere. v2 introduces the subtle tonal shift (`#F6F6F8` page vs `#FFFFFF` card) that eliminates the need for most borders.
