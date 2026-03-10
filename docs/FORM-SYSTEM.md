# Form System Documentation

## **Overview**

This project uses a **structured form system** built on top of:

- **React Hook Form** – form state management
- **Zod** – schema validation
- **shadcn/ui primitives** – UI building blocks
- **Custom form abstractions** in /components/forms

The goal of this system is to:

- Standardize how forms are built
- Ensure consistent UX across the application
- Reduce repetitive form wiring
- Improve maintainability
- Make forms easier for AI coding agents and developers to generate correctly

The form system provides **three layers**:

1. **Primitive UI components**
2. **Field wrappers (RHF components)**
3. **Page-level layout and structure**

---

# **Directory Structure**

```
components/
  forms/
    fields/
      RHFTextField.tsx
      RHFTextareaField.tsx
      RHFSelectField.tsx
      RHFNumberField.tsx
      RHFCheckboxField.tsx
      RHFDateField.tsx
      RHFMoneyField.tsx
      RHFComboboxField.tsx
      RHFFieldArrayTable.tsx

    utils/
      buildOptions.ts
      parsers.ts

    FormSection.tsx
    FormGrid.tsx
    FormActions.tsx
    FormServerError.tsx

    index.ts
```

---

# **Architectural Layers**

## **1. UI Primitive Layer**

These live in:

```
components/ui/
```

Examples:

- Input
- Select
- Checkbox
- Popover
- Command
- Button
- Table

These are **pure UI primitives**.

They **do not contain business logic** or form state logic.

---

## **2. Field Wrapper Layer (React Hook Form Integration)**

Location:

```
components/forms/fields
```

These components integrate the UI primitives with:

- React Hook Form
- Validation
- Labels
- Error messages
- Descriptions

Examples:

| **Component** | **Purpose** |
| --- | --- |
| RHFTextField | Standard text input |
| RHFTextareaField | Multi-line text |
| RHFSelectField | Standard dropdown |
| RHFNumberField | Numeric input |
| RHFMoneyField | Currency formatted input |
| RHFCheckboxField | Boolean toggle |
| RHFDateField | Date picker |
| RHFComboboxField | Searchable dropdown |
| RHFFieldArrayTable | Editable row tables |

These are the **primary field components developers should use**.

They eliminate the need to manually wire:

- FormField
- FormControl
- FormLabel
- FormMessage
- FormDescription

---

# **Utility Layer**

Located in:

```
components/forms/utils
```

These utilities support consistent form behavior.

## **buildOptions.ts**

Creates select option lists safely.

Example:

```
const STATUS_VALUES = ["draft", "pending", "approved"] as const

const STATUS_OPTIONS = buildOptions(STATUS_VALUES, {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved"
})
```

Benefits:

- type-safe enums
- avoids repeated option objects
- consistent structure

---

## **parsers.ts**

Handles numeric input parsing.

Example:

```
const schema = z.object({
  amount: z.preprocess(
    parseOptionalNumber,
    z.number().min(0).optional()
  )
})
```

Why this exists:

HTML inputs return **strings**, even for numbers.

These utilities ensure numbers are parsed safely.

---

# **Layout Components**

These components standardize page structure.

## **FormSection**

Creates a logical grouping of fields.

Example:

```
<FormSection
  title="Basic Information"
  description="Enter the main details"
>
```

Benefits:

- improves readability
- groups related inputs
- consistent spacing

---

## **FormGrid**

Provides responsive field layout.

Example:

```
<FormGrid columns={2}>
```

Default behavior:

```
mobile: 1 column
tablet+: based on columns prop
```

Supported columns:

```
1 (default), 2, 3, 12
```

Notes:

- Mobile is always a single column baseline
- `columns={12}` is intended for advanced `FormGridRow` layouts

---

## **FormActions**

Standard action bar for forms.

Example:

```
<FormActions
  submitLabel="Create Item"
  isSubmitting={isSubmitting}
  onCancel={handleCancel}
/>
```

Handles:

- submit state
- cancel button
- loading indicators
- consistent layout
- sticky, safe-area-aware mobile action bar
- full-width mobile action buttons

---

## **FormServerError**

Displays API-level errors.

Example:

```
<FormServerError message={errors.root?.message} />
```

Used for errors such as:

- API validation failures
- network failures
- permission errors

---

# **Example Form Pattern**

Standard page structure:

```
<Form {...form}>
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

    <FormSection title="Basic Information">
      <FormGrid columns={2}>

        <RHFTextField
          control={control}
          name="name"
          label="Name"
        />

        <RHFSelectField
          control={control}
          name="type"
          label="Type"
          options={TYPE_OPTIONS}
        />

      </FormGrid>
    </FormSection>

    <FormServerError message={errors.root?.message} />

    <FormActions
      submitLabel="Create"
      isSubmitting={isSubmitting}
    />

  </form>
</Form>
```

---

# **Design Principles**

This system enforces several principles:

### **Consistency**

All forms share the same structure.

### **Composability**

Pages assemble forms from reusable components.

### **Separation of Concerns**

UI, logic, and layout are separated.

### **Predictability**

Developers know exactly where things live.

### **AI-friendly architecture**

AI coding agents can reliably generate new forms.

---

# **Current Mobile Behavior**

The system now includes dedicated mobile-safe behavior in the core components:

1. `FormGrid` is mobile-first by default (`1` column baseline)
2. `RHFComboboxField` uses:
   - desktop: popover
   - mobile: bottom drawer selector
3. `RHFFieldArrayTable` uses:
   - desktop: table layout
   - mobile: stacked card layout
4. `FormActions` supports sticky mobile action bars with full-width buttons

This establishes a strong baseline for migrating existing form pages.

---

# **Mobile Best-Practice Notes**

Even with the shared defaults, verify each page:

1. keyboard-safe action visibility
2. touch target comfort at narrow widths
3. long option lists in comboboxes
4. field-array editing speed on mobile

---

# **Summary**

The form system provides:

- structured form architecture
- reusable field components
- standardized layout patterns
- type-safe utilities
- strong developer ergonomics

Current status:

```
Architecture: Strong
Consistency: Strong
Mobile UX: Strong baseline
Mobile Best Practices: Implemented in core components
```

When creating new forms, focus on:

1. using `FormGrid` instead of ad hoc field layouts
2. using `RHFComboboxField` and `RHFFieldArrayTable` instead of custom mobile logic
3. keeping fixed-width classes limited to desktop-only table cells
4. validating behavior on a real mobile viewport before shipping

These patterns make the form system migration-ready for mobile.
