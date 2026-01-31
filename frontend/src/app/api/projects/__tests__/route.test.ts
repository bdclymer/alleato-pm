import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { mockProject } from "@/test-utils/mocks";

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
}));

describe("/api/projects", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth mock
    mockAuthClient.auth.getUser.mockClear();
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    });
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
          pageSize: 10,
          totalCount: 1,
          totalPages: 1,
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
        "http://localhost:3000/api/projects?page=2&pageSize=20"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta).toEqual({
        page: 2,
        pageSize: 20,
        totalCount: 50,
        totalPages: 3,
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
        from: jest.fn(() => createMockQuery({
          data: null,
          error: { message: "Database error" },
          count: null,
        }))
      };

      const request = new NextRequest("http://localhost:3000/api/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "An unexpected error occurred. Please try again." });
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
      expect(data).toEqual({ error: "An unexpected error occurred. Please try again." });
    });

    it("returns 401 when user is not authenticated", async () => {
      mockAuthClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      });

      const request = new NextRequest("http://localhost:3000/api/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });
  });

  describe("POST", () => {
    it("creates a new project successfully", async () => {
      const newProject = {
        name: "New Project",
        client: "New Client",
        state: "pre-construction",
      };

      mockServiceClient = {
        from: jest.fn(() => createMockQuery({
          data: { ...newProject, id: 2 },
          error: null,
          count: null,
        }))
      };

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify(newProject),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({ ...newProject, id: 2 });

      expect(mockServiceClient.from).toHaveBeenCalledWith("projects");
    });

    it("handles creation errors", async () => {
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

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "An unexpected error occurred. Please try again." });
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

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "An unexpected error occurred. Please try again." });
    });

    it("returns 401 when user is not authenticated", async () => {
      mockAuthClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      });

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });
  });
});