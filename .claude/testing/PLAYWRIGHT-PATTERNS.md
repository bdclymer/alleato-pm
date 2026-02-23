# Playwright Testing Patterns

Quick reference for common Playwright testing patterns used in this project.

## Selector Priority (Most Reliable First)

| Priority | Selector | When to Use | Example |
|----------|----------|-------------|---------|
| 1 | `getByTestId` | When `data-testid` exists | `page.getByTestId("submit-btn")` |
| 2 | `getByRole` | Buttons, cells, rows, headings | `page.getByRole("button", { name: /save/i })` |
| 3 | `getByLabel` | Form inputs with labels | `page.getByLabel("Description")` |
| 4 | `getByPlaceholder` | Search inputs | `page.getByPlaceholder(/search/i)` |
| 5 | `locator("#id")` | HTML `id` attributes | `page.locator("#contractNumber")` |
| 6 | `getByText` | Static text (use sparingly) | `page.getByText("No items found.")` |

## Navigation Patterns

### Always Use domcontentloaded

```typescript
// ✅ GOOD
await page.goto(url);
await page.waitForLoadState('domcontentloaded');

// ❌ NEVER - will timeout on modern apps
await page.waitForLoadState('networkidle');
```
### Reload Fallback for Data Hydration
```typescript
await page.goto(`/${projectId}/feature`);
await page.waitForLoadState("domcontentloaded");

// Check if seeded data is visible
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
).toBeVisible({ timeout: 15000 });
```
## Form Interaction Patterns

### Fill and Submit

```typescript
await page.getByLabel("Name").fill("Test Item");
await page.getByLabel("Description").fill("Test description");
await page.getByRole("button", { name: /save|submit/i }).click();
```
### Handle Auto-Generated Values
```typescript
const numberInput = page.locator("#contractNumber");
await numberInput.clear(); // Clear existing prefix/value
await numberInput.fill("NEW-001");
```

## Table Interaction Patterns

### Row Actions

```typescript
// Find specific row
const row = page.getByRole("row", { name: /Item Name/i });
await expect(row).toBeVisible();

// Click action menu in that row
await row.getByRole("button", { name: /open menu/i }).click();
await page.getByRole("menuitem", { name: "Edit" }).click();
```
### Cell Verification
```typescript
// Scope to table cells (avoids strict mode violations)
await expect(
  page.getByRole("cell", { name: "Expected Value" })
).toBeVisible();
```
## Modal Patterns

### Open and Interact

```typescript
await page.getByRole("button", { name: /add|create/i }).click();

const modal = page.getByRole("dialog");
await expect(modal).toBeVisible();

// Fill modal form
await modal.getByLabel("Name").fill("Test");
await modal.getByRole("button", { name: /save/i }).click();

// Modal should close
await expect(modal).not.toBeVisible();
```
### Keyboard Navigation
```typescript
// Escape to close
await page.keyboard.press("Escape");

// Tab navigation
await page.keyboard.press("Tab");
await page.keyboard.press("Shift+Tab"); // Backwards
```

## Database Verification Patterns

### Using pollFor for State Verification

```typescript
import { pollFor } from "../helpers/poll";

await pollFor(
  () => getItemFromDB(itemId),
  (item) => {
    expect(item.status).toBe("approved");
    expect(item.updated_at).toBeTruthy();
  },
  15000 // timeout
);
```
### Using pollForSimple for Counts
```typescript
await expect
  .poll(async () => (await listItems(projectId)).length)
  .toBe(3);
```
## Error Handling Patterns

### Confirmation Dialogs

```typescript
// Use .last() for confirmation buttons (rendered on top)
const confirmBtn = page.getByRole("button", { name: /delete|confirm/i }).last();
if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await confirmBtn.click();
}
```
### Multiple Matching Elements
```typescript
// When strict mode violations occur
page.getByRole("menuitem", { name: /delete/i }).first()
```

## Wait Strategies

### Preferred: Web-First Assertions

```typescript
// ✅ GOOD - auto-waits and retries
await expect(element).toBeVisible({ timeout: 15000 });
await expect(element).toHaveText("Expected");
```
### Acceptable: Brief Animation Waits
```typescript
// ✅ OK for animations/transitions
await page.waitForTimeout(500);
```
### Avoid: Arbitrary Long Waits

```typescript
// ❌ BAD - slow and unreliable
await page.waitForTimeout(5000);
```

## Anti-Patterns to Avoid

- Never use `networkidle` for waitUntil
- Never hardcode project IDs - create test projects
- Never forget to clean up test data
- Never use CSS selectors when semantic selectors exist
- Never assume timing - always use proper waits
- Never mix authentication cookies between tests
