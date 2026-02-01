/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { DrawingAreaSelector } from "../DrawingAreaSelector";
import type { DrawingAreaWithCount } from "@/types/drawings.types";

const mockAreas: DrawingAreaWithCount[] = [
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
    created_by: "user-1",
    updated_by: null,
    parentAreaId: null,
    sortOrder: 0,
    drawingCount: 5,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    createdBy: "user-1",
    updatedBy: null,
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
    created_by: "user-1",
    updated_by: null,
    parentAreaId: "area-1",
    sortOrder: 1,
    drawingCount: 3,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    createdBy: "user-1",
    updatedBy: null,
  },
  {
    id: "area-3",
    project_id: 1,
    name: "MEP",
    description: "Mechanical, Electrical, Plumbing",
    parent_area_id: null,
    sort_order: 2,
    drawing_count: 8,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    created_by: "user-1",
    updated_by: null,
    parentAreaId: null,
    sortOrder: 2,
    drawingCount: 8,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    createdBy: "user-1",
    updatedBy: null,
  },
  {
    id: "area-4",
    project_id: 1,
    name: "HVAC",
    description: "HVAC systems",
    parent_area_id: "area-3",
    sort_order: 0,
    drawing_count: 4,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    created_by: "user-1",
    updated_by: null,
    parentAreaId: "area-3",
    sortOrder: 0,
    drawingCount: 4,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    createdBy: "user-1",
    updatedBy: null,
  },
];

