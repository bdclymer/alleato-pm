"use client";

import * as React from "react";
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import {
  BaseModal,
  ModalBody,
  ModalFooter,
} from "@/components/budget/modals/BaseModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportResult {
  success: boolean;
  importedCount: number;
  totalRows: number;
  error?: string;
  errors?: string[];
  warnings?: string[];
  skippedRows?: number;
  message: string;
}

interface EstimateImportPreviewRow {
  sourceSheet: "General Conditions" | "Details";
  rowNumber: number;
  costCode: string;
  costType: string;
  costTypeCode: string;
  description: string;
  workDescription: string | null;
  budgetAmount: number;
  includeInBudget: boolean;
  includeInOwnerSov: boolean;
  warnings: string[];
}

interface EstimateImportPreview {
  importableCount: number;
  ownerSovCount: number;
  totalRows: number;
  skippedRows: number;
  totalBudgetAmount: number;
  warnings: string[];
  rows: EstimateImportPreviewRow[];
}

interface ImportBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

export function ImportBudgetModal({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: ImportBudgetModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const [sourceType, setSourceType] = React.useState<"budget" | "estimate">("estimate");
  const [estimatePreview, setEstimatePreview] = React.useState<EstimateImportPreview | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
      setIsImporting(false);
      setIsPreviewing(false);
      setIsDragging(false);
      setImportResult(null);
      setSourceType("estimate");
      setEstimatePreview(null);
    }
  }, [open]);

  const handleDownloadTemplate = () => {
    try {
      const link = document.createElement("a");
      link.href = "/alleato-budget-template.xlsx";
      link.download = `budget-template-project-${projectId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Template downloaded successfully");
    } catch {
      toast.error("Failed to download template");
    }
  };

  const validateFile = (selectedFile: File): string | null => {
    const validExcelTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const validCsvTypes = ["text/csv", "application/csv"];
    const isExcel =
      validExcelTypes.includes(selectedFile.type) ||
      selectedFile.name.endsWith(".xlsx") ||
      selectedFile.name.endsWith(".xlsm");
    const isCsv =
      validCsvTypes.includes(selectedFile.type) ||
      selectedFile.name.endsWith(".csv");
    if (!isExcel && !isCsv) return "Please upload a valid Excel (.xlsx/.xlsm) or CSV (.csv) file";
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) return "File size must be less than 10MB";
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setError(null);
    setEstimatePreview(null);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    setEstimatePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePreviewEstimate = async () => {
    if (!file) return;
    setIsPreviewing(true);
    setError(null);
    setEstimatePreview(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiFetch<EstimateImportPreview>(
        `/api/projects/${projectId}/budget/estimate-import/preview`,
        { method: "POST", body: formData },
      );
      setEstimatePreview(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to preview estimate workbook";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await apiFetch<ImportResult>(`/api/projects/${projectId}/budget/import`, {
        method: "POST",
        body: formData,
      });
      setImportResult(result);

      let message = `Budget imported successfully! ${result.importedCount || 0} line item(s) added.`;
      if (result.warnings?.length || result.skippedRows) {
        const issues = [];
        if (result.warnings?.length) issues.push(`${result.warnings.length} warnings`);
        if (result.skippedRows) issues.push(`${result.skippedRows} skipped rows`);
        message += ` (${issues.join(", ")})`;
      }

      toast.success(message);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import budget";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const previewRows = estimatePreview?.rows.filter((row) => row.includeInBudget).slice(0, 8) ?? [];

  return (
    <BaseModal
      isOpen={open}
      onClose={() => { if (!isImporting) onOpenChange(false); }}
      title="Import Budget"
      size="md"
    >
      <ModalBody>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSourceType("estimate");
                setEstimatePreview(null);
                setError(null);
              }}
              className={cn(
                "h-auto justify-start rounded-md px-3 py-3 text-left transition-colors",
                sourceType === "estimate"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <span className="block min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ClipboardCheck className="h-4 w-4" />
                  Estimate workbook
                </span>
                <span className="mt-1 block whitespace-normal text-xs text-muted-foreground">
                  Alleato estimate template to budget-ready rows
                </span>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSourceType("budget");
                setEstimatePreview(null);
                setError(null);
              }}
              className={cn(
                "h-auto justify-start rounded-md px-3 py-3 text-left transition-colors",
                sourceType === "budget"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <span className="block min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  Budget template
                </span>
                <span className="mt-1 block whitespace-normal text-xs text-muted-foreground">
                  Existing CSV/XLSX budget import format
                </span>
              </span>
            </Button>
          </div>

          {/* Notes */}
          <div className="rounded-lg bg-warning/10 p-4 text-warning flex items-start gap-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-foreground">
                {sourceType === "estimate" ? "Estimate import behavior" : "Before you import"}
              </p>
              <ul className="text-muted-foreground space-y-0.5 list-disc list-inside">
                {sourceType === "estimate" ? (
                  <>
                    <li>Rows with valid cost types create project budget codes and budget lines</li>
                    <li>Rows with amounts are identified for the owner SOV migration step</li>
                  </>
                ) : (
                  <>
                    <li>Budget uses project currency — no conversion is applied</li>
                    <li>Take a snapshot first to preserve current state</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              How to import
            </p>
            {sourceType === "estimate" ? (
              <ol className="text-sm text-foreground space-y-1 list-decimal list-inside ml-0.5">
                <li>Upload the Alleato estimate workbook</li>
                <li>Review the parsed cost codes, cost types, and amounts</li>
                <li>Import the validated rows into this project budget</li>
              </ol>
            ) : (
              <ol className="text-sm text-foreground space-y-1 list-decimal list-inside ml-0.5">
                <li>Download the Excel template below</li>
                <li>Fill in your budget line items</li>
                <li>Upload the completed file</li>
              </ol>
            )}
          </div>

          {/* Template download */}
          {sourceType === "budget" ? (
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Budget Import Template</p>
                <p className="text-xs text-muted-foreground">Excel format (.xlsx)</p>
              </div>
            </div>
            <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
              <Upload className="h-3.5 w-3.5" />
              Download
            </Button>
            </div>
          ) : null}

          {/* File upload */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Excel or CSV file <span className="text-destructive">*</span>
            </p>

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {sourceType === "estimate" ? ".xlsx or .xlsm" : ".xlsx, .xlsm, or .csv"}, max 10 MB
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleRemoveFile}
                    variant="ghost"
                    size="icon"
                    disabled={isImporting}
                    className="h-7 w-7 shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-destructive">{error}</p>
              </div>
            )}
          </div>

          {sourceType === "estimate" && file ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Estimate preview</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewEstimate}
                  disabled={isPreviewing || isImporting}
                >
                  {isPreviewing ? "Analyzing..." : estimatePreview ? "Refresh preview" : "Analyze workbook"}
                </Button>
              </div>

              {estimatePreview ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Budget rows</p>
                      <p className="text-sm font-semibold text-foreground">{estimatePreview.importableCount}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Owner SOV rows</p>
                      <p className="text-sm font-semibold text-foreground">{estimatePreview.ownerSovCount}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(estimatePreview.totalBudgetAmount)}
                      </p>
                    </div>
                  </div>

                  {estimatePreview.warnings.length > 0 ? (
                    <div className="rounded-md bg-warning/10 p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-warning">
                            {estimatePreview.warnings.length} row warning{estimatePreview.warnings.length === 1 ? "" : "s"}
                          </p>
                          <ul className="mt-1 max-h-20 space-y-0.5 overflow-y-auto text-xs text-warning">
                            {estimatePreview.warnings.slice(0, 4).map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                            {estimatePreview.warnings.length > 4 ? (
                              <li className="italic">+{estimatePreview.warnings.length - 4} more</li>
                            ) : null}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="overflow-hidden rounded-md border">
                    <div className="grid grid-cols-[88px_1fr_72px_96px] gap-3 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>Code</span>
                      <span>Description</span>
                      <span>Type</span>
                      <span className="text-right">Amount</span>
                    </div>
                    <div className="divide-y">
                      {previewRows.map((row) => (
                        <div
                          key={`${row.sourceSheet}-${row.rowNumber}-${row.costCode}`}
                          className="grid grid-cols-[88px_1fr_72px_96px] gap-3 px-3 py-2 text-xs"
                        >
                          <span className="font-medium text-foreground">{row.costCode}</span>
                          <span className="truncate text-muted-foreground">{row.description}</span>
                          <span className="text-muted-foreground">{row.costTypeCode}</span>
                          <span className="text-right tabular-nums text-foreground">
                            {formatCurrency(row.budgetAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Analyze the workbook before importing so malformed codes or missing cost types fail loudly.
                </p>
              )}
            </div>
          ) : null}

          {/* Import results */}
          {importResult && (importResult.warnings?.length || importResult.errors?.length) ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Import results
              </p>

              {importResult.warnings && importResult.warnings.length > 0 && (
                <div className="rounded-md bg-warning/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                    <div className="flex-1 space-y-1.5">
                      <p className="text-sm font-medium text-warning">
                        {importResult.warnings.length} warning{importResult.warnings.length !== 1 ? "s" : ""}
                      </p>
                      <ul className="text-xs text-warning space-y-0.5 max-h-20 overflow-y-auto">
                        {importResult.warnings.slice(0, 5).map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                        {importResult.warnings.length > 5 && (
                          <li className="italic">+{importResult.warnings.length - 5} more…</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <p className="text-sm font-medium text-destructive">
                        {importResult.errors.length} error{importResult.errors.length !== 1 ? "s" : ""}
                      </p>
                      <ul className="text-xs text-destructive space-y-0.5 max-h-20 overflow-y-auto">
                        {importResult.errors.slice(0, 5).map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li className="italic">+{importResult.errors.length - 5} more…</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </ModalBody>

      <ModalFooter>
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
          disabled={!file || isImporting}
        >
          {isImporting ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              {sourceType === "estimate" ? "Import Estimate" : "Import"}
            </>
          )}
        </Button>
      </ModalFooter>
    </BaseModal>
  );
}
