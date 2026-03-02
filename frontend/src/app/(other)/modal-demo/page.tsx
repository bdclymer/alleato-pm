"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  OriginalBudgetModal,
  UnlockBudgetModal,
  CreateBudgetLineItemsModal,
} from "@/components/budget/modals";

/**
 * Modal Demo Page
 *
 * Test page for budget modals with different screen sizes
 *
 * Access at: /modal-demo
 */
export default function ModalDemoPage() {
  const [openModal, setOpenModal] = useState<string | null>(null);

  const mockData = {
    calculationMethod: "unit_price" as const,
    unitQty: 100,
    uom: "SF",
    unitCost: 25.5,
    originalBudget: 2550.0,
  };

  const mockCostCodes = [
    { code: "01-1000", description: "General Conditions" },
    { code: "01-3126", description: "Foundation Work" },
    { code: "01-3127", description: "Framing Labor" },
    { code: "01-3128", description: "Concrete Work" },
    { code: "03-1000", description: "Concrete" },
    { code: "04-2000", description: "Masonry" },
    { code: "05-1200", description: "Structural Steel" },
  ];

  const handleSaveOriginalBudget = async (data: any) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert("Budget saved successfully!");
  };

  const handleUnlockBudget = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    alert("Budget unlocked successfully!");
  };

  const handleCreateLineItems = async (items: any) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert(`Created ${items.length} budget line items!`);
  };

  return (
    <div className="min-h-screen bg-muted p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Budget Modals Demo
        </h1>
        <p className="text-foreground mb-8">
          Test the budget modals on different screen sizes. Resize your browser
          to see mobile responsiveness.
        </p>

        <div className="bg-background rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Available Modals
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Original Budget Modal */}
              <div className="border border-border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-foreground">Original Budget</h3>
                <p className="text-sm text-foreground">
                  Edit budget amount with calculation methods
                </p>
                <Button
                  onClick={() => setOpenModal("original-budget")}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Open Modal
                </Button>
              </div>

              {/* Unlock Budget Modal */}
              <div className="border border-border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-foreground">Unlock Budget</h3>
                <p className="text-sm text-foreground">
                  Confirmation dialog for unlocking
                </p>
                <Button
                  onClick={() => setOpenModal("unlock-budget")}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Open Modal
                </Button>
              </div>

              {/* Create Line Items Modal */}
              <div className="border border-border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-foreground">Create Line Items</h3>
                <p className="text-sm text-foreground">
                  Add multiple budget line items
                </p>
                <Button
                  onClick={() => setOpenModal("create-line-items")}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Open Modal
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Features Tested
            </h2>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-success mt-1">✓</span>
                <span>
                  <strong>Wider modals:</strong> Default max-w-4xl for better
                  content display
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-1">✓</span>
                <span>
                  <strong>Mobile responsive:</strong> Adapts layout for small
                  screens
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-1">✓</span>
                <span>
                  <strong>Procore design:</strong> Dark header with white text
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-1">✓</span>
                <span>
                  <strong>Keyboard navigation:</strong> ESC to close, TAB to
                  navigate
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-1">✓</span>
                <span>
                  <strong>Real-time calculations:</strong> Original Budget = Qty
                  × Cost
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-1">✓</span>
                <span>
                  <strong>Validation:</strong> Form validation before submission
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-1">✓</span>
                <span>
                  <strong>Loading states:</strong> Disabled buttons during save
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-1">✓</span>
                <span>
                  <strong>Unsaved changes warning:</strong> Confirmation before
                  closing
                </span>
              </li>
            </ul>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Testing Instructions
            </h2>
            <ol className="space-y-2 text-sm text-foreground list-decimal list-inside">
              <li>Open each modal to verify appearance</li>
              <li>
                Resize browser to test responsive behavior (mobile, tablet,
                desktop)
              </li>
              <li>Test keyboard navigation (ESC to close)</li>
              <li>Test form validation in editable modals</li>
              <li>Verify calculation updates in Original Budget modal</li>
              <li>Check unsaved changes warning when closing with edits</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Modals */}
      <OriginalBudgetModal
        isOpen={openModal === "original-budget"}
        onClose={() => setOpenModal(null)}
        costCode="01-3126"
        budgetLineId="test-123"
        currentData={mockData}
        onSave={handleSaveOriginalBudget}
      />

      <UnlockBudgetModal
        isOpen={openModal === "unlock-budget"}
        onClose={() => setOpenModal(null)}
        onConfirm={handleUnlockBudget}
      />

      <CreateBudgetLineItemsModal
        isOpen={openModal === "create-line-items"}
        onClose={() => setOpenModal(null)}
        onSave={handleCreateLineItems}
        availableCostCodes={mockCostCodes}
      />
    </div>
  );
}