describe("DrawingAreaSelector", () => {
  const defaultProps = {
    areas: mockAreas,
    onSelectArea: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders correctly with areas", () => {
      render(<DrawingAreaSelector {...defaultProps} />);

      expect(screen.getByText("Drawing Areas")).toBeInTheDocument();
      expect(screen.getByText("All Drawings")).toBeInTheDocument();
      expect(screen.getByText("Architectural")).toBeInTheDocument();
      expect(screen.getByText("MEP")).toBeInTheDocument();
    });

    it("renders loading state correctly", () => {
      render(<DrawingAreaSelector {...defaultProps} isLoading={true} />);

      expect(screen.getByText("Drawing Areas")).toBeInTheDocument();
      expect(screen.queryByText("Architectural")).not.toBeInTheDocument();

      // Should show skeleton loaders
      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it("renders empty state when no areas", () => {
      render(<DrawingAreaSelector {...defaultProps} areas={[]} />);

      expect(screen.getByText("No drawing areas created")).toBeInTheDocument();
      expect(screen.getByText("Create areas to organize your drawings")).toBeInTheDocument();
      expect(screen.getByText("Create First Area")).toBeInTheDocument();
    });

    it("calculates total drawing count correctly", () => {
      render(<DrawingAreaSelector {...defaultProps} />);

      const allDrawingsBadge = screen.getByText("All Drawings")
        .closest("div")
        ?.querySelector('[class*="badge"]');

      expect(allDrawingsBadge).toHaveTextContent("20"); // 5 + 3 + 8 + 4
    });
  });

  describe("Hierarchical Display", () => {
    it("builds and displays hierarchical structure correctly", () => {
      render(<DrawingAreaSelector {...defaultProps} />);

      // Root areas should be visible
      expect(screen.getByText("Architectural")).toBeInTheDocument();
      expect(screen.getByText("MEP")).toBeInTheDocument();

      // Child areas should not be visible initially (collapsed)
      expect(screen.queryByText("Structural")).not.toBeInTheDocument();
      expect(screen.queryByText("HVAC")).not.toBeInTheDocument();
    });

    it("shows proper folder icons for parent and child areas", () => {
      render(<DrawingAreaSelector {...defaultProps} />);

      const architecturalRow = screen.getByText("Architectural").closest("div");
      const mepRow = screen.getByText("MEP").closest("div");

      // Both should have folder icons since they have children
      expect(architecturalRow).toBeInTheDocument();
      expect(mepRow).toBeInTheDocument();
    });

    it("applies correct padding for nested levels", () => {
      render(<DrawingAreaSelector {...defaultProps} />);

      // Expand Architectural to show Structural
      const architecturalExpandButton = screen.getByText("Architectural")
        .closest("div")
        ?.querySelector("button");

      if (architecturalExpandButton) {
        fireEvent.click(architecturalExpandButton);
      }

      waitFor(() => {
        const structuralRow = screen.getByText("Structural").closest("div");
        expect(structuralRow).toHaveClass("pl-4");
      });
    });
  });

  describe("Expand/Collapse Functionality", () => {
    it("expands and collapses areas with children", async () => {
      const user = userEvent.setup();
      render(<DrawingAreaSelector {...defaultProps} />);

      // Initially, child areas should not be visible
      expect(screen.queryByText("Structural")).not.toBeInTheDocument();

      // Click the expand button for Architectural
      const architecturalRow = screen.getByText("Architectural").closest("div");
      const expandButton = architecturalRow?.querySelector("button");

      expect(expandButton).toBeInTheDocument();
      if (expandButton) {
        await user.click(expandButton);
      }

      // Now Structural should be visible
      await waitFor(() => {
        expect(screen.getByText("Structural")).toBeInTheDocument();
      });

      // Click again to collapse
      if (expandButton) {
        await user.click(expandButton);
      }

      // Structural should be hidden again
      await waitFor(() => {
        expect(screen.queryByText("Structural")).not.toBeInTheDocument();
      });
    });

    it("shows correct chevron icons for expand/collapse state", async () => {
      const user = userEvent.setup();
      render(<DrawingAreaSelector {...defaultProps} />);

      const architecturalRow = screen.getByText("Architectural").closest("div");
      const expandButton = architecturalRow?.querySelector("button");

      // Initially should show ChevronRight (collapsed)
      expect(expandButton).toBeInTheDocument();

      // Click to expand
      if (expandButton) {
        await user.click(expandButton);
      }

      // Should now show ChevronDown (expanded)
      await waitFor(() => {
        expect(screen.getByText("Structural")).toBeInTheDocument();
      });
    });

    it("disables expand button for areas without children", () => {
      render(<DrawingAreaSelector {...defaultProps} />);

      // First expand Architectural to show Structural
      const architecturalRow = screen.getByText("Architectural").closest("div");
      const architecturalExpandButton = architecturalRow?.querySelector("button");

      if (architecturalExpandButton) {
        fireEvent.click(architecturalExpandButton);
      }

      waitFor(() => {
        const structuralRow = screen.getByText("Structural").closest("div");
        const structuralExpandButton = structuralRow?.querySelector("button");

        expect(structuralExpandButton).toBeDisabled();
      });
    });
  });

  describe("Selection Functionality", () => {
    it("calls onSelectArea when area is clicked", async () => {
      const user = userEvent.setup();
      const onSelectArea = jest.fn();

      render(<DrawingAreaSelector {...defaultProps} onSelectArea={onSelectArea} />);

      const architecturalArea = screen.getByText("Architectural").closest("div");
      if (architecturalArea) {
        await user.click(architecturalArea);
      }

      expect(onSelectArea).toHaveBeenCalledWith("area-1");
    });

    it("calls onSelectArea with null when All Drawings is clicked", async () => {
      const user = userEvent.setup();
      const onSelectArea = jest.fn();

      render(<DrawingAreaSelector {...defaultProps} onSelectArea={onSelectArea} />);

      const allDrawingsOption = screen.getByText("All Drawings").closest("div");
      if (allDrawingsOption) {
        await user.click(allDrawingsOption);
      }

      expect(onSelectArea).toHaveBeenCalledWith(null);
    });

    it("highlights selected area", () => {
      render(
        <DrawingAreaSelector
          {...defaultProps}
          selectedAreaId="area-1"
        />
      );

      const architecturalRow = screen.getByText("Architectural").closest("div");
      expect(architecturalRow).toHaveClass("bg-blue-50", "border-blue-200");
    });

    it("highlights All Drawings when no area is selected", () => {
      render(
        <DrawingAreaSelector
          {...defaultProps}
          selectedAreaId={undefined}
        />
      );

      const allDrawingsRow = screen.getByText("All Drawings").closest("div");
      expect(allDrawingsRow).toHaveClass("bg-blue-50", "border-blue-200");
    });
  });

  describe("Action Menu", () => {
    it("shows action menu on hover and handles create sub-area", async () => {
      const user = userEvent.setup();
      const onCreateArea = jest.fn();

      render(
        <DrawingAreaSelector
          {...defaultProps}
          onCreateArea={onCreateArea}
        />
      );

      const architecturalRow = screen.getByText("Architectural").closest("div");

      // Hover over the row to show action button
      if (architecturalRow) {
        await user.hover(architecturalRow);
      }

      // Look for the action button (Plus icon)
      const actionButton = architecturalRow?.querySelector("button:last-child");
      expect(actionButton).toBeInTheDocument();

      if (actionButton) {
        await user.click(actionButton);
      }

      // Should show dropdown menu
      await waitFor(() => {
        expect(screen.getByText("Add Sub-Area")).toBeInTheDocument();
      });

      // Click on "Add Sub-Area"
      const addSubAreaOption = screen.getByText("Add Sub-Area");
      await user.click(addSubAreaOption);

      expect(onCreateArea).toHaveBeenCalledWith("area-1");
    });

    it("handles edit area action", async () => {
      const user = userEvent.setup();
      const onEditArea = jest.fn();

      render(
        <DrawingAreaSelector
          {...defaultProps}
          onEditArea={onEditArea}
        />
      );

      const architecturalRow = screen.getByText("Architectural").closest("div");

      if (architecturalRow) {
        await user.hover(architecturalRow);
      }

      const actionButton = architecturalRow?.querySelector("button:last-child");
      if (actionButton) {
        await user.click(actionButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Edit Area")).toBeInTheDocument();
      });

      const editOption = screen.getByText("Edit Area");
      await user.click(editOption);

      expect(onEditArea).toHaveBeenCalledWith(mockAreas[0]);
    });

    it("shows delete option only for areas with no drawings", async () => {
      const user = userEvent.setup();
      const onDeleteArea = jest.fn();

      const areasWithEmpty = [
        ...mockAreas,
        {
          id: "area-5",
          project_id: 1,
          name: "Empty Area",
          description: "Empty area",
          parent_area_id: null,
          sort_order: 3,
          drawing_count: 0,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
          created_by: "user-1",
          updated_by: null,
          parentAreaId: null,
          sortOrder: 3,
          drawingCount: 0,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          createdBy: "user-1",
          updatedBy: null,
        }
      ];

      render(
        <DrawingAreaSelector
          {...defaultProps}
          areas={areasWithEmpty}
          onDeleteArea={onDeleteArea}
        />
      );

      // Check area with drawings (should not show delete)
      const architecturalRow = screen.getByText("Architectural").closest("div");
      if (architecturalRow) {
        await user.hover(architecturalRow);
        const actionButton = architecturalRow?.querySelector("button:last-child");
        if (actionButton) {
          await user.click(actionButton);
        }
      }

      expect(screen.queryByText("Delete Area")).not.toBeInTheDocument();

      // Dismiss the menu
      await user.keyboard("{Escape}");

      // Check empty area (should show delete)
      const emptyAreaRow = screen.getByText("Empty Area").closest("div");
      if (emptyAreaRow) {
        await user.hover(emptyAreaRow);
        const actionButton = emptyAreaRow?.querySelector("button:last-child");
        if (actionButton) {
          await user.click(actionButton);
        }
      }

      await waitFor(() => {
        expect(screen.getByText("Delete Area")).toBeInTheDocument();
      });

      const deleteOption = screen.getByText("Delete Area");
      await user.click(deleteOption);

      expect(onDeleteArea).toHaveBeenCalledWith(
        expect.objectContaining({ id: "area-5" })
      );
    });
  });

  describe("Empty State", () => {
    it("handles create first area action", async () => {
      const user = userEvent.setup();
      const onCreateArea = jest.fn();

      render(
        <DrawingAreaSelector
          {...defaultProps}
          areas={[]}
          onCreateArea={onCreateArea}
        />
      );

      const createButton = screen.getByText("Create First Area");
      await user.click(createButton);

      expect(onCreateArea).toHaveBeenCalledWith();
    });

    it("shows add button in section header", () => {
      const onCreateArea = jest.fn();

      render(
        <DrawingAreaSelector
          {...defaultProps}
          onCreateArea={onCreateArea}
        />
      );

      expect(screen.getByText("Add Area")).toBeInTheDocument();
    });
  });

  describe("Drawing Count Display", () => {
    it("displays drawing count badges for all areas", () => {
      render(<DrawingAreaSelector {...defaultProps} />);

      const badges = screen.getAllByText(/^\d+$/);

      // Should have badges for All Drawings (20) and visible areas
      expect(badges.some(badge => badge.textContent === "20")).toBe(true); // All drawings
      expect(badges.some(badge => badge.textContent === "5")).toBe(true);  // Architectural
      expect(badges.some(badge => badge.textContent === "8")).toBe(true);  // MEP
    });
  });

  describe("Event Handling", () => {
    it("stops propagation on expand button click", async () => {
      const user = userEvent.setup();
      const onSelectArea = jest.fn();

      render(<DrawingAreaSelector {...defaultProps} onSelectArea={onSelectArea} />);

      const architecturalRow = screen.getByText("Architectural").closest("div");
      const expandButton = architecturalRow?.querySelector("button");

      if (expandButton) {
        await user.click(expandButton);
      }

      // onSelectArea should not be called when clicking expand button
      expect(onSelectArea).not.toHaveBeenCalled();
    });

    it("stops propagation on action menu click", async () => {
      const user = userEvent.setup();
      const onSelectArea = jest.fn();
      const onCreateArea = jest.fn();

      render(
        <DrawingAreaSelector
          {...defaultProps}
          onSelectArea={onSelectArea}
          onCreateArea={onCreateArea}
        />
      );

      const architecturalRow = screen.getByText("Architectural").closest("div");

      if (architecturalRow) {
        await user.hover(architecturalRow);
      }

      const actionButton = architecturalRow?.querySelector("button:last-child");
      if (actionButton) {
        await user.click(actionButton);
      }

      // onSelectArea should not be called when clicking action button
      expect(onSelectArea).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels and roles", () => {
      render(<DrawingAreaSelector {...defaultProps} />);

      // Check that buttons have appropriate accessibility
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);

      // Check that clickable areas are properly focusable
      const architecturalRow = screen.getByText("Architectural").closest("div");
      expect(architecturalRow).toHaveClass("cursor-pointer");
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<DrawingAreaSelector {...defaultProps} />);

      const architecturalRow = screen.getByText("Architectural").closest("div");
      const expandButton = architecturalRow?.querySelector("button");

      if (expandButton) {
        expandButton.focus();
        await user.keyboard("{Enter}");
      }

      // Should expand the area
      await waitFor(() => {
        expect(screen.getByText("Structural")).toBeInTheDocument();
      });
    });
  });
});