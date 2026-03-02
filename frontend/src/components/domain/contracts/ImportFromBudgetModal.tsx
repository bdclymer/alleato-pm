"use client";

import * as React from "react";
import { Upload, AlertCircle, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BudgetLineItem {
  id: string;
  cost_code_id: string;
  cost_type_id: string;
  description: string;
  original_amount: number;
  cost_code?: {
    id: string;
    title: string;
  };
  cost_type?: {
    code: string;
    name: string;
  };
}

interface ImportFromBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId?: string;
  onImportSuccess?: (items: unknown[]) => void;
}

export function ImportFromBudgetModal({
  open,
  onOpenChange,
  projectId,
  contractId,
  onImportSuccess,
}: ImportFromBudgetModalProps) {
  const [budgetLines, setBudgetLines] = React.useState<BudgetLineItem[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch budget lines when modal opens
  React.useEffect(() => {
    if (open && projectId) {
      fetchBudgetLines();
    } else {
      // Reset state when modal closes
      setBudgetLines([]);
      setSelectedIds(new Set());
      setSearchQuery("");
      setError(null);
    }
  }, [open, projectId]);

  const fetchBudgetLines = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/budget`);
      if (!response.ok) {
        throw new Error("Failed to fetch budget lines");
      }
      const data = await response.json();
      setBudgetLines(data.lineItems || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load budget");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filteredIds = filteredLines.map((line) => line.id);
      setSelectedIds(new Set(filteredIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectLine = (lineId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(lineId);
    } else {
      newSelected.delete(lineId);
    }
    setSelectedIds(newSelected);
  };

  const filteredLines = React.useMemo(() => {
    if (!searchQuery.trim()) return budgetLines;
    const query = searchQuery.toLowerCase();
    return budgetLines.filter(
      (line) =>
        line.cost_code_id?.toLowerCase().includes(query) ||
        line.description?.toLowerCase().includes(query) ||
        line.cost_code?.title?.toLowerCase().includes(query) ||
        line.cost_type?.code?.toLowerCase().includes(query),
    );
  }, [budgetLines, searchQuery]);

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one budget line to import");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      // If we have a contract ID, use the API endpoint
      if (contractId) {
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/line-items/import`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: "budget",
              lineItemIds: Array.from(selectedIds),
            }),
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to import from budget");
        }

        toast.success(
          `Successfully imported ${result.importedCount} of ${selectedIds.size} line items`,
        );
        onImportSuccess?.(result);
        onOpenChange(false);
      } else {
        // For new contracts, just return the selected budget lines
        const selectedLines = budgetLines.filter((line) =>
          selectedIds.has(line.id),
        );
        onImportSuccess?.(selectedLines);
        onOpenChange(false);
        toast.success(`Added ${selectedLines.length} line items from budget`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to import from budget";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={isImporting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import from Budget</DialogTitle>
          <DialogDescription>
            Select budget line items to import into the contract schedule of
            values
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search */}
          <div className="flex items-center gap-2 px-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by cost code, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <div className="text-sm text-muted-foreground">
              {selectedIds.size} of {filteredLines.length} selected
            </div>
          </div>

          {/* Budget Lines Table */}
          <div className="flex-1 overflow-hidden border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-border border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Loading budget lines...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-red-600">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">{error}</p>
                  <Button
                    onClick={fetchBudgetLines}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : filteredLines.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">
                    {budgetLines.length === 0
                      ? "No budget lines found. Please add budget items first."
                      : "No budget lines match your search."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-auto h-full">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0 border-b">
                    <tr>
                      <th className="px-4 py-4 text-left w-12">
                        <Checkbox
                          checked={
                            filteredLines.length > 0 &&
                            filteredLines.every((line) =>
                              selectedIds.has(line.id),
                            )
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-foreground">
                        Cost Code
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-foreground">
                        Type
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-foreground">
                        Description
                      </th>
                      <th className="px-4 py-4 text-right text-sm font-medium text-foreground">
                        Budget Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLines.map((line) => (
                      <tr
                        key={line.id}
                        className={cn(
                          "border-b hover:bg-muted cursor-pointer",
                          selectedIds.has(line.id) && "bg-blue-50",
                        )}
                        onClick={() =>
                          handleSelectLine(line.id, !selectedIds.has(line.id))
                        }
                      >
                        <td className="px-4 py-4">
                          <Checkbox
                            checked={selectedIds.has(line.id)}
                            onCheckedChange={(checked) =>
                              handleSelectLine(line.id, checked === true)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-4 text-sm font-mono">
                          {line.cost_code_id}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {line.cost_type?.code || "-"}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div>
                            {line.cost_code?.title || line.description}
                            {line.description && line.cost_code?.title && (
                              <div className="text-xs text-muted-foreground">
                                {line.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-medium">
                          {formatCurrency(line.original_amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 bg-red-50 p-4 rounded-md text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={selectedIds.size === 0 || isImporting || isLoading}
          >
            {isImporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import {selectedIds.size > 0 && `(${selectedIds.size})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
