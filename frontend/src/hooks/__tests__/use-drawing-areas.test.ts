import { renderHook, act, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useDrawingAreas, useDrawingArea } from "../use-drawing-areas";
import { createClient } from "@/lib/supabase/client";

// Mock dependencies
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

const createClientMock = createClient as jest.Mock;
const toastMock = toast as jest.Mocked<typeof toast>;

describe("useDrawingAreas", () => {
  let supabaseMock: {
    from: jest.Mock;
    auth: { getUser: jest.Mock };
  };

  const mockAreas = [
    {
      id: "area-1",
      project_id: 1,
      name: "Architectural",
      description: "Architectural drawings",
      parent_area_id: null,
      sort_order: 0,
      drawing_count: 5,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      parentAreaId: null,
      sortOrder: 0,
      drawingCount: 5,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    },
    {
      id: "area-2",
      project_id: 1,
      name: "Structural",
      description: "Structural drawings",
      parent_area_id: "area-1",
      sort_order: 1,
      drawing_count: 3,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      parentAreaId: "area-1",
      sortOrder: 1,
      drawingCount: 3,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    supabaseMock = {
      from: jest.fn().mockReturnThis(),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    };

    // Setup chainable mock methods
    const chainableMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    supabaseMock.from.mockReturnValue(chainableMock);
    createClientMock.mockReturnValue(supabaseMock);

    // Default successful response
    chainableMock.select.mockReturnValue({
      ...chainableMock,
      eq: jest.fn().mockReturnValue({
        ...chainableMock,
        order: jest.fn().mockResolvedValue({
          data: mockAreas,
          error: null,
        }),
      }),
    });
  });

  describe("useDrawingAreas", () => {
    it("loads drawing areas on mount", async () => {
      const { result } = renderHook(() => useDrawingAreas("1"));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.areas).toEqual(mockAreas);
      expect(result.current.error).toBe(null);
      expect(supabaseMock.from).toHaveBeenCalledWith("drawing_areas_with_counts");
    });

    it("handles fetch error", async () => {
      const fetchError = new Error("Database connection failed");
      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: fetchError,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useDrawingAreas("1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe("Database connection failed");
      expect(toastMock.error).toHaveBeenCalledWith(
        "Failed to load drawing areas",
        { description: "Please try again." }
      );
    });

    it("does not fetch when projectId is empty", async () => {
      const { result } = renderHook(() => useDrawingAreas(""));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseMock.from).not.toHaveBeenCalled();
    });

    it("creates new area successfully", async () => {
      const newArea = {
        id: "area-3",
        project_id: 1,
        name: "MEP",
        description: "MEP drawings",
        parent_area_id: null,
        sort_order: 2,
        created_by: "user-1",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      supabaseMock.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newArea,
              error: null,
            }),
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [...mockAreas, newArea],
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useDrawingAreas("1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdArea: any;
      await act(async () => {
        createdArea = await result.current.createArea({
          name: "MEP",
          description: "MEP drawings",
        });
      });

      expect(createdArea).toEqual(newArea);
      expect(toastMock.success).toHaveBeenCalledWith(
        "Drawing area created",
        { description: '"MEP" has been created successfully.' }
      );
    });

    it("calculates sort order correctly for root areas", async () => {
      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: "new-area" },
            error: null,
          }),
        }),
      });

      supabaseMock.from.mockReturnValue({
        insert: insertMock,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockAreas,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useDrawingAreas("1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createArea({
          name: "New Root Area",
        });
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_order: 1, // Should be max(0) + 1
        })
      );
    });

    it("calculates sort order correctly for child areas", async () => {
      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: "new-area" },
            error: null,
          }),
        }),
      });

      supabaseMock.from.mockReturnValue({
        insert: insertMock,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockAreas,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useDrawingAreas("1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createArea({
          name: "New Child Area",
          parentAreaId: "area-1",
        });
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_order: 2, // Should be max(1) + 1 for children of area-1
          parent_area_id: "area-1",
        })
      );
    });

    it("updates area successfully", async () => {
      const updatedArea = {
        ...mockAreas[0],
        name: "Updated Name",
        updated_at: "2024-01-02",
      };

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedArea,
              error: null,
            }),
          }),
        }),
      });

      supabaseMock.from.mockReturnValue({
        update: updateMock,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [updatedArea, mockAreas[1]],
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useDrawingAreas("1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updated: any;
      await act(async () => {
        updated = await result.current.updateArea("area-1", {
          name: "Updated Name",
        });
      });

      expect(updated.name).toBe("Updated Name");
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
          updated_at: expect.any(String),
        })
      );
      expect(toastMock.success).toHaveBeenCalledWith(
        "Drawing area updated",
        { description: '"Updated Name" has been updated successfully.' }
      );
    });

    it("deletes area after checking constraints", async () => {
      // Mock constraint checks - no children or drawings
      const selectMock = jest.fn()
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [], // No children
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [], // No drawings
              error: null,
            }),
          }),
        });

      const deleteMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawing_areas") {
          return {
            select: selectMock,
            delete: deleteMock,
          };
        }
        if (table === "drawings") {
          return { select: selectMock };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockAreas.filter((a) => a.id !== "area-1"),
                error: null,
              }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useDrawingAreas("1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteArea("area-1");
      });

      expect(deleteMock).toHaveBeenCalled();
      expect(toastMock.success).toHaveBeenCalledWith(
        "Drawing area deleted",
        { description: "The area has been deleted successfully." }
      );
    });

    it("prevents deleting area with children", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: "child-area" }], // Has children
            error: null,
          }),
        }),
      });

      supabaseMock.from.mockReturnValue({
        select: selectMock,
      });

      const { result } = renderHook(() => useDrawingAreas("1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.deleteArea("area-1");
        })
      ).rejects.toThrow(
        "Cannot delete area that contains sub-areas. Please delete or move sub-areas first."
      );

      expect(toastMock.error).toHaveBeenCalledWith(
        "Failed to delete area",
        {
          description:
            "Cannot delete area that contains sub-areas. Please delete or move sub-areas first.",
        }
      );
    });

    it("prevents deleting area with drawings", async () => {
      let selectCallCount = 0;
      const selectMock = jest.fn().mockImplementation(() => ({
        eq: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: selectCallCount++ === 0 ? [] : [{ id: "drawing-1" }], // No children, but has drawings
            error: null,
          }),
        }),
      }));

      supabaseMock.from.mockReturnValue({
        select: selectMock,
      });

      const { result } = renderHook(() => useDrawingAreas("1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.deleteArea("area-1");
        })
      ).rejects.toThrow(
        "Cannot delete area that contains drawings. Please delete or move drawings first."
      );
    });

    it("reorders areas correctly", async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      supabaseMock.from.mockReturnValue({
        update: updateMock,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockAreas,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useDrawingAreas("1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.reorderAreas("area-2", "area-1", "inside");
      });

      expect(updateMock).toHaveBeenCalledWith({
        parent_area_id: "area-1",
        sort_order: 0, // First child of area-1
      });

      expect(toastMock.success).toHaveBeenCalledWith(
        "Drawing areas reordered",
        { description: "The area has been moved successfully." }
      );
    });
  });

  describe("useDrawingArea", () => {
    it("fetches single area by ID", async () => {
      const singleMock = jest.fn().mockResolvedValue({
        data: mockAreas[0],
        error: null,
      });

      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      });

      const { result } = renderHook(() => useDrawingArea("area-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.area).toEqual(mockAreas[0]);
      expect(result.current.error).toBe(null);
      expect(singleMock).toHaveBeenCalled();
    });

    it("handles fetch error for single area", async () => {
      const fetchError = new Error("Area not found");
      supabaseMock.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: fetchError,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useDrawingArea("area-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.area).toBe(null);
      expect(result.current.error?.message).toBe("Area not found");
    });

    it("does not fetch when areaId is empty", async () => {
      const { result } = renderHook(() => useDrawingArea(""));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseMock.from).not.toHaveBeenCalled();
    });
  });
});