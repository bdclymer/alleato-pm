# Design Tokens

All styling uses these tokens. No hex codes. No arbitrary values. No hardcoded colors.

## Colors

### Backgrounds

| Token | Usage |
|-------|-------|
| `bg-background` | Page background |
| `bg-card` | Card surfaces |
| `bg-muted` | Subtle background (table rows, hover states) |
| `bg-muted/30` | Very subtle tint |
| `bg-accent` | Interactive hover state |
| `bg-popover` | Popover/dropdown surfaces |
| `bg-primary` | Primary buttons, active states |
| `bg-secondary` | Secondary buttons |
| `bg-destructive` | Delete/danger actions |

### Text

| Token | Usage |
|-------|-------|
| `text-foreground` | Primary text (headings, body) |
| `text-muted-foreground` | Secondary text (descriptions, labels, metadata) |
| `text-primary` | Links, active navigation |
| `text-destructive` | Error text, destructive actions |
| `text-card-foreground` | Text on card surfaces |
| `text-popover-foreground` | Text in popovers |

### Borders

| Token | Usage |
|-------|-------|
| `border-border` | Default borders (dividers, card borders) |
| `border-input` | Form input borders |
| `border-ring` | Focus ring color |

### Status Colors

Use these for status indicators, badges, and alerts:

| Token | Usage |
|-------|-------|
| `text-green-600` / `bg-green-50` | Success, approved, active |
| `text-yellow-600` / `bg-yellow-50` | Warning, pending, draft |
| `text-red-600` / `bg-red-50` | Error, rejected, overdue |
| `text-blue-600` / `bg-blue-50` | Info, in progress |

### Banned Color Patterns

```
bg-white, bg-black                    → use bg-background, text-foreground
text-gray-*, bg-gray-*, border-gray-* → use semantic tokens above
#[hex], rgb(), rgba(), hsl()          → use Tailwind tokens
bg-[#...], text-[#...]               → use design system tokens
```

## Spacing

