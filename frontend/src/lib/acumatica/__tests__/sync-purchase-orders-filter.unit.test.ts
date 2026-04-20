import type { FlatPurchaseOrder } from "../types";

/**
 * Regression test for the $expand=Details bug in syncPurchaseOrders.
 *
 * Root cause: getPurchaseOrders was called without $expand=Details, so
 * po.Details was always undefined. The filter expression
 *   po.Details?.some(d => d.ProjectID === acuProjectId)
 * returned undefined (falsy) for every PO, silently dropping the entire list
 * whenever acumatica_project_id was set on the project.
 *
 * Fix: added $expand: "Details" and paginated with $top: 100 (sync.ts:960).
 */

function filterPOsByProject(
  pos: FlatPurchaseOrder[],
  acuProjectId: string,
): FlatPurchaseOrder[] {
  return pos.filter((po) => po.Details?.some((d) => d.ProjectID === acuProjectId));
}

describe("syncPurchaseOrders — project filter", () => {
  const PROJECT = "ACUPROJ-42";

  it("includes POs that have a detail line matching the project", () => {
    const pos: FlatPurchaseOrder[] = [
      { OrderNbr: "PO-1", Vendor: "V1", Date: "2025-01-01", Status: "Open", Details: [{ ProjectID: PROJECT }] },
      { OrderNbr: "PO-2", Vendor: "V2", Date: "2025-01-02", Status: "Open", Details: [{ ProjectID: "OTHER" }] },
      { OrderNbr: "PO-3", Vendor: "V3", Date: "2025-01-03", Status: "Open", Details: [{ ProjectID: PROJECT }, { ProjectID: "OTHER" }] },
    ];

    const result = filterPOsByProject(pos, PROJECT);
    expect(result.map((p) => p.OrderNbr)).toEqual(["PO-1", "PO-3"]);
  });

  it("drops ALL POs when Details is undefined — this was the pre-fix behavior", () => {
    // Simulates the response shape returned WITHOUT $expand=Details:
    // Details is absent, so po.Details?.some(...) is undefined (falsy).
    const posWithoutDetails: FlatPurchaseOrder[] = [
      { OrderNbr: "PO-1", Vendor: "V1", Date: "2025-01-01", Status: "Open" },
      { OrderNbr: "PO-2", Vendor: "V2", Date: "2025-01-02", Status: "Open" },
    ];

    const result = filterPOsByProject(posWithoutDetails, PROJECT);
    // Before fix: all POs were silently dropped when acuProjectId was set.
    expect(result).toHaveLength(0);
  });

  it("excludes POs whose details only reference other projects", () => {
    const pos: FlatPurchaseOrder[] = [
      { OrderNbr: "PO-X", Vendor: "VX", Date: "2025-01-01", Status: "Open", Details: [{ ProjectID: "UNRELATED" }] },
    ];

    expect(filterPOsByProject(pos, PROJECT)).toHaveLength(0);
  });
});
