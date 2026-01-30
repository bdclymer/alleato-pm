"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { COST_TYPES, getCostTypeLabel } from "@/constants/budget";
import { DivisionTree, toggleDivisionInSet } from "./DivisionTree";
import type { AvailableCostCode, NewBudgetCodeData } from "../types";

interface CreateBudgetCodeModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onOpenChange: (open: boolean) => void;
  /** Project ID for creating the budget code */
  projectId: string;
  /** Callback when a budget code is successfully created */
  onSuccess: (budgetCodeId: string) => void;
}

export function CreateBudgetCodeModal({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreateBudgetCodeModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingCostCodes, setLoadingCostCodes] = useState(false);
  const [availableCostCodes, setAvailableCostCodes] = useState<
    AvailableCostCode[]
  >([]);
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(
    new Set(),
  );
  const [formData, setFormData] = useState<NewBudgetCodeData>({
    costCodeId: "",
    costType: "R",
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch cost codes when modal opens
  useEffect(() => {
    if (!open) return;

    const fetchCostCodes = async () => {
      try {
        setLoadingCostCodes(true);
        setError(null);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from("cost_codes")
          .select("id, title, status, division_title")
          .eq("status", "Active")
          .order("id", { ascending: true });

        if (fetchError) {
          setError("Failed to load cost codes");
          return;
        }

        setAvailableCostCodes(data || []);
      } catch (err) {
        setError("Failed to load cost codes");
      } finally {
        setLoadingCostCodes(false);
      }
    };

    fetchCostCodes();
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({ costCodeId: "", costType: "R" });
      setExpandedDivisions(new Set());
      setError(null);
    }
  }, [open]);

  // Group cost codes by division
  const groupedCostCodes = useMemo(() => {
    return availableCostCodes.reduce(
      (acc, code) => {
        const divisionKey = code.division_title || "Other";
        if (!acc[divisionKey]) {
          acc[divisionKey] = [];
        }
        acc[divisionKey].push(code);
        return acc;
      },
      {} as Record<string, AvailableCostCode[]>,
    );
  }, [availableCostCodes]);

  // Transform for DivisionTree
  const treeItems = useMemo(() => {
    const result: Record<
      string,
      Array<{ id: string; label: string; description: string | null }>
    > = {};
    for (const [division, codes] of Object.entries(groupedCostCodes)) {
      result[division] = codes.map((code) => ({
        id: code.id,
        label: `${code.division_title || code.id} - ${code.title}`,
        description: code.title,
      }));
    }
    return result;
  }, [groupedCostCodes]);

  const selectedCostCode = availableCostCodes.find(
    (cc) => cc.id === formData.costCodeId,
  );

  const handleSubmit = async () => {
    if (!formData.costCodeId || !formData.costType) {
      setError("Please select a cost code and cost type");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cost_code_id: formData.costCodeId,
          cost_type_id: formData.costType,
          description: selectedCostCode?.title || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to create budget code");
      }

      const result = await response.json();
      onSuccess(result.budgetCode?.id);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create budget code",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Budget Code</DialogTitle>
          <DialogDescription>
            Add a new budget code that can be used for line items in this
            project.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="costCode">Cost Code*</Label>
            {loadingCostCodes ? (
              <div className="border rounded-md p-3 text-sm text-muted-foreground">
                Loading cost codes...
              </div>
            ) : (
              <DivisionTree
                groupedItems={treeItems}
                expandedDivisions={expandedDivisions}
                onToggleDivision={(division) =>
                  setExpandedDivisions(
                    toggleDivisionInSet(expandedDivisions, division),
                  )
                }
                onSelectItem={(item) =>
                  setFormData({ ...formData, costCodeId: item.id })
                }
                selectedId={formData.costCodeId}
              />
            )}
            <p className="text-sm text-muted-foreground">
              Click on a division to expand and select a cost code
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="costType">Cost Type*</Label>
            <Select
              value={formData.costType}
              onValueChange={(value) =>
                setFormData({ ...formData, costType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COST_TYPES.map((type) => (
                  <SelectItem key={type.code} value={type.code}>
                    {type.code} - {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium text-foreground">Preview:</p>
            <p className="text-sm text-foreground mt-1">
              {selectedCostCode ? (
                <>
                  {selectedCostCode.division_title || selectedCostCode.id}.
                  {formData.costType} – {selectedCostCode.title} –{" "}
                  {getCostTypeLabel(formData.costType)}
                </>
              ) : (
                "Select cost code and cost type to see preview"
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !formData.costCodeId || !formData.costType}
          >
            {loading ? "Creating..." : "Create Budget Code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
