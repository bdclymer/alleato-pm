/**
 * Regression tests for subcontract data-mapping utilities.
 *
 * Bug: accounting_method was omitted from mapFormToInsert, so the DB column
 * was never written on create — it silently fell back to whatever the DB default
 * was, ignoring the user's selection.
 *
 * Bug: mapRowToDisplay omitted accounting_method, so reads silently dropped the field.
 */

import { mapFormToInsert, mapRowToDisplay } from "@/lib/db/subcontracts";
import type { Database } from "@/types/database.types";

type SubcontractRow = Database["public"]["Tables"]["subcontracts"]["Row"];

const BASE_FORM = {
  contractNumber: "SC-001",
  status: "Draft",
};
const PROJECT_ID = 1;
const USER_ID = "user-1";

describe("mapFormToInsert — accounting_method", () => {
  it("writes unit_quantity when provided", () => {
    const result = mapFormToInsert(
      { ...BASE_FORM, accountingMethod: "unit_quantity" },
      PROJECT_ID,
      USER_ID,
    );
    expect(result.accounting_method).toBe("unit_quantity");
  });

  it("writes amount_based when provided", () => {
    const result = mapFormToInsert(
      { ...BASE_FORM, accountingMethod: "amount_based" },
      PROJECT_ID,
      USER_ID,
    );
    expect(result.accounting_method).toBe("amount_based");
  });

  it("defaults to amount_based when accountingMethod is undefined (regression: field was missing)", () => {
    const result = mapFormToInsert({ ...BASE_FORM }, PROJECT_ID, USER_ID);
    expect(result.accounting_method).toBe("amount_based");
  });

  it("defaults to amount_based when accountingMethod is null", () => {
    const result = mapFormToInsert(
      { ...BASE_FORM, accountingMethod: null },
      PROJECT_ID,
      USER_ID,
    );
    expect(result.accounting_method).toBe("amount_based");
  });

  it("rejects an invalid value and falls back to amount_based (regression: unsafe cast allowed bad values)", () => {
    // Before the fix, `as` cast would silently accept "percent" — the allowlist now blocks it
    const result = mapFormToInsert(
      { ...BASE_FORM, accountingMethod: "percent" },
      PROJECT_ID,
      USER_ID,
    );
    expect(result.accounting_method).toBe("amount_based");
  });
});

describe("mapRowToDisplay — accounting_method", () => {
  const BASE_ROW: SubcontractRow = {
    id: "row-1",
    project_id: 1,
    contract_number: "SC-001",
    status: "Draft",
    executed: false,
    contract_company_id: null,
    title: null,
    default_retainage_percent: null,
    accounting_method: "unit_quantity",
    description: null,
    inclusions: null,
    exclusions: null,
    start_date: null,
    estimated_completion_date: null,
    actual_completion_date: null,
    contract_date: null,
    signed_contract_received_date: null,
    issued_on_date: null,
    is_private: true,
    non_admin_user_ids: [],
    allow_non_admin_view_sov_items: false,
    invoice_contact_ids: [],
    created_by: "user-1",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    acumatica_external_key: null,
    assigned_to: null,
    bill_to: null,
    deleted_at: null,
  } as unknown as SubcontractRow;

  it("includes accountingMethod in the display object (regression: field was missing)", () => {
    const result = mapRowToDisplay(BASE_ROW);
    expect(result.accountingMethod).toBe("unit_quantity");
  });

  it("passes null through unchanged", () => {
    const result = mapRowToDisplay({ ...BASE_ROW, accounting_method: null });
    expect(result.accountingMethod).toBeNull();
  });
});
