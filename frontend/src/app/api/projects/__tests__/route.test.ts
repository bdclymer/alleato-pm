import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { mockProject } from "@/test-utils/mocks";
import { getApiRouteUser } from "@/lib/supabase/server";

const mockGetApiRouteUser = getApiRouteUser as jest.MockedFunction<typeof getApiRouteUser>;

// Create a thenable mock that can be both chained and awaited
const createMockQuery = (resolveValue: {
  data: unknown;
  error: unknown;
  count: unknown;
}) => {
  // Create a base object that is thenable
  const mockObj = {
    from: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
    ilike: jest.fn(),
    not: jest.fn(),
    or: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    // Make the object thenable so it can be awaited
    then: jest.fn((resolve: (value: unknown) => void) => resolve(resolveValue)),
  };

  // Make all methods chainable and return the mock itself
  Object.keys(mockObj).forEach((key) => {
    if (key !== "then") {
      (mockObj as Record<string, jest.Mock>)[key].mockReturnValue(mockObj);
    }
  });

  return mockObj;
};

type MockQuery = ReturnType<typeof createMockQuery>;
let mockServiceClient: any;

// Mock auth client
const mockAuthClient = {
  auth: {
    getUser: jest.fn(() => Promise.resolve({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    })),
  },
};

// Mock Supabase
jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(() => mockServiceClient),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(mockAuthClient)),
  getApiRouteUser: jest.fn(() => Promise.resolve({ id: 'test-user-id', email: 'test@example.com' })),
}));

