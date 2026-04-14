"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

import {
  BudgetOverlay,
  BudgetOverlayBody,
  BudgetOverlayFooter,
  BudgetOverlayHeader,
} from "@/components/ui/budget-overlay";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch, ApiError } from "@/lib/api-client";

interface UnlockBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onUnlockSuccess: () => void;
}

interface ActiveModification {
  id: number | string;
  number: string | null;
  status: string;
}

export function UnlockBudgetDialog({
  open,
  onOpenChange,
  projectId,
  onUnlockSuccess,
}: UnlockBudgetDialogProps) {
  const [unlocking, setUnlocking] = useState(false);
  const [checkingMods, setCheckingMods] = useState(true);
  const [activeMods, setActiveMods] = useState<ActiveModification[]>([]);

  // On dialog open, fetch modifications and filter to non-void to determine
  // whether unlock is allowed. This mirrors the backend guard in
  // /api/projects/[projectId]/budget/lock (DELETE) which returns 409
  // BUDGET_HAS_ACTIVE_MODIFICATIONS when any non-void modification exists.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setCheckingMods(true);
    setActiveMods([]);

    (async () => {
      try {
        const data = await apiFetch<{ modifications?: ActiveModification[] } | ActiveModification[]>(
          `/api/projects/${projectId}/budget/modifications`,
        );

        const list: ActiveModification[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.modifications)
            ? data.modifications
            : [];

        const active = list.filter((m) => m.status !== "void");
        if (!cancelled) setActiveMods(active);
      } catch (error) {
        // If we can't load modifications, don't silently allow unlock —
        // the backend will still enforce the check, but we should warn.
        if (!cancelled) {
          toast.error("Could not check budget modifications", {
            description:
              error instanceof Error
                ? error.message
                : "Unable to verify whether unlock is allowed.",
          });
        }
      } finally {
        if (!cancelled) setCheckingMods(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const handleUnlock = async (preserveLineItems: boolean) => {
    setUnlocking(true);

    try {
      const data = await apiFetch<{ deletedCount?: number }>(
        `/api/projects/${projectId}/budget/lock`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preserveLineItems }),
        },
      );

      if (preserveLineItems) {
        toast.success("Budget unlocked successfully", {
          description: "All budget line items have been preserved.",
        });
      } else {
        const deletedCount = data.deletedCount || 0;
        toast.success(
          `Budget unlocked and ${deletedCount} line items deleted`,
          {
            description: "The budget is now editable with a clean slate.",
          },
        );
      }

      onUnlockSuccess();
      onOpenChange(false);
    } catch (error) {
      // Defensive: if a modification was added between open and click,
      // backend returns 409 BUDGET_HAS_ACTIVE_MODIFICATIONS. Refresh the
      // dialog state so the user sees the blocked view.
      if (error instanceof ApiError && error.status === 409) {
        const body = error.body as
          | { modifications?: ActiveModification[]; modificationCount?: number }
          | undefined;
        const mods = Array.isArray(body?.modifications) ? body.modifications : [];
        setActiveMods(mods);
        toast.error("Unlock blocked", {
          description:
            error.message ||
            "Budget modifications must be deleted or voided before unlocking.",
        });
      } else {
        toast.error("Could not unlock budget", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred — please try again",
        });
      }
    } finally {
      setUnlocking(false);
    }
  };

  const isBlocked = activeMods.length > 0;

  return (
    <BudgetOverlay
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      size="md"
      className="flex h-full flex-col"
    >
      <BudgetOverlayHeader
        title="Unlock Budget"
        description={
          isBlocked
            ? "Unlock is blocked while active budget modifications exist."
            : "Choose how you want to unlock this budget. This action will allow editing of budget line items."
        }
      />

      <BudgetOverlayBody className="space-y-4 px-4 py-4 sm:px-6">
        {checkingMods ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking budget modifications…
          </div>
        ) : isBlocked ? (
          <BlockedView modifications={activeMods} />
        ) : (
          <UnlockOptions
            unlocking={unlocking}
            onUnlock={handleUnlock}
          />
        )}
      </BudgetOverlayBody>

      <BudgetOverlayFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={unlocking}
        >
          {isBlocked ? "Close" : "Cancel"}
        </Button>
      </BudgetOverlayFooter>
    </BudgetOverlay>
  );
}

function BlockedView({ modifications }: { modifications: ActiveModification[] }) {
  const count = modifications.length;
  const noun = count === 1 ? "modification" : "modifications";

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          <strong>Budget cannot be unlocked.</strong> This budget has {count}{" "}
          active {noun}. Delete or void each {count === 1 ? "one" : noun} from
          the Budget Modifications tab before unlocking the budget.
        </AlertDescription>
      </Alert>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Blocking modifications ({count})
        </div>
        <ul className="divide-y divide-border">
          {modifications.map((m) => (
            <li
              key={String(m.id)}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  #{m.number ?? m.id}
                </span>
                <span className="text-foreground">
                  Modification {m.number ?? `#${m.id}`}
                </span>
              </div>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {m.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        Procore parity rule: a locked budget with pending changes must have
        every modification resolved before the lock can be removed.
      </p>
    </div>
  );
}

function UnlockOptions({
  unlocking,
  onUnlock,
}: {
  unlocking: boolean;
  onUnlock: (preserveLineItems: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Warning Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unlocking the budget will allow changes to budget line items. Choose
          whether to keep or remove existing line items.
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
              Keep all existing budget line items. Use this when you need to
              make minor adjustments or add new items without losing current
              data.
            </p>
            <Button
              onClick={() => onUnlock(true)}
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
              Remove all budget line items and start fresh. Use this when you
              need to rebuild the budget from scratch.{" "}
              <strong>This cannot be undone.</strong>
            </p>
            <Button
              onClick={() => onUnlock(false)}
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
  );
}
