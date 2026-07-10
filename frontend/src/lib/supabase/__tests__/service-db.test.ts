const createClientMock = jest.fn((url: string, key: string) => ({
  url,
  key,
  from: (relation: string) => ({ __project: { url, key }, relation }),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) =>
    createClientMock(...(args as [string, string])),
}));

const ORIGINAL_ENV = process.env;

const PM_URL = "https://pm-app.supabase.co";
const RAG_URL = "https://ai-rag.supabase.co";

describe("serviceDb — table → Supabase project router", () => {
  beforeEach(() => {
    jest.resetModules();
    createClientMock.mockClear();
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: PM_URL,
      SUPABASE_SERVICE_ROLE_KEY: "pm-service-key",
      RAG_SUPABASE_URL: RAG_URL,
      RAG_SUPABASE_SERVICE_ROLE_KEY: "rag-service-key",
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("routes an AI-Database table to the RAG project", async () => {
    const { serviceDb } = await import("../service-db");

    const builder = serviceDb.from("document_chunks") as unknown as {
      __project: { url: string };
    };

    expect(builder.__project.url).toBe(RAG_URL);
  });

  it("routes a PM-App table to the PM-App project", async () => {
    const { serviceDb } = await import("../service-db");

    const builder = serviceDb.from("projects") as unknown as {
      __project: { url: string };
    };

    expect(builder.__project.url).toBe(PM_URL);
  });

  it("routes outlook intake tables to the RAG project (the historical mistype)", async () => {
    const { serviceDb } = await import("../service-db");

    const builder = serviceDb.from("outlook_email_intake") as unknown as {
      __project: { url: string };
    };

    expect(builder.__project.url).toBe(RAG_URL);
  });

  it("throws instead of silently falling back to PM App when RAG is unconfigured", async () => {
    delete process.env.RAG_SUPABASE_URL;

    const { serviceDb } = await import("../service-db");

    expect(() => serviceDb.from("document_chunks")).toThrow(
      /Missing RAG_SUPABASE_URL/,
    );
  });

  it("memoizes each project client across calls", async () => {
    const { serviceDb } = await import("../service-db");

    serviceDb.from("projects");
    serviceDb.from("contracts");
    serviceDb.from("document_chunks");
    serviceDb.from("rag_document_metadata");

    // one PM client + one RAG client, not one per call
    expect(createClientMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the registry membership check in sync with the exported set", async () => {
    const { isRagTable, RAG_TABLE_NAMES, RAG_TABLE_REGISTRY } = await import(
      "../service-db"
    );

    expect(isRagTable("document_chunks")).toBe(true);
    expect(isRagTable("rag_document_metadata")).toBe(true);
    expect(isRagTable("projects")).toBe(false);
    expect(RAG_TABLE_REGISTRY.size).toBe(RAG_TABLE_NAMES.length);
  });
});
