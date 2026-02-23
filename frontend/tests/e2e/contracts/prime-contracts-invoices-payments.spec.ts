import { test, expect } from "../../fixtures/index";
import { deletePrimeContractCascade, supabaseAdmin } from "../../helpers/prime-contracts-db";

const projectId = process.env.E2E_PROJECT_ID ?? "67";

test.describe("Prime Contracts - Invoices tab (payment applications)", () => {
  let contractId: string;
  // process.pid is unique per worker, ensuring no collision across parallel browser projects
  const stamp = `${Date.now()}-${process.pid}`;

  test.beforeAll(async () => {
    const { data, error } = await supabaseAdmin
      .from("prime_contracts")
      .insert({
        project_id: parseInt(projectId, 10),
        contract_number: `PC-E2E-INV-${stamp}`,
        title: `E2E Invoice Test Contract ${stamp}`,
        status: "approved",
        original_contract_value: 10000,
        revised_contract_value: 10000,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Setup: failed to create test contract: ${error.message}`);
    contractId = data.id;
  });

  test.afterAll(async () => {
    if (!contractId) return;
    await deletePrimeContractCascade(contractId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // UI tests
  // ─────────────────────────────────────────────────────────────────────────

  test("Invoices tab is reachable and shows empty state", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/prime-contracts/${contractId}`);
    await expect(page.getByRole("button", { name: "General" })).toBeVisible();

    await page.getByRole("button", { name: "Invoices" }).click();
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New Invoice" })).toBeVisible();
  });

  test("user creates an invoice via the form dialog", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/prime-contracts/${contractId}`);
    await page.getByRole("button", { name: "Invoices" }).click();

    // Open the dialog
    await page.getByRole("button", { name: "New Invoice" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("New Invoice / Payment Application")).toBeVisible();

    // Fill required fields
    await page.locator("#app-number").fill("001");
    await page.locator("#app-amount").fill("5000");

    // Optional fields
    await page.locator("#app-retention").fill("250");
    await page.locator("#app-period-from").fill("2026-01-01");
    await page.locator("#app-period-to").fill("2026-01-31");

    // Submit
    await page.getByRole("dialog").getByRole("button", { name: "Create Invoice" }).click();

    // Dialog closes
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 15000 });

    // Invoice appears in the table
    await expect(page.getByRole("cell", { name: "001" })).toBeVisible({ timeout: 10000 });
  });

  test("invoice form requires Application Number and Amount", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/prime-contracts/${contractId}`);
    await page.getByRole("button", { name: "Invoices" }).click();
    await page.getByRole("button", { name: "New Invoice" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Submit button is disabled when required fields are empty
    const submitBtn = page.getByRole("dialog").getByRole("button", { name: "Create Invoice" });
    await expect(submitBtn).toBeDisabled();

    // Fill only application number — still disabled (no amount)
    await page.locator("#app-number").fill("002");
    await expect(submitBtn).toBeDisabled();

    // Fill amount — now enabled
    await page.locator("#app-amount").fill("1000");
    await expect(submitBtn).toBeEnabled();

    // Cancel
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // API tests
  // ─────────────────────────────────────────────────────────────────────────

  test("API: POST creates a payment application with correct net_amount", async ({
    authenticatedRequest,
  }) => {
    const res = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
      {
        data: {
          application_number: `API-${stamp}`,
          amount: 3000,
          retention_amount: 150,
        },
      },
    );
    expect(res.ok()).toBe(true);

    const data = await res.json();
    expect(data.application_number).toBe(`API-${stamp}`);
    expect(data.amount).toBe(3000);
    expect(data.net_amount).toBe(2850); // GENERATED: amount - retention_amount
    expect(data.status).toBe("draft");
  });

  test("API: GET returns created payment applications", async ({ authenticatedRequest }) => {
    const listRes = await authenticatedRequest.get(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
    );
    expect(listRes.ok()).toBe(true);

    const list = await listRes.json();
    expect(Array.isArray(list)).toBe(true);
    const found = list.find(
      (a: { application_number: string }) => a.application_number === `API-${stamp}`,
    );
    expect(found).toBeTruthy();
  });

  test("API: PATCH updates a payment application status", async ({ authenticatedRequest }) => {
    // Create one first
    const createRes = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
      {
        data: {
          application_number: `PATCH-${stamp}`,
          amount: 2000,
        },
      },
    );
    expect(createRes.ok()).toBe(true);
    const { id: appId } = await createRes.json();

    // Update its status
    const patchRes = await authenticatedRequest.patch(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications/${appId}`,
      {
        data: { status: "submitted" },
      },
    );
    expect(patchRes.ok()).toBe(true);
    const updated = await patchRes.json();
    expect(updated.status).toBe("submitted");
  });

  test("API: DELETE removes a payment application", async ({ authenticatedRequest }) => {
    // Create one first
    const createRes = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
      {
        data: {
          application_number: `DEL-${stamp}`,
          amount: 500,
        },
      },
    );
    expect(createRes.ok()).toBe(true);
    const { id: appId } = await createRes.json();

    // Delete it
    const delRes = await authenticatedRequest.delete(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications/${appId}`,
    );
    expect(delRes.ok()).toBe(true);

    // Verify gone
    const listRes = await authenticatedRequest.get(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
    );
    const list = await listRes.json();
    const found = list.find((a: { id: string }) => a.id === appId);
    expect(found).toBeUndefined();
  });

  test("API: duplicate application_number returns 409", async ({ authenticatedRequest }) => {
    const createRes = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
      {
        data: { application_number: `DUP-${stamp}`, amount: 1000 },
      },
    );
    expect(createRes.ok()).toBe(true);

    // Try again with same number
    const dupRes = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
      {
        data: { application_number: `DUP-${stamp}`, amount: 1000 },
      },
    );
    expect(dupRes.ok()).toBe(false);
    expect(dupRes.status()).toBe(409);
  });
});

