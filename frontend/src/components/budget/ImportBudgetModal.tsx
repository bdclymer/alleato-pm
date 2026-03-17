"use client";

import * as React from "react";
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
      setIsImporting(false);
      setIsDragging(false);
      setImportResult(null);
    }
  }, [open]);

  const handleDownloadTemplate = async () => {
    try {
      // Use the static template file
      const link = document.createElement("a");
      link.href = "/alleato-budget-template.xlsx";
      link.download = `budget-template-project-${projectId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Template downloaded successfully");
    } catch (err) {
      toast.error("Failed to download template");
    }
  };

  const validateFile = (selectedFile: File): string | null => {
    // Check file type - support both Excel and CSV
    const validExcelTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const validCsvTypes = ["text/csv", "application/csv"];

    const isExcel = validExcelTypes.includes(selectedFile.type) ||
      selectedFile.name.endsWith(".xlsx");
    const isCsv = validCsvTypes.includes(selectedFile.type) ||
      selectedFile.name.endsWith(".csv");

    if (!isExcel && !isCsv) {
      return "Please upload a valid Excel (.xlsx) or CSV (.csv) file";
    }

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      return "File size must be less than 10MB";
    }

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
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
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
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/projects/${projectId}/budget/import`, {
        method: "POST",
        body: formData,
      });

      const result: ImportResult = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          result.errors?.[0] ||
          result.message ||
          "Failed to import budget",
        );
      }

      // Store the result for display
      setImportResult(result);

      // Show success message with details
      let message = `Budget imported successfully! ${result.importedCount || 0} line item(s) added.`;

      if (result.warnings?.length || result.skippedRows) {
        const issues = [];
        if (result.warnings?.length) issues.push(`${result.warnings.length} warnings`);
        if (result.skippedRows) issues.push(`${result.skippedRows} skipped rows`);
        message += ` (${issues.join(", ")})`;
      }

      toast.success(message);

      // Call success callback to refresh budget data
      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to import budget";
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

  return (
    <Dialog open={open} onOpenChange={isImporting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Budget from Excel</DialogTitle>
          <DialogDescription className="space-y-4 pt-2">
            <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-4 rounded-md">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Important Notes:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>
                    The budget uses the project currency and will not be
                    converted on import
                  </li>
                  <li>
                    Consider taking a snapshot before importing to preserve
                    current budget state
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-sm text-foreground">
              <p className="font-medium mb-2">How to import:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Download the Excel template below</li>
                <li>Complete the template with your budget line items</li>
                <li>Upload the completed file to populate your budget</li>
              </ol>
            </div>

            <a
              href="https://support.procore.com/products/online/user-guide/project-level/budget/tutorials/import-a-budget"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Learn more about budget imports →
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template Section */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
            <div className="flex items-center gap-4">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium text-sm">Budget Import Template</p>
                <p className="text-xs text-muted-foreground">Excel format (.xlsx)</p>
              </div>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Download Template
            </Button>
          </div>

          {/* File Upload Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Excel File <span className="text-red-500">*</span>
            </label>

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-border hover:bg-muted",
                )}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Upload File
                </p>
                <p className="text-xs text-muted-foreground">or Drag & Drop</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Excel (.xlsx) or CSV (.csv) files, max 10MB
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleRemoveFile}
                    variant="ghost"
                    size="sm"
                    disabled={isImporting}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {error && (
              <div className="flex items-start gap-2 text-red-600 bg-red-50 p-4 rounded-md text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Import Results Section */}
          {importResult && (importResult.warnings?.length || importResult.errors?.length) && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Import Results</h4>

              {importResult.warnings && importResult.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <p className="text-sm font-medium text-amber-800">
                        Warnings ({importResult.warnings.length})
                      </p>
                      <div className="max-h-24 overflow-y-auto">
                        <ul className="text-xs space-y-1">
                          {importResult.warnings.slice(0, 5).map((warning, index) => (
                            <li key={index} className="text-amber-700">{warning}</li>
                          ))}
                          {importResult.warnings.length > 5 && (
                            <li className="text-amber-600 italic">
                              +{importResult.warnings.length - 5} more warnings...
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <p className="text-sm font-medium text-red-800">
                        Errors ({importResult.errors.length})
                      </p>
                      <div className="max-h-24 overflow-y-auto">
                        <ul className="text-xs space-y-1">
                          {importResult.errors.slice(0, 5).map((error, index) => (
                            <li key={index} className="text-red-700">{error}</li>
                          ))}
                          {importResult.errors.length > 5 && (
                            <li className="text-red-600 italic">
                              +{importResult.errors.length - 5} more errors...
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
            disabled={!file || isImporting}
          >
            {isImporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
