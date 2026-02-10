/**
 * Change Order Status Transition Validation
 *
 * Defines valid status transitions and provides utilities for validating
 * status changes in the change order workflow.
 *
 * Status Flow:
 * - draft → submitted (by creator)
 * - submitted → pending (auto after submission)
 * - pending → approved, rejected (by reviewer)
 * - rejected → draft (revision by creator)
 * - approved → executed (by authorized user)
 * - any → withdrawn (by creator)
 */

export type ChangeOrderStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "withdrawn"
  | "void";

export type ChangeOrderAction =
  | "submit"
  | "approve"
  | "reject"
  | "execute"
  | "withdraw"
  | "revise"
  | "edit"
  | "delete";

/**
 * Valid status transitions map
 * Key: current status
 * Value: array of valid next statuses
 */
const VALID_TRANSITIONS: Record<ChangeOrderStatus, ChangeOrderStatus[]> = {
  draft: ["submitted", "withdrawn", "void"],
  submitted: ["pending", "withdrawn", "void"],
  pending: ["approved", "rejected", "withdrawn", "void"],
  approved: ["executed", "void"],
  rejected: ["draft", "withdrawn", "void"],
  executed: ["void"],
  withdrawn: [],
  void: [],
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  const validNextStatuses = VALID_TRANSITIONS[currentStatus as ChangeOrderStatus];
  if (!validNextStatuses) return false;

  return validNextStatuses.includes(nextStatus as ChangeOrderStatus);
}

/**
 * Get available actions for a given status
 */
export function getAvailableActions(
  status: string,
  isCreator: boolean,
  isReviewer: boolean
): ChangeOrderAction[] {
  const actions: ChangeOrderAction[] = [];

  switch (status) {
    case "draft":
      if (isCreator) {
        actions.push("submit", "edit", "delete");
      }
      break;

    case "submitted":
    case "pending":
      if (isReviewer) {
        actions.push("approve", "reject");
      }
      if (isCreator) {
        actions.push("withdraw");
      }
      break;

    case "rejected":
      if (isCreator) {
        actions.push("revise", "delete");
      }
      break;

    case "approved":
      // Execute action available to authorized users (could add permission check here)
      actions.push("execute");
      break;

    case "executed":
      // View only - no actions available
      break;

    case "withdrawn":
    case "void":
      // Terminal states - no actions available
      break;
  }

  return actions;
}

/**
 * Check if an action is available for the current status
 */
export function isActionAvailable(
  status: string,
  action: ChangeOrderAction,
  isCreator: boolean,
  isReviewer: boolean
): boolean {
  const availableActions = getAvailableActions(status, isCreator, isReviewer);
  return availableActions.includes(action);
}

/**
 * Check if a status transition is irreversible
 * Returns true for actions that cannot be undone
 */
export function isIrreversibleAction(action: ChangeOrderAction): boolean {
  return ["approve", "execute", "withdraw"].includes(action);
}

/**
 * Get warning message for irreversible actions
 */
export function getActionWarning(action: ChangeOrderAction): string | null {
  switch (action) {
    case "approve":
      return "Approving this change order will update the contract's revised value. This action cannot be undone.";
    case "execute":
      return "Executing this change order will finalize it and commit the changes. This action cannot be undone.";
    case "withdraw":
      return "Withdrawing this change order will cancel it permanently. This action cannot be undone.";
    case "reject":
      return "Rejecting this change order will send it back to the creator for revision.";
    default:
      return null;
  }
}

/**
 * Get the next status after performing an action
 */
export function getNextStatus(
  currentStatus: string,
  action: ChangeOrderAction
): ChangeOrderStatus | null {
  const statusMap: Record<string, Record<ChangeOrderAction, ChangeOrderStatus | null>> = {
    draft: {
      submit: "submitted",
      approve: null,
      reject: null,
      execute: null,
      withdraw: "withdrawn",
      revise: null,
      edit: "draft",
      delete: null,
    },
    submitted: {
      submit: null,
      approve: null,
      reject: null,
      execute: null,
      withdraw: "withdrawn",
      revise: null,
      edit: null,
      delete: null,
    },
    pending: {
      submit: null,
      approve: "approved",
      reject: "rejected",
      execute: null,
      withdraw: "withdrawn",
      revise: null,
      edit: null,
      delete: null,
    },
    approved: {
      submit: null,
      approve: null,
      reject: null,
      execute: "executed",
      withdraw: null,
      revise: null,
      edit: null,
      delete: null,
    },
    rejected: {
      submit: null,
      approve: null,
      reject: null,
      execute: null,
      withdraw: "withdrawn",
      revise: "draft",
      edit: "draft",
      delete: null,
    },
  };

  return statusMap[currentStatus]?.[action] ?? null;
}

/**
 * Get user-friendly status label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    pending: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
    executed: "Executed",
    withdrawn: "Withdrawn",
    void: "Void",
  };

  return labels[status] || status;
}

/**
 * Get user-friendly action label
 */
export function getActionLabel(action: ChangeOrderAction): string {
  const labels: Record<ChangeOrderAction, string> = {
    submit: "Submit for Review",
    approve: "Approve",
    reject: "Reject",
    execute: "Execute",
    withdraw: "Withdraw",
    revise: "Revise",
    edit: "Edit",
    delete: "Delete",
  };

  return labels[action];
}
