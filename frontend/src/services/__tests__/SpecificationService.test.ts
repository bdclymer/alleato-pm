import { SpecificationService } from "../SpecificationService";
import { createClient } from "@/lib/supabase/server";

// Mock Supabase client
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

describe("SpecificationService", () => {
  let service: SpecificationService;
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn(),
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn(),
        remove: jest.fn(),
      },
    };

    (createClient as any).mockResolvedValue(mockSupabase);
    service = new SpecificationService();
  });

  describe("list", () => {
    it("should list specifications with filters", async () => {
      const mockData = [
        {
          id: 1,
          section_number: "03 30 00",
          title: "Cast-in-Place Concrete",
          status: "active",
          project_id: 31,
        },
      ];

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.list(31, {
        search: "concrete",
        status: "active",
        page: 1,
        page_size: 25,
      });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().data).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith("specification_sections");
      expect(mockSupabase.ilike).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalled();
    });

    it("should handle pagination correctly", async () => {
      mockSupabase.single.mockResolvedValue({ data: [], error: null });

      await service.list(31, {
        page: 2,
        page_size: 10,
      });

      expect(mockSupabase.range).toHaveBeenCalledWith(10, 19);
    });

    it("should return error on database failure", async () => {
      const mockError = { message: "Database error", code: "42P01" };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      const result = await service.list(31, {});

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain("Failed to fetch specifications");
    });
  });

  describe("getById", () => {
    it("should fetch a single specification by ID", async () => {
      const mockSpec = {
        id: 1,
        section_number: "03 30 00",
        title: "Cast-in-Place Concrete",
        status: "active",
        project_id: 31,
      };

      mockSupabase.single.mockResolvedValue({ data: mockSpec, error: null });

      const result = await service.getById(31, "1");

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockSpec);
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", 1);
      expect(mockSupabase.eq).toHaveBeenCalledWith("project_id", 31);
    });

    it("should return error when specification not found", async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await service.getById(31, "999");

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe("NOT_FOUND");
    });
  });

  describe("create", () => {
    it("should create a specification with file upload", async () => {
      const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
      const mockData = {
        file: mockFile,
        section_number: "03 30 00",
        title: "Test Spec",
        description: "Test Description",
        notes: "Initial upload",
        area_ids: [],
        subscriber_ids: [],
      };

      // Mock file upload
      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: "specs/test.pdf" },
        error: null,
      });

      // Mock specification creation
      mockSupabase.single.mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      // Mock revision creation via RPC
      mockSupabase.rpc.mockResolvedValue({
        data: { id: 1, revision_number: 1 },
        error: null,
      });

      const result = await service.create("31", mockData, "user-123");

      expect(result.isOk()).toBe(true);
      expect(mockSupabase.storage.upload).toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "create_specification_revision",
        expect.objectContaining({
          p_file_name: "test.pdf",
          p_file_type: "application/pdf",
          p_uploaded_by: "user-123",
        })
      );
    });

    it("should reject files that are too large", async () => {
      const largeFile = new File(["x".repeat(51 * 1024 * 1024)], "large.pdf", {
        type: "application/pdf",
      });

      const result = await service.create(
        "31",
        {
          file: largeFile,
          section_number: "03 30 00",
          title: "Test",
          description: "",
          notes: "",
          area_ids: [],
          subscriber_ids: [],
        },
        "user-123"
      );

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe("VALIDATION_ERROR");
      expect(result.unwrapErr().message).toContain("50MB");
    });

    it("should reject non-PDF files", async () => {
      const wrongFile = new File(["content"], "test.txt", { type: "text/plain" });

      const result = await service.create(
        "31",
        {
          file: wrongFile,
          section_number: "03 30 00",
          title: "Test",
          description: "",
          notes: "",
          area_ids: [],
          subscriber_ids: [],
        },
        "user-123"
      );

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe("VALIDATION_ERROR");
      expect(result.unwrapErr().message).toContain("PDF");
    });

    it("should check for duplicate section numbers", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { count: 1 },
        error: null,
      });

      const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });

      const result = await service.create(
        "31",
        {
          file: mockFile,
          section_number: "03 30 00",
          title: "Test",
          description: "",
          notes: "",
          area_ids: [],
          subscriber_ids: [],
        },
        "user-123"
      );

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe("DUPLICATE");
    });
  });

  describe("update", () => {
    it("should update specification metadata", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 1, title: "Updated Title" },
        error: null,
      });

      const result = await service.update("31", "1", {
        title: "Updated Title",
        description: "Updated Description",
        status: "active",
      });

      expect(result.isOk()).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", 1);
    });

    it("should not allow updating to duplicate section number", async () => {
      // First call: check for duplicate
      mockSupabase.single
        .mockResolvedValueOnce({ data: { count: 1 }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const result = await service.update("31", "1", {
        section_number: "03 30 00",
      });

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe("DUPLICATE");
    });
  });

  describe("delete", () => {
    it("should delete specification and its files", async () => {
      // Mock get specification
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 1,
          revisions: [
            { id: 1, file_url: "specs/file1.pdf" },
            { id: 2, file_url: "specs/file2.pdf" },
          ],
        },
        error: null,
      });

      // Mock storage remove
      mockSupabase.storage.remove.mockResolvedValue({ data: [], error: null });

      // Mock database delete
      mockSupabase.eq.mockReturnThis();
      mockSupabase.delete.mockResolvedValue({ error: null });

      const result = await service.delete("31", "1");

      expect(result.isOk()).toBe(true);
      expect(mockSupabase.storage.remove).toHaveBeenCalledWith(
        expect.arrayContaining(["file1.pdf", "file2.pdf"])
      );
      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    it("should return error when specification not found", async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await service.delete("31", "999");

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe("NOT_FOUND");
    });
  });

  describe("search", () => {
    it("should search specifications by text", async () => {
      const mockResults = [
        { id: 1, section_number: "03 30 00", title: "Concrete" },
        { id: 2, section_number: "03 31 00", title: "Concrete Formwork" },
      ];

      mockSupabase.single.mockResolvedValue({ data: mockResults, error: null });

      const result = await service.search(31, "concrete");

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockResults);
      expect(mockSupabase.ilike).toHaveBeenCalled();
    });
  });

  describe("linkToArea", () => {
    it("should link specification to area", async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: 1 }, error: null });

      const result = await service.linkToArea(1, 5);

      expect(result.isOk()).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        section_id: 1,
        area_id: 5,
      });
    });

    it("should handle duplicate link attempts gracefully", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "23505" }, // Unique violation
      });

      const result = await service.linkToArea(1, 5);

      expect(result.isOk()).toBe(true); // Should succeed silently
    });
  });

  describe("unlinkFromArea", () => {
    it("should unlink specification from area", async () => {
      mockSupabase.delete.mockResolvedValue({ error: null });

      const result = await service.unlinkFromArea(1, 5);

      expect(result.isOk()).toBe(true);
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith("section_id", 1);
      expect(mockSupabase.eq).toHaveBeenCalledWith("area_id", 5);
    });
  });
});
