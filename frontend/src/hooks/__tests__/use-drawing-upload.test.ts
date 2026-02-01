import { renderHook, act, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useDrawingUpload } from "../use-drawing-upload";
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

describe("useDrawingUpload", () => {
  let supabaseMock: {
    from: jest.Mock;
    storage: { from: jest.Mock };
    auth: { getUser: jest.Mock };
  };

  const mockDrawing = {
    id: "drawing-1",
    project_id: 1,
    area_id: "area-1",
    drawing_number: "A101",
    title: "Floor Plan",
    discipline: "Architectural",
    drawing_type: "Plan",
    created_by: "user-1",
  };

  const mockRevision = {
    id: "revision-1",
    drawing_id: "drawing-1",
    revision_number: "A",
    status: "under_review",
    file_url: "drawings/projects/1/drawing-1/1234567890_test.pdf",
    file_name: "test.pdf",
    file_size: 1024000,
    file_type: "application/pdf",
    is_current_revision: true,
    uploaded_by: "user-1",
  };

  const mockFile = new File(["mock pdf content"], "test.pdf", {
    type: "application/pdf",
    lastModified: Date.now(),
  });

  Object.defineProperty(mockFile, "size", {
    value: 1024000, // 1MB
    writable: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    supabaseMock = {
      from: jest.fn(),
      storage: {
        from: jest.fn(),
      },
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    };

    createClientMock.mockReturnValue(supabaseMock);
  });

  describe("file validation", () => {
    it("accepts valid PDF file", async () => {
      const { result } = renderHook(() => useDrawingUpload("1"));

      // Setup successful upload mock
      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockDrawing,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "drawing_revisions") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockRevision,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      supabaseMock.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: "drawings/projects/1/drawing-1/1234567890_test.pdf" },
          error: null,
        }),
      });

      await act(async () => {
        const revision = await result.current.uploadDrawing(mockFile, {
          drawingNumber: "A101",
          title: "Floor Plan",
          receivedDate: "2024-01-01",
        });
        expect(revision).toEqual(mockRevision);
      });

      expect(toastMock.success).toHaveBeenCalledWith("Drawing uploaded successfully");
    });

    it("rejects invalid file type", async () => {
      const invalidFile = new File(["mock content"], "test.txt", {
        type: "text/plain",
      });

      const { result } = renderHook(() => useDrawingUpload("1"));

      await expect(
        act(async () => {
          await result.current.uploadDrawing(invalidFile, {
            drawingNumber: "A101",
            title: "Floor Plan",
            receivedDate: "2024-01-01",
          });
        })
      ).rejects.toThrow("File type not allowed. Please upload PDF, PNG, JPEG, or TIFF files.");
    });

    it("rejects file that is too large", async () => {
      const largeFile = new File(["mock content"], "large.pdf", {
        type: "application/pdf",
      });

      // Mock file size to be over 500MB
      Object.defineProperty(largeFile, "size", {
        value: 501 * 1024 * 1024, // 501MB
        writable: false,
      });

      const { result } = renderHook(() => useDrawingUpload("1"));

      await expect(
        act(async () => {
          await result.current.uploadDrawing(largeFile, {
            drawingNumber: "A101",
            title: "Floor Plan",
            receivedDate: "2024-01-01",
          });
        })
      ).rejects.toThrow("File too large. Maximum size is 500MB.");
    });

    it("accepts valid image files", async () => {
      const imageTypes = ["image/png", "image/jpeg", "image/tiff"];

      for (const type of imageTypes) {
        const imageFile = new File(["mock image"], "test.png", { type });
        Object.defineProperty(imageFile, "size", {
          value: 1024000,
          writable: false,
        });

        const { result } = renderHook(() => useDrawingUpload("1"));

        // Setup successful upload mock
        supabaseMock.from.mockImplementation((table) => {
          if (table === "drawings") {
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockDrawing,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "drawing_revisions") {
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockRevision,
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        });

        supabaseMock.storage.from.mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: "drawings/projects/1/drawing-1/1234567890_test.png" },
            error: null,
          }),
        });

        await act(async () => {
          const revision = await result.current.uploadDrawing(imageFile, {
            drawingNumber: "A101",
            title: "Floor Plan",
            receivedDate: "2024-01-01",
          });
          expect(revision).toBeTruthy();
        });
      }
    });
  });

  describe("single file upload", () => {
    beforeEach(() => {
      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockDrawing,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "drawing_revisions") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockRevision,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      supabaseMock.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: "drawings/projects/1/drawing-1/1234567890_test.pdf" },
          error: null,
        }),
      });
    });

    it("creates drawing and revision records correctly", async () => {
      const { result } = renderHook(() => useDrawingUpload("1"));

      const drawingInsertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockDrawing,
            error: null,
          }),
        }),
      });

      const revisionInsertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockRevision,
            error: null,
          }),
        }),
      });

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return { insert: drawingInsertMock };
        }
        if (table === "drawing_revisions") {
          return { insert: revisionInsertMock };
        }
        return {};
      });

      const uploadData = {
        drawingNumber: "A101",
        title: "Floor Plan",
        discipline: "Architectural",
        drawingType: "Plan",
        areaId: "area-1",
        revisionNumber: "B",
        drawingDate: "2024-01-01",
        receivedDate: "2024-01-01",
        description: "Test drawing",
      };

      await act(async () => {
        await result.current.uploadDrawing(mockFile, uploadData);
      });

      expect(drawingInsertMock).toHaveBeenCalledWith({
        project_id: 1,
        area_id: "area-1",
        drawing_number: "A101",
        title: "Floor Plan",
        discipline: "Architectural",
        drawing_type: "Plan",
        created_by: "user-1",
      });

      expect(revisionInsertMock).toHaveBeenCalledWith({
        drawing_id: "drawing-1",
        revision_number: "B",
        drawing_set_id: null,
        drawing_date: "2024-01-01",
        received_date: "2024-01-01",
        status: "under_review",
        file_url: "drawings/projects/1/drawing-1/1234567890_test.pdf",
        file_name: "test.pdf",
        file_size: 1024000,
        file_type: "application/pdf",
        is_current_revision: true,
        description: "Test drawing",
        uploaded_by: "user-1",
      });
    });

    it("handles drawing creation error", async () => {
      const { result } = renderHook(() => useDrawingUpload("1"));

      const drawingError = new Error("Drawing creation failed");
      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: drawingError,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(
        act(async () => {
          await result.current.uploadDrawing(mockFile, {
            drawingNumber: "A101",
            title: "Floor Plan",
            receivedDate: "2024-01-01",
          });
        })
      ).rejects.toThrow("Drawing creation failed");

      expect(toastMock.error).toHaveBeenCalledWith(
        "Upload failed",
        { description: "Drawing creation failed" }
      );
    });

    it("handles storage upload error", async () => {
      const { result } = renderHook(() => useDrawingUpload("1"));

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockDrawing,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const storageError = new Error("Storage upload failed");
      supabaseMock.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: storageError,
        }),
      });

      await expect(
        act(async () => {
          await result.current.uploadDrawing(mockFile, {
            drawingNumber: "A101",
            title: "Floor Plan",
            receivedDate: "2024-01-01",
          });
        })
      ).rejects.toThrow("Storage upload failed");
    });

    it("sanitizes file names for storage", async () => {
      const { result } = renderHook(() => useDrawingUpload("1"));

      const specialCharsFile = new File(["content"], "file with spaces & symbols!.pdf", {
        type: "application/pdf",
      });

      Object.defineProperty(specialCharsFile, "size", {
        value: 1024000,
        writable: false,
      });

      const uploadMock = jest.fn().mockResolvedValue({
        data: { path: "drawings/projects/1/drawing-1/1234567890_file_with_spaces___symbols_.pdf" },
        error: null,
      });

      supabaseMock.storage.from.mockReturnValue({
        upload: uploadMock,
      });

      await act(async () => {
        await result.current.uploadDrawing(specialCharsFile, {
          drawingNumber: "A101",
          title: "Floor Plan",
          receivedDate: "2024-01-01",
        });
      });

      expect(uploadMock).toHaveBeenCalledWith(
        expect.stringContaining("file_with_spaces___symbols_.pdf"),
        specialCharsFile
      );
    });
  });

  describe("multiple file upload", () => {
    it("uploads multiple files successfully", async () => {
      const { result } = renderHook(() => useDrawingUpload("1"));

      const files = [
        new File(["content1"], "file1.pdf", { type: "application/pdf" }),
        new File(["content2"], "file2.pdf", { type: "application/pdf" }),
      ];

      Object.defineProperty(files[0], "size", { value: 1024000, writable: false });
      Object.defineProperty(files[1], "size", { value: 1024000, writable: false });

      // Mock FileList
      const mockFileList = {
        length: 2,
        0: files[0],
        1: files[1],
        [Symbol.iterator]: function* () {
          yield files[0];
          yield files[1];
        },
      } as FileList;

      let drawingIdCounter = 1;
      let revisionIdCounter = 1;

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockDrawing, id: `drawing-${drawingIdCounter++}` },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "drawing_revisions") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockRevision, id: `revision-${revisionIdCounter++}` },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      supabaseMock.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: "drawings/projects/1/drawing-1/file.pdf" },
          error: null,
        }),
      });

      let results: any;
      await act(async () => {
        results = await result.current.uploadMultipleDrawings(mockFileList, {
          discipline: "Architectural",
          drawingType: "Plan",
        });
      });

      expect(results).toHaveLength(2);
      expect(toastMock.success).toHaveBeenCalledWith("Uploaded 2 of 2 drawings");
    });

    it("continues uploading after individual failures", async () => {
      const { result } = renderHook(() => useDrawingUpload("1"));

      const files = [
        new File(["content1"], "file1.pdf", { type: "application/pdf" }),
        new File(["content2"], "file2.txt", { type: "text/plain" }), // Invalid type
        new File(["content3"], "file3.pdf", { type: "application/pdf" }),
      ];

      Object.defineProperty(files[0], "size", { value: 1024000, writable: false });
      Object.defineProperty(files[1], "size", { value: 1024000, writable: false });
      Object.defineProperty(files[2], "size", { value: 1024000, writable: false });

      const mockFileList = {
        length: 3,
        0: files[0],
        1: files[1],
        2: files[2],
        [Symbol.iterator]: function* () {
          yield files[0];
          yield files[1];
          yield files[2];
        },
      } as FileList;

      let drawingIdCounter = 1;
      let revisionIdCounter = 1;

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockDrawing, id: `drawing-${drawingIdCounter++}` },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "drawing_revisions") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockRevision, id: `revision-${revisionIdCounter++}` },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      supabaseMock.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: "drawings/projects/1/drawing-1/file.pdf" },
          error: null,
        }),
      });

      let results: any;
      await act(async () => {
        results = await result.current.uploadMultipleDrawings(mockFileList, {
          discipline: "Architectural",
        });
      });

      expect(results).toHaveLength(2); // Only 2 successful uploads
      expect(toastMock.success).toHaveBeenCalledWith("Uploaded 2 of 3 drawings");
    });

    it("uses file name as default drawing number and title", async () => {
      const { result } = renderHook(() => useDrawingUpload("1"));

      const file = new File(["content"], "A101-Floor-Plan.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(file, "size", { value: 1024000, writable: false });

      const mockFileList = {
        length: 1,
        0: file,
        [Symbol.iterator]: function* () {
          yield file;
        },
      } as FileList;

      const drawingInsertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockDrawing,
            error: null,
          }),
        }),
      });

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return { insert: drawingInsertMock };
        }
        if (table === "drawing_revisions") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockRevision,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      supabaseMock.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: "drawings/projects/1/drawing-1/file.pdf" },
          error: null,
        }),
      });

      await act(async () => {
        await result.current.uploadMultipleDrawings(mockFileList, {});
      });

      expect(drawingInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          drawing_number: "A101-Floor-Plan", // File name without extension
          title: "A101-Floor-Plan",
        })
      );
    });
  });

  describe("error management", () => {
    it("clears errors", async () => {
      const { result } = renderHook(() => useDrawingUpload("1"));

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toEqual([]);
    });

    it("tracks upload state", async () => {
      const { result } = renderHook(() => useDrawingUpload("1"));

      const file = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(file, "size", { value: 1024000, writable: false });

      const mockFileList = {
        length: 1,
        0: file,
        [Symbol.iterator]: function* () {
          yield file;
        },
      } as FileList;

      supabaseMock.from.mockImplementation((table) => {
        if (table === "drawings") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockDrawing,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "drawing_revisions") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockRevision,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      supabaseMock.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: "drawings/projects/1/drawing-1/file.pdf" },
          error: null,
        }),
      });

      expect(result.current.isUploading).toBe(false);

      await act(async () => {
        const uploadPromise = result.current.uploadMultipleDrawings(mockFileList, {});
        expect(result.current.isUploading).toBe(true);
        await uploadPromise;
      });

      expect(result.current.isUploading).toBe(false);
    });
  });
});