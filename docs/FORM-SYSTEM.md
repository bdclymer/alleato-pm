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
tablet+: 2 columns
```

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

The system is **mobile-compatible but not fully optimized yet**.

The current layout approach:

```
mobile → single column
tablet/desktop → two columns
```

This ensures forms remain readable on smaller screens.

However, several components still require improvements for **best-in-class mobile UX**.

---

# **Recommended Mobile Improvements**

The following improvements should be implemented to reach **best practice mobile form behavior**.

---

# **1. Improve Field Array Tables**

Current behavior:

RHFFieldArrayTable renders a traditional table layout.

This works well on desktop but can become difficult to use on mobile devices.

Problems include:

- horizontal scrolling
- cramped editing fields
- poor row readability

Recommended solution:

Create a **responsive pattern**:

```
desktop → table layout
mobile → stacked card layout
```

Example mobile layout:

```
Line Item
------------------
Item Name
[ input ]

Quantity
[ input ]

Unit Cost
[ input ]

[ Remove Item ]
```

This dramatically improves usability on smaller screens.

---

# **2. Improve Combobox Behavior**

Combobox dropdowns may become difficult to interact with on mobile.

Potential issues:

- small touch targets
- popover width mismatch
- keyboard overlapping results list

Recommended improvements:

- ensure popover width matches trigger width
- add maximum height with scroll
- increase item height for touch targets
- test keyboard interactions

---

# **3. Action Bar Improvements**

Action bars should be tested carefully on mobile.

Potential issues:

- keyboard overlapping submit button
- cramped buttons
- unclear primary action

Recommended improvements:

- consider full-width primary button on small screens
- ensure spacing between buttons
- test with mobile keyboard open

---

# **4. Improve Input Touch Targets**

Mobile touch targets should meet usability standards.

Recommended guidelines:

```
minimum control height: ~44px
generous vertical spacing
labels above inputs
```

This helps prevent accidental taps.

---

# **5. Avoid Fixed Width Fields**

Fields should expand naturally to full width on mobile.

Avoid:

```
min-width constraints
fixed pixel widths
inline layouts that compress fields
```

Instead rely on responsive grid behavior.

---

# **Future Mobile Enhancements**

The following improvements would significantly strengthen the system.

### **Responsive Field Array Component**

Create:

```
RHFFieldArrayResponsive
```

Behavior:

```
desktop → table
mobile → stacked cards
```

---

### **Bottom Sticky Mobile Action Bar**

For long forms consider:

```
sticky mobile submit bar
```

Example:

```
-------------------------
| Cancel | Save Changes |
-------------------------
```

Fixed at the bottom of the screen.

---

### **Mobile Combobox Sheet**

Instead of a popover, mobile combobox could open a **bottom sheet selector**.

This is a pattern used in many high-quality mobile apps.

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
Mobile UX: Good baseline
Mobile Best Practices: Needs improvement
```

Next improvements should focus on:

1. Responsive field-array tables
2. Improved combobox mobile behavior
3. Mobile-friendly action bars
4. Better touch target sizing

These changes will elevate the system from **functional responsive forms** to **best-practice mobile form UX**.