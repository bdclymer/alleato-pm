import { test, expect } from "../fixtures/index";
import { createTestProject } from "../helpers/bootstrap";

type BudgetLine = {
  id: string;
  costCode: string;
};

/**
 * Loads one budget line from the project budget API for endpoint scoping.
 */
async function loadSeedBudgetLine(
  projectId: number,
  authenticatedRequest: {
    get: (url: string) => Promise<{
      ok: () => boolean;
      status: () => number;
      json: () => Promise<unknown>;
      text: () => Promise<string>;
    }>;
  },
): Promise<BudgetLine | null> {
  const response = await authenticatedRequest.get(`/api/projects/${projectId}/budget`);
  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Failed to load budget line seed data (${response.status()}): ${text}`);
  }

  const payload = (await response.json()) as { lineItems?: BudgetLine[] };
  const firstLine = payload.lineItems?.[0] ?? null;
  return firstLine;
}

test.describe("Budget Modal Endpoint Contract", () => {
  test("change orders, commitments, and pending cost changes endpoints return stable payloads", async ({
    page,
    authenticatedRequest,
  }) => {
    const project = await createTestProject(page, {}, authenticatedRequest);
    const projectId = project.project.id;

    const line = await loadSeedBudgetLine(projectId, authenticatedRequest);
    test.skip(!line, "No budget lines returned by seed bootstrap");

    const [changeOrdersRes, commitmentsRes, pendingCostsRes] = await Promise.all([
      authenticatedRequest.get(
        `/api/projects/${projectId}/budget/change-orders?budgetLineId=${line!.id}&status=approved`,
      ),
      authenticatedRequest.get(
        `/api/projects/${projectId}/budget/commitments?budgetLineId=${line!.id}&costCode=${encodeURIComponent(line!.costCode)}&status=approved,complete`,
      ),
      authenticatedRequest.get(
        `/api/projects/${projectId}/budget/pending-cost-changes?budgetLineId=${line!.id}&type=all`,
      ),
    ]);

    if (!changeOrdersRes.ok()) {
      const body = await changeOrdersRes.text();
      throw new Error(`change-orders endpoint failed (${changeOrdersRes.status()}): ${body}`);
    }
    if (!commitmentsRes.ok()) {
      const body = await commitmentsRes.text();
      throw new Error(`commitments endpoint failed (${commitmentsRes.status()}): ${body}`);
    }
    if (!pendingCostsRes.ok()) {
      const body = await pendingCostsRes.text();
      throw new Error(`pending-cost-changes endpoint failed (${pendingCostsRes.status()}): ${body}`);
    }

    const changeOrdersBody = (await changeOrdersRes.json()) as {
      changeOrders?: Array<Record<string, unknown>>;
    };
    const commitmentsBody = (await commitmentsRes.json()) as {
      commitments?: Array<Record<string, unknown>>;
    };
    const pendingCostsBody = (await pendingCostsRes.json()) as {
      changes?: Array<Record<string, unknown>>;
    };

    expect(Array.isArray(changeOrdersBody.changeOrders)).toBeTruthy();
    expect(Array.isArray(commitmentsBody.commitments)).toBeTruthy();
    expect(Array.isArray(pendingCostsBody.changes)).toBeTruthy();

    if ((changeOrdersBody.changeOrders?.length ?? 0) > 0) {
      const first = changeOrdersBody.changeOrders![0];
      expect(typeof first.id).toBe("string");
      expect(typeof first.amount).toBe("number");
      expect(typeof first.status).toBe("string");
    }

    if ((commitmentsBody.commitments?.length ?? 0) > 0) {
      const first = commitmentsBody.commitments![0];
      expect(typeof first.id).toBe("string");
      expect(typeof first.amount).toBe("number");
      expect(typeof first.type).toBe("string");
    }

    if ((pendingCostsBody.changes?.length ?? 0) > 0) {
      const first = pendingCostsBody.changes![0];
      expect(typeof first.id).toBe("string");
      expect(typeof first.amount).toBe("number");
      expect(typeof first.type).toBe("string");
    }
  });
});
