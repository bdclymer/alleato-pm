# Workflow Guide - Step-by-Step Instructions

This document provides exact steps for implementing common features. Follow these workflows to avoid missing steps.

## 🚀 Add New Feature Module

### Step 1: Database Schema

```sql
-- 1. Create table in Supabase SQL Editor
CREATE TABLE feature_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Add RLS policies
ALTER TABLE feature_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project items" ON feature_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = feature_items.project_id
      AND project_members.user_id = auth.uid()
    )
  );
```
### Step 2: Generate Types
```bash
pnpm supabase gen types typescript --project-id [your-project-id] > database.types.ts
```
### Step 3: Create API Routes

```bash
# Create directory structure
mkdir -p app/api/projects/[projectId]/feature-items
```
```typescript
// app/api/projects/[projectId]/feature-items/route.ts
import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const supabase = createServerClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch data
  const { data, error } = await supabase
    .from("feature_items")
    .select("*")
    .eq("project_id", params.projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("feature_items")
    .insert({
      ...body,
      project_id: params.projectId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### Step 4: Create Hook

```typescript
// hooks/use-feature-items.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useFeatureItems(projectId: string) {
  return useQuery({
    queryKey: ["feature-items", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/feature-items`);
      if (!response.ok) throw new Error("Failed to fetch items");
      return response.json();
    },
  });
}

export function useCreateFeatureItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/projects/${projectId}/feature-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-items", projectId] });
      toast.success("Item created successfully");
    },
  });
}
```
### Step 5: Create UI Components
```typescript
// app/(main)/[projectId]/feature-items/page.tsx
import { FeatureItemsClient } from "./client";

export default function FeatureItemsPage({
  params
}: {
  params: { projectId: string }
}) {
  return <FeatureItemsClient projectId={params.projectId} />;
}

// app/(main)/[projectId]/feature-items/client.tsx
"use client";

import { useFeatureItems } from "@/hooks/use-feature-items";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateItemModal } from "./create-modal";
import { useState } from "react";

export function FeatureItemsClient({ projectId }: { projectId: string }) {
  const { data, isLoading } = useFeatureItems(projectId);
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Feature Items</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Item
        </Button>
      </div>

      <DataTable columns={columns} data={data || []} />

      <CreateItemModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        projectId={projectId}
      />
    </div>
  );
}
```
### Step 6: Add Navigation

```typescript
// Update components/app-sidebar.tsx
const projectNavigation = [
  // ... existing items
  {
    name: "Feature Items",
    href: `/${projectId}/feature-items`,
    icon: Package,
  },
];
```
### Step 7: Add Tests
```typescript
// tests/e2e/feature-items.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Feature Items", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    // ... login steps
    await page.goto("/project-id/feature-items");
  });

  test("should create new item", async ({ page }) => {
    await page.click("button:has-text('New Item')");
    await page.fill('input[name="name"]', "Test Item");
    await page.fill('textarea[name="description"]', "Test Description");
    await page.click("button:has-text('Save')");

    await expect(page.locator("text=Test Item")).toBeVisible();
  });
});
```

## 📝 Add Form with File Upload

### Step 1: Create Upload Component

```typescript
// components/upload/file-upload.tsx
"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FileUpload({
  onUpload,
  accept = "*",
  multiple = false
}: {
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    onUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onUpload(files);
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center",
        isDragging && "border-primary bg-primary/5"
      )}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
    >
      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Drag and drop files here, or click to select
      </p>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <Button variant="outline" className="mt-2" asChild>
          <span>Select Files</span>
        </Button>
      </label>
    </div>
  );
}
```
### Step 2: Handle Upload in Form
```typescript
// In your form component
const [files, setFiles] = useState<File[]>([]);

const handleSubmit = async (formData: any) => {
  // Upload files first
  const uploadPromises = files.map(async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/upload`, {
      method: "POST",
      body: formData,
    });

    return response.json();
  });

  const uploadedFiles = await Promise.all(uploadPromises);

  // Then submit form with file references
  await submitForm({
    ...formData,
    attachments: uploadedFiles,
  });
};
```
## 🔄 Add Real-time Updates

### Step 1: Set Up Subscription

```typescript
// hooks/use-realtime.ts
import { useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeSubscription(
  table: string,
  filter: { column: string; value: string },
  queryKey: string[]
) {
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
          filter: `${filter.column}=eq.${filter.value}`,
        },
        (payload) => {
          // Invalidate and refetch
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter.column, filter.value, queryKey]);
}
```
### Step 2: Use in Component
```typescript
// In your client component
export function RealtimeComponent({ projectId }) {
  const { data } = useQuery({
    queryKey: ["items", projectId],
    queryFn: fetchItems,
  });

  // Subscribe to changes
  useRealtimeSubscription(
    "items",
    { column: "project_id", value: projectId },
    ["items", projectId]
  );

  return <div>{/* Render data */}</div>;
}
```

## 🎨 Add Complex Modal Workflow

### Step 1: Create Multi-Step Modal

```typescript
// components/modals/multi-step-modal.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function MultiStepModal({ open, onOpenChange }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

  const steps = [
    { title: "Basic Info", component: Step1 },
    { title: "Details", component: Step2 },
    { title: "Review", component: Step3 },
  ];

  const CurrentStep = steps[step - 1].component;

  const handleNext = (stepData: any) => {
    setFormData({ ...formData, ...stepData });
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      handleSubmit({ ...formData, ...stepData });
    }
  };

  const handleBack = () => {
    setStep(Math.max(1, step - 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {/* Progress indicator */}
        <div className="flex justify-between mb-8">
          {steps.map((s, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 text-center pb-2 border-b-2",
                i + 1 <= step ? "border-primary" : "border-muted"
              )}
            >
              {s.title}
            </div>
          ))}
        </div>

        {/* Current step content */}
        <CurrentStep
          data={formData}
          onNext={handleNext}
          onBack={handleBack}
          isFirst={step === 1}
          isLast={step === steps.length}
        />
      </DialogContent>
    </Dialog>
  );
}
```
## 🧪 Add Comprehensive Test Suite

### Step 1: Unit Tests Setup
```typescript
// __tests__/feature.test.ts
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FeatureComponent } from "@/components/feature";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe("FeatureComponent", () => {
  it("renders correctly", () => {
    render(<FeatureComponent />, { wrapper: createWrapper() });
    expect(screen.getByText("Feature Title")).toBeInTheDocument();
  });
});
```
### Step 2: Integration Tests

```typescript
// tests/integration/api.test.ts
import { createServerClient } from "@/lib/supabase/server";

