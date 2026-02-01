// Form Validation E2E Test Template
// Tests form validation, required fields, error handling

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

test.describe("Feature Name – Form Validation", () => {
  test.beforeAll(async () => {
    testUserId = await getUserIdByEmail(testUserEmail);
    projectId = await createProject(`E2E Form Validation ${Date.now()}`);
    await addProjectMember(projectId, testUserId, "admin");
  });

  test.afterAll(async () => {
    if (projectId) {
      await cleanupProjectArtifacts(projectId);
    }
  });

  // ── VALIDATION: Required fields ─────────────────────────────────
  test("Required field validation prevents submission", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature/new`);
    await page.waitForLoadState("domcontentloaded");

    // Try to submit without required fields
    await page.getByRole("button", { name: /save|create|submit/i }).click();

    // Check for validation errors
    await expect(page.getByText(/required|cannot be empty/i)).toBeVisible({
      timeout: 10000,
    });

    // Form should still be visible (not submitted)
    await expect(page.getByRole("button", { name: /save|create|submit/i })).toBeVisible();
  });

  // ── VALIDATION: Field format ────────────────────────────────────
  test("Email field validates format", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature/new`);
    await page.waitForLoadState("domcontentloaded");

    // Enter invalid email
    await page.getByLabel(/email/i).fill("invalid-email");
    await page.getByRole("button", { name: /save|create|submit/i }).click();

    // Check for email validation error
    await expect(
      page.getByText(/invalid email|valid email address/i),
    ).toBeVisible({ timeout: 10000 });
  });

  // ── VALIDATION: Field length limits ─────────────────────────────
  test("Field length validation enforced", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature/new`);
    await page.waitForLoadState("domcontentloaded");

    // Enter text exceeding max length
    const longText = "a".repeat(256); // Assuming 255 char limit
    await page.getByLabel(/name|title/i).fill(longText);
    await page.getByRole("button", { name: /save|create|submit/i }).click();

    // Check for length validation error
    await expect(
      page.getByText(/too long|maximum.*characters/i),
    ).toBeVisible({ timeout: 10000 });
  });

  // ── VALIDATION: Error clearing ──────────────────────────────────
  test("Validation errors clear when fields corrected", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature/new`);
    await page.waitForLoadState("domcontentloaded");

    // Trigger validation error
    await page.getByRole("button", { name: /save|create|submit/i }).click();
    await expect(page.getByText(/required|cannot be empty/i)).toBeVisible();

    // Fill required field
    await page.getByLabel(/name|title/i).fill("Valid Name");

    // Error should disappear
    await expect(page.getByText(/required|cannot be empty/i)).not.toBeVisible({
      timeout: 5000,
    });
  });

  // ── SUCCESS: Valid form submission ──────────────────────────────
  test("Valid form submits successfully", async ({ page }) => {
    await page.goto(`/${projectId}/your-feature/new`);
    await page.waitForLoadState("domcontentloaded");

    // Fill all required fields with valid data
    await page.getByLabel(/name|title/i).fill("Test Item");
    await page.getByLabel(/description/i).fill("Test description");
    // Add more fields as needed...

    // Submit
    await page.getByRole("button", { name: /save|create|submit/i }).click();

    // Should redirect or show success message
    await expect(
      page.getByText(/created|saved|success/i).or(
        page.getByRole("heading", { name: /test item/i })
      )
    ).toBeVisible({ timeout: 15000 });
  });

  // ── VALIDATION: Duplicate prevention ────────────────────────────
  test("Prevents duplicate entries when applicable", async ({ page }) => {
    // First create an item
    // const existingItem = await createItem({
    //   project_id: projectId,
    //   name: "Duplicate Test"
    // });

    await page.goto(`/${projectId}/your-feature/new`);
    await page.waitForLoadState("domcontentloaded");

    // Try to create duplicate
    await page.getByLabel(/name|title/i).fill("Duplicate Test");
    await page.getByRole("button", { name: /save|create|submit/i }).click();

    // Should show duplicate error
    await expect(
      page.getByText(/already exists|duplicate|unique/i),
    ).toBeVisible({ timeout: 10000 });
  });
});