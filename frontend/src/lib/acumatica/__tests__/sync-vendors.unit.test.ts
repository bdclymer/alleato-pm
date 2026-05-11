import { syncVendors } from "../sync-service";

jest.mock("../client", () => ({
  createAcumaticaClient: () => ({
    login: jest.fn().mockResolvedValue(undefined),
    getVendors: jest.fn().mockResolvedValue([
      {
        VendorID: "V-001",
        VendorName: "Acme Masonry",
        Status: "Active",
      },
      {
        VendorID: "V-002",
        VendorName: "New Vendor",
        Status: "Active",
      },
    ]),
  }),
}));

type CompanyRow = {
  id: string;
  name: string | null;
  acumatica_vendor_id: string | null;
  is_vendor?: boolean;
};

function buildSupabaseMock(initialCompanies: CompanyRow[]) {
  const companies = [...initialCompanies];
  const updates: Array<{ id: string; payload: Record<string, unknown> }> = [];
  const inserts: Array<Record<string, unknown>> = [];

  const supabase = {
    from(table: string) {
      expect(table).toBe("companies");
      return {
        select() {
          return {
            eq() {
              return Promise.resolve({ data: companies, error: null });
            },
          };
        },
        update(payload: Record<string, unknown>) {
          return {
            eq(idColumn: string, id: string) {
              expect(idColumn).toBe("id");
              updates.push({ id, payload });
              return Promise.resolve({ error: null });
            },
          };
        },
        insert(payload: Record<string, unknown>) {
          inserts.push(payload);
          const inserted = {
            id: `company-${companies.length + inserts.length}`,
            name: String(payload.name ?? ""),
            acumatica_vendor_id: String(payload.acumatica_vendor_id ?? ""),
          };
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: inserted, error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  return { supabase, updates, inserts };
}

describe("syncVendors", () => {
  it("updates existing vendor companies and inserts new ones without partial-index upsert", async () => {
    const { supabase, updates, inserts } = buildSupabaseMock([
      {
        id: "company-1",
        name: "Acme Masonry",
        acumatica_vendor_id: "V-001",
      },
    ]);

    const result = await syncVendors(supabase as never);

    expect(result).toEqual({
      created: 1,
      updated: 1,
      errors: [],
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      id: "company-1",
      payload: {
        acumatica_vendor_id: "V-001",
        name: "Acme Masonry",
        is_vendor: true,
      },
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      acumatica_vendor_id: "V-002",
      name: "New Vendor",
      is_vendor: true,
    });
  });
});
