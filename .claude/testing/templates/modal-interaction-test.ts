// Modal Interaction E2E Test Template
// Tests modal open/close, form submission, keyboard navigation

import { test, expect } from "@playwright/test";
import {
  addProjectMember,
  createProject,
  getUserIdByEmail,
} from "../helpers/db";
import { cleanupProjectArtifacts } from "../helpers/cleanup";

const testUserEmail =
  process.env.PLAYWRIGHT_TEST_USER_EMAIL ?? "test1@mail.com";

let projectId: number;
let testUserId: string;

test.describe("Feature Name – Modal Interactions", () => {
  test.beforeAll(async () => {
    testUserId = await getUserIdByEmail(testUserEmail);
    projectId = await createProject(`E2E Modal ${Date.now()}`);
    await addProjectMember(projectId, testUserId, "admin");
  });

  test.afterAll(async () => {
    if (projectId) {
      await cleanupProjectArtifacts(projectId);
    }
  });

  // ── MODAL: Open from trigger ────────────────────────────────────
  test("Modal opens when trigger clicked", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Click trigger button
    await page.getByRole("button", { name: /add|create|new/i }).click();

    // Modal should appear
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Modal should have focus
    await expect(modal).toBeFocused();
  });

  // ── MODAL: Close via X button ───────────────────────────────────
  test("Modal closes via close button", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Open modal
    await page.getByRole("button", { name: /add|create|new/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Close via X button
    await modal.getByRole("button", { name: /close/i }).click();

    // Modal should disappear
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  // ── MODAL: Close via Escape key ─────────────────────────────────
  test("Modal closes via Escape key", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Open modal
    await page.getByRole("button", { name: /add|create|new/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Modal should disappear
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  // ── MODAL: Close via backdrop click ─────────────────────────────
  test("Modal closes via backdrop click", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Open modal
    await page.getByRole("button", { name: /add|create|new/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Click backdrop (outside modal content)
    await page.mouse.click(50, 50); // Top-left corner

    // Modal should disappear
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  // ── MODAL: Form submission ──────────────────────────────────────
  test("Modal form submits and closes", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Open modal
    await page.getByRole("button", { name: /add|create|new/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Fill form
    await modal.getByLabel(/name|title/i).fill("Test Item");

    // Submit
    await modal.getByRole("button", { name: /save|create|submit/i }).click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Success indication (toast, redirect, or updated list)
    await expect(
      page.getByText(/created|saved|success/i).or(
        page.getByRole("cell", { name: "Test Item" })
      )
    ).toBeVisible({ timeout: 15000 });
  });

  // ── MODAL: Cancel button ────────────────────────────────────────
  test("Cancel button closes modal without saving", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Open modal
    await page.getByRole("button", { name: /add|create|new/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Fill some data
    await modal.getByLabel(/name|title/i).fill("Should Not Save");

    // Click cancel
    await modal.getByRole("button", { name: /cancel/i }).click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Data should NOT be saved
    await expect(page.getByRole("cell", { name: "Should Not Save" }))
      .not.toBeVisible({ timeout: 5000 });
  });

  // ── MODAL: Keyboard navigation ──────────────────────────────────
  test("Keyboard navigation works in modal", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Open modal
    await page.getByRole("button", { name: /add|create|new/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Tab should cycle through form fields
    const nameField = modal.getByLabel(/name|title/i);
    const descField = modal.getByLabel(/description/i);
    const submitBtn = modal.getByRole("button", { name: /save|create|submit/i });

    // Should start focused on first field
    await expect(nameField).toBeFocused();

    // Tab to next field
    await page.keyboard.press("Tab");
    await expect(descField).toBeFocused();

    // Tab to submit button
    await page.keyboard.press("Tab");
    await expect(submitBtn).toBeFocused();

    // Shift+Tab should go backwards
    await page.keyboard.press("Shift+Tab");
    await expect(descField).toBeFocused();
  });

  // ── MODAL: Validation in modal ──────────────────────────────────
  test("Validation errors display in modal", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature`);
    await page.waitForLoadState("domcontentloaded");

    // Open modal
    await page.getByRole("button", { name: /add|create|new/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Try to submit without required fields
    await modal.getByRole("button", { name: /save|create|submit/i }).click();

    // Validation error should appear in modal
    await expect(modal.getByText(/required|cannot be empty/i)).toBeVisible({
      timeout: 10000,
    });

    // Modal should stay open
    await expect(modal).toBeVisible();
  });
});