describe("API Routes", () => {
  it("creates item successfully", async () => {
    const response = await fetch("/api/items", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.name).toBe("Test");
  });
});
```
### Step 3: E2E Test
```typescript
// tests/e2e/feature-flow.spec.ts
test("complete feature workflow", async ({ page }) => {
  // Login
  await page.goto("/login");
  // ... login steps

  // Navigate to feature
  await page.goto("/project/feature");

  // Create item
  await page.click("text=New Item");
  await page.fill('input[name="name"]', "Test Item");
  await page.click("text=Save");

  // Verify creation
  await expect(page.locator("text=Test Item")).toBeVisible();

  // Edit item
  await page.click('button[aria-label="Edit Test Item"]');
  await page.fill('input[name="name"]', "Updated Item");
  await page.click("text=Save");

  // Verify update
  await expect(page.locator("text=Updated Item")).toBeVisible();

  // Delete item
  await page.click('button[aria-label="Delete Updated Item"]');
  await page.click("text=Confirm");

  // Verify deletion
  await expect(page.locator("text=Updated Item")).not.toBeVisible();
});
```

## 🔐 Add Role-Based Access

### Step 1: Create Permissions Hook

```typescript
// hooks/use-permissions.ts
export function usePermissions(projectId: string) {
  const { data: user } = useCurrentUser();

  const { data: permissions } = useQuery({
    queryKey: ["permissions", projectId, user?.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/permissions?userId=${user?.id}`
      );
      return response.json();
    },
    enabled: !!user?.id,
  });

  return {
    canView: permissions?.canView ?? false,
    canEdit: permissions?.canEdit ?? false,
    canDelete: permissions?.canDelete ?? false,
    isAdmin: permissions?.isAdmin ?? false,
  };
}
```
### Step 2: Protect UI Elements
```typescript
// In your component
const { canEdit, canDelete } = usePermissions(projectId);

return (
  <div>
    {canEdit && (
      <Button onClick={handleEdit}>Edit</Button>
    )}
    {canDelete && (
      <Button onClick={handleDelete} variant="destructive">
        Delete
      </Button>
    )}
  </div>
);
```

## 🚨 Common Pitfalls to Avoid

1. **Forgetting to regenerate types** after database changes
2. **Not checking auth** in API routes
3. **Missing error handling** in mutations
4. **Not invalidating queries** after mutations
5. **Forgetting to add navigation** links for new features
6. **Not testing error states** in E2E tests
7. **Missing loading states** in UI components
8. **Not using transactions** for multi-table operations
9. **Forgetting RLS policies** on new tables
10. **Not handling race conditions** in real-time updates

---

Remember: Follow these workflows exactly. Each step has been refined through experience!
