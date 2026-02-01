import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { createClient } from "@/lib/supabase/server";

// Mock dependencies
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const createClientMock = createClient as jest.Mock;

describe("Drawings API Routes", () => {
  let supabaseMock: {
    auth: { getUser: jest.Mock };
    from: jest.Mock;
  };

  const mockDrawingsData = [
    {
      id: "drawing-1",
      project_id: 1,
      drawing_number: "A-101",
      title: "First Floor Plan",
      revision_number: "B",
      discipline: "Architectural",
      drawing_type: "Plan",
      status: "approved",
      drawing_date: "2024-01-15",
      received_date: "2024-01-16",
      area_name: "Level 1",
      set_name: "Construction Documents",
      file_name: "A-101-Rev-B.pdf",
      file_size: 2048000,
      file_type: "application/pdf",
      uploaded_by_email: "john@example.com",
    },
    {
      id: "drawing-2",
      project_id: 1,
      drawing_number: "S-201",
      title: "Foundation Plan",
      revision_number: "A",
      discipline: "Structural",
      drawing_type: "Plan",
      status: "under_review",
      drawing_date: "2024-01-10",
      received_date: "2024-01-11",
      area_name: "Foundation",
      set_name: "Structural Drawings",
      file_name: "S-201-Rev-A.pdf",
      file_size: 3072000,
      file_type: "application/pdf",
      uploaded_by_email: "jane@example.com",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    supabaseMock = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn(),
    };

    createClientMock.mockResolvedValue(supabaseMock);
  });

  describe("GET /api/projects/[projectId]/drawings", () => {
    beforeEach(() => {
      // Setup default successful query chain
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };

      supabaseMock.from.mockReturnValue(mockQueryChain);

      // Default successful query response
      mockQueryChain.range.mockResolvedValue({
        data: mockDrawingsData,
        error: null,
        count: 2,
      });
    });

    it("returns drawings with pagination for authenticated user", async () => {
      const request = new NextRequest("http://localhost/api/projects/1/drawings");
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockDrawingsData);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });
    });

    it("returns 401 for unauthenticated user", async () => {
      supabaseMock.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      const request = new NextRequest("http://localhost/api/projects/1/drawings");
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("applies search filter correctly", async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
      };

      supabaseMock.from.mockReturnValue(mockQueryChain);
      mockQueryChain.range.mockResolvedValue({
        data: [mockDrawingsData[0]],
        error: null,
        count: 1,
      });

      const request = new NextRequest(
        "http://localhost/api/projects/1/drawings?search=A-101"
      );
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await GET(request, context);

      expect(mockQueryChain.or).toHaveBeenCalledWith(
        "drawing_number.ilike.%A-101%,title.ilike.%A-101%"
      );
      expect(response.status).toBe(200);
    });

    it("applies discipline filter correctly", async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
      };

      supabaseMock.from.mockReturnValue(mockQueryChain);
      mockQueryChain.range.mockResolvedValue({
        data: [mockDrawingsData[0]],
        error: null,
        count: 1,
      });

      const request = new NextRequest(
        "http://localhost/api/projects/1/drawings?discipline=Architectural"
      );
      const context = { params: Promise.resolve({ projectId: "1" }) };

      await GET(request, context);

      expect(mockQueryChain.eq).toHaveBeenCalledWith("discipline", "Architectural");
    });

    it("applies multiple filters correctly", async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };

      supabaseMock.from.mockReturnValue(mockQueryChain);
      mockQueryChain.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      const request = new NextRequest(
        "http://localhost/api/projects/1/drawings?discipline=Structural&status=approved&dateFrom=2024-01-01&dateTo=2024-01-31"
      );
      const context = { params: Promise.resolve({ projectId: "1" }) };

      await GET(request, context);

      expect(mockQueryChain.eq).toHaveBeenCalledWith("discipline", "Structural");
      expect(mockQueryChain.eq).toHaveBeenCalledWith("status", "approved");
      expect(mockQueryChain.gte).toHaveBeenCalledWith("received_date", "2024-01-01");
      expect(mockQueryChain.lte).toHaveBeenCalledWith("received_date", "2024-01-31");
    });

    it("handles pagination parameters correctly", async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
      };

      supabaseMock.from.mockReturnValue(mockQueryChain);
      mockQueryChain.range.mockResolvedValue({
        data: mockDrawingsData,
        error: null,
        count: 100,
      });

      const request = new NextRequest(
        "http://localhost/api/projects/1/drawings?page=2&limit=25"
      );
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(mockQueryChain.range).toHaveBeenCalledWith(25, 49); // page 2, limit 25
      expect(data.pagination).toEqual({
        page: 2,
        limit: 25,
        total: 100,
        totalPages: 4,
      });
    });

    it("returns 400 for invalid filter parameters", async () => {
      const request = new NextRequest(
        "http://localhost/api/projects/1/drawings?discipline=InvalidDiscipline"
      );
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid filters");
      expect(data.details).toBeDefined();
    });

    it("handles database errors gracefully", async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
      };

      supabaseMock.from.mockReturnValue(mockQueryChain);
      mockQueryChain.range.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
        count: null,
      });

      const request = new NextRequest("http://localhost/api/projects/1/drawings");
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Database connection failed");
    });

    it("handles unexpected errors with 500 status", async () => {
      supabaseMock.from.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const request = new NextRequest("http://localhost/api/projects/1/drawings");
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("queries drawing_log table with correct project filter", async () => {
      const request = new NextRequest("http://localhost/api/projects/1/drawings");
      const context = { params: Promise.resolve({ projectId: "1" }) };

      await GET(request, context);

      expect(supabaseMock.from).toHaveBeenCalledWith("drawing_log");
    });

    it("orders results by drawing_updated_at descending", async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
      };

      supabaseMock.from.mockReturnValue(mockQueryChain);
      mockQueryChain.range.mockResolvedValue({
        data: mockDrawingsData,
        error: null,
        count: 2,
      });

      const request = new NextRequest("http://localhost/api/projects/1/drawings");
      const context = { params: Promise.resolve({ projectId: "1" }) };

      await GET(request, context);

      expect(mockQueryChain.order).toHaveBeenCalledWith("drawing_updated_at", {
        ascending: false,
      });
    });
  });

  describe("POST /api/projects/[projectId]/drawings", () => {
    beforeEach(() => {
      // Setup default successful query responses
      const mockSelectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null, // No existing drawing
          error: null,
        }),
      };

      const mockInsertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: "new-drawing-1",
            project_id: 1,
            drawing_number: "A-102",
            title: "Second Floor Plan",
            created_by: "user-1",
          },
          error: null,
        }),
      };

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            insert: jest.fn().mockReturnValue(mockInsertChain),
          };
        }
        return {};
      });
    });

    it("creates new drawing with valid data", async () => {
      const drawingData = {
        drawingNumber: "A-102",
        title: "Second Floor Plan",
        discipline: "Architectural",
        drawingType: "Plan",
        areaId: "area-1",
      };

      const request = new NextRequest("http://localhost/api/projects/1/drawings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(drawingData),
      });
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.drawing_number).toBe("A-102");
      expect(data.title).toBe("Second Floor Plan");
    });

    it("returns 401 for unauthenticated user", async () => {
      supabaseMock.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      const request = new NextRequest("http://localhost/api/projects/1/drawings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          drawingNumber: "A-102",
          title: "Second Floor Plan",
        }),
      });
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when drawing number is missing", async () => {
      const request = new NextRequest("http://localhost/api/projects/1/drawings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Second Floor Plan",
        }),
      });
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Drawing number and title are required");
    });

    it("returns 400 when title is missing", async () => {
      const request = new NextRequest("http://localhost/api/projects/1/drawings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          drawingNumber: "A-102",
        }),
      });
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Drawing number and title are required");
    });

    it("returns 409 when drawing number already exists", async () => {
      const mockSelectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: "existing-drawing" }], // Existing drawing found
          error: null,
        }),
      };

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
          };
        }
        return {};
      });

      const request = new NextRequest("http://localhost/api/projects/1/drawings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          drawingNumber: "A-101", // Duplicate number
          title: "Another Floor Plan",
        }),
      });
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Drawing number already exists in this project");
    });

    it("handles database insert errors", async () => {
      const mockSelectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      const mockInsertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        }),
      };

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            insert: jest.fn().mockReturnValue(mockInsertChain),
          };
        }
        return {};
      });

      const request = new NextRequest("http://localhost/api/projects/1/drawings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          drawingNumber: "A-102",
          title: "Second Floor Plan",
        }),
      });
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Insert failed");
    });

    it("includes optional fields in insert when provided", async () => {
      const mockInsertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "new-drawing" },
          error: null,
        }),
      };

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            select: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            insert: jest.fn().mockReturnValue(mockInsertChain),
          };
        }
        return {};
      });

      const drawingData = {
        drawingNumber: "M-101",
        title: "HVAC Plan",
        discipline: "Mechanical",
        drawingType: "Plan",
        areaId: "area-2",
      };

      const request = new NextRequest("http://localhost/api/projects/1/drawings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(drawingData),
      });
      const context = { params: Promise.resolve({ projectId: "1" }) };

      await POST(request, context);

      expect(mockInsertChain.insert).toHaveBeenCalledWith({
        project_id: 1,
        area_id: "area-2",
        drawing_number: "M-101",
        title: "HVAC Plan",
        discipline: "Mechanical",
        drawing_type: "Plan",
        created_by: "user-1",
      });
    });

    it("handles null optional fields correctly", async () => {
      const mockInsertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "new-drawing" },
          error: null,
        }),
      };

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            select: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            insert: jest.fn().mockReturnValue(mockInsertChain),
          };
        }
        return {};
      });

      const drawingData = {
        drawingNumber: "A-103",
        title: "Third Floor Plan",
        // No optional fields
      };

      const request = new NextRequest("http://localhost/api/projects/1/drawings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(drawingData),
      });
      const context = { params: Promise.resolve({ projectId: "1" }) };

      await POST(request, context);

      expect(mockInsertChain.insert).toHaveBeenCalledWith({
        project_id: 1,
        area_id: null,
        drawing_number: "A-103",
        title: "Third Floor Plan",
        discipline: null,
        drawing_type: null,
        created_by: "user-1",
      });
    });

    it("handles unexpected errors with 500 status", async () => {
      supabaseMock.from.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const request = new NextRequest("http://localhost/api/projects/1/drawings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          drawingNumber: "A-102",
          title: "Second Floor Plan",
        }),
      });
      const context = { params: Promise.resolve({ projectId: "1" }) };

      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("correctly parses projectId as integer", async () => {
      const mockInsertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "new-drawing" },
          error: null,
        }),
      };

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            select: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            insert: jest.fn().mockReturnValue(mockInsertChain),
          };
        }
        return {};
      });

      const request = new NextRequest("http://localhost/api/projects/42/drawings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          drawingNumber: "A-102",
          title: "Second Floor Plan",
        }),
      });
      const context = { params: Promise.resolve({ projectId: "42" }) };

      await POST(request, context);

      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 42, // Should be integer, not string
        })
      );
    });
  });
});