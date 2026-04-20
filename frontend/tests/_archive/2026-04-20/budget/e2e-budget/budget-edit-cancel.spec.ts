/**
 * Regression test: Cancel an edit discards changes (test scenario 3.2)
 *
 * Verifies that clicking Cancel in the Original Budget edit sidebar does NOT
 * persist any changes to the database or to the table display.
 *
 * Root cause this guards against: the edit sidebar's reset useEffect had
 * `lineItem` in its dependency array. Since the parent constructs `lineItem`
 * as an inline object literal, any parent re-render (e.g. React Query
 * background refetch) creates a new reference, fires the effect, and resets
 * the user's in-progress edits — making it appear that "Cancel" discarded
 * changes when it was really a spurious mid-edit reset.
 */

import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/index";
import { createTestProject } from "../../helpers/bootstrap";

async function waitForBudgetTable(page: Page) {
  await page.waitForSelector("table", { timeout: 15000 });
}

test.describe("Budget Edit — Cancel discards changes", () => {
  test("cancel on the Original Budget sidebar leaves table value unchanged", async ({
    page,
    safeNavigate,
    authenticatedRequest,
  }) => {
    const project = await createTestProject(
      page,
      { template: "commercial" },
      authenticatedRequest,
    );

    await safeNavigate(`/${project.project.id}/budget`);
    await waitForBudgetTable(page);

    // Open the edit sidebar via the pencil button on the first non-parent row
    const editButton = page
      .getByRole("button", { name: "Edit line item" })
      .first();
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await editButton.click();

    // Confirm the sidebar opened
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 8000 });

    // Read the current displayed budget value from the sidebar header
    const currentBudgetText = await dialog
      .locator("text=/Current Budget/")
      .locator("..")
      .locator("span.text-2xl")
      .textContent();

    // Target the Original Budget input field (aria-label set by MoneyField)
    const originalBudgetInput = dialog.getByRole("textbox", {
      name: "Original Budget",
    });
    await expect(originalBudgetInput).toBeVisible({ timeout: 5000 });

    // Type a clearly distinct value — 99999 should not exist in seed data
    await originalBudgetInput.focus();
    await originalBudgetInput.fill("99999");

    // Click Cancel — must NOT save anything
    const cancelButton = dialog.getByRole("button", { name: "Cancel" });
    await expect(cancelButton).toBeVisible({ timeout: 3000 });
    await cancelButton.click();

    // Sidebar must close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // The table must not show the value we typed
    await expect(page.locator("table")).not.toContainText("99,999");

    // Reload the page — after a full round-trip the DB value must also be unchanged
    await page.reload();
    await waitForBudgetTable(page);
    await expect(page.locator("table")).not.toContainText("99,999");

    // Sanity-check: the edit sidebar can still be opened and shows the original value
    await editButton.click();
    await expect(dialog).toBeVisible({ timeout: 8000 });
    const afterCancelText = await dialog
      .locator("text=/Current Budget/")
      .locator("..")
      .locator("span.text-2xl")
      .textContent();
    expect(afterCancelText).toEqual(currentBudgetText);
  });
});
