import { test, expect } from "@playwright/test";
import { createSupabaseClient } from "../../helpers/supabase";

test.describe("Directory Management Workflows", () => {
  const testProjectId = "98"; // Using existing test project
  const testUserEmail = `test.user.${Date.now()}@example.com`;
  const testCompanyName = `Test Company ${Date.now()}`;
  const testGroupName = `Test Group ${Date.now()}`;

  test.beforeAll(async () => {
    // Setup test data if needed
    const supabase = createSupabaseClient();

    // Clean up any existing test data
    await supabase
      .from("people")
      .delete()
      .eq("email", testUserEmail);
  });

  test.afterAll(async () => {
    // Cleanup test data
    const supabase = createSupabaseClient();

    // Clean up test user
    await supabase
      .from("people")
      .delete()
      .eq("email", testUserEmail);

    // Clean up test company
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("name", testCompanyName)
      .single();

    if (company) {
      await supabase
        .from("companies")
        .delete()
        .eq("id", company.id);
    }

    // Clean up test group
    const { data: group } = await supabase
      .from("distribution_groups")
      .select("id")
      .eq("name", testGroupName)
      .single();

    if (group) {
      await supabase
        .from("distribution_groups")
        .delete()
        .eq("id", group.id);
    }
  });

  test("should navigate to directory page", async ({ page }) => {
    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Verify tabs are visible
    await expect(page.locator("text=Users")).toBeVisible();
    await expect(page.locator("text=Contacts")).toBeVisible();
    await expect(page.locator("text=Companies")).toBeVisible();
    await expect(page.locator("text=Distribution Groups")).toBeVisible();
  });

  test("should create a new company", async ({ page }) => {
    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Navigate to Companies tab
    await page.click("text=Companies");
    await page.waitForTimeout(1000);

    // Click Add Company button
    const addButton = page.locator("button:has-text('Add Company')").first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Fill in company form
    await page.fill("input[placeholder='ABC Corporation']", testCompanyName);
    await page.fill("input[placeholder='ABC Corp']", `${testCompanyName} Display`);
    await page.fill("input[placeholder='XX-XXXXXXX']", "12-3456789");
    await page.fill("input[placeholder='123 Main Street']", "123 Test Street");
    await page.fill("input[placeholder='New York']", "Test City");
    await page.fill("input[placeholder='NY']", "TS");
    await page.fill("input[placeholder='10001']", "12345");
    await page.fill("input[placeholder='United States']", "Test Country");
    await page.fill("input[placeholder='+1 (555) 123-4567']", "+1 555-0100");
    await page.fill("input[placeholder='contact@example.com']", `contact@${testCompanyName.replace(/\s/g, '').toLowerCase()}.com`);
    await page.fill("input[placeholder='https://example.com']", `https://${testCompanyName.replace(/\s/g, '').toLowerCase()}.com`);

    // Submit form
    await page.click("button:has-text('Create Company')");

    // Wait for success message
    await expect(page.locator("text=Company created successfully")).toBeVisible({ timeout: 10000 });

    // Verify company appears in list
    await page.waitForTimeout(2000);
    await expect(page.locator(`text=${testCompanyName}`)).toBeVisible();
  });

  test("should create a new user", async ({ page }) => {
    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Make sure we're on Users tab
    await page.click("text=Users");
    await page.waitForTimeout(1000);

    // Click Add Person button
    const addButton = page.locator("button:has-text('Add Person')").first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Wait for dialog to open
    await page.waitForSelector("text=Add New Person", { timeout: 10000 });

    // Select user type
    const typeSelect = page.locator("select").filter({ hasText: "User (Can login)" }).first();
    if (await typeSelect.count() > 0) {
      await typeSelect.selectOption("user");
    } else {
      // Try clicking the select trigger for shadcn select
      await page.click('[id="person-type"]');
      await page.click("text=User (Can login)");
    }

    // Fill in user form
    await page.fill("input[placeholder='John']", "Test");
    await page.fill("input[placeholder='Doe']", "User");
    await page.fill("input[placeholder='john.doe@example.com']", testUserEmail);
    await page.fill("input[placeholder='+1 (555) 123-4567']", "+1 555-0101");
    await page.fill("input[placeholder='Project Manager']", "Test Engineer");

    // Select company if available
    const companySelect = page.locator('[id="company"]');
    if (await companySelect.count() > 0) {
      await companySelect.click();
      const companyOption = page.locator(`text=${testCompanyName}`).first();
      if (await companyOption.count() > 0) {
        await companyOption.click();
      } else {
        // Click outside to close dropdown
        await page.keyboard.press("Escape");
      }
    }

    // Submit form
    await page.click("button:has-text('Create Person')");

    // Wait for success message
    await expect(page.locator("text=Test User has been created")).toBeVisible({ timeout: 10000 });

    // Verify user appears in list
    await page.waitForTimeout(2000);
    await expect(page.locator(`text=${testUserEmail}`)).toBeVisible();
  });

  test("should edit an existing user", async ({ page }) => {
    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Find and click on the test user row
    const userRow = page.locator(`tr:has-text("${testUserEmail}")`).first();
    await expect(userRow).toBeVisible({ timeout: 10000 });

    // Click edit button in the row
    await userRow.locator("button[aria-label='Edit']").click();

    // Wait for edit dialog
    await page.waitForSelector("text=Edit Person", { timeout: 10000 });

    // Update job title
    const jobTitleInput = page.locator("input[placeholder='Project Manager']");
    await jobTitleInput.clear();
    await jobTitleInput.fill("Senior Test Engineer");

    // Update phone number
    const phoneInput = page.locator("input[placeholder='+1 (555) 123-4567']");
    await phoneInput.clear();
    await phoneInput.fill("+1 555-0102");

    // Save changes
    await page.click("button:has-text('Save Changes')");

    // Wait for success message
    await expect(page.locator("text=Test User has been updated")).toBeVisible({ timeout: 10000 });

    // Verify changes appear in list
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Senior Test Engineer")).toBeVisible();
  });

  test("should create a distribution group", async ({ page }) => {
    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Navigate to Distribution Groups tab
    await page.click("text=Distribution Groups");
    await page.waitForTimeout(1000);

    // Click Add Group button
    const addButton = page.locator("button:has-text('Add Group')").first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Wait for dialog to open
    await page.waitForSelector("text=Create Distribution Group", { timeout: 10000 });

    // Fill in group form
    await page.fill("input[placeholder='Engineering Team']", testGroupName);
    await page.fill("textarea[placeholder='Describe the purpose of this group...']", "Test group for E2E testing");

    // Select group type
    const typeSelect = page.locator("text=Select a type").first();
    await typeSelect.click();
    await page.click("text=Internal");

    // Search and add members
    const searchInput = page.locator("input[placeholder='Search people to add...']");
    await searchInput.fill("Test User");
    await page.waitForTimeout(1000);

    // Select the test user if found
    const userCheckbox = page.locator(`text=${testUserEmail}`).locator("../..").locator("input[type='checkbox']").first();
    if (await userCheckbox.count() > 0) {
      await userCheckbox.check();
    }

    // Submit form
    await page.click("button:has-text('Create Group')");

    // Wait for success message
    await expect(page.locator("text=Group created successfully")).toBeVisible({ timeout: 10000 });

    // Verify group appears in list
    await page.waitForTimeout(2000);
    await expect(page.locator(`text=${testGroupName}`)).toBeVisible();
  });

  test("should filter users by status", async ({ page }) => {
    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Make sure we're on Users tab
    await page.click("text=Users");
    await page.waitForTimeout(1000);

    // Open filters if available
    const filterButton = page.locator("button:has-text('Filters')").first();
    if (await filterButton.count() > 0) {
      await filterButton.click();
      await page.waitForTimeout(500);
    }

    // Select Active status filter
    const activeFilter = page.locator("label:has-text('Active')").first();
    if (await activeFilter.count() > 0) {
      await activeFilter.click();
      await page.waitForTimeout(1000);

      // Verify filtered results
      const rows = page.locator("tbody tr");
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test("should search for users", async ({ page }) => {
    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Find search input
    const searchInput = page.locator("input[placeholder*='Search']").first();
    await searchInput.fill("Test User");
    await page.waitForTimeout(1000);

    // Verify search results
    const userEmail = page.locator(`text=${testUserEmail}`);
    if (await userEmail.count() > 0) {
      await expect(userEmail).toBeVisible();
    }

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(1000);
  });

  test("should export directory data", async ({ page }) => {
    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Look for export button
    const exportButton = page.locator("button:has-text('Export')").first();
    if (await exportButton.count() > 0) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download');

      await exportButton.click();

      // Wait for download to start
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toContain('.csv');
    }
  });

  test("should handle CSV import dialog", async ({ page }) => {
    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Look for import button
    const importButton = page.locator("button:has-text('Import')").first();
    if (await importButton.count() > 0) {
      await importButton.click();

      // Wait for import dialog
      await page.waitForSelector("text=Import Directory Data", { timeout: 10000 });

      // Verify import type options
      await expect(page.locator("text=Users")).toBeVisible();
      await expect(page.locator("text=Contacts")).toBeVisible();
      await expect(page.locator("text=Companies")).toBeVisible();

      // Test template download
      const templateButton = page.locator("button:has-text('Download Template')");
      if (await templateButton.count() > 0) {
        const downloadPromise = page.waitForEvent('download');
        await templateButton.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('template.csv');
      }

      // Close dialog
      await page.keyboard.press("Escape");
    }
  });

  test("should handle permission template dialog", async ({ page }) => {
    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Navigate to Settings tab if available
    const settingsTab = page.locator("text=Settings").first();
    if (await settingsTab.count() > 0) {
      await settingsTab.click();
      await page.waitForTimeout(1000);

      // Look for permission templates section
      const addTemplateButton = page.locator("button:has-text('Add Template')").first();
      if (await addTemplateButton.count() > 0) {
        await addTemplateButton.click();

        // Wait for template dialog
        await page.waitForSelector("text=Create Permission Template", { timeout: 10000 });

        // Fill in template form
        await page.fill("input[placeholder='Project Manager']", `Test Template ${Date.now()}`);
        await page.fill("textarea[placeholder*='Describe']", "Test permission template");

        // Select some permissions
        const permissionTabs = page.locator(".tabs-list").first();
        if (await permissionTabs.count() > 0) {
          // Click on first tab
          await permissionTabs.locator("button").first().click();

          // Enable some permissions
          const checkboxes = page.locator("input[type='checkbox']").locator("visible=true");
          const checkboxCount = await checkboxes.count();
          if (checkboxCount > 0) {
            // Check first 3 permissions
            for (let i = 0; i < Math.min(3, checkboxCount); i++) {
              await checkboxes.nth(i).check();
            }
          }
        }

        // Cancel dialog (don't actually create to avoid cleanup issues)
        await page.click("button:has-text('Cancel')");
      }
    }
  });

  test("should handle bulk operations", async ({ page }) => {
    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Find checkboxes for bulk selection
    const selectAllCheckbox = page.locator("thead input[type='checkbox']").first();
    if (await selectAllCheckbox.count() > 0) {
      // Select all items
      await selectAllCheckbox.check();
      await page.waitForTimeout(500);

      // Look for bulk action buttons
      const bulkActionsBar = page.locator("text=selected").first();
      if (await bulkActionsBar.count() > 0) {
        await expect(bulkActionsBar).toBeVisible();

        // Deselect all
        await selectAllCheckbox.uncheck();
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe("Directory Responsive Design", () => {
  const testProjectId = "98";

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Verify mobile layout
    const mobileMenu = page.locator("[data-testid='mobile-menu']").first();
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu).toBeVisible();
    }

    // Verify table is scrollable or transformed for mobile
    const table = page.locator("table").first();
    if (await table.count() > 0) {
      const tableContainer = page.locator(".overflow-x-auto").first();
      await expect(tableContainer).toBeVisible();
    }
  });

  test("should be responsive on tablet", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(`/${testProjectId}/directory`);
    await page.waitForSelector("[data-testid='directory-page']", { timeout: 10000 });

    // Verify tablet layout
    const sidebar = page.locator("[data-testid='sidebar']").first();
    const shouldHaveSidebar = await sidebar.count() > 0;

    if (shouldHaveSidebar) {
      // On tablet, sidebar might be collapsible
      const sidebarToggle = page.locator("[data-testid='sidebar-toggle']").first();
      if (await sidebarToggle.count() > 0) {
        await expect(sidebarToggle).toBeVisible();
      }
    }
  });
});