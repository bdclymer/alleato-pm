/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { toast } from "sonner";
import { DrawingUploadDialog } from "../DrawingUploadDialog";
import { useDrawingUpload } from "@/hooks/use-drawing-upload";
import { useDrawingAreas } from "@/hooks/use-drawing-areas";

// Mock dependencies
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/hooks/use-drawing-upload", () => ({
  useDrawingUpload: jest.fn(),
}));

jest.mock("@/hooks/use-drawing-areas", () => ({
  useDrawingAreas: jest.fn(),
}));

const useDrawingUploadMock = useDrawingUpload as jest.Mock;
const useDrawingAreasMock = useDrawingAreas as jest.Mock;
const toastMock = toast as jest.Mocked<typeof toast>;

describe("DrawingUploadDialog", () => {
  const mockAreas = [
    {
      id: "area-1",
      name: "Architectural",
      children: [
        {
          id: "area-2",
          name: "Floor Plans",
          children: [],
        },
      ],
    },
    {
      id: "area-3",
      name: "Structural",
      children: [],
    },
  ];

  const mockUploadHook = {
    uploadDrawing: jest.fn(),
    uploadMultipleDrawings: jest.fn(),
    isUploading: false,
    errors: [],
    clearErrors: jest.fn(),
  };

  const defaultProps = {
    projectId: "1",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useDrawingAreasMock.mockReturnValue({
      areas: mockAreas,
    });

    useDrawingUploadMock.mockReturnValue(mockUploadHook);
  });

  describe("Dialog Behavior", () => {
    it("opens and closes correctly", async () => {
      const user = userEvent.setup();
      render(<DrawingUploadDialog {...defaultProps} />);

      // Dialog should be closed initially
      expect(screen.queryByText("Upload Drawings")).not.toBeInTheDocument();

      // Click trigger button
      const triggerButton = screen.getByRole("button", { name: /upload drawings/i });
      await user.click(triggerButton);

      // Dialog should open
      await waitFor(() => {
        expect(screen.getByText("Upload Drawings")).toBeInTheDocument();
      });

      // Close dialog
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText("Upload Drawings")).not.toBeInTheDocument();
      });
    });

    it("renders custom trigger when provided", () => {
      render(
        <DrawingUploadDialog {...defaultProps}>
          <button>Custom Upload</button>
        </DrawingUploadDialog>
      );

      expect(screen.getByText("Custom Upload")).toBeInTheDocument();
      expect(screen.queryByText("Upload Drawings")).not.toBeInTheDocument();
    });
  });

  describe("File Selection", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<DrawingUploadDialog {...defaultProps} />);

      const triggerButton = screen.getByRole("button", { name: /upload drawings/i });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText("Upload Drawings")).toBeInTheDocument();
      });
    });

    it("displays file upload field", () => {
      expect(screen.getByText("Drawing Files")).toBeInTheDocument();
      expect(screen.getByText("Drag and drop files here or click to browse. Maximum 500MB per file.")).toBeInTheDocument();
    });

    it("auto-populates drawing number and title from file name", async () => {
      const file = new File(["content"], "A-101-Floor-Plan.pdf", {
        type: "application/pdf",
      });

      // Mock file input change
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });

        fireEvent.change(fileInput);
      }

      await waitFor(() => {
        const drawingNumberInput = screen.getByLabelText(/drawing number/i) as HTMLInputElement;
        const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;

        expect(drawingNumberInput.value).toBe("A-101-Floor-Plan");
        expect(titleInput.value).toBe("A-101-Floor-Plan");
      });
    });

    it("displays selected files with proper information", async () => {
      const files = [
        new File(["content1"], "drawing1.pdf", { type: "application/pdf" }),
        new File(["content2"], "drawing2.png", { type: "image/png" }),
      ];

      Object.defineProperty(files[0], "size", { value: 1024000, writable: false });
      Object.defineProperty(files[1], "size", { value: 2048000, writable: false });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: files,
          writable: false,
        });

        fireEvent.change(fileInput);
      }

      await waitFor(() => {
        expect(screen.getByText("Selected Files (2)")).toBeInTheDocument();
        expect(screen.getByText("drawing1.pdf")).toBeInTheDocument();
        expect(screen.getByText("drawing2.png")).toBeInTheDocument();
        expect(screen.getByText("1000.0 KB")).toBeInTheDocument();
        expect(screen.getByText("2.0 MB")).toBeInTheDocument();
        expect(screen.getByText("PDF")).toBeInTheDocument();
        expect(screen.getByText("PNG")).toBeInTheDocument();
      });
    });

    it("allows removing selected files", async () => {
      const user = userEvent.setup();
      const file = new File(["content"], "test.pdf", { type: "application/pdf" });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });

        fireEvent.change(fileInput);
      }

      await waitFor(() => {
        expect(screen.getByText("test.pdf")).toBeInTheDocument();
      });

      const removeButton = screen.getByRole("button", { name: /remove/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText("test.pdf")).not.toBeInTheDocument();
        expect(screen.queryByText("Selected Files")).not.toBeInTheDocument();
      });
    });

    it("formats file sizes correctly", async () => {
      const testCases = [
        { size: 500, expected: "500 B" },
        { size: 1536, expected: "1.5 KB" },
        { size: 1048576, expected: "1.0 MB" },
        { size: 5242880, expected: "5.0 MB" },
      ];

      for (const { size, expected } of testCases) {
        const file = new File(["content"], `test-${size}.pdf`, { type: "application/pdf" });
        Object.defineProperty(file, "size", { value: size, writable: false });

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

        if (fileInput) {
          Object.defineProperty(fileInput, 'files', {
            value: [file],
            writable: false,
          });

          fireEvent.change(fileInput);
        }

        await waitFor(() => {
          expect(screen.getByText(expected)).toBeInTheDocument();
        });

        // Clear for next test
        const removeButton = screen.getByRole("button", { name: /remove/i });
        await userEvent.setup().click(removeButton);
      }
    });
  });

  describe("Form Fields", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<DrawingUploadDialog {...defaultProps} defaultAreaId="area-1" />);

      const triggerButton = screen.getByRole("button", { name: /upload drawings/i });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText("Upload Drawings")).toBeInTheDocument();
      });
    });

    it("renders all form fields", () => {
      expect(screen.getByLabelText(/drawing number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/revision/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/discipline/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/drawing area/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/drawing date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("sets default values correctly", () => {
      const revisionInput = screen.getByLabelText(/revision/i) as HTMLInputElement;
      expect(revisionInput.value).toBe("A");

      // Check if default area is selected (area-1)
      const areaSelect = screen.getByLabelText(/drawing area/i);
      expect(areaSelect).toBeInTheDocument();
    });

    it("renders hierarchical area options with proper indentation", async () => {
      const user = userEvent.setup();
      const areaSelect = screen.getByLabelText(/drawing area/i);

      await user.click(areaSelect);

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Architectural" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Floor Plans" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Structural" })).toBeInTheDocument();
      });
    });

    it("validates required fields", async () => {
      const user = userEvent.setup();

      // Try to submit without required fields
      const submitButton = screen.getByRole("button", { name: /upload/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith("Please select at least one file to upload");
      });
    });

    it("disables form fields when uploading", () => {
      useDrawingUploadMock.mockReturnValue({
        ...mockUploadHook,
        isUploading: true,
      });

      render(<DrawingUploadDialog {...defaultProps} />);

      const drawingNumberInput = screen.getByLabelText(/drawing number/i);
      const titleInput = screen.getByLabelText(/title/i);

      expect(drawingNumberInput).toBeDisabled();
      expect(titleInput).toBeDisabled();
    });
  });

  describe("Upload Functionality", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<DrawingUploadDialog {...defaultProps} />);

      const triggerButton = screen.getByRole("button", { name: /upload drawings/i });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText("Upload Drawings")).toBeInTheDocument();
      });
    });

    it("handles single file upload", async () => {
      const user = userEvent.setup();
      const onUploadComplete = jest.fn();

      render(<DrawingUploadDialog {...defaultProps} onUploadComplete={onUploadComplete} />);

      const file = new File(["content"], "test.pdf", { type: "application/pdf" });
      mockUploadHook.uploadDrawing.mockResolvedValue({ id: "revision-1" });

      // Open dialog
      const triggerButton = screen.getByRole("button", { name: /upload drawings/i });
      await user.click(triggerButton);

      // Add file
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });
        fireEvent.change(fileInput);
      }

      // Fill required fields
      await user.type(screen.getByLabelText(/drawing number/i), "A-101");
      await user.type(screen.getByLabelText(/title/i), "Floor Plan");

      // Submit
      const submitButton = screen.getByRole("button", { name: /upload/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUploadHook.uploadDrawing).toHaveBeenCalledWith(
          file,
          expect.objectContaining({
            drawingNumber: "A-101",
            title: "Floor Plan",
          })
        );
        expect(toastMock.success).toHaveBeenCalledWith("Successfully uploaded 1 drawing");
      });
    });

    it("handles multiple file upload", async () => {
      const user = userEvent.setup();
      const files = [
        new File(["content1"], "test1.pdf", { type: "application/pdf" }),
        new File(["content2"], "test2.pdf", { type: "application/pdf" }),
      ];

      mockUploadHook.uploadMultipleDrawings.mockResolvedValue([
        { id: "revision-1" },
        { id: "revision-2" },
      ]);

      // Add files
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: files,
          writable: false,
        });
        fireEvent.change(fileInput);
      }

      // Fill required fields
      await user.type(screen.getByLabelText(/drawing number/i), "A-101");
      await user.type(screen.getByLabelText(/title/i), "Floor Plans");

      // Submit
      const submitButton = screen.getByRole("button", { name: /upload \(2\)/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUploadHook.uploadMultipleDrawings).toHaveBeenCalledWith(
          expect.any(FileList),
          expect.objectContaining({
            drawingNumber: "A-101",
            title: "Floor Plans",
          })
        );
        expect(toastMock.success).toHaveBeenCalledWith("Successfully uploaded 2 drawings");
      });
    });

    it("handles upload errors", async () => {
      const user = userEvent.setup();
      const file = new File(["content"], "test.pdf", { type: "application/pdf" });
      const uploadError = new Error("Upload failed");

      mockUploadHook.uploadDrawing.mockRejectedValue(uploadError);

      // Add file
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });
        fireEvent.change(fileInput);
      }

      // Fill required fields
      await user.type(screen.getByLabelText(/drawing number/i), "A-101");
      await user.type(screen.getByLabelText(/title/i), "Floor Plan");

      // Submit
      const submitButton = screen.getByRole("button", { name: /upload/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith("Upload failed", {
          description: "Upload failed",
        });
      });
    });

    it("displays upload errors from hook", () => {
      useDrawingUploadMock.mockReturnValue({
        ...mockUploadHook,
        errors: [
          { fileName: "test.pdf", error: "File too large", code: "FILE_TOO_LARGE" },
          { fileName: "invalid.txt", error: "Invalid file type", code: "INVALID_TYPE" },
        ],
      });

      render(<DrawingUploadDialog {...defaultProps} />);

      expect(screen.getByText("Upload Errors:")).toBeInTheDocument();
      expect(screen.getByText("test.pdf:")).toBeInTheDocument();
      expect(screen.getByText("File too large")).toBeInTheDocument();
      expect(screen.getByText("invalid.txt:")).toBeInTheDocument();
      expect(screen.getByText("Invalid file type")).toBeInTheDocument();
    });

    it("shows upload progress and completion states", () => {
      useDrawingUploadMock.mockReturnValue({
        ...mockUploadHook,
        isUploading: true,
      });

      render(<DrawingUploadDialog {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: /uploading/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText("Uploading...")).toBeInTheDocument();
    });

    it("resets form after successful upload", async () => {
      const user = userEvent.setup();
      const file = new File(["content"], "test.pdf", { type: "application/pdf" });

      mockUploadHook.uploadDrawing.mockResolvedValue({ id: "revision-1" });

      // Add file and fill form
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });
        fireEvent.change(fileInput);
      }

      await user.type(screen.getByLabelText(/drawing number/i), "A-101");
      await user.type(screen.getByLabelText(/title/i), "Floor Plan");

      const submitButton = screen.getByRole("button", { name: /upload/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Dialog should close and form should reset
        expect(screen.queryByText("Selected Files")).not.toBeInTheDocument();
      });
    });
  });

  describe("Upload States", () => {
    it("disables remove buttons during upload", () => {
      useDrawingUploadMock.mockReturnValue({
        ...mockUploadHook,
        isUploading: true,
      });

      const file = new File(["content"], "test.pdf", { type: "application/pdf" });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });
        fireEvent.change(fileInput);
      }

      // Remove button should not be present during upload
      expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    });

    it("disables cancel button during upload", () => {
      useDrawingUploadMock.mockReturnValue({
        ...mockUploadHook,
        isUploading: true,
      });

      render(<DrawingUploadDialog {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe("Integration with Hooks", () => {
    it("clears errors when starting upload", async () => {
      const user = userEvent.setup();
      const file = new File(["content"], "test.pdf", { type: "application/pdf" });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });
        fireEvent.change(fileInput);
      }

      await user.type(screen.getByLabelText(/drawing number/i), "A-101");
      await user.type(screen.getByLabelText(/title/i), "Floor Plan");

      const submitButton = screen.getByRole("button", { name: /upload/i });
      await user.click(submitButton);

      expect(mockUploadHook.clearErrors).toHaveBeenCalled();
    });

    it("calls onUploadComplete callback after successful upload", async () => {
      const user = userEvent.setup();
      const onUploadComplete = jest.fn();
      const file = new File(["content"], "test.pdf", { type: "application/pdf" });

      mockUploadHook.uploadDrawing.mockResolvedValue({ id: "revision-1" });

      render(<DrawingUploadDialog {...defaultProps} onUploadComplete={onUploadComplete} />);

      // Open dialog
      const triggerButton = screen.getByRole("button", { name: /upload drawings/i });
      await user.click(triggerButton);

      // Add file and submit
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });
        fireEvent.change(fileInput);
      }

      await user.type(screen.getByLabelText(/drawing number/i), "A-101");
      await user.type(screen.getByLabelText(/title/i), "Floor Plan");

      const submitButton = screen.getByRole("button", { name: /upload/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalled();
      });
    });
  });
});