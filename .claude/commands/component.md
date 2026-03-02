# Create Component (Design System Enforced)

Create a new component that follows design system rules.

## Usage

```bash
/component ComponentName [type]
```
**Types:**

- `ui` - Base UI component (goes in components/ui/)
- `form` - Form field component (goes in components/forms/)
- `layout` - Layout component (goes in components/layout/)
- `domain` - Domain-specific component (specify subdirectory)
- `page` - Page component

## Instructions

You are creating a new component. The component name is: $ARGUMENTS

### Step 1: Read Design System (MANDATORY)

Read these files from `frontend/src/design-system/` using the Read tool (in parallel):

1. **`frontend/src/design-system/components.md`** -- Component decision trees, banned patterns, layout components
2. **`frontend/src/design-system/tokens.md`** -- Colors, spacing, typography, shadows, borders
3. **`frontend/src/design-system/patterns.md`** -- Loading, error, empty states, form patterns

If creating a **page component**, also read:

4. **`frontend/src/design-system/page-archetypes.md`** -- The 4 page templates. Pick ONE and use its EXACT structure.

**You MUST use the design system. No exceptions. No inventing layouts from scratch.**

### Step 2: Determine Component Type and Location

Based on the name and context, determine:

- Component type (ui, form, layout, domain, page)
- File location
- Whether similar components exist to reference

### Step 3: Create Component Following Rules

**All rules below come from the design system files you just read. Follow them exactly.**

**Color Rules (from tokens.md):**

- Use ONLY semantic tokens: `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`, `bg-muted`
- Status: `text-destructive`, `bg-destructive/10`, etc.
- NEVER use raw hex values or hardcoded Tailwind colors like `text-gray-500`
- NEVER use arbitrary color values like `text-[#333]`

**Spacing Rules (from tokens.md):**

- Use 8px grid: `p-2`, `p-4`, `p-6`, `p-8`, `gap-2`, `gap-4`, `gap-6`
- NEVER use odd values: `p-3`, `p-5`, `p-7`, `gap-1.5`, `gap-2.5`
- NEVER use arbitrary values like `p-[10px]`

**Typography Rules (from tokens.md):**

- Use scale: `text-xs`, `text-sm`, `text-base`, `text-lg`
- Max weight: `font-semibold` (never `font-bold` or `font-extrabold`)
- NEVER use arbitrary values like `text-[14px]`

**Shadows & Borders (from tokens.md):**

- Shadows: `shadow-xs` or `shadow-sm` ONLY. Never `shadow-md`/`shadow-lg`/`shadow-xl`
- Border radius: `rounded-md` or `rounded-lg`. Never arbitrary values.
- Borders: `border` (1px) only. Never `border-2` or thicker.

**Component Rules (from components.md):**

- Use shadcn/ui components where available (Button, Input, Badge, etc.)
- Use `Modal`/`Slideover` from unified components (NEVER raw Dialog/Sheet)
- For forms, use react-hook-form + zod patterns from patterns.md
- NEVER nest cards (Card inside Card is forbidden)

**Layout Rules (from components.md):**

- Pages MUST use `ProjectPageHeader` + `PageContainer` from `@/components/layout`
- Forms MUST use `FormContainer` from `@/components/layout`
- NEVER use deprecated `ProjectToolPage` or custom header wrappers

**Responsive Rules:**

- Mobile-first: Start with mobile styles, add `sm:`, `md:`, `lg:` breakpoints
- Always consider mobile experience

**Accessibility Rules:**

- Use proper ARIA attributes
- Ensure focus states are visible
- Associate labels with inputs

### Step 4: Verify Component

After creating the component:

1. Run `/design-check path/to/new/component.tsx`
2. Fix any violations found
3. Ensure TypeScript has no errors: `npm run typecheck --prefix frontend`

### Step 5: Document Component

Add a brief comment at the top of the file:

```tsx
/**
 * ComponentName
 *
 * [Brief description of what it does]
 *
 * @example
 * <ComponentName prop="value" />
 */
```
### Template: UI Component

```tsx
import { cn } from "@/lib/utils"

interface ComponentNameProps {
  className?: string
  children?: React.ReactNode
}

export function ComponentName({ className, children }: ComponentNameProps) {
  return (
    <div className={cn(
      "bg-card text-card-foreground p-4 rounded-lg border",
      className
    )}>
      {children}
    </div>
  )
}
```

### Template: Form Field Component

```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FieldNameProps {
  label: string
  name: string
  value?: string
  onChange?: (value: string) => void
  error?: string
  disabled?: boolean
  className?: string
}

export function FieldName({
  label,
  name,
  value,
  onChange,
  error,
  disabled,
  className
}: FieldNameProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={name}
        className="text-xs font-semibold text-neutral-500"
      >
        {label}
      </Label>
      <Input
        id={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p id={`${name}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
```
