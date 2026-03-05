import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import { CreateBudgetCodeModal } from "@/app/(main)/[projectId]/budget/setup/components/CreateBudgetCodeModal";
import type {
  BudgetCode,
  ChangeOrderFormState,
  ContractLineItem,
  LineItemFormState,
} from "../types";

interface PrimeContractDialogsProps {
  showAddLineItemDialog: boolean;
  setShowAddLineItemDialog: Dispatch<SetStateAction<boolean>>;
  lineItemForm: LineItemFormState;
  setLineItemForm: Dispatch<SetStateAction<LineItemFormState>>;
  budgetCodes: BudgetCode[];
  budgetCodesLoading: boolean;
  setShowCreateBudgetCodeModal: Dispatch<SetStateAction<boolean>>;
  showCreateBudgetCodeModal: boolean;
  projectId: string;
  handleBudgetCodeCreated: (budgetCodeId: string) => Promise<void>;
  isSubmittingLineItem: boolean;
  handleAddLineItem: () => Promise<void>;
  formatCurrency: (value: number | null | undefined) => string;
  showNewCoDialog: boolean;
  setShowNewCoDialog: Dispatch<SetStateAction<boolean>>;
  coForm: ChangeOrderFormState;
  setCoForm: Dispatch<SetStateAction<ChangeOrderFormState>>;
  isSubmittingCo: boolean;
  handleCreateCo: () => Promise<void>;
  showRejectCoDialog: boolean;
  setShowRejectCoDialog: Dispatch<SetStateAction<boolean>>;
  setRejectingCoId: Dispatch<SetStateAction<string | null>>;
  rejectionReason: string;
  setRejectionReason: Dispatch<SetStateAction<string>>;
  isRejectingCo: boolean;
  handleRejectCo: () => Promise<void>;
  lineItemToDelete: ContractLineItem | null;
  setLineItemToDelete: Dispatch<SetStateAction<ContractLineItem | null>>;
  isDeletingLineItem: boolean;
  handleDeleteLineItem: () => Promise<void>;
}