describe("/api/projects", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth mock
    mockGetApiRouteUser.mockResolvedValue({ id: 'test-user-id', email: 'test@example.com' });
  });

  describe("GET", () => {
    it("returns projects with default pagination", async () => {
      // Setup mock service client with different responses for different tables
      mockServiceClient = {
        from: jest.fn((table: string) => {
          if (table === "users_auth") {
            return createMockQuery({
              data: { person_id: "person-123" },
              error: null,
              count: null,
            });
          }
          if (table === "user_profiles") {
            return createMockQuery({
              data: { is_admin: false },
              error: null,
              count: null,
            });
          }
          if (table === "project_directory_memberships") {
            return createMockQuery({
              data: [{ project_id: 1 }],
              error: null,
              count: null,
            });
          }
          if (table === "projects") {
            return createMockQuery({
              data: [mockProject],
              error: null,
              count: 1,
            });
          }
          return createMockQuery({ data: null, error: null, count: null });
        })
      };

      const request = new NextRequest("http://localhost:3000/api/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        data: [mockProject],
        meta: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
          isAdmin: false,
        },
      });

      expect(mockServiceClient.from).toHaveBeenCalledWith("projects");
    });

    it("handles pagination parameters", async () => {
      mockServiceClient = {
        from: jest.fn((table: string) => {
          if (table === "users_auth") {
            return createMockQuery({
              data: { person_id: "person-123" },
              error: null,
              count: null,
            });
          }
          if (table === "user_profiles") {
            return createMockQuery({
              data: { is_admin: false },
              error: null,
              count: null,
            });
          }
          if (table === "project_directory_memberships") {
            return createMockQuery({
              data: [{ project_id: 1 }],
              error: null,
              count: null,
            });
          }
          if (table === "projects") {
            return createMockQuery({
              data: [mockProject],
              error: null,
              count: 50,
            });
          }
          return createMockQuery({ data: null, error: null, count: null });
        })
      };

      const request = new NextRequest(
        "http://localhost:3000/api/projects?page=2&limit=20"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
        isAdmin: false,
      });
    });

    it("handles search parameter", async () => {
      mockServiceClient = {
        from: jest.fn((table: string) => {
          if (table === "users_auth") {
            return createMockQuery({
              data: { person_id: "person-123" },
              error: null,
              count: null,
            });
          }
          if (table === "user_profiles") {
            return createMockQuery({
              data: { is_admin: false },
              error: null,
              count: null,
            });
          }
          if (table === "projects") {
            const mockQuery = createMockQuery({
              data: [mockProject],
              error: null,
              count: 1,
            });
            return mockQuery;
          }
          return createMockQuery({ data: null, error: null, count: null });
        })
      };

      const request = new NextRequest(
        "http://localhost:3000/api/projects?search=test"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("handles database errors", async () => {
      mockServiceClient = {
        from: jest.fn((table: string) => {
          if (table === "users_auth") {
            return createMockQuery({
              data: { person_id: "person-123" },
              error: null,
              count: null,
            });
          }
          if (table === "user_profiles") {
            return createMockQuery({
              data: { is_admin: false },
              error: null,
              count: null,
            });
          }
          if (table === "project_directory_memberships") {
            return createMockQuery({
              data: [{ project_id: 1 }],
              error: null,
              count: null,
            });
          }
          if (table === "projects") {
            return createMockQuery({
              data: null,
              error: { message: "Database error" },
              count: null,
            });
          }
          return createMockQuery({ data: null, error: null, count: null });
        })
      };

      const request = new NextRequest("http://localhost:3000/api/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual(expect.objectContaining({ success: false, error_code: "INTERNAL_ERROR" }));
    });

    it("handles unexpected errors", async () => {
      mockServiceClient = {
        from: jest.fn(() => {
          throw new Error("Unexpected error");
        })
      };

      const request = new NextRequest("http://localhost:3000/api/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual(expect.objectContaining({ success: false, error_code: "INTERNAL_ERROR" }));
    });

    it("returns 401 when user is not authenticated", async () => {
      mockGetApiRouteUser.mockResolvedValueOnce(null);

      const request = new NextRequest("http://localhost:3000/api/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual(expect.objectContaining({ error_code: "AUTH_EXPIRED" }));
    });
  });

  /**
   * Helper: build a service client mock that properly routes table calls for POST /api/projects.
   * The route calls: users_auth → permission_templates → projects (insert) → project_directory_memberships (insert)
   */
  function buildPostMockServiceClient(
    projectData: Record<string, unknown>,
    projectId = 2,
    captureInsert?: (data: Record<string, unknown>) => void,
  ) {
    return {
      from: jest.fn((table: string) => {
        if (table === "users_auth") {
          return createMockQuery({ data: { person_id: "person-1" }, error: null, count: null });
        }
        if (table === "user_profiles") {
          return createMockQuery({ data: { is_admin: false }, error: null, count: null });
        }
        if (table === "permission_templates") {
          return createMockQuery({ data: { id: "admin-template-id" }, error: null, count: null });
        }
        if (table === "projects") {
          const q = createMockQuery({ data: { ...projectData, id: projectId, phase: projectData.phase ?? "Current" }, error: null, count: null });
          if (captureInsert) {
            q.insert = jest.fn((data) => { captureInsert(data as Record<string, unknown>); return q; });
          }
          return q;
        }
        if (table === "project_directory_memberships") {
          return createMockQuery({ data: null, error: null, count: null });
        }
        return createMockQuery({ data: null, error: null, count: null });
      }),
    };
  }

  describe("POST", () => {
    it("creates a new project successfully", async () => {
      const newProject = {
        name: "New Project",
        client: "New Client",
        state: "pre-construction",
      };

      mockServiceClient = buildPostMockServiceClient(newProject, 2);

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify(newProject),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({ ...newProject, id: 2, phase: "Current" });

      expect(mockServiceClient.from).toHaveBeenCalledWith("projects");
    });

    it("sets phase to 'Current' by default when not provided", async () => {
      const newProject = {
        name: "New Project",
        client: "New Client",
      };

      let insertedData: Record<string, unknown> | null = null;
      mockServiceClient = buildPostMockServiceClient(newProject, 3, (data) => { insertedData = data; });

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify(newProject),
      });

      await POST(request);

      expect(insertedData).toHaveProperty("phase", "Current");
    });

    it("normalizes blank date fields to null", async () => {
      const newProject = {
        name: "New Project",
        "start date": "",
        "est completion": "",
      };

      let insertedData: Record<string, unknown> | null = null;
      mockServiceClient = buildPostMockServiceClient(newProject, 5, (data) => { insertedData = data; });

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify(newProject),
      });

      await POST(request);

      expect(insertedData).toHaveProperty("start date", null);
      expect(insertedData).toHaveProperty("est completion", null);
    });

    it("allows overriding the default phase", async () => {
      const newProject = {
        name: "New Project",
        phase: "planning",
      };

      let insertedData: Record<string, unknown> | null = null;
      mockServiceClient = buildPostMockServiceClient(newProject, 4, (data) => { insertedData = data; });

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify(newProject),
      });

      await POST(request);

      expect(insertedData).toHaveProperty("phase", "planning");
    });

    it("handles creation errors when prerequisites are missing", async () => {
      mockServiceClient = {
        from: jest.fn(() => createMockQuery({
          data: null,
          error: { message: "Duplicate project name" },
          count: null,
        }))
      };

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Duplicate" }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Route throws PRECONDITION_FAILED when authLink lookup fails
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data).toEqual(expect.objectContaining({ success: false }));
    });

    it("handles invalid JSON", async () => {
      mockServiceClient = {
        from: jest.fn(() => createMockQuery({
          data: null,
          error: null,
          count: null
        }))
      };

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(request);
      const data = await response.json();

      // parseJsonBody throws INVALID_PAYLOAD (400) for malformed JSON
      expect(response.status).toBe(400);
      expect(data).toEqual(expect.objectContaining({ success: false }));
    });

    it("returns 401 when user is not authenticated", async () => {
      mockGetApiRouteUser.mockResolvedValueOnce(null);

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual(expect.objectContaining({ error_code: "AUTH_EXPIRED" }));
    });
  });
});