8px grid system. Every spacing value is a multiple of 8px (with 4px for tight situations).

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` / `space-y-1` | 4px | Icon-to-text gap |
| `gap-2` / `space-y-2` | 8px | Tight groups (label + input, badge + text) |
| `gap-3` / `space-y-3` | 12px | Compact lists |
| `gap-4` / `space-y-4` | 16px | Items within a section, default group spacing |
| `gap-6` / `space-y-6` | 24px | Form fields, related subsections |
| `gap-8` / `space-y-8` | 32px | Top-level page sections |

### Page Padding (handled by PageContainer)

| Breakpoint | Horizontal | Vertical |
|-----------|-----------|---------|
| Mobile | `px-4` (16px) | `py-4` (16px) |
| Tablet (`sm:`) | `px-6` (24px) | `py-6` (24px) |
| Desktop (`lg:`) | `px-8` (32px) | `py-6` (24px) |

### Banned Spacing Patterns

```
p-[10px], gap-[15px], m-[20px]  → use token values
p-5, p-7, p-9, p-10, p-11      → use 8px cadence (p-4, p-6, p-8, p-12)
```

## Typography

### Font Sizes

| Token | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Metadata, timestamps, fine print |
| `text-sm` | 14px | Secondary text, descriptions, table cells |
| `text-base` | 16px | Body text, form inputs |
| `text-lg` | 18px | Section headings (h2) |
| `text-xl` | 20px | Page sub-headings |
| `text-2xl` | 24px | Page titles (rare, mostly in PageHeader) |

### Font Weights

| Token | Usage |
|-------|-------|
| `font-normal` | Body text, descriptions |
| `font-medium` | Labels, table headers, navigation items |
| `font-semibold` | Section headings, emphasis |

**`font-bold` and `font-extrabold` are banned in body content.** Only used inside the PageHeader component.

### Banned Typography Patterns

```
text-[14px], text-[1.2rem]  → use text-sm, text-base, etc.
font-bold in page content   → use font-semibold max
```

## Borders & Radius

| Token | Usage |
|-------|-------|
| `border` | Default 1px border |
| `border-b` | Section dividers |
| `rounded-md` | Form inputs, buttons, cards |
| `rounded-lg` | Cards, modals |
| `rounded-full` | Avatars, badges, pills |

### Banned

```
border-2, border-4              → 1px borders only
rounded-sm, rounded (no suffix) → use rounded-md for inputs
shadow-lg, shadow-xl             → use shadow-sm or shadow-xs only
```

## Shadows

| Token | Usage |
|-------|-------|
| `shadow-xs` | Form inputs, select triggers |
| `shadow-sm` | Cards, dropdowns |
| (none) | Most elements — shadows are used sparingly |

### Banned

```
shadow, shadow-md, shadow-lg, shadow-xl, shadow-2xl → too heavy
ring-* with glow effects                             → not our aesthetic
```

## Interactive States

Every interactive element must implement all 5 states. No exceptions.

### The 5 States (all required)

| State | What Happens | Key Classes |
|-------|-------------|-------------|
| **Default** | Resting state — visible border, subtle shadow | `border-input shadow-xs bg-background` |
| **Hover** | Background shifts, shadow lifts slightly | `hover:bg-accent hover:text-accent-foreground` |
| **Focus** | Brand-colored ring appears around element | `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` |
| **Active** | Slight scale-down for tactile feedback | `active:scale-[0.98]` (buttons only) |
| **Disabled** | Faded, non-interactive | `disabled:opacity-50 disabled:pointer-events-none` |

### Button Interactive States (copy-paste ready)

**Primary Button** (brand CTA — max 1-2 per screen):

```
bg-primary text-primary-foreground shadow-xs
hover:bg-primary/90
focus-visible:ring-[3px] focus-visible:ring-ring/50
active:scale-[0.98]
disabled:opacity-50 disabled:pointer-events-none
```

**Secondary / Outline Button**:

```
border border-input bg-background text-foreground shadow-xs
hover:bg-accent hover:text-accent-foreground
focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
active:scale-[0.98]
disabled:opacity-50 disabled:pointer-events-none
```

**Ghost Button**:

```
text-muted-foreground
hover:bg-accent hover:text-accent-foreground
focus-visible:ring-[3px] focus-visible:ring-ring/50
disabled:opacity-50 disabled:pointer-events-none
```

**Destructive Button**:

```
bg-destructive text-destructive-foreground shadow-xs
hover:bg-destructive/90
focus-visible:ring-[3px] focus-visible:ring-ring/50
active:scale-[0.98]
disabled:opacity-50 disabled:pointer-events-none
```

### Link / Text Interactive States

```
text-muted-foreground
hover:text-foreground
transition-colors
```

For brand-accent hover (e.g., list item titles):

```
text-foreground
group-hover:text-primary
transition-colors
```

### Row / Card Interactive States

Entire-row hover (for list items, table rows):

```
group rounded-md transition-colors
hover:bg-muted
```

### Banned Interactive Patterns

```
hover:bg-gray-50, hover:bg-gray-100      → use hover:bg-accent or hover:bg-muted
hover:text-orange-600, hover:bg-orange-*  → use hover:text-primary or hover:bg-primary
focus:ring-orange-500                     → use focus-visible:ring-ring/50
focus:outline-none (alone)                → must ALSO have ring — focus needs visible indicator
ring-2 ring-offset-2                      → use ring-[3px] ring-ring/50 (matches shadcn)
```

### Component Consistency Matrix

All form-level interactive elements must match:

| Property | Input | SelectTrigger | Button (outline) |
|----------|-------|---------------|------------------|
| Border | `border-input` | `border-input` | `border-input` |
| Radius | `rounded-md` | `rounded-md` | `rounded-md` |
| Height | `h-9` | `h-9` | `h-9` |
| Shadow | `shadow-xs` | `shadow-xs` | `shadow-xs` |
| Focus ring | `ring-ring/50` | `ring-ring/50` | `ring-ring/50` |
| Padding | `px-3 py-2` | `px-3 py-2` | `px-3 py-2` |

**Any deviation from this matrix is a bug.**

### CSS Variable Reference (what the tokens resolve to)

These are defined in `globals.css` — never use the raw values, always use the Tailwind tokens above.

| Token | CSS Variable | Light Mode Value | Resolves To |
|-------|-------------|-----------------|-------------|
| `primary` | `--primary` | `29 71% 52%` | Procore orange (#DB802D) |
| `ring` | `--ring` | `215 20% 65%` | Neutral blue-gray focus ring |
| `brand` | `--brand` | `29 71% 52%` | Same as primary |
| `destructive` | `--destructive` | `0 84.2% 60.2%` | Red |
| `muted` | `--muted` | `0 0% 96.1%` | Light gray |
| `accent` | `--accent` | `0 0% 96.1%` | Light gray (hover bg) |
