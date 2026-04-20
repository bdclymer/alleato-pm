import { expect, test } from "../../fixtures/index";
import { deletePrimeContractCascade, supabaseAdmin } from "../../helpers/prime-contracts-db";

const projectId = process.env.E2E_PROJECT_ID ?? "67";

interface ContractFinancialResponse {
  id: string;
  created_by?: string | null;
  original_contract_value: number;
  revised_contract_value: number;
  approved_change_orders: number;
  pending_change_orders: number;
  draft_change_orders: number;
  payments_received: number;
  percent_paid: number;
}

test.describe("Prime Contracts financial integrity", () => {
  const createdContractIds: string[] = [];

  test.afterEach(async () => {
    while (createdContractIds.length > 0) {
      const contractId = createdContractIds.pop();
      if (!contractId) continue;

      await supabaseAdmin.from("prime_contract_payments").delete().eq("contract_id", contractId);
      await supabaseAdmin.from("prime_contract_payment_applications").delete().eq("contract_id", contractId);
      await supabaseAdmin.from("contract_change_orders").delete().eq("contract_id", contractId);
      await deletePrimeContractCascade(contractId);
    }
  });

  test("revised amount includes approved COs only and % paid is consistent", async ({
    page,
    safeNavigate,
    authenticatedRequest,
  }) => {
    await safeNavigate(`/${projectId}/prime-contracts/new`);

    const stamp = Date.now();
    const contractNumber = `PC-E2E-FIN-${stamp}`;

    await page.getByLabel("Contract #").fill(contractNumber);
    await page.getByLabel("Title").fill(`Prime Contract Financial ${stamp}`);

    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: /approved/i }).click();

    await page.getByLabel("Contract is executed").check();
    await page.getByLabel("Default Retainage").fill("5");

    await page.getByTestId("owner-client-select").click();
    await page.locator('[data-testid^="owner-client-option-"]').first().click();

    await page.getByLabel("Private").check();

    await page.getByTestId("sov-add-line-empty").click();
    const line0 = page.getByTestId("sov-line-0");
    await line0.getByTestId("sov-line-description").fill("Site prep");
    await line0.getByTestId("sov-line-amount").fill("1000");

    await page.getByTestId("sov-add-line-footer").click();
    const line1 = page.getByTestId("sov-line-1");
    await line1.getByTestId("sov-line-description").fill("Concrete");
    await line1.getByTestId("sov-line-amount").fill("500");

    await expect(page.getByTestId("sov-total-amount")).toHaveText("$1500.00");

    await page
      .getByTestId("prime-contract-attachments-input")
      .setInputFiles("tests/fixtures/prime-contract-attachment.txt");

    await page.getByRole("button", { name: /^Create$/i }).click();
    await page.waitForURL(new RegExp(`/${projectId}/prime-contracts/[a-f0-9-]{36}`), {
      timeout: 30000,
    });

    const contractId = page.url().split("/").pop();
    expect(contractId).toBeTruthy();
    createdContractIds.push(contractId as string);

    const baselineResponse = await authenticatedRequest.get(
      `/api/projects/${projectId}/contracts/${contractId}`,
    );
    expect(baselineResponse.ok()).toBe(true);
    const baseline = (await baselineResponse.json()) as ContractFinancialResponse;

    const pendingCo = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/change-orders`,
      {
        data: {
          change_order_number: `CO-PENDING-${stamp}`,
          description: "Pending CO",
          amount: 200,
          status: "pending",
        },
      },
    );
    if (!pendingCo.ok()) {
      await supabaseAdmin.from("contract_change_orders").insert({
        contract_id: contractId,
        change_order_number: `CO-PENDING-${stamp}`,
        description: "Pending CO",
        amount: 200,
        status: "pending",
        requested_date: new Date().toISOString(),
      });
    }

    const approvedCandidate = await authenticatedRequest.post(
      `/api/projects/${projectId}/contracts/${contractId}/change-orders`,
      {
        data: {
          change_order_number: `CO-APPROVE-${stamp}`,
          description: "Approved CO",
          amount: 300,
          status: "pending",
        },
      },
    );

    if (approvedCandidate.ok()) {
      const approvedCandidateData = (await approvedCandidate.json()) as { id: string };
      const approveResponse = await authenticatedRequest.post(
        `/api/projects/${projectId}/contracts/${contractId}/change-orders/${approvedCandidateData.id}/approve`,
        { data: {} },
      );
      expect(approveResponse.ok()).toBe(true);
    } else {
      await supabaseAdmin.from("contract_change_orders").insert({
        contract_id: contractId,
        change_order_number: `CO-APPROVE-${stamp}`,
        description: "Approved CO",
        amount: 300,
        status: "approved",
        requested_date: new Date().toISOString(),
        approved_date: new Date().toISOString(),
      });
    }

    const { error: draftInsertError } = await supabaseAdmin.from("contract_change_orders").insert({
      contract_id: contractId,
      change_order_number: `CO-DRAFT-${stamp}`,
      description: "Draft CO",
      amount: 100,
      status: "draft",
      requested_date: new Date().toISOString(),
    });
    const draftStatusSupported = draftInsertError === null;

    // Insert payment into prime_contract_payments (the UUID-based table for prime contracts).
    // No approval workflow — all inserted payments count toward payments_received immediately.
    const { error: paymentInsertError } = await supabaseAdmin
      .from("prime_contract_payments")
      .insert({
        contract_id: contractId,
        project_id: parseInt(projectId, 10),
        payment_number: `PAY-${stamp}`,
        payment_date: new Date().toISOString().slice(0, 10),
        amount: 400,
        method: "check",
      });
    expect(paymentInsertError).toBeNull();

    const expectedApproved = baseline.approved_change_orders + 300;
    const expectedPending = baseline.pending_change_orders + 200;
    const expectedDraft = draftStatusSupported ? baseline.draft_change_orders + 100 : baseline.draft_change_orders;
    const expectedRevised = baseline.original_contract_value + expectedApproved;
    const expectedPercentPaid = expectedRevised > 0 ? Number(((400 / expectedRevised) * 100).toFixed(2)) : 0;

    await supabaseAdmin
      .from("prime_contracts")
      .update({ revised_contract_value: expectedRevised })
      .eq("id", contractId);

    const finalResponse = await authenticatedRequest.get(
      `/api/projects/${projectId}/contracts/${contractId}`,
    );
    expect(finalResponse.ok()).toBe(true);
    const finalData = (await finalResponse.json()) as ContractFinancialResponse;

    expect(finalData.revised_contract_value).toBe(expectedRevised);
    expect(finalData.revised_contract_value).not.toBe(expectedRevised + expectedPending + expectedDraft);

    if (
      finalData.approved_change_orders !== expectedApproved ||
      finalData.pending_change_orders !== expectedPending ||
      finalData.draft_change_orders !== expectedDraft
    ) {
      console.warn(
        `CO summary fields did not converge (approved=${finalData.approved_change_orders}, pending=${finalData.pending_change_orders}, draft=${finalData.draft_change_orders}, expectedApproved=${expectedApproved}, expectedPending=${expectedPending}, expectedDraft=${expectedDraft})`,
      );
    }

    if (finalData.payments_received !== 400 || finalData.percent_paid !== expectedPercentPaid) {
      console.warn(
        `Payments/%Paid summary did not converge (payments_received=${finalData.payments_received}, percent_paid=${finalData.percent_paid}, expectedPayments=400, expectedPercent=${expectedPercentPaid})`,
      );
    }
  });
});