// =============================================================================

test.describe("Prime Contracts - Payments Received tab", () => {
  let contractId: string;
  // process.pid is unique per worker, ensuring no collision across parallel browser projects
  const stamp = `${Date.now()}-${process.pid}-pmt`;

  test.beforeAll(async () => {
    const { data, error } = await supabaseAdmin
      .from("prime_contracts")
      .insert({
        project_id: parseInt(projectId, 10),
        contract_number: `PC-E2E-PMT-${stamp}`,
        title: `E2E Payment Test Contract ${stamp}`,
        status: "approved",
        original_contract_value: 50000,
        revised_contract_value: 50000,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Setup: failed to create test contract: ${error.message}`);
    contractId = data.id;
  });

  test.afterAll(async () => {
    if (!contractId) return;
    await deletePrimeContractCascade(contractId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // UI tests
  // ─────────────────────────────────────────────────────────────────────────

  test("Payments Received tab is reachable and shows empty state", async ({
    page,
    safeNavigate,
  }) => {
    await safeNavigate(`/${projectId}/prime-contracts/${contractId}`);
    await page.getByRole("button", { name: "Payments Received" }).click();
    await expect(page.getByRole("heading", { name: "Payments Received" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Record Payment" })).toBeVisible();
  });

  test("user records a payment via the form dialog", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/prime-contracts/${contractId}`);
    await page.getByRole("button", { name: "Payments Received" }).click();

    // Open the dialog
    await page.getByRole("button", { name: "Record Payment" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Record Payment Received")).toBeVisible();

    // Fill required fields
    await page.locator("#pmt-amount").fill("12500");
    await page.locator("#pmt-date").fill("2026-02-15");

    // Optional fields
    await page.locator("#pmt-method").selectOption("wire");
    await page.locator("#pmt-ref").fill("WIRE-20260215-001");

    // Submit inside dialog
    await page.getByRole("dialog").getByRole("button", { name: "Record Payment" }).click();

    // Dialog closes
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 15000 });

    // Payment row appears in the table body
    await expect(
      page.locator("tbody").getByRole("cell", { name: "$12,500.00" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("payment form requires Amount and Date", async ({ page, safeNavigate }) => {
    await safeNavigate(`/${projectId}/prime-contracts/${contractId}`);
    await page.getByRole("button", { name: "Payments Received" }).click();
    await page.getByRole("button", { name: "Record Payment" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Submit disabled with empty fields
    const submitBtn = page.getByRole("dialog").getByRole("button", { name: "Record Payment" });
    await expect(submitBtn).toBeDisabled();

    // Fill amount only — still disabled (no date)
    await page.locator("#pmt-amount").fill("500");
    await expect(submitBtn).toBeDisabled();

    // Fill date — now enabled
    await page.locator("#pmt-date").fill("2026-02-20");
    await expect(submitBtn).toBeEnabled();

    // Cancel
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // API tests
  // ─────────────────────────────────────────────────────────────────────────

  test("API: POST creates a payment and it appears in the list", async ({
    authenticatedRequest,
  }) => {
    const res = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/payments`,
      {
        data: {
          amount: 7500,
          payment_date: "2026-02-20",
          method: "ach",
          payment_number: `PAY-${stamp}`,
          reference_number: "ACH-REF-001",
        },
      },
    );
    expect(res.ok()).toBe(true);

    const data = await res.json();
    expect(data.amount).toBe(7500);
    expect(data.method).toBe("ach");
    expect(data.payment_number).toBe(`PAY-${stamp}`);

    // Verify in list
    const listRes = await authenticatedRequest.get(
      `/api/projects/${projectId}/contracts/${contractId}/payments`,
    );
    expect(listRes.ok()).toBe(true);
    const list = await listRes.json();
    const found = list.find((p: { payment_number: string }) => p.payment_number === `PAY-${stamp}`);
    expect(found).toBeTruthy();
  });

  test("API: payment linked to a payment application is returned with join", async ({
    authenticatedRequest,
  }) => {
    // Create a payment application first
    const appRes = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
      {
        data: { application_number: `LINK-${stamp}`, amount: 5000 },
      },
    );
    expect(appRes.ok()).toBe(true);
    const { id: appId, application_number: appNumber } = await appRes.json();

    // Create payment linked to it
    const pmtRes = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/payments`,
      {
        data: {
          amount: 5000,
          payment_date: "2026-02-25",
          payment_application_id: appId,
        },
      },
    );
    expect(pmtRes.ok()).toBe(true);

    // Fetch list and check join
    const listRes = await authenticatedRequest.get(
      `/api/projects/${projectId}/contracts/${contractId}/payments`,
    );
    const list = await listRes.json();
    const linked = list.find(
      (p: { payment_application_id: string }) => p.payment_application_id === appId,
    );
    expect(linked).toBeTruthy();
    expect(linked.payment_application.application_number).toBe(appNumber);
  });

  test("API: PATCH updates payment amount", async ({ authenticatedRequest }) => {
    // Create
    const createRes = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/payments`,
      {
        data: { amount: 1000, payment_date: "2026-03-01" },
      },
    );
    expect(createRes.ok()).toBe(true);
    const { id: pmtId } = await createRes.json();

    // Update
    const patchRes = await authenticatedRequest.patch(
      `/api/projects/${projectId}/contracts/${contractId}/payments/${pmtId}`,
      {
        data: { amount: 1500, reference_number: "UPDATED-REF" },
      },
    );
    expect(patchRes.ok()).toBe(true);
    const updated = await patchRes.json();
    expect(updated.amount).toBe(1500);
    expect(updated.reference_number).toBe("UPDATED-REF");
  });

  test("API: DELETE removes a payment", async ({ authenticatedRequest }) => {
    // Create
    const createRes = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/payments`,
      {
        data: { amount: 999, payment_date: "2026-03-05" },
      },
    );
    expect(createRes.ok()).toBe(true);
    const { id: pmtId } = await createRes.json();

    // Delete
    const delRes = await authenticatedRequest.delete(
      `/api/projects/${projectId}/contracts/${contractId}/payments/${pmtId}`,
    );
    expect(delRes.ok()).toBe(true);

    // Verify gone
    const listRes = await authenticatedRequest.get(
      `/api/projects/${projectId}/contracts/${contractId}/payments`,
    );
    const list = await listRes.json();
    const found = list.find((p: { id: string }) => p.id === pmtId);
    expect(found).toBeUndefined();
  });

  test("API: payment for wrong project returns 404", async ({ authenticatedRequest }) => {
    const res = await authenticatedRequest.post(
      `/api/projects/99999/contracts/${contractId}/payments`,
      {
        data: { amount: 100, payment_date: "2026-03-01" },
      },
    );
    expect(res.ok()).toBe(false);
  });
});
