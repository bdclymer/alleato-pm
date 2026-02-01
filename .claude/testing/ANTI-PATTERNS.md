# E2E Testing Anti-Patterns

Common mistakes that break tests and how to avoid them.

## 🚫 Navigation Anti-Patterns

### Using networkidle
```typescript
// ❌ BAD - will timeout on modern apps with WebSocket/SSE
await page.waitForLoadState('networkidle');

// ✅ GOOD
await page.waitForLoadState('domcontentloaded');
```

### Hardcoded URLs/IDs
```typescript
// ❌ BAD - fragile, breaks when data changes
await page.goto('/31/budget');

// ✅ GOOD - create isolated test data
const projectId = await createProject(`E2E Test ${Date.now()}`);
await page.goto(`/${projectId}/budget`);
```

## 🚫 Data Management Anti-Patterns

### No Test Data Cleanup
```typescript
// ❌ BAD - leaves orphaned data that pollutes other tests
test("create item", async ({ page }) => {
  await createItem({ project_id: projectId, name: "Test" });
  // No cleanup!
});

// ✅ GOOD - clean before AND after
test.beforeAll(async () => {
  projectId = await createProject(`E2E Test ${Date.now()}`);
});
test.afterAll(async () => {
  await cleanupProjectArtifacts(projectId);
});
```

### Relying on Specific Counts
```typescript
// ❌ BAD - breaks if other tests leave data
expect(rows).toHaveLength(1);

// ✅ GOOD - check your specific item exists
expect(rows.find(r => r.title === "My Item")).toBeTruthy();
```

### Wrong Enum Case
```typescript
// ❌ BAD - violates CHECK constraints
await createSubcontract({ status: "draft" });     // lowercase
await createDirectCost({ cost_type: "expense" });  // lowercase

// ✅ GOOD - match exact case from migration
await createSubcontract({ status: "Draft" });     // PascalCase
await createDirectCost({ cost_type: "Expense" });  // PascalCase
```

## 🚫 Selector Anti-Patterns

### Fragile CSS Selectors
```typescript
// ❌ BAD - breaks with styling changes
page.locator('.btn.btn-primary.submit-button')

// ✅ GOOD - semantic selectors
page.getByRole("button", { name: /submit/i })
```

### Generic Text Selectors
```typescript
// ❌ BAD - causes strict mode violations (multiple matches)
page.getByText("Concrete delivery")

// ✅ GOOD - scoped to table cells
page.getByRole("cell", { name: "Concrete delivery" })
```

### Missing TestIds When Available
```typescript
// ❌ BAD - when data-testid exists
page.getByRole("button", { name: "Submit Change Order" })

// ✅ GOOD - use the testid
page.getByTestId("change-order-submit")
```

## 🚫 Timing Anti-Patterns

### Arbitrary Waits
```typescript
// ❌ BAD - slow and unreliable
await page.waitForTimeout(5000);
await expect(item).toBeVisible();

// ✅ GOOD - wait for actual condition
await expect(item).toBeVisible({ timeout: 15000 });
```

### Manual Visibility Checks
```typescript
// ❌ BAD - loses auto-wait benefits
if (await element.isVisible()) {
  await element.click();
}

// ✅ GOOD - web-first assertions handle waiting
await expect(element).toBeVisible();
await element.click();
```

### Forgetting Reload Fallback
```typescript
// ❌ BAD - fails when seeded data isn't immediately visible
await page.goto(`/${projectId}/commitments`);
await expect(page.getByRole("cell", { name: "Seeded Item" })).toBeVisible();

// ✅ GOOD - reload fallback for hydration timing
await page.goto(`/${projectId}/commitments`);
await page.waitForLoadState("domcontentloaded");

const visible = await page
  .getByRole("cell", { name: "Seeded Item" })
  .isVisible({ timeout: 5000 })
  .catch(() => false);

if (!visible) {
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
}

await expect(
  page.getByRole("cell", { name: "Seeded Item" })
).toBeVisible();
```

## 🚫 Test Structure Anti-Patterns

