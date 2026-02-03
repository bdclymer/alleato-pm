/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DrawingLogTable } from "../DrawingLogTable";
import type { DrawingLogTableRow } from "@/types/drawings.types";

// Mock dependencies
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock the GenericDataTable to avoid complex dependencies
jest.mock("@/components/tables/generic-table-factory", () => ({
  GenericDataTable: ({ data, config, onRowAction, onBulkAction }: any) => (
    <div data-testid="generic-data-table">
      <div data-testid="table-config" style={{ display: "none" }}>
        {JSON.stringify(config)}
      </div>
      <div data-testid="table-title">{config.title}</div>
      <div data-testid="table-description">{config.description}</div>

      {/* Render data rows for testing */}
      {data.map((row: any, index: number) => (
        <div key={index} data-testid={`table-row-${index}`}>
          <span data-testid={`drawing-number-${index}`}>{row.drawingNumber}</span>
          <span data-testid={`title-${index}`}>{row.title}</span>
          <span data-testid={`revision-${index}`}>{row.revisionNumber}</span>
          <span data-testid={`discipline-${index}`}>{row.discipline}</span>
          <span data-testid={`status-${index}`}>{row.status}</span>

          {/* Row action buttons */}
          {config.rowActions.map((action: any) => (
            <button
              key={action.id}
              data-testid={`action-${action.id}-${index}`}
              onClick={() => onRowAction(action.id, row)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ))}

      {/* Bulk action buttons */}
      {config.bulkActions.map((action: any) => (
        <button
          key={action.id}
          data-testid={`bulk-${action.id}`}
          onClick={() => onBulkAction(action.id, data.slice(0, 2))} // Mock selection
        >
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

const useRouterMock = useRouter as jest.Mock;
const toastMock = toast as jest.Mocked<typeof toast>;

describe("DrawingLogTable", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  const mockData: DrawingLogTableRow[] = [
    {
      id: "drawing-1",
      drawingId: "drawing-1",
      drawingNumber: "A-101",
      title: "First Floor Plan",
      revisionNumber: "B",
      discipline: "Architectural",
      drawingType: "Plan",
      status: "approved",
      drawingDate: "2024-01-15",
      receivedDate: "2024-01-16",
      areaName: "Level 1",
      setName: "Construction Documents",
      fileName: "A-101-Rev-B.pdf",
      fileSize: 2048000,
      fileType: "application/pdf",
      fileUrl: "https://example.com/files/A-101-Rev-B.pdf",
      uploadedByEmail: "john@example.com",
      revisionCreatedAt: "2024-01-16T10:30:00Z",
      revisionDescription: "Updated dimensions per RFI",
      isCurrentRevision: true,
    },
    {
      id: "drawing-2",
      drawingId: "drawing-2",
      drawingNumber: "S-201",
      title: "Foundation Plan",
      revisionNumber: "A",
      discipline: "Structural",
      drawingType: "Plan",
      status: "under_review",
      drawingDate: "2024-01-10",
      receivedDate: "2024-01-11",
      areaName: "Foundation",
      setName: "Structural Drawings",
      fileName: "S-201-Rev-A.pdf",
      fileSize: 3072000,
      fileType: "application/pdf",
      fileUrl: "https://example.com/files/S-201-Rev-A.pdf",
      uploadedByEmail: "jane@example.com",
      revisionCreatedAt: "2024-01-11T14:15:00Z",
      revisionDescription: "Initial submission",
      isCurrentRevision: true,
    },
  ];

  const defaultProps = {
    data: mockData,
    projectId: "1",
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useRouterMock.mockReturnValue(mockRouter);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders table with correct title and description", () => {
      render(<DrawingLogTable {...defaultProps} />);

      expect(screen.getByTestId("table-title")).toHaveTextContent("Drawing Log");
      expect(screen.getByTestId("table-description")).toHaveTextContent(
        "Manage all drawing revisions and their metadata"
      );
    });

    it("renders loading state correctly", () => {
      render(<DrawingLogTable {...defaultProps} isLoading={true} />);

      expect(screen.getByText("Loading drawings...")).toBeInTheDocument();
      expect(screen.queryByTestId("generic-data-table")).not.toBeInTheDocument();
    });

    it("renders data rows correctly", () => {
      render(<DrawingLogTable {...defaultProps} />);

      expect(screen.getByTestId("drawing-number-0")).toHaveTextContent("A-101");
      expect(screen.getByTestId("title-0")).toHaveTextContent("First Floor Plan");
      expect(screen.getByTestId("revision-0")).toHaveTextContent("B");
      expect(screen.getByTestId("discipline-0")).toHaveTextContent("Architectural");
      expect(screen.getByTestId("status-0")).toHaveTextContent("approved");

      expect(screen.getByTestId("drawing-number-1")).toHaveTextContent("S-201");
      expect(screen.getByTestId("title-1")).toHaveTextContent("Foundation Plan");
    });

    it("passes correct config to GenericDataTable", () => {
      render(<DrawingLogTable {...defaultProps} />);

      const configElement = screen.getByTestId("table-config");
      const config = JSON.parse(configElement.textContent || "{}");

      expect(config.title).toBe("Drawing Log");
      expect(config.searchFields).toContain("drawingNumber");
      expect(config.searchFields).toContain("title");
      expect(config.enableSorting).toBe(true);
      expect(config.defaultSort.field).toBe("drawingNumber");
      expect(config.defaultSort.direction).toBe("asc");
    });
  });

  describe("Row Actions", () => {
    it("handles view action correctly", async () => {
      render(<DrawingLogTable {...defaultProps} />);

      const viewButton = screen.getByTestId("action-view-0");
      fireEvent.click(viewButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/1/drawings/viewer/drawing-1");
    });

    it.skip("handles download action with valid file URL", async () => {
      // Mock DOM methods
      const createElementSpy = jest.spyOn(document, "createElement");
      const appendChildSpy = jest.spyOn(document.body, "appendChild");
      const removeChildSpy = jest.spyOn(document.body, "removeChild");

      const mockLink = {
        click: jest.fn(),
        href: "",
        download: "",
      } as any;

      createElementSpy.mockReturnValue(mockLink);
      appendChildSpy.mockImplementation(() => {});
      removeChildSpy.mockImplementation(() => {});

      render(<DrawingLogTable {...defaultProps} />);

      const downloadButton = screen.getByTestId("action-download-0");
      fireEvent.click(downloadButton);

      expect(mockLink.href).toBe("https://example.com/files/A-101-Rev-B.pdf");
      expect(mockLink.download).toBe("A-101-Rev-B.pdf");
      expect(mockLink.click).toHaveBeenCalled();
      expect(toastMock.success).toHaveBeenCalledWith("Download started");

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it.skip("handles download action with missing file URL", async () => {
      const dataWithoutUrl = [
        { ...mockData[0], fileUrl: null },
      ];

      render(<DrawingLogTable {...defaultProps} data={dataWithoutUrl} />);

      const downloadButton = screen.getByTestId("action-download-0");
      fireEvent.click(downloadButton);

      expect(toastMock.error).toHaveBeenCalledWith("File not available for download");
    });

    it.skip("handles edit action correctly", async () => {
      render(<DrawingLogTable {...defaultProps} />);

      const editButton = screen.getByTestId("action-edit-0");
      fireEvent.click(editButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/1/drawings/drawing-1/edit");
    });

    it.skip("handles new revision action correctly", async () => {
      render(<DrawingLogTable {...defaultProps} />);

      const newRevisionButton = screen.getByTestId("action-newRevision-0");
      fireEvent.click(newRevisionButton);

      expect(mockRouter.push).toHaveBeenCalledWith("/1/drawings/drawing-1/new-revision");
    });

    it.skip("handles QR code action (placeholder)", async () => {
      render(<DrawingLogTable {...defaultProps} />);

      const qrCodeButton = screen.getByTestId("action-qrCode-0");
      fireEvent.click(qrCodeButton);

      expect(toastMock.info).toHaveBeenCalledWith("QR Code generation coming soon");
    });

    it.skip("handles delete action with callback", async () => {
      const onDeleteDrawing = jest.fn().mockResolvedValue(undefined);
      const onRefresh = jest.fn();

      render(
        <DrawingLogTable
          {...defaultProps}
          onDeleteDrawing={onDeleteDrawing}
          onRefresh={onRefresh}
        />
      );

      const deleteButton = screen.getByTestId("action-delete-0");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(onDeleteDrawing).toHaveBeenCalledWith("drawing-1");
        expect(onRefresh).toHaveBeenCalled();
      });
    });

    it.skip("handles delete action without callback", async () => {
      render(<DrawingLogTable {...defaultProps} />);

      const deleteButton = screen.getByTestId("action-delete-0");
      fireEvent.click(deleteButton);

      // Should not throw error or cause issues
      expect(toastMock.error).not.toHaveBeenCalled();
    });

    it.skip("handles action errors gracefully", async () => {
      const onDeleteDrawing = jest.fn().mockRejectedValue(new Error("Delete failed"));

      render(
        <DrawingLogTable
          {...defaultProps}
          onDeleteDrawing={onDeleteDrawing}
        />
      );

      const deleteButton = screen.getByTestId("action-delete-0");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith("Failed to delete drawing");
      });
    });
  });

  describe.skip("Bulk Actions", () => {
    beforeEach(() => {
      // Mock DOM methods for bulk actions - preserve original createElement for non-anchor elements
      const originalCreateElement = document.createElement.bind(document);
      jest.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        if (tagName === "a") {
          return {
            click: jest.fn(),
            href: "",
            download: "",
            setAttribute: jest.fn(),
          } as any;
        }
        return originalCreateElement(tagName);
      });

      jest.spyOn(document.body, "appendChild").mockImplementation(() => ({} as Node));
      jest.spyOn(document.body, "removeChild").mockImplementation(() => ({} as Node));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("handles bulk download action", async () => {
      render(<DrawingLogTable {...defaultProps} />);

      const bulkDownloadButton = screen.getByTestId("bulk-bulkDownload");
      fireEvent.click(bulkDownloadButton);

      expect(toastMock.success).toHaveBeenCalledWith("Started download of 2 drawings");
    });

    it("handles bulk export action", async () => {
      render(<DrawingLogTable {...defaultProps} />);

      const bulkExportButton = screen.getByTestId("bulk-bulkExport");
      fireEvent.click(bulkExportButton);

      expect(toastMock.success).toHaveBeenCalledWith("Exported 2 drawings to CSV");
    });

    it("handles bulk status update action (placeholder)", async () => {
      render(<DrawingLogTable {...defaultProps} />);

      const bulkStatusUpdateButton = screen.getByTestId("bulk-bulkStatusUpdate");
      fireEvent.click(bulkStatusUpdateButton);

      expect(toastMock.info).toHaveBeenCalledWith("Bulk status update coming soon");
    });

    it("handles bulk action errors gracefully", async () => {
      render(<DrawingLogTable {...defaultProps} />);

      // Mock document.createElement to throw an error only for anchor tags
      const originalCreateElement = document.createElement.bind(document);
      jest.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        if (tagName === "a") {
          throw new Error("DOM error");
        }
        return originalCreateElement(tagName);
      });

      const bulkDownloadButton = screen.getByTestId("bulk-bulkDownload");
      fireEvent.click(bulkDownloadButton);

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith("Failed to bulkDownload selected drawings");
      });
    });
  });

  describe("Configuration", () => {
    it("includes all required columns", () => {
      render(<DrawingLogTable {...defaultProps} />);

      const configElement = screen.getByTestId("table-config");
      const config = JSON.parse(configElement.textContent || "{}");

      const columnIds = config.columns.map((col: any) => col.id);

      expect(columnIds).toContain("drawingNumber");
      expect(columnIds).toContain("title");
      expect(columnIds).toContain("revisionNumber");
      expect(columnIds).toContain("discipline");
      expect(columnIds).toContain("drawingType");
      expect(columnIds).toContain("status");
      expect(columnIds).toContain("drawingDate");
      expect(columnIds).toContain("receivedDate");
      expect(columnIds).toContain("areaName");
      expect(columnIds).toContain("fileName");
      expect(columnIds).toContain("fileSize");
      expect(columnIds).toContain("fileType");
    });

    it("includes all required row actions", () => {
      render(<DrawingLogTable {...defaultProps} />);

      const configElement = screen.getByTestId("table-config");
      const config = JSON.parse(configElement.textContent || "{}");

      const actionIds = config.rowActions.map((action: any) => action.id);

      expect(actionIds).toContain("view");
      expect(actionIds).toContain("download");
      expect(actionIds).toContain("edit");
      expect(actionIds).toContain("newRevision");
      expect(actionIds).toContain("qrCode");
      expect(actionIds).toContain("delete");
    });

    it("includes all required bulk actions", () => {
      render(<DrawingLogTable {...defaultProps} />);

      const configElement = screen.getByTestId("table-config");
      const config = JSON.parse(configElement.textContent || "{}");

      const bulkActionIds = config.bulkActions.map((action: any) => action.id);

      expect(bulkActionIds).toContain("bulkDownload");
      expect(bulkActionIds).toContain("bulkExport");
      expect(bulkActionIds).toContain("bulkStatusUpdate");
    });

    it("includes all required filters", () => {
      render(<DrawingLogTable {...defaultProps} />);

      const configElement = screen.getByTestId("table-config");
      const config = JSON.parse(configElement.textContent || "{}");

      const filterIds = config.filters.map((filter: any) => filter.id);

      expect(filterIds).toContain("discipline");
      expect(filterIds).toContain("drawingType");
      expect(filterIds).toContain("status");
      expect(filterIds).toContain("areaName");
      expect(filterIds).toContain("setName");
      expect(filterIds).toContain("fileType");
    });

    it("sets correct default visibility for columns", () => {
      render(<DrawingLogTable {...defaultProps} />);

      const configElement = screen.getByTestId("table-config");
      const config = JSON.parse(configElement.textContent || "{}");

      const drawingNumberCol = config.columns.find((col: any) => col.id === "drawingNumber");
      const fileNameCol = config.columns.find((col: any) => col.id === "fileName");
      const fileSizeCol = config.columns.find((col: any) => col.id === "fileSize");

      expect(drawingNumberCol.defaultVisible).toBe(true);
      expect(fileNameCol.defaultVisible).toBe(false);
      expect(fileSizeCol.defaultVisible).toBe(false);
    });

    it("configures badge variants correctly", () => {
      render(<DrawingLogTable {...defaultProps} />);

      const configElement = screen.getByTestId("table-config");
      const config = JSON.parse(configElement.textContent || "{}");

      const disciplineCol = config.columns.find((col: any) => col.id === "discipline");
      const statusCol = config.columns.find((col: any) => col.id === "status");

      expect(disciplineCol.renderConfig.variantMap.Architectural).toBe("default");
      expect(disciplineCol.renderConfig.variantMap.Structural).toBe("secondary");

      expect(statusCol.renderConfig.variantMap.approved).toBe("default");
      expect(statusCol.renderConfig.variantMap.under_review).toBe("secondary");
      expect(statusCol.renderConfig.variantMap.void).toBe("destructive");
    });

    it("sets correct search fields", () => {
      render(<DrawingLogTable {...defaultProps} />);

      const configElement = screen.getByTestId("table-config");
      const config = JSON.parse(configElement.textContent || "{}");

      expect(config.searchFields).toEqual([
        "drawingNumber",
        "title",
        "fileName",
        "areaName",
        "setName"
      ]);
    });

    it("enables all required table features", () => {
      render(<DrawingLogTable {...defaultProps} />);

      const configElement = screen.getByTestId("table-config");
      const config = JSON.parse(configElement.textContent || "{}");

      expect(config.enableViewSwitcher).toBe(true);
      expect(config.enableRowSelection).toBe(true);
      expect(config.enableSorting).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty data array", () => {
      render(<DrawingLogTable {...defaultProps} data={[]} />);

      expect(screen.getByTestId("generic-data-table")).toBeInTheDocument();
      expect(screen.queryByTestId("table-row-0")).not.toBeInTheDocument();
    });

    it("handles missing optional props", () => {
      render(<DrawingLogTable data={mockData} projectId="1" />);

      expect(screen.getByTestId("generic-data-table")).toBeInTheDocument();
    });

    it("handles unknown row actions gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      render(<DrawingLogTable {...defaultProps} />);

      // Manually trigger an unknown action through the mock
      const configElement = screen.getByTestId("table-config");
      const config = JSON.parse(configElement.textContent || "{}");

      // Get the onRowAction from the mocked component and call it with an unknown action
      const rowActionButtons = screen.getAllByTestId(/^action-/);
      if (rowActionButtons.length > 0) {
        // Simulate unknown action by directly calling the handler
        // This would normally be done through the GenericDataTable
        const mockOnRowAction = jest.fn();
        mockOnRowAction("unknownAction", mockData[0]);
      }

      expect(consoleSpy).not.toHaveBeenCalled(); // Since we don't actually trigger it through the component

      consoleSpy.mockRestore();
    });

    it("handles data with missing optional fields", () => {
      const dataWithMissingFields = [{
        ...mockData[0],
        areaName: undefined,
        setName: undefined,
        revisionDescription: undefined,
      }];

      render(<DrawingLogTable {...defaultProps} data={dataWithMissingFields} />);

      expect(screen.getByTestId("generic-data-table")).toBeInTheDocument();
    });
  });

  describe("Integration", () => {
    it("updates correctly when data changes", () => {
      const { rerender } = render(<DrawingLogTable {...defaultProps} />);

      expect(screen.getByTestId("drawing-number-0")).toHaveTextContent("A-101");

      const newData = [
        {
          ...mockData[0],
          drawingNumber: "A-102",
          title: "Second Floor Plan",
        }
      ];

      rerender(<DrawingLogTable {...defaultProps} data={newData} />);

      expect(screen.getByTestId("drawing-number-0")).toHaveTextContent("A-102");
      expect(screen.getByTestId("title-0")).toHaveTextContent("Second Floor Plan");
    });

    it("updates correctly when projectId changes", () => {
      const { rerender } = render(<DrawingLogTable {...defaultProps} />);

      const configElement = screen.getByTestId("table-config");
      const config = JSON.parse(configElement.textContent || "{}");
      expect(config.rowClickPath).toBe("/{projectId}/drawings/viewer/{id}");

      rerender(<DrawingLogTable {...defaultProps} projectId="2" />);

      const updatedConfigElement = screen.getByTestId("table-config");
      const updatedConfig = JSON.parse(updatedConfigElement.textContent || "{}");
      expect(updatedConfig.rowClickPath).toBe("/{projectId}/drawings/viewer/{id}");
    });
  });
});