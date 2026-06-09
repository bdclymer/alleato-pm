process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import { NextRequest } from "next/server";

import { GET } from "../route";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

const createClientMock = createClient as jest.MockedFunction<
  typeof createClient
>;
const createServiceClientMock = createServiceClient as jest.MockedFunction<
  typeof createServiceClient
>;

type DocumentRow = {
  id: number;
  file_name: string;
  file_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  source_system: string | null;
  source_web_url: string | null;
  source_metadata: {
    outlook_intake_attachment_id?: number | null;
  } | null;
};

function makeRequest() {
  return new NextRequest(
    "http://localhost/api/projects/1009/documents/42/download",
  );
}

function buildProjectDocumentQuery(result: {
  data: DocumentRow | null;
  error: { code?: string; message: string } | null;
}) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
}

function buildSupabaseClient(documentResult: {
  data: DocumentRow | null;
  error: { code?: string; message: string } | null;
}) {
  const query = buildProjectDocumentQuery(documentResult);
  const from = jest.fn((table: string) => {
    if (table !== "project_documents") {
      throw new Error(`Unexpected supabase.from("${table}")`);
    }
    return query;
  });

  return {
    client: {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from,
    } as Awaited<ReturnType<typeof createClient>>,
    query,
  };
}

function buildServiceClient() {
  const createSignedUrl = jest.fn().mockResolvedValue({
    data: null,
    error: { message: "No signed URL" },
  });
  const attachmentSingle = jest.fn();
  const attachmentQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: attachmentSingle,
  };
  const from = jest.fn((table: string) => {
    if (table === "outlook_email_intake_attachments") {
      return attachmentQuery;
    }
    throw new Error(`Unexpected serviceClient.from("${table}")`);
  });

  return {
    client: {
      from,
      storage: {
        from: jest.fn(() => ({
          createSignedUrl,
        })),
      },
    } as Awaited<ReturnType<typeof createServiceClient>>,
    createSignedUrl,
    attachmentQuery,
  };
}

describe("project document download route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prefers file_url before source_web_url for external fallbacks", async () => {
    const supabase = buildSupabaseClient({
      data: {
        id: 42,
        file_name: "proposal.pdf",
        file_url: "https://files.example.com/proposal.pdf",
        storage_bucket: null,
        storage_path: null,
        source_system: null,
        source_web_url: "https://outlook.office.com/mail/id/abc",
        source_metadata: null,
      },
      error: null,
    });
    const service = buildServiceClient();
    createClientMock.mockResolvedValue(supabase.client);
    createServiceClientMock.mockReturnValue(service.client);

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: "1009", documentId: "42" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://files.example.com/proposal.pdf",
    );
    expect(response.headers.get("x-document-source")).toBe("file-url");
  });

  it("falls back to source_web_url only when no direct file URL exists", async () => {
    const supabase = buildSupabaseClient({
      data: {
        id: 42,
        file_name: "proposal.pdf",
        file_url: "graph://messages/abc/attachments/def",
        storage_bucket: null,
        storage_path: null,
        source_system: null,
        source_web_url: "https://outlook.office.com/mail/id/abc",
        source_metadata: null,
      },
      error: null,
    });
    const service = buildServiceClient();
    createClientMock.mockResolvedValue(supabase.client);
    createServiceClientMock.mockReturnValue(service.client);

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: "1009", documentId: "42" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://outlook.office.com/mail/id/abc",
    );
    expect(response.headers.get("x-document-source")).toBe("source-web-url");
  });

  it("streams promoted Outlook attachment bytes before falling back to the email web link", async () => {
    const supabase = buildSupabaseClient({
      data: {
        id: 42,
        file_name: "proposal.pdf",
        file_url: "https://outlook.office.com/mail/id/abc",
        storage_bucket: null,
        storage_path: null,
        source_system: "outlook_attachment",
        source_web_url: "https://outlook.office.com/mail/id/abc",
        source_metadata: {
          outlook_intake_attachment_id: 2060,
        },
      },
      error: null,
    });
    const service = buildServiceClient();
    service.attachmentQuery.single.mockResolvedValue({
      data: {
        id: 2060,
        file_name: "proposal.pdf",
        content: "\\x25504446",
        content_type: "application/pdf",
        project_id: 1009,
      },
      error: null,
    });
    createClientMock.mockResolvedValue(supabase.client);
    createServiceClientMock.mockReturnValue(service.client);

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ projectId: "1009", documentId: "42" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-document-source")).toBe(
      "outlook-intake-attachment",
    );
    expect(response.headers.get("content-type")).toBe("application/pdf");
    await expect(response.arrayBuffer()).resolves.toEqual(
      Uint8Array.from([0x25, 0x50, 0x44, 0x46]).buffer,
    );
  });
});
