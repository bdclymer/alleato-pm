# Standard Form Page Pattern

This document defines the canonical pattern for all form pages in the application.

## Quick Start

Copy `StandardFormPage.tsx` from this directory and customize for your feature.

## Structure Overview

```tsx
<>
  <PageHeader />
  <PageContainer>
    <FormContainer>
      <Form>
        <form>
          <section>...</section>  // Basic Information
          <section>...</section>  // Additional Details
          <div>...</div>          // Form Actions (Cancel/Submit)
        </form>
      </Form>
    </FormContainer>
  </PageContainer>
</>
```

## Required Imports

```tsx
// Layout (ALWAYS use these)
import { PageHeader, PageContainer, FormContainer } from "@/components/layout";

// UI Components (NO custom styling)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form handling
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
```

## Component Rules

### Layout Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `PageHeader` | Standard page header | `title`, `description`, `actions` |
| `PageContainer` | Full-width page wrapper | `maxWidth="full"` default |
| `FormContainer` | Centered form with max-width | `maxWidth="lg"`, `withCard={false}` |

### Form Components

| Component | Purpose |
|-----------|---------|
| `Form` | React Hook Form provider |
| `FormField` | Field controller with validation |
| `FormItem` | Container for label + input + message |
| `FormLabel` | Accessible label |
| `FormControl` | Input wrapper (Slot) |
| `FormDescription` | Help text below input |
| `FormMessage` | Validation error display |

## Section Pattern

Use `<section>` tags with heading divs, NOT Card components:

```tsx
<section className="space-y-6">
  <div className="border-b pb-2">
    <h2 className="text-lg font-semibold">Section Title</h2>
    <p className="text-sm text-muted-foreground">
      Section description
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Form fields */}
  </div>
</section>
```

## Grid Layouts

| Layout | Use Case |
|--------|----------|
| `grid-cols-1 md:grid-cols-2` | Most fields (default) |
| `grid-cols-1 md:grid-cols-3` | Compact fields (dates, selects) |
| Full width (no grid) | Textarea, description fields |

## Form Actions Pattern

Always place at bottom with border separator:

```tsx
<div className="flex items-center justify-end gap-4 pt-6 border-t">
  <Button
    type="button"
    variant="outline"
    onClick={handleCancel}
    disabled={isSubmitting}
  >
    Cancel
  </Button>
  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
    Create Item
  </Button>
</div>
```

## DO NOT Use

- ❌ `Card`, `CardHeader`, `CardContent` for form sections
- ❌ Custom className on Input, Select, Textarea
- ❌ Custom styled buttons
- ❌ Inline Calendar icons (use native date input)
- ❌ Separator component between sections (use space-y-8)
- ❌ Custom auto-fill buttons
- ❌ Auto-save indicators in create forms
- ❌ Empty string `value=""` in SelectItem (Radix doesn't allow it)

## Select "None" Option Pattern

**IMPORTANT:** Radix Select does NOT allow empty string values for SelectItem.

For optional selects, DON'T add a "None" option. Instead:
1. Use the placeholder to indicate "nothing selected"
2. Leave the field optional in the schema
3. The user can simply not select anything

```tsx
// ❌ WRONG - Will cause runtime error
<SelectItem value="">None</SelectItem>

// ✅ CORRECT - Just don't include a "None" option
<Select onValueChange={field.onChange} defaultValue={field.value}>
  <SelectTrigger>
    <SelectValue placeholder="Select vendor (optional)" />
  </SelectTrigger>
  <SelectContent>
    {vendors.map((v) => (
      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Spacing Standards

| Element | Spacing |
|---------|---------|
| Between sections | `space-y-8` (on form) |
| Within sections | `space-y-6` |
| Between grid items | `gap-6` |
| Section header to content | `pb-2` on header div |

## Field Pattern

Standard field with label and validation:

```tsx
<FormField
  control={form.control}
  name="field_name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Field Label *</FormLabel>
      <FormControl>
        <Input placeholder="Placeholder" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

With description (help text):

```tsx
<FormItem>
  <FormLabel>Field Label</FormLabel>
  <FormControl>
    <Input {...field} />
  </FormControl>
  <FormDescription>
    Help text for this field
  </FormDescription>
  <FormMessage />
</FormItem>
```

## Select Pattern

```tsx
<FormField
  control={form.control}
  name="select_field"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Select Label</FormLabel>
      <Select
        onValueChange={field.onChange}
        defaultValue={field.value}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Options Pattern

Define options as constants outside the component:

```tsx
const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
];
```

## Schema Pattern

Use Zod for validation:

```tsx
const formSchema = z.object({
  // Required string
  name: z.string().min(1, "Name is required"),

  // Required select
  type: z.string().min(1, "Type is required"),

  // Optional string
  description: z.string().optional(),

  // Number with coercion (for form inputs)
  amount: z.coerce.number().min(0, "Must be positive"),

  // With default
  status: z.string().default("draft"),
});

type FormValues = z.infer<typeof formSchema>;
```

## Example: Minimal Form Page

```tsx
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageContainer, FormContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z.object({
  name: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

export default function NewItemPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      await fetch(`/api/projects/${projectId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast.success("Created");
      router.push(`/${projectId}/items`);
    } catch {
      toast.error("Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New Item"
        description="Create a new item"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />
      <PageContainer>
        <FormContainer maxWidth="lg" withCard={false}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <section className="space-y-6">
                <div className="border-b pb-2">
                  <h2 className="text-lg font-semibold">Details</h2>
                </div>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </div>
            </form>
          </Form>
        </FormContainer>
      </PageContainer>
    </>
  );
}
```
