"use client";

import { BaseModal, ModalBody, ModalFooter } from "./BaseModal";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface UnlockBudgetModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * UnlockBudgetModal - Confirmation dialog for unlocking budget
 *
 * Features:
 * - Warning message about preserving modifications
 * - Two-button action (Cancel / Preserve and Unlock)
 * - Mobile responsive
 */
export function UnlockBudgetModal({
  open,
  onClose,
  onConfirm,
}: UnlockBudgetModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <BaseModal
      isOpen={open}
      onClose={onClose}
      title="Unlock the Budget"
      size="md"
    >
      <ModalBody className="py-6 bg-background">
        <div className="rounded-lg border border-border bg-muted/40 p-4 flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              Unlocking the Budget will preserve your Budget Modifications.
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              You can edit Original Budget amounts after unlocking. Lock again
              anytime.
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm}>
          Preserve and Unlock
        </Button>
      </ModalFooter>
    </BaseModal>
  );
}