export function PrimeContractDialogs(props: PrimeContractDialogsProps) {
  const {
    showAddLineItemDialog,
    setShowAddLineItemDialog,
    lineItemForm,
    setLineItemForm,
    budgetCodes,
    budgetCodesLoading,
    setShowCreateBudgetCodeModal,
    showCreateBudgetCodeModal,
    projectId,
    handleBudgetCodeCreated,
    isSubmittingLineItem,
    handleAddLineItem,
    formatCurrency,
    showNewCoDialog,
    setShowNewCoDialog,
    coForm,
    setCoForm,
    isSubmittingCo,
    handleCreateCo,
    showRejectCoDialog,
    setShowRejectCoDialog,
    setRejectingCoId,
    rejectionReason,
    setRejectionReason,
    isRejectingCo,
    handleRejectCo,
    lineItemToDelete,
    setLineItemToDelete,
    isDeletingLineItem,
    handleDeleteLineItem,
  } = props;

  return (
    <>
      {/* Add Line Item Dialog */}
      <Modal open={showAddLineItemDialog} onOpenChange={setShowAddLineItemDialog}>
        <ModalContent className="sm:max-w-[500px]">
          <ModalHeader>
            <ModalTitle>Add Schedule of Values Line</ModalTitle>
            <ModalDescription>
              Add a new line to the Schedule of Values for this contract.
            </ModalDescription>
          </ModalHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Budget Code</Label>
              <BudgetCodeSelector
                value={lineItemForm.budgetCodeId}
                onValueChange={(value) =>
                  setLineItemForm((prev) => ({ ...prev, budgetCodeId: value }))
                }
                budgetCodes={budgetCodes}
                loading={budgetCodesLoading}
                onCreateNew={() => setShowCreateBudgetCodeModal(true)}
                placeholder="Select budget code..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="line-number">
                Line Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="line-number"
                type="number"
                min="1"
                step="1"
                value={lineItemForm.lineNumber}
                onChange={(e) =>
                  setLineItemForm({ ...lineItemForm, lineNumber: e.target.value })
                }
                placeholder="1"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={lineItemForm.description}
                onChange={(e) =>
                  setLineItemForm({ ...lineItemForm, description: e.target.value })
                }
                placeholder="Enter line item description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={lineItemForm.quantity}
                  onChange={(e) =>
                    setLineItemForm({ ...lineItemForm, quantity: e.target.value })
                  }
                  placeholder="1"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit-cost">Unit Cost</Label>
                <Input
                  id="unit-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={lineItemForm.unitCost}
                  onChange={(e) =>
                    setLineItemForm({ ...lineItemForm, unitCost: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="unit-of-measure">Unit of Measure</Label>
              <Input
                id="unit-of-measure"
                value={lineItemForm.unitOfMeasure}
                onChange={(e) =>
                  setLineItemForm({ ...lineItemForm, unitOfMeasure: e.target.value })
                }
                placeholder="e.g., SF, LF, EA"
              />
            </div>

            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-1">Total Cost</p>
              <p className="text-lg">
                {formatCurrency(
                  parseFloat(lineItemForm.quantity || "0") *
                    parseFloat(lineItemForm.unitCost || "0")
                )}
              </p>
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddLineItemDialog(false)}
              disabled={isSubmittingLineItem}
            >
              Cancel
            </Button>
            <Button onClick={handleAddLineItem} disabled={isSubmittingLineItem}>
              {isSubmittingLineItem ? "Adding..." : "Add SOV Line"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <CreateBudgetCodeModal
        open={showCreateBudgetCodeModal}
        onOpenChange={setShowCreateBudgetCodeModal}
        projectId={projectId}
        onSuccess={handleBudgetCodeCreated}
      />

      {/* New Change Order Dialog */}
      <Modal open={showNewCoDialog} onOpenChange={setShowNewCoDialog}>
        <ModalContent className="sm:max-w-md">
          <ModalHeader>
            <ModalTitle>New Change Order</ModalTitle>
            <ModalDescription>
              Create a new change order for this contract.
            </ModalDescription>
          </ModalHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="co-number">
                CO Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="co-number"
                value={coForm.change_order_number}
                onChange={(e) => setCoForm((prev) => ({ ...prev, change_order_number: e.target.value }))}
                placeholder="CO-001"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="co-description"
                value={coForm.description}
                onChange={(e) => setCoForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the change order..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="co-amount"
                type="number"
                step="0.01"
                value={coForm.amount}
                onChange={(e) => setCoForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-status">Status</Label>
              <select
                id="co-status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={coForm.status}
                onChange={(e) => setCoForm((prev) => ({ ...prev, status: e.target.value as "draft" | "pending" }))}
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowNewCoDialog(false)} disabled={isSubmittingCo}>
              Cancel
            </Button>
            <Button onClick={handleCreateCo} disabled={isSubmittingCo}>
              {isSubmittingCo ? "Creating..." : "Create Change Order"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reject Change Order Dialog */}
      <Modal open={showRejectCoDialog} onOpenChange={setShowRejectCoDialog}>
        <ModalContent className="sm:max-w-md">
          <ModalHeader>
            <ModalTitle>Reject Change Order</ModalTitle>
            <ModalDescription>
              Provide a reason for rejecting this change order.
            </ModalDescription>
          </ModalHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection-reason">
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this change order is being rejected..."
                rows={3}
              />
            </div>
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectCoDialog(false);
                setRejectingCoId(null);
                setRejectionReason("");
              }}
              disabled={isRejectingCo}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectCo}
              disabled={isRejectingCo || !rejectionReason.trim()}
            >
              {isRejectingCo ? "Rejecting..." : "Reject Change Order"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Line Item Confirmation */}
      <Modal open={!!lineItemToDelete} onOpenChange={(open) => { if (!open) setLineItemToDelete(null); }}>
        <ModalContent className="sm:max-w-md">
          <ModalHeader>
            <ModalTitle>Delete Line Item</ModalTitle>
            <ModalDescription>
              Are you sure you want to delete line item{" "}
              <strong>#{lineItemToDelete?.line_number}</strong>
              {lineItemToDelete?.description ? ` — ${lineItemToDelete.description}` : ""}?
              This action cannot be undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={() => setLineItemToDelete(null)} disabled={isDeletingLineItem}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLineItem}
              disabled={isDeletingLineItem}
            >
              {isDeletingLineItem ? "Deleting..." : "Delete"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
