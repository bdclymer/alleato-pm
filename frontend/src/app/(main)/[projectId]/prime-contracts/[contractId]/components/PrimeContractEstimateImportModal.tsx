"use client";

import * as React from "react";
import { CheckCircle2, FileSpreadsheet, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoAlert } from "@/components/ds/InfoAlert";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { BudgetCode, ContractLineItem } from "../types";

interface EstimateSovPreviewRow {
  sourceSheet: "General Conditions" | "Details";
  rowNumber: number;
  costCode: string;
  costType: string;
  costTypeCode: string;
  description: string;
  workDescription: string | null;
  budgetAmount: number;
  unitQty: number | null;
  unitOfMeasure: string | null;
  unitCost: number | null;
  includeInPrimeContract: boolean;
  includeInOwnerSov: boolean;
  alreadyInSov: boolean;
  selectedByDefault: boolean;
  warnings: string[];
}

interface EstimateSovPreview {
  importableCount: number;
  ownerSovCount: number;
  selectedByDefaultCount: number;
  existingSovMatchCount: number;
  totalBudgetAmount: number;
  warnings: string[];
  rows: EstimateSovPreviewRow[];
}

interface PrimeContractEstimateImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contractId: string;
  budgetCodes: BudgetCode[];
  existingLineItems: ContractLineItem[];
  onImported: (items: ContractLineItem[]) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDescription(row: EstimateSovPreviewRow): string {
  return row.workDescription
    ? `${row.description} - ${row.workDescription}`
    : row.description;
}

function findBudgetCodeId(row: EstimateSovPreviewRow, budgetCodes: BudgetCode[]): string | null {
  const match = budgetCodes.find(
    (code) =>
      code.legacyCostCodeId === row.costCode &&
      (!code.costType || code.costType === row.costTypeCode),
  );
  return match?.id ?? null;
}

