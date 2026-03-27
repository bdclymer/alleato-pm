"use client";

import * as React from "react";
import { FileDown, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * ExportDialog props interface
 */
interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  selectedCommitmentIds?: string[];
  // For individual commitment PDF export
  commitmentId?: string;
  commitmentNumber?: string;
}

type ExportFormat = "csv" | "excel" | "pdf";
type ExportTemplate = "standard" | "financial" | "summary";

/**
 * ExportDialog - Dialog for exporting Commitments data
 *
 * Provides customizable export options for commitments data including format selection,
 * template selection, and SOV items inclusion.
 *
 * @example
 * ```tsx
 * // For list export
 * <ExportDialog
 *   open={isExportOpen}
 *   onOpenChange={setIsExportOpen}
 *   projectId="123"
 * />
 *
 * // For individual commitment PDF
 * <ExportDialog
 *   open={isExportOpen}
 *   onOpenChange={setIsExportOpen}
 *   projectId="123"
 *   commitmentId="abc-123"
 *   commitmentNumber="SC-001"
 * />
 * ```
 */
export function ExportDialog({
  open,
  onOpenChange,
  projectId,
  selectedCommitmentIds,
  commitmentId,
  commitmentNumber,
}: ExportDialogProps) {
  const [format, setFormat] = React.useState<ExportFormat>(
    commitmentId ? "pdf" : "csv"
  );
  const [template, setTemplate] = React.useState<ExportTemplate>("standard");
  const [includeSOVItems, setIncludeSOVItems] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  // Determine if this is an individual export or list export
  const isIndividualExport = !!commitmentId;

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFormat(commitmentId ? "pdf" : "csv");
      setTemplate("standard");
      setIncludeSOVItems(false);
      setIsExporting(false);
    }
  }, [open, commitmentId]);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const exportParams: any = {
        format,
        template,
        include_sov_items: includeSOVItems,
        filters: {},
      };

      // For individual commitment PDF export
      if (isIndividualExport && commitmentId) {
        exportParams.commitmentId = commitmentId;
        exportParams.format = "pdf";
      }

      // Use different endpoint for individual commitment vs list export
      const endpoint = isIndividualExport && commitmentId
        ? `/api/commitments/${commitmentId}/export`
        : `/api/projects/${projectId}/commitments/export`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportParams),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
      }

      // Get filename from Content-Disposition or create default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = isIndividualExport
        ? `commitment-${commitmentNumber || commitmentId}.${format === "pdf" ? "pdf" : format}`
        : `commitments-${new Date().toISOString().split("T")[0]}.${format === "pdf" ? "pdf" : format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        format === "pdf"
          ? "PDF downloaded successfully"
          : "Export downloaded successfully"
      );

      // Close dialog on success
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Export failed. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const exportScope = isIndividualExport
    ? `Commitment ${commitmentNumber || commitmentId}`
    : selectedCommitmentIds?.length
      ? `${selectedCommitmentIds.length} selected commitments`
      : "All commitments";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isIndividualExport ? "Export Commitment" : "Export Commitments"}
          </DialogTitle>
          <DialogDescription>
            {isIndividualExport
              ? "Generate a PDF document for this commitment."
              : "Choose your export format and options. " + exportScope + " will be exported."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection - Only show for list export */}
          {!isIndividualExport && (
            <div className="space-y-4">
              <Label htmlFor="export-format">Export Format</Label>
              <RadioGroup
                id="export-format"
                value={format}
                onValueChange={(value) => setFormat(value as ExportFormat)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="font-normal cursor-pointer">
                    CSV (Comma-separated values)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="excel" />
                  <Label htmlFor="excel" className="font-normal cursor-pointer">
                    Excel (Spreadsheet)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="font-normal cursor-pointer">
                    PDF (Printable document)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Template Selection - Only show for list export (non-PDF) */}
          {!isIndividualExport && format !== "pdf" && (
            <div className="space-y-4">
              <Label htmlFor="export-template">Template</Label>
              <RadioGroup
                id="export-template"
                value={template}
                onValueChange={(value) => setTemplate(value as ExportTemplate)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="standard" id="standard" />
                  <Label
                    htmlFor="standard"
                    className="font-normal cursor-pointer"
                  >
                    Standard - All fields
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="financial" id="financial" />
                  <Label
                    htmlFor="financial"
                    className="font-normal cursor-pointer"
                  >
                    Financial - Financial focus
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="summary" id="summary" />
                  <Label htmlFor="summary" className="font-normal cursor-pointer">
                    Summary - High-level overview
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Include SOV Items - Only for individual PDF export */}
          {isIndividualExport && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-sov-items"
                checked={includeSOVItems}
                onCheckedChange={(checked) =>
                  setIncludeSOVItems(checked === true)
                }
              />
              <Label
                htmlFor="include-sov-items"
                className="font-normal cursor-pointer"
              >
                Include Schedule of Values (SOV) items
              </Label>
            </div>
          )}

          {/* Export Scope Info */}
          <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
            <strong>Export scope:</strong> {exportScope}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown />
                {format === "pdf" ? "Generate PDF" : "Export"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
