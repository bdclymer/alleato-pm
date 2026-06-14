"use client";

import * as React from "react";
import { Upload, Loader2, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CommitmentsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onImported?: () => void;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  message: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function CommitmentsImportDialog({
  open,
  onOpenChange,
  projectId,
  onImported,
}: CommitmentsImportDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
      setResult(null);
      setIsImporting(false);
    }
  }, [open]);

  const handlePickFile = (selected: File | undefined) => {
    if (!selected) return;

    const isXlsx =
      selected.name.toLowerCase().endsWith(".xlsx") ||
      selected.name.toLowerCase().endsWith(".xls") ||
      selected.type.includes("spreadsheet") ||
      selected.type.includes("excel");

    if (!isXlsx) {
      setError("Please upload an Excel file (.xlsx or .xls).");
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("File must be less than 20MB.");
      return;
    }

    setFile(selected);
    setError(null);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) {
      setError("Choose an Excel file to import.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await apiFetch<ImportResult>(`/api/projects/${projectId}/commitments/import`, {
        method: "POST",
        body: formData,
      });

      setResult(data);

      if (data.imported > 0) {
        toast.success(data.message);
        onImported?.();
      } else {
        toast.error(data.message || "No commitments imported.");
      }
    } catch (importError) {
      const msg =
        importError instanceof ApiError
          ? importError.message
          : importError instanceof Error
            ? importError.message
            : "Import failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const isDone = result !== null && result.imported > 0;

  return (
    <Modal open={open} onOpenChange={isImporting ? undefined : onOpenChange}>
      <ModalContent className="sm:max-w-lg">
        <ModalHeader>
          <ModalTitle>Import Commitments</ModalTitle>
          <ModalDescription>
            Upload a commitments export (.xlsx) — the Alleato template or a Procore / Job Planner
            export. Each row creates a subcontract or purchase order with its original contract
            amount. Companies are matched by name; any not already in the directory are created.
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4">
          <label
            htmlFor="commitments-import-file"
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          >
            {file ? (
              <>
                <FileSpreadsheet className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(file.size / 1024)} KB — click to change
                </p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx or .xls, max 20MB</p>
              </>
            )}
            <Input
              id="commitments-import-file"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => handlePickFile(e.target.files?.[0])}
              disabled={isImporting}
            />
          </label>

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {result ? (
            <Alert variant={result.imported > 0 ? "default" : "destructive"}>
              {result.imported > 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <p>{result.message}</p>
                {result.errors.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i} className="text-muted-foreground">
                        {err}
                      </li>
                    ))}
                    {result.errors.length > 5 ? (
                      <li className="text-muted-foreground">
                        +{result.errors.length - 5} more errors
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            {isDone ? "Close" : "Cancel"}
          </Button>
          {!isDone ? (
            <Button onClick={handleImport} disabled={isImporting || !file}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
