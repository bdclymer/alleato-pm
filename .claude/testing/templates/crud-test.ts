// CRUD E2E Test Template
// Copy-paste starter for testing Create, Read, Update, Delete workflows

import { test, expect } from "@playwright/test";
import {
  addProjectMember,
  createProject,
  getUserIdByEmail,
} from "../helpers/db";
import { cleanupProjectArtifacts } from "../helpers/cleanup";
import { pollFor } from "../helpers/poll";

const testUserEmail =
  process.env.PLAYWRIGHT_TEST_USER_EMAIL ?? "test1@mail.com";

let projectId: number;
let testUserId: string;

test.describe("Feature Name – CRUD Workflows", () => {
  // ── SETUP: Create isolated project ──────────────────────────────
  test.beforeAll(async () => {
    testUserId = await getUserIdByEmail(testUserEmail);
    projectId = await createProject(`E2E Feature ${Date.now()}`);
    await addProjectMember(projectId, testUserId, "admin");
  });

  // ── TEARDOWN: Clean everything ──────────────────────────────────
  test.afterAll(async () => {
    if (projectId) {
      await cleanupProjectArtifacts(projectId);
    }
  });

  // ── READ: Empty state ───────────────────────────────────────────
  test("Empty state shows when no items exist", async ({ page }) => {
    // Clean any existing data
    // await deleteItemsByProject(projectId);

    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Assert empty state message OR empty table
    const emptyMsg = page.getByText(/no .* found/i);
    await expect(emptyMsg).toBeVisible({ timeout: 15000 });
  });

  // ── READ: Seeded data renders ───────────────────────────────────
  test("Seeded item renders in the list", async ({ page }) => {
    // Clean slate
    // await deleteItemsByProject(projectId);

    // Seed via DB helper
    // const item = await createItem({ project_id: projectId, ... });

    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Reload fallback for timing
    const visible = await page
      .getByRole("cell", { name: "Expected Text" })
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!visible) {
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
    }

    await expect(
      page.getByRole("cell", { name: "Expected Text" }),
    ).toBeVisible({ timeout: 15000 });
  });

  // ── CREATE: Form submission ─────────────────────────────────────
  test("Create item via form persists to database", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature/new`);
    await page.waitForLoadState("domcontentloaded");

    // Fill form fields
    await page.locator("#fieldName").fill("Test Value");

    // Submit
    await page.getByRole("button", { name: /save|create|submit/i }).click();

    // Verify persistence
    // await pollFor(
    //   () => listItemsForProject(projectId),
    //   (rows) => {
    //     const created = rows.find(r => r.name === "Test Value");
    //     expect(created).toBeTruthy();
    //   },
    //   20000,
    // );
  });

  // ── UPDATE: Edit existing item ──────────────────────────────────
  test("Edit item updates in database", async ({ page }) => {
    // Seed item first
    // const item = await createItem({ project_id: projectId, ... });

    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Find and click edit
    await page.getByTestId(`row-actions-${item.id}`).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();

    // Update form
    await page.locator("#fieldName").clear();
    await page.locator("#fieldName").fill("Updated Value");
    await page.getByRole("button", { name: /save|update/i }).click();

    // Verify persistence
    // await pollFor(
    //   () => getItem(item.id),
    //   (updated) => {
    //     expect(updated.name).toBe("Updated Value");
    //   },
    // );
  });

  // ── DELETE: Remove item ─────────────────────────────────────────
  test("Delete item removes it from list", async ({ page }) => {
    // Seed item
    // const item = await createItem({ project_id: projectId, ... });

    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Find row and open action menu
    const row = page.getByRole("row", { name: /Item Name/i });
    await expect(row).toBeVisible({ timeout: 15000 });

    // Click action menu
    const actionBtn = row.getByRole("button", { name: /open menu/i });
    await actionBtn.click();
    await page.waitForTimeout(500);

    // Click delete
    await page.getByRole("menuitem", { name: /delete/i }).first().click();

    // Confirm dialog
    const confirmBtn = page.getByRole("button", { name: /delete|confirm/i }).last();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Verify gone
    await expect(row).not.toBeVisible({ timeout: 10000 });
  });
});