export function PrimeContractEstimateImportModal({
  open,
  onOpenChange,
  projectId,
  contractId,
  budgetCodes,
  existingLineItems,
  onImported,
}: PrimeContractEstimateImportModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<EstimateSovPreview | null>(null);
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setPreview(null);
      setSelectedRows(new Set());
      setIsPreviewing(false);
      setIsImporting(false);
      setError(null);
    }
  }, [open]);

  const previewRows = preview?.rows.filter((row) => row.includeInOwnerSov) ?? [];
  const selectedPreviewRows = previewRows.filter((row) =>
    selectedRows.has(`${row.sourceSheet}:${row.rowNumber}`),
  );

  const handleFileSelect = (selectedFile: File) => {
    const isExcel = selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xlsm");
    if (!isExcel) {
      setError("Upload an Alleato estimate workbook as .xlsx or .xlsm.");
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setPreview(null);
    setSelectedRows(new Set());
    setError(null);
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsPreviewing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiFetch<EstimateSovPreview>(
        `/api/projects/${projectId}/contracts/${contractId}/line-items/estimate-import/preview`,
        { method: "POST", body: formData },
      );
      setPreview(result);
      setSelectedRows(
        new Set(
          result.rows
            .filter((row) => row.selectedByDefault)
            .map((row) => `${row.sourceSheet}:${row.rowNumber}`),
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to preview estimate workbook.";
      setError(message);
      toast.error(message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const toggleRow = (row: EstimateSovPreviewRow, checked: boolean) => {
    const key = `${row.sourceSheet}:${row.rowNumber}`;
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleAppendToSov = async () => {
    if (selectedPreviewRows.length === 0) return;
    setIsImporting(true);
    setError(null);

    try {
      const maxLineNumber = existingLineItems.reduce(
        (max, item) => Math.max(max, item.line_number),
        0,
      );
      const createdItems: ContractLineItem[] = [];

      for (const [index, row] of selectedPreviewRows.entries()) {
        const created = await apiFetch<ContractLineItem>(
          `/api/projects/${projectId}/contracts/${contractId}/line-items`,
          {
            method: "POST",
            body: JSON.stringify({
              line_number: maxLineNumber + index + 1,
              description: formatDescription(row),
              cost_code_id: row.costCode,
              budget_code_id: findBudgetCodeId(row, budgetCodes),
              quantity: row.unitQty && row.unitQty > 0 ? row.unitQty : 1,
              unit_of_measure: row.unitOfMeasure || "LS",
              unit_cost: row.budgetAmount,
            }),
          },
        );
        createdItems.push(created);
      }

      toast.success(`Added ${createdItems.length} SOV line${createdItems.length === 1 ? "" : "s"}.`);
      onImported(createdItems);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add estimate rows to SOV.";
      setError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={(nextOpen) => !isImporting && onOpenChange(nextOpen)}>
      <ModalContent className="sm:max-w-4xl">
        <ModalHeader>
          <ModalTitle>Import Estimate To SOV</ModalTitle>
          <ModalDescription>
            Preview the estimate workbook and append selected rows to this prime contract.
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-5 py-2">
          <InfoAlert variant="info">
            <p className="font-semibold">Nothing is overwritten.</p>
            <p className="text-muted-foreground">
              Existing SOV cost codes are detected and left unselected until you choose otherwise.
            </p>
          </InfoAlert>

          <div className="space-y-2">
            {!file ? (
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full justify-start gap-3 px-4 py-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-5 w-5" />
                <span className="text-left">
                  <span className="block text-sm font-medium">Choose estimate workbook</span>
                  <span className="block text-xs text-muted-foreground">.xlsx or .xlsm</span>
                </span>
              </Button>
            ) : (
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setSelectedRows(new Set());
                  }}
                  disabled={isImporting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
            />

            {error ? (
              <InfoAlert variant="error">{error}</InfoAlert>
            ) : null}
          </div>

          {preview ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">SOV candidates</p>
                  <p className="text-sm font-semibold text-foreground">{preview.ownerSovCount}</p>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Selected</p>
                  <p className="text-sm font-semibold text-foreground">{selectedRows.size}</p>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Already in SOV</p>
                  <p className="text-sm font-semibold text-foreground">{preview.existingSovMatchCount}</p>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Workbook total</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(preview.totalBudgetAmount)}
                  </p>
                </div>
              </div>

              {preview.warnings.length > 0 ? (
                <InfoAlert variant="warning">
                  <p className="font-medium">{preview.warnings.length} workbook warning{preview.warnings.length === 1 ? "" : "s"}</p>
                  <ul className="mt-1 max-h-20 space-y-0.5 overflow-y-auto text-xs">
                    {preview.warnings.slice(0, 5).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                    {preview.warnings.length > 5 ? (
                      <li className="italic">+{preview.warnings.length - 5} more</li>
                    ) : null}
                  </ul>
                </InfoAlert>
              ) : null}

              <div className="max-h-96 overflow-auto rounded-md border">
                <div className="grid grid-cols-[36px_96px_1fr_80px_112px] gap-3 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span />
                  <span>Code</span>
                  <span>Description</span>
                  <span>Type</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="divide-y">
                  {previewRows.map((row) => {
                    const key = `${row.sourceSheet}:${row.rowNumber}`;
                    const hasWarnings = row.warnings.length > 0;
                    const disabled = row.alreadyInSov || hasWarnings;
                    return (
                      <div
                        key={key}
                        className={cn(
                          "grid grid-cols-[36px_96px_1fr_80px_112px] gap-3 px-3 py-2 text-xs",
                          disabled && "bg-muted/20 text-muted-foreground",
                        )}
                      >
                        <Checkbox
                          checked={selectedRows.has(key)}
                          disabled={disabled || isImporting}
                          onCheckedChange={(checked) => toggleRow(row, checked === true)}
                          aria-label={`Select ${row.costCode}`}
                        />
                        <span className="font-medium">{row.costCode}</span>
                        <span className="min-w-0 truncate">
                          {formatDescription(row)}
                          {row.alreadyInSov ? " (already in SOV)" : ""}
                          {hasWarnings ? " (review warning)" : ""}
                        </span>
                        <span>{row.costTypeCode}</span>
                        <span className="text-right tabular-nums">{formatCurrency(row.budgetAmount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          {!preview ? (
            <Button onClick={handlePreview} disabled={!file || isPreviewing || isImporting}>
              <Upload className="h-4 w-4" />
              {isPreviewing ? "Analyzing..." : "Preview Workbook"}
            </Button>
          ) : (
            <Button onClick={handleAppendToSov} disabled={selectedRows.size === 0 || isImporting}>
              {isImporting ? "Adding..." : `Add ${selectedRows.size} To SOV`}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
