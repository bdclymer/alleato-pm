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
 * ExportCommitmentDialog props interface
 */
interface ExportCommitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitmentId: string;
  commitmentNumber?: string;
  commitmentTitle?: string;
}

type ExportFormat = "csv" | "excel" | "pdf";
type ExportTemplate = "standard" | "financial" | "summary";

/**
 * ExportCommitmentDialog - Dialog for exporting Commitment data
 *
 * Provides customizable export options for commitment data including format selection,
 * template selection, and SOV line items inclusion.
 *
 * @example
 * ```tsx
 * <ExportCommitmentDialog
 *   open={isExportOpen}
 *   onOpenChange={setIsExportOpen}
 *   commitmentId="uuid-123"
 *   commitmentNumber="SC-001"
 *   commitmentTitle="Electrical Work"
 * />
 * ```
 */
export function ExportCommitmentDialog({
  open,
  onOpenChange,
  commitmentId,
  commitmentNumber,
  commitmentTitle,
}: ExportCommitmentDialogProps) {
  const [format, setFormat] = React.useState<ExportFormat>("pdf");
  const [template, setTemplate] = React.useState<ExportTemplate>("standard");
  const [includeSovItems, setIncludeSovItems] = React.useState(true);
  const [includeChangeOrders, setIncludeChangeOrders] = React.useState(true);
  const [includeInvoices, setIncludeInvoices] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFormat("pdf");
      setTemplate("standard");
      setIncludeSovItems(true);
      setIncludeChangeOrders(true);
      setIncludeInvoices(false);
      setIsExporting(false);
    }
  }, [open]);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const exportParams = {
        format,
        template,
        include_sov_items: includeSovItems,
        include_change_orders: includeChangeOrders,
        include_invoices: includeInvoices,
      };

      const response = await fetch(
        `/api/commitments/${commitmentId}/export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(exportParams),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
      }

      // Get filename from Content-Disposition or create default
      const contentDisposition = response.headers.get("Content-Disposition");
      const baseFilename = commitmentNumber || commitmentId;
      let filename = `commitment-${baseFilename}-${new Date().toISOString().split("T")[0]}`;

      if (format === "csv") {
        filename += ".csv";
      } else if (format === "excel") {
        filename += ".xlsx";
      } else if (format === "pdf") {
        filename += ".html"; // HTML that can be printed to PDF
      }

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success(`Commitment exported successfully as ${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export commitment"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const commitmentLabel = commitmentNumber
    ? `${commitmentNumber}${commitmentTitle ? ` - ${commitmentTitle}` : ""}`
    : "this commitment";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Commitment</DialogTitle>
          <DialogDescription>
            Choose your export format and options for {commitmentLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label htmlFor="export-format">Export Format</Label>
            <RadioGroup
              id="export-format"
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer">
                  PDF (Printable document)
                </Label>
              </div>
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
            </RadioGroup>
          </div>

          {/* Template Selection */}
          <div className="space-y-3">
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
                  Standard - All contract details
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="financial" id="financial" />
                <Label
                  htmlFor="financial"
                  className="font-normal cursor-pointer"
                >
                  Financial - Amounts and billing focus
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

          {/* Include Options */}
          <div className="space-y-3">
            <Label>Include in Export</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-sov-items"
                  checked={includeSovItems}
                  onCheckedChange={(checked) =>
                    setIncludeSovItems(checked === true)
                  }
                />
                <Label
                  htmlFor="include-sov-items"
                  className="font-normal cursor-pointer"
                >
                  Schedule of Values (SOV) line items
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-change-orders"
                  checked={includeChangeOrders}
                  onCheckedChange={(checked) =>
                    setIncludeChangeOrders(checked === true)
                  }
                />
                <Label
                  htmlFor="include-change-orders"
                  className="font-normal cursor-pointer"
                >
                  Change orders
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-invoices"
                  checked={includeInvoices}
                  onCheckedChange={(checked) =>
                    setIncludeInvoices(checked === true)
                  }
                />
                <Label
                  htmlFor="include-invoices"
                  className="font-normal cursor-pointer"
                >
                  Invoice history
                </Label>
              </div>
            </div>
          </div>

          {/* Info Box */}
          {format === "pdf" && (
            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              <strong>Note:</strong> PDF export will open a print-friendly page.
              Use your browser&apos;s print function (Ctrl/Cmd+P) to save as PDF.
            </div>
          )}
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
                <FileDown className="h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