### Smoke Tests Disguised as E2E
```typescript
// ❌ BAD - this is a smoke test, NOT an E2E test
test("budget page loads", async ({ page }) => {
  await page.goto("/budget");
  await expect(page.locator("h1")).toBeVisible();
});

// ✅ GOOD - actual user workflow
test("Create budget line item persists to database", async ({ page }) => {
  await page.goto(`/${projectId}/budget/new`);
  await page.getByLabel("Cost Code").fill("01-001");
  await page.getByLabel("Description").fill("Site Preparation");
  await page.getByLabel("Budget Amount").fill("50000");
  await page.getByRole("button", { name: "Save" }).click();

  // Verify in database
  await pollFor(
    () => listBudgetLinesForProject(projectId),
    (lines) => {
      const created = lines.find(l => l.cost_code === "01-001");
      expect(created).toBeTruthy();
      expect(created.budget_amount).toBe(50000);
    }
  );
});
```

### Shared State Between Tests
```typescript
// ❌ BAD - tests affect each other
test.describe("Budget", () => {
  let sharedItem;

  test("create item", async () => {
    sharedItem = await createBudgetLine(...);
  });

  test("edit item", async () => {
    // Depends on previous test!
    await editBudgetLine(sharedItem.id, ...);
  });
});

// ✅ GOOD - isolated tests
test.describe("Budget", () => {
  test("create item persists", async () => {
    await deleteBudgetLinesByProject(projectId); // Clean slate
    const item = await createBudgetLine(...);
    // Test creation
  });

  test("edit item updates database", async () => {
    await deleteBudgetLinesByProject(projectId); // Clean slate
    const item = await createBudgetLine(...);     // Fresh data
    // Test editing
  });
});
```

## 🚫 Authentication Anti-Patterns

### Manual Login in Every Test
```typescript
// ❌ BAD - slow and unreliable
test("feature test", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Login" }).click();

  // Now test the actual feature...
});

// ✅ GOOD - use storage state
// In auth.setup.ts - runs once
test.beforeAll(async ({ page }) => {
  // Login once, save to tests/.auth/user.json
});

// In actual tests - inherits auth automatically
test("feature test", async ({ page }) => {
  // Already logged in!
  await page.goto(`/${projectId}/feature`);
});
```

### Missing Project Membership
```typescript
// ❌ BAD - user can't access project data
test.beforeAll(async () => {
  projectId = await createProject("Test Project");
  // Forgot to add user to project!
});

// ✅ GOOD - ensure user has access
test.beforeAll(async () => {
  const testUserId = await getUserIdByEmail("test@example.com");
  projectId = await createProject("Test Project");
  await addProjectMember(projectId, testUserId, "admin");
});
```

## 🚫 Form Interaction Anti-Patterns

### Not Clearing Auto-Generated Values
```typescript
// ❌ BAD - if field has prefix like "SC-002", this appends
await page.getByLabel("Contract Number").fill("SC-001");

// ✅ GOOD - clear first
await page.getByLabel("Contract Number").clear();
await page.getByLabel("Contract Number").fill("SC-001");
```

### Wrong Confirmation Button
```typescript
// ❌ BAD - might click wrong delete button if multiple exist
await page.getByRole("button", { name: /delete/i }).click();

// ✅ GOOD - confirmation dialogs render last/on top
await page.getByRole("button", { name: /delete/i }).last().click();
```

## 🚫 Database Constraint Violations

### Status Values Case Sensitivity
Different entities use different cases - check migrations!

```typescript
// Subcontracts use PascalCase
{ status: "Draft" | "Sent" | "Pending" | "Approved" | "Executed" | "Closed" | "Void" }

// Change Orders use lowercase
{ status: "draft" | "pending" | "approved" | "rejected" | "void" }

// Companies use UPPERCASE
{ status: "ACTIVE" | "INACTIVE" }
```

### Mismatched Foreign Key Types
```typescript
// ❌ BAD - if projects.id is INTEGER but you pass UUID
await createSubcontract({
  project_id: "550e8400-e29b-41d4-a716-446655440000" // UUID
});

// ✅ GOOD - match the actual type
await createSubcontract({
  project_id: 123 // INTEGER
});
```

## Quick Checklist: Avoid These

- [ ] No `networkidle` waits
- [ ] No hardcoded IDs or counts
- [ ] No shared state between tests
- [ ] No arbitrary `waitForTimeout` calls
- [ ] No CSS class selectors when semantic options exist
- [ ] No manual visibility polling
- [ ] No forgotten test cleanup
- [ ] No wrong enum case for status fields
- [ ] No missing project memberships in test setup
- [ ] No smoke tests disguised as E2E tests