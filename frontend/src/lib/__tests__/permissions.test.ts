import { createClient } from "@/lib/supabase/server";
import { assignPermissionTemplate, loadUserPermissions } from "@/lib/permissions";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: jest.fn(),
  getIsAdmin: jest.fn(async () => false),
}));

const createClientMock = createClient as jest.Mock;

function createQuery(result: unknown) {
  const query: Record<string, jest.Mock | ((resolve: (value: unknown) => unknown) => Promise<unknown>)> = {};
  for (const method of ["select", "eq", "update", "insert"]) {
    query[method] = jest.fn(() => query);
  }
  query.maybeSingle = jest.fn(async () => result);
  return query;
}

describe("assignPermissionTemplate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects company templates before updating a project membership", async () => {
    const updateQuery = createQuery({ data: null, error: null });
    const from = jest.fn((table: string) => {
      if (table === "permission_templates") {
        return createQuery({ data: { scope: "company" }, error: null });
      }
      if (table === "project_directory_memberships") {
        return updateQuery;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: "admin-1" } } })),
      },
      from,
    });

    const result = await assignPermissionTemplate(67, "person-1", "company-template-1");

    expect(result).toEqual({
      success: false,
      error: "Project access requires a project permission template.",
    });
    expect(from).toHaveBeenCalledWith("permission_templates");
    expect(from).not.toHaveBeenCalledWith("project_directory_memberships");
  });

  it("updates the project membership when the template is project-scoped", async () => {
    const updateQuery = createQuery({ data: null, error: null });
    const insertQuery = createQuery({ data: null, error: null });
    const from = jest.fn((table: string) => {
      if (table === "permission_templates") {
        return createQuery({ data: { scope: "project" }, error: null });
      }
      if (table === "project_directory_memberships") {
        return updateQuery;
      }
      if (table === "permission_audit_log") {
        return insertQuery;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: "admin-1" } } })),
      },
      from,
    });

    const result = await assignPermissionTemplate(67, "person-1", "project-template-1");

    expect(result).toEqual({ success: true });
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ permission_template_id: "project-template-1" }),
    );
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "assign_template",
        person_id: "person-1",
        project_id: 67,
        template_id: "project-template-1",
      }),
    );
  });
});

describe("loadUserPermissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows app admins from user_profiles when the JWT admin claim is stale", async () => {
    const from = jest.fn((table: string) => {
      if (table === "user_profiles") {
        return createQuery({ data: { is_admin: true }, error: null });
      }
      if (table === "users_auth") {
        return createQuery({ data: null, error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    createClientMock.mockResolvedValue({
      from,
    });

    const result = await loadUserPermissions(761, "admin-auth-user");

    expect(result).toEqual(
      expect.objectContaining({
        userId: "admin-auth-user",
        personId: "admin-auth-user",
        projectId: 761,
        isAdmin: true,
      }),
    );
    expect(result?.overrides.budget).toBe("none");
    expect(from).not.toHaveBeenCalledWith("project_directory_memberships");
    expect(from).not.toHaveBeenCalledWith("user_module_permissions");
  });
});
