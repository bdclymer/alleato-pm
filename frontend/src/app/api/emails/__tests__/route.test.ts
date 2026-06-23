process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import { NextRequest } from "next/server";
import { GET } from "../route";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getApiRouteUser: jest.fn(),
}));

jest.mock("@/lib/emails/access", () => ({
  buildOwnEmailsFilter: jest.fn(() => "from_email.eq.user@example.com"),
}));

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;
const getApiRouteUserMock = getApiRouteUser as jest.MockedFunction<
  typeof getApiRouteUser
>;

function profileBuilder(isAdmin: boolean) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { is_admin: isAdmin },
      error: null,
    }),
  };
}

function emailBuilder() {
  return {
    select: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    then: jest.fn((resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({
        data: [],
        error: null,
      }),
    ),
  };
}

function request(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

describe("/api/emails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getApiRouteUserMock.mockResolvedValue({
      id: "admin-user",
      email: "admin@alleatogroup.com",
    });
  });

  it("includes app and Outlook emails by default", async () => {
    const emailQuery = emailBuilder();
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "user_profiles") return profileBuilder(true);
        if (table === "project_emails") return emailQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
    createClientMock.mockResolvedValue(
      supabase as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await GET(request("/api/emails"));

    expect(response.status).toBe(200);
    expect(emailQuery.is).toHaveBeenCalledWith("deleted_at", null);
    expect(emailQuery.is).not.toHaveBeenCalledWith("graph_message_id", null);
    expect(emailQuery.is).not.toHaveBeenCalledWith("mailbox_user_id", null);
    expect(emailQuery.is).not.toHaveBeenCalledWith("conversation_id", null);
    expect(emailQuery.or).not.toHaveBeenCalledWith(
      "graph_message_id.not.is.null,mailbox_user_id.not.is.null,conversation_id.not.is.null",
    );
  });

  it("narrows to app emails only when source=app is explicit", async () => {
    const emailQuery = emailBuilder();
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "user_profiles") return profileBuilder(true);
        if (table === "project_emails") return emailQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
    createClientMock.mockResolvedValue(
      supabase as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await GET(request("/api/emails?source=app"));

    expect(response.status).toBe(200);
    expect(emailQuery.is).toHaveBeenCalledWith("graph_message_id", null);
    expect(emailQuery.is).toHaveBeenCalledWith("mailbox_user_id", null);
    expect(emailQuery.is).toHaveBeenCalledWith("conversation_id", null);
  });
});
