import { NextRequest } from "next/server";

import { DELETE, POST } from "../route";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;
const createServiceClientMock = createServiceClient as jest.MockedFunction<typeof createServiceClient>;

type QueryResult = {
  data: unknown;
  error: unknown;
};

function createQuery(result: QueryResult) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    then: jest.fn((resolve: (value: QueryResult) => void) => resolve(result)),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue(result);
  query.upsert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.delete.mockReturnValue(query);

  return query;
}

function setupAuth() {
  createClientMock.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "admin-auth-id", email: "admin@example.com" } },
        error: null,
      }),
    },
    from: jest.fn((table: string) => {
      if (table === "user_profiles") {
        return createQuery({ data: { is_admin: true }, error: null });
      }
      return createQuery({ data: null, error: null });
    }),
  } as never);
}

describe("/api/permissions/users/[personId]/project-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth();
  });

  it("adds project access for an existing person with a project template", async () => {
    const membershipQuery = createQuery({ data: null, error: null });

    createServiceClientMock.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "people") {
          return createQuery({ data: { id: "person-1" }, error: null });
        }
        if (table === "permission_templates") {
          return createQuery({
            data: { id: "template-1", name: "Project Manager", scope: "project" },
            error: null,
          });
        }
        if (table === "project_directory_memberships") {
          return membershipQuery;
        }
        return createQuery({ data: null, error: null });
      }),
    } as never);

    const response = await POST(
      new NextRequest("http://localhost/api/permissions/users/person-1/project-access", {
        method: "POST",
        body: JSON.stringify({
          project_id: 42,
          template_id: "11111111-1111-4111-8111-111111111111",
        }),
      }),
      { params: Promise.resolve({ personId: "person-1" }) },
    );

    expect(response.status).toBe(200);
    expect(membershipQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 42,
        person_id: "person-1",
        permission_template_id: "11111111-1111-4111-8111-111111111111",
        role: "Project Manager",
        status: "active",
      }),
      { onConflict: "project_id,person_id" },
    );
  });

  it("rejects company templates for project access", async () => {
    createServiceClientMock.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "people") {
          return createQuery({ data: { id: "person-1" }, error: null });
        }
        if (table === "permission_templates") {
          return createQuery({
            data: { id: "template-1", name: "Admin", scope: "company" },
            error: null,
          });
        }
        return createQuery({ data: null, error: null });
      }),
    } as never);

    const response = await POST(
      new NextRequest("http://localhost/api/permissions/users/person-1/project-access", {
        method: "POST",
        body: JSON.stringify({
          project_id: 42,
          template_id: "11111111-1111-4111-8111-111111111111",
        }),
      }),
      { params: Promise.resolve({ personId: "person-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual(expect.objectContaining({ success: false, error_code: "INVALID_PAYLOAD" }));
  });

  it("removes project access and scoped overrides", async () => {
    const membershipsUpdateQuery = createQuery({ data: null, error: null });
    const overridesDeleteQuery = createQuery({ data: null, error: null });

    createServiceClientMock.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "people") {
          return createQuery({ data: { id: "person-1" }, error: null });
        }
        if (table === "project_directory_memberships") {
          return membershipsUpdateQuery;
        }
        if (table === "user_granular_permission_overrides") {
          return overridesDeleteQuery;
        }
        return createQuery({ data: null, error: null });
      }),
    } as never);

    const response = await DELETE(
      new NextRequest("http://localhost/api/permissions/users/person-1/project-access", {
        method: "DELETE",
        body: JSON.stringify({ project_id: 42 }),
      }),
      { params: Promise.resolve({ personId: "person-1" }) },
    );

    expect(response.status).toBe(200);
    expect(membershipsUpdateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "inactive" }),
    );
    expect(membershipsUpdateQuery.eq).toHaveBeenCalledWith("person_id", "person-1");
    expect(membershipsUpdateQuery.eq).toHaveBeenCalledWith("project_id", 42);
    expect(overridesDeleteQuery.delete).toHaveBeenCalled();
    expect(overridesDeleteQuery.eq).toHaveBeenCalledWith("project_id", 42);
  });
});
