# Page Archetypes

Every page in this application uses one of these 4 archetypes. No exceptions.

## Quick Reference

| Archetype | Width | `maxWidth` | Use Case |
|-----------|-------|------------|----------|
| **Table Page** | Full width | `"full"` | Lists, data grids, budgets, directories |
| **Form Page** | Narrow (672px) | N/A (uses `FormContainer`) | Create/edit forms, settings |
| **Form Wide** | Medium (896px) | N/A (uses `FormContainer maxWidth="lg"`) | Complex forms, multi-column |
| **Content Page** | Standard (1024px) | `"xl"` | Detail views, dashboards, reports |

## Required Imports

Every page starts with:

```tsx
import { PageContainer, ProjectPageHeader } from "@/components/layout";
```

Form pages also need:

```tsx
import { FormContainer } from "@/components/layout";
```

---

## 1. Table Page

For: Budget, Commitments, Directory, Prime Contracts, Change Orders list, Specifications list, Drawings list, Direct Costs, Schedule.

```tsx
"use client";

import { ProjectPageHeader, PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TablePage() {
  return (
    <>
      <ProjectPageHeader
        title="Commitments"
        description="Manage subcontracts, purchase orders, and vendor agreements"
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Commitment
          </Button>
        }
      />
      <PageContainer maxWidth="full">
        {/* Toolbar: filters left, actions right */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            {/* Search, filters */}
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk actions, export */}
          </div>
        </div>

        {/* Table */}
        <div className="space-y-4">
          {/* DataTable or table component */}
        </div>
      </PageContainer>
    </>
  );
}
```

**Rules:**
- `maxWidth="full"` — tables need horizontal space
- Toolbar sits above the table, not inside PageHeader
- Search/filters left, actions right
- No card wrapper around the table

---

## 2. Form Page (Narrow)

For: Create/edit forms with single-column layout. Login, signup, simple settings.

```tsx
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ProjectPageHeader, PageContainer, FormContainer } from "@/components/layout";
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
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreateItemPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      // API call here
      toast.success("Created");
      router.push(`/${projectId}/items`);
    } catch {
      toast.error("Failed to create");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <ProjectPageHeader
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
        <FormContainer maxWidth="md" withCard={false}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <section className="space-y-6">
                <div className="border-b pb-2">
                  <h2 className="text-lg font-semibold">Details</h2>
                  <p className="text-sm text-muted-foreground">
                    Basic information about the item
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              {/* Form actions — always at bottom with border */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Item
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

**Rules:**
- `FormContainer maxWidth="md"` — optimized for readability (672px)
- `withCard={false}` — no card wrapper, use sections with `border-b`
- Form sections use `<section className="space-y-6">` with heading divs
- Grid: `grid-cols-1 md:grid-cols-2` for most fields
- Actions always at bottom with `border-t` separator
- Cancel left, Submit right

---

## 3. Form Wide

For: Complex forms with multi-column layout, forms with embedded tables or previews.

Same as Form Page but with `FormContainer maxWidth="lg"`:

```tsx
<PageContainer>
  <FormContainer maxWidth="lg" withCard={false}>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <section className="space-y-6">
          <div className="border-b pb-2">
            <h2 className="text-lg font-semibold">Contract Details</h2>
          </div>

          {/* Multi-column grid for wider forms */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Form fields */}
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline">Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Form>
  </FormContainer>
</PageContainer>
```

**Rules:**
- `FormContainer maxWidth="lg"` — 896px
- Can use up to 3-column grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Same section/action patterns as narrow form

---

## 4. Content Page

For: Detail views, project home, dashboards, reports, documentation.

```tsx
"use client";

import { ProjectPageHeader, PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function ContentPage() {
  return (
    <>
      <ProjectPageHeader
        title="Project Overview"
        description="Key metrics and project status"
        actions={
          <Button variant="outline" size="sm">
            Export
          </Button>
        }
      />
      <PageContainer maxWidth="xl">
        {/* Section 1: Metrics row */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Key Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Metric cards (cards ARE allowed here for KPI tiles) */}
          </div>
        </section>

        {/* Section 2: Content */}
        <section className="space-y-4 mt-8">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          {/* Content here */}
        </section>
      </PageContainer>
    </>
  );
}
```

**Rules:**
- `maxWidth="xl"` — 1280px, optimal for content readability
- Sections separated by `mt-8` or parent `space-y-8`
- Cards allowed for KPI tiles and summary blocks only
- No card wrappers around sections
- Two-column layouts (content + sidebar): use `grid gap-20 lg:grid-cols-[minmax(0,1fr)_280px]` — `gap-20` (80px) is the **minimum** for content/sidebar separation. `gap-8` or `gap-12` is too tight and makes the page unreadable.
- Section label headings use `text-xs font-semibold uppercase tracking-widest text-primary` — never `text-muted-foreground` (invisible against white backgrounds)

---

## Choosing an Archetype

```
Is the primary content a data table or list?
  YES → Table Page

Is the primary content a form?
  YES → Is it simple (< 8 fields, single column)?
    YES → Form Page (narrow)
    NO  → Form Wide

Everything else → Content Page
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `maxWidth="full"` for a form page | Use `FormContainer` with appropriate `maxWidth` |
| Wrapping table in a Card | Tables go directly in `PageContainer` |
| Custom header instead of `ProjectPageHeader` | Always use `ProjectPageHeader` |
| Manual padding (`px-4 py-6`) instead of `PageContainer` | `PageContainer` handles all padding |
| Skipping `ProjectPageHeader` entirely | Every page needs a header |
| Using `PageHeader` import name | Use `ProjectPageHeader` for clarity (same component) |
