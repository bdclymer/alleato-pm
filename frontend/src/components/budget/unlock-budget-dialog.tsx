"use client";

import * as React from "react";
import { useState } from "react";
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UnlockBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onUnlockSuccess: () => void;
}

export function UnlockBudgetDialog({
  open,
  onOpenChange,
  projectId,
  onUnlockSuccess,
}: UnlockBudgetDialogProps) {
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async (preserveLineItems: boolean) => {
    setUnlocking(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/budget/lock`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preserveLineItems }),
      });

      if (response.ok) {
        const data = await response.json();

        // Show success message based on choice
        if (preserveLineItems) {
          toast.success("Budget unlocked successfully", {
            description: "All budget line items have been preserved.",
          });
        } else {
          const deletedCount = data.deletedCount || 0;
          toast.success(`Budget unlocked and ${deletedCount} line items deleted`, {
            description: "The budget is now editable with a clean slate.",
          });
        }

        onUnlockSuccess();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to unlock budget");
      }
    } catch (error) {
      toast.error("Failed to unlock budget", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Unlock Budget</DialogTitle>
          <DialogDescription>
            Choose how you want to unlock this budget. This action will allow editing of budget line items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unlocking the budget will allow changes to budget line items. Choose whether to keep or remove existing line items.
            </AlertDescription>
          </Alert>

          {/* Option 1: Preserve Line Items */}
          <div className="border rounded-lg p-6 space-y-4 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-base">Preserve Line Items</h3>
                <p className="text-sm text-muted-foreground">
                  Keep all existing budget line items. Use this when you need to make minor adjustments or add new items without losing current data.
                </p>
                <Button
                  onClick={() => handleUnlock(true)}
                  disabled={unlocking}
                  className="w-full sm:w-auto"
                  variant="default"
                >
                  {unlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Unlock and Preserve
                </Button>
              </div>
            </div>
          </div>

          {/* Option 2: Delete All Line Items */}
          <div className="border rounded-lg p-6 space-y-4 hover:border-destructive/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-base">Delete All Line Items</h3>
                <p className="text-sm text-muted-foreground">
                  Remove all budget line items and start fresh. Use this when you need to rebuild the budget from scratch. <strong>This cannot be undone.</strong>
                </p>
                <Button
                  onClick={() => handleUnlock(false)}
                  disabled={unlocking}
                  className="w-full sm:w-auto"
                  variant="destructive"
                >
                  {unlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Unlock and Delete All
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={unlocking}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
