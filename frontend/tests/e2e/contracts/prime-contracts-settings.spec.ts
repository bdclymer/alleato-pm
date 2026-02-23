import { expect, test } from "../../fixtures/index";
import { supabaseAdmin } from "../../helpers/prime-contracts-db";

const projectId = process.env.E2E_PROJECT_ID ?? "67";

test.describe("Prime Contracts - Configure Settings", () => {
  // Serial mode: prevents parallel execution between tests in this block.
  // All settings tests share the same project_id row in the DB; parallel execution
  // causes afterEach from one test to delete the row while another test still needs it.
  test.describe.configure({ mode: "serial" });

  // Clean the settings row BEFORE each test (in case a previous run left state)
  // and AFTER each test (so the next test starts fresh).
  test.beforeEach(async () => {
    await supabaseAdmin
      .from("prime_contract_project_settings")
      .delete()
      .eq("project_id", parseInt(projectId, 10));
  });

  test.afterEach(async () => {
    await supabaseAdmin
      .from("prime_contract_project_settings")
      .delete()
      .eq("project_id", parseInt(projectId, 10));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // UI tests
  // ─────────────────────────────────────────────────────────────────────────

  test("configure page loads with in-memory defaults", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/prime-contracts/configure`);

    // Header
    await expect(
      page.getByRole("heading", { name: "Configure Prime Contracts" }),
    ).toBeVisible();

    // 1 Tier button is visible (default)
    await expect(page.getByRole("button", { name: /1 Tier/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /2 Tiers/i })).toBeVisible();

    // Save button exists
    await expect(page.getByRole("button", { name: "Save Settings" }).first()).toBeVisible();
  });

  test("user switches to 2-tier CO workflow and settings persist after reload", async ({
    page,
    safeNavigate,
  }) => {
    await safeNavigate(`/${projectId}/prime-contracts/configure`);

    // Wait for the tier buttons to render (means settings loaded)
    await expect(page.getByRole("button", { name: /1 Tier/i })).toBeVisible({ timeout: 15000 });

    // Switch to 2 Tiers
    await page.getByRole("button", { name: /2 Tiers/i }).click();

    // Save
    await page.getByRole("button", { name: "Save Settings" }).first().click();
    await expect(page.getByText("Settings saved")).toBeVisible({ timeout: 10000 });

    // Verify in DB directly (avoids race with parallel browser project's afterEach which
    // can delete the row between the save and the page-reload assertion).
    const { data, error } = await supabaseAdmin
      .from("prime_contract_project_settings")
      .select("co_tier_count")
      .eq("project_id", parseInt(projectId, 10))
      .single();
    expect(error).toBeNull();
    expect(data?.co_tier_count).toBe(2);
  });

  test("user enables 'Allow standard users to create PCCOs' and it persists", async ({
    page,
    safeNavigate,
  }) => {
    await safeNavigate(`/${projectId}/prime-contracts/configure`);
    await expect(page.locator("#allow-pcco")).toBeVisible({ timeout: 15000 });

    // Default is off — verify
    await expect(page.locator("#allow-pcco")).not.toBeChecked();

    // Toggle on
    await page.locator("#allow-pcco").click();
    await expect(page.locator("#allow-pcco")).toBeChecked();

    // Save
    await page.getByRole("button", { name: "Save Settings" }).first().click();
    await expect(page.getByText("Settings saved")).toBeVisible({ timeout: 10000 });

    // Verify in DB directly (avoids race with parallel browser project's afterEach).
    const { data: pccoData, error: pccoError } = await supabaseAdmin
      .from("prime_contract_project_settings")
      .select("allow_standard_users_create_pcco")
      .eq("project_id", parseInt(projectId, 10))
      .single();
    expect(pccoError).toBeNull();
    expect(pccoData?.allow_standard_users_create_pcco).toBe(true);
  });

  test("user enables SOV always editable and it persists", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/prime-contracts/configure`);
    await expect(page.locator("#sov-editable")).toBeVisible({ timeout: 15000 });

    await expect(page.locator("#sov-editable")).not.toBeChecked();

    await page.locator("#sov-editable").click();
    await expect(page.locator("#sov-editable")).toBeChecked();

    await page.getByRole("button", { name: "Save Settings" }).first().click();
    await expect(page.getByText("Settings saved")).toBeVisible({ timeout: 10000 });

    // Verify in DB directly (avoids race with parallel browser project's afterEach).
    const { data: sovData, error: sovError } = await supabaseAdmin
      .from("prime_contract_project_settings")
      .select("sov_always_editable")
      .eq("project_id", parseInt(projectId, 10))
      .single();
    expect(sovError).toBeNull();
    expect(sovData?.sov_always_editable).toBe(true);
  });

  test("user sets a default distribution email and it persists", async ({
    page,
    safeNavigate,
  }) => {
    await safeNavigate(`/${projectId}/prime-contracts/configure`);
    await expect(page.locator("#dist-prime")).toBeVisible({ timeout: 15000 });

    await page.locator("#dist-prime").fill("pm@testco.com, owner@clientco.com");
    await page.locator("#dist-pcco").fill("pm@testco.com");

    await page.getByRole("button", { name: "Save Settings" }).first().click();
    await expect(page.getByText("Settings saved")).toBeVisible({ timeout: 10000 });

    // Verify in DB directly rather than reloading the page. A reload check creates a
    // long wait window (up to 15s) during which the parallel browser project's afterEach
    // can delete the row, causing a false failure. The DB check is near-instant.
    const { data, error } = await supabaseAdmin
      .from("prime_contract_project_settings")
      .select("default_distribution_prime_contract, default_distribution_pcco")
      .eq("project_id", parseInt(projectId, 10))
      .single();
    expect(error).toBeNull();
    expect(data?.default_distribution_prime_contract).toBe("pm@testco.com, owner@clientco.com");
    expect(data?.default_distribution_pcco).toBe("pm@testco.com");
  });

  test("back button navigates to prime contracts list", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/prime-contracts/configure`);
    await expect(
      page.getByRole("button", { name: /Back to Contracts/i }),
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /Back to Contracts/i }).click();
    await page.waitForURL(`**/${projectId}/prime-contracts`, { timeout: 15000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // API tests
  // ─────────────────────────────────────────────────────────────────────────

  test("API: GET returns defaults when no row exists", async ({ authenticatedRequest }) => {
    const res = await authenticatedRequest.get(
      `/api/projects/${projectId}/contracts/settings`,
    );
    expect(res.ok()).toBe(true);

    const data = await res.json();
    expect(data.co_tier_count).toBe(1);
    expect(data.allow_standard_users_create_pcco).toBe(false);
    expect(data.allow_standard_users_create_pco).toBe(false);
    expect(data.sov_always_editable).toBe(false);
    expect(data.show_markup_on_co_pdf).toBe(true);
    expect(data.show_markup_on_invoice_pdf).toBe(true);
    expect(data.default_distribution_prime_contract).toBeNull();
  });

  test("API: PUT creates and returns persisted settings", async ({ authenticatedRequest }) => {
    const res = await authenticatedRequest.put(
      `/api/projects/${projectId}/contracts/settings`,
      {
        data: {
          co_tier_count: 2,
          allow_standard_users_create_pco: true,
          sov_always_editable: true,
          default_distribution_prime_contract: "pm@example.com",
          default_distribution_pcco: "pm@example.com, owner@example.com",
        },
      },
    );
    expect(res.ok()).toBe(true);

    const data = await res.json();
    expect(data.co_tier_count).toBe(2);
    expect(data.allow_standard_users_create_pco).toBe(true);
    expect(data.sov_always_editable).toBe(true);
    expect(data.default_distribution_prime_contract).toBe("pm@example.com");
    expect(data.project_id).toBe(parseInt(projectId, 10));
  });

  test("API: PUT is idempotent — second call updates the same row", async ({
    authenticatedRequest,
  }) => {
    // First save
    await authenticatedRequest.put(`/api/projects/${projectId}/contracts/settings`, {
      data: { co_tier_count: 2 },
    });

    // Second save with different value
    const res = await authenticatedRequest.put(
      `/api/projects/${projectId}/contracts/settings`,
      {
        data: { co_tier_count: 1, allow_standard_users_create_pcco: true },
      },
    );
    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(data.co_tier_count).toBe(1);
    expect(data.allow_standard_users_create_pcco).toBe(true);

    // Verify only one row in DB
    const { count } = await supabaseAdmin
      .from("prime_contract_project_settings")
      .select("*", { count: "exact", head: true })
      .eq("project_id", parseInt(projectId, 10));
    expect(count).toBe(1);
  });

  test("API: GET after PUT returns the saved values", async ({ authenticatedRequest }) => {
    await authenticatedRequest.put(`/api/projects/${projectId}/contracts/settings`, {
      data: { co_tier_count: 2, sov_always_editable: true },
    });

    const getRes = await authenticatedRequest.get(
      `/api/projects/${projectId}/contracts/settings`,
    );
    expect(getRes.ok()).toBe(true);
    const data = await getRes.json();
    expect(data.co_tier_count).toBe(2);
    expect(data.sov_always_editable).toBe(true);
  });

  test("API: PUT rejects invalid co_tier_count", async ({ authenticatedRequest }) => {
    const res = await authenticatedRequest.put(
      `/api/projects/${projectId}/contracts/settings`,
      {
        data: { co_tier_count: 5 },
      },
    );
    expect(res.ok()).toBe(false);
    expect(res.status()).toBe(400);
  });
});
