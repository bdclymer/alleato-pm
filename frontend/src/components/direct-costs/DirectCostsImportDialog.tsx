"use client";

import * as React from "react";
import Papa from "papaparse";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DirectCostsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onImported?: () => void;
}

interface Vendor {
  id: string;
  vendor_name: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface BudgetCode {
  id: string;
  code: string;
  description: string;
  fullLabel: string;
}

type ParsedRow = Record<string, string>;

const STATUS_MAP: Record<string, "Draft" | "Pending" | "Revise and Resubmit" | "Approved"> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  paid: "Approved",
  revise: "Revise and Resubmit",
  resubmit: "Revise and Resubmit",
  "revise and resubmit": "Revise and Resubmit",
  rejected: "Revise and Resubmit",
};

const COST_TYPE_MAP: Record<string, "Expense" | "Invoice" | "Subcontractor Invoice"> = {
  expense: "Expense",
  invoice: "Invoice",
  "subcontractor invoice": "Subcontractor Invoice",
  subcontractor: "Subcontractor Invoice",
};

const HEADER_ALIASES = {
  date: ["date", "created", "created at", "incurred date", "item date"],
  status: ["status"],
  costType: ["type", "cost type", "direct cost type"],
  description: ["description", "memo", "details", "notes", "name"],
  vendor: ["vendor", "vendor name", "supplier", "payee"],
  employee: ["employee", "employee name"],
  amount: ["amount", "total", "total amount", "grand total", "cost"],
  invoiceNumber: ["invoice", "invoice #", "invoice number", "reference"],
  budgetCode: ["budget code", "cost code", "budget_code", "cost_code"],
  quantity: ["quantity", "qty"],
  unitCost: ["unit cost", "unit price", "rate", "price"],
  receivedDate: ["received date", "received"],
  paidDate: ["paid date", "payment date", "paid"],
} as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function normalizeHeader(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function getFieldValue(row: ParsedRow, aliases: readonly string[]): string {
  for (const alias of aliases) {
    const value = row[alias];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function parseCurrency(value: string): number | null {
  if (!value.trim()) return null;

  const cleaned = value.replace(/[$,]/g, "").trim();
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function parseDateValue(value: string): Date | null {
  if (!value.trim()) return null;

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const normalized = value.trim();
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?:\s*[AP]M)?)?$/i);
  if (!match) return null;

  const month = Number.parseInt(match[1], 10) - 1;
  const day = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  const parsed = new Date(year, month, day);

  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function normalizeStatus(value: string): "Draft" | "Pending" | "Revise and Resubmit" | "Approved" {
  return STATUS_MAP[value.trim().toLowerCase()] ?? "Draft";
}

function normalizeCostType(value: string): "Expense" | "Invoice" | "Subcontractor Invoice" {
  return COST_TYPE_MAP[value.trim().toLowerCase()] ?? "Expense";
}

function buildHeaderMap(rows: string[][]): { headerIndex: number; aliases: string[] } | null {
  for (let i = 0; i < rows.length; i += 1) {
    const normalizedHeaders = rows[i].map((cell) => normalizeHeader(String(cell ?? "")));
    const hasAmount = normalizedHeaders.some((header) => HEADER_ALIASES.amount.includes(header as any));
    const hasStatus = normalizedHeaders.some((header) => HEADER_ALIASES.status.includes(header as any));
    const hasType = normalizedHeaders.some((header) => HEADER_ALIASES.costType.includes(header as any));

    if (hasAmount && (hasStatus || hasType)) {
      return { headerIndex: i, aliases: normalizedHeaders };
    }
  }

  return null;
}

function rowToMappedRecord(row: string[], aliases: string[]): ParsedRow {
  const result: ParsedRow = {};
  aliases.forEach((header, index) => {
    result[header] = String(row[index] ?? "").trim();
  });
  return result;
}

export function DirectCostsImportDialog({
  open,
  onOpenChange,
  projectId,
  onImported,
}: DirectCostsImportDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(false);

  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [budgetCodes, setBudgetCodes] = React.useState<BudgetCode[]>([]);

  const [fallbackVendorId, setFallbackVendorId] = React.useState<string>("none");
  const [fallbackEmployeeId, setFallbackEmployeeId] = React.useState<string>("none");

  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
      setIsImporting(false);
      return;
    }

    let cancelled = false;

    async function loadOptions() {
      setIsLoadingOptions(true);
      setError(null);

      try {
        const [vendorsRes, employeesRes, budgetCodesRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/vendors`),
          fetch(`/api/projects/${projectId}/employees`),
          fetch(`/api/projects/${projectId}/budget-codes`),
        ]);

        if (!vendorsRes.ok || !employeesRes.ok || !budgetCodesRes.ok) {
          throw new Error("Failed to load import options");
        }

        const vendorData = (await vendorsRes.json()) as Vendor[];
        const employeeData = (await employeesRes.json()) as Employee[];
        const budgetCodeData = (await budgetCodesRes.json()) as { budgetCodes?: BudgetCode[] } | BudgetCode[];
        const normalizedBudgetCodes = Array.isArray(budgetCodeData)
          ? budgetCodeData
          : budgetCodeData.budgetCodes || [];

        if (cancelled) return;

        setVendors(vendorData);
        setEmployees(employeeData);
        setBudgetCodes(normalizedBudgetCodes);
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Failed to load import options";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const vendorByName = React.useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((vendor) => {
      map.set(vendor.vendor_name.trim().toLowerCase(), vendor.id);
    });
    return map;
  }, [vendors]);

  const employeeByName = React.useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((employee) => {
      const fullName = `${employee.first_name} ${employee.last_name}`.trim().toLowerCase();
      if (fullName) {
        map.set(fullName, employee.id);
      }
    });
    return map;
  }, [employees]);

  const budgetCodeByCode = React.useMemo(() => {
    const map = new Map<string, string>();
    budgetCodes.forEach((budgetCode) => {
      map.set(budgetCode.code.trim().toLowerCase(), budgetCode.id);
    });
    return map;
  }, [budgetCodes]);

  const handlePickFile = (selectedFile: File | undefined) => {
    if (!selectedFile) {
      return;
    }

    const isCsv = selectedFile.name.toLowerCase().endsWith(".csv") || selectedFile.type.includes("csv");
    if (!isCsv) {
      setError("Please upload a CSV (.csv) file.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError("File must be less than 10MB.");
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleImport = async () => {
    if (!file) {
      setError("Choose a CSV file to import.");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const csvText = await file.text();
      const parsed = Papa.parse<string[]>(csvText, {
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        throw new Error(parsed.errors[0]?.message || "Failed to parse CSV");
      }

      const rows = parsed.data;
      if (rows.length === 0) {
        throw new Error("CSV file is empty.");
      }

      const header = buildHeaderMap(rows);
      if (!header) {
        throw new Error("Could not detect CSV header row. Include at least Status/Type and Amount columns.");
      }

      const dataRows = rows.slice(header.headerIndex + 1);
      if (dataRows.length === 0) {
        throw new Error("No data rows found in CSV file.");
      }

      let successCount = 0;
      let failedCount = 0;
      const failedRows: string[] = [];

      for (let index = 0; index < dataRows.length; index += 1) {
        const rawRow = rowToMappedRecord(dataRows[index], header.aliases);

        const amountValue = parseCurrency(getFieldValue(rawRow, HEADER_ALIASES.amount));
        const quantityValue = parseCurrency(getFieldValue(rawRow, HEADER_ALIASES.quantity)) ?? 1;
        const unitCostValue =
          parseCurrency(getFieldValue(rawRow, HEADER_ALIASES.unitCost)) ??
          (amountValue !== null && quantityValue > 0 ? amountValue / quantityValue : null);

        if (unitCostValue === null || quantityValue <= 0) {
          failedCount += 1;
          failedRows.push(`Row ${index + 1}: missing or invalid amount/quantity`);
          continue;
        }

        const date =
          parseDateValue(getFieldValue(rawRow, HEADER_ALIASES.date)) ??
          new Date();

        const vendorName = getFieldValue(rawRow, HEADER_ALIASES.vendor).toLowerCase();
        const employeeName = getFieldValue(rawRow, HEADER_ALIASES.employee).toLowerCase();
        const budgetCodeCode = getFieldValue(rawRow, HEADER_ALIASES.budgetCode).toLowerCase();

        const resolvedVendorId =
          (vendorName ? vendorByName.get(vendorName) : undefined) ||
          (fallbackVendorId !== "none" ? fallbackVendorId : null);

        const resolvedEmployeeId =
          (employeeName ? employeeByName.get(employeeName) : undefined) ||
          (fallbackEmployeeId !== "none" ? fallbackEmployeeId : null);

        const resolvedBudgetCodeId =
          (budgetCodeCode ? budgetCodeByCode.get(budgetCodeCode) : undefined) ||
          null;

        const payload = {
          cost_type: normalizeCostType(getFieldValue(rawRow, HEADER_ALIASES.costType)),
          date: toIsoDate(date),
          vendor_id: resolvedVendorId,
          employee_id: resolvedEmployeeId,
          invoice_number: getFieldValue(rawRow, HEADER_ALIASES.invoiceNumber) || null,
          status: normalizeStatus(getFieldValue(rawRow, HEADER_ALIASES.status)),
          description: getFieldValue(rawRow, HEADER_ALIASES.description) || null,
          received_date: (() => {
            const parsedDate = parseDateValue(getFieldValue(rawRow, HEADER_ALIASES.receivedDate));
            return parsedDate ? toIsoDate(parsedDate) : null;
          })(),
          paid_date: (() => {
            const parsedDate = parseDateValue(getFieldValue(rawRow, HEADER_ALIASES.paidDate));
            return parsedDate ? toIsoDate(parsedDate) : null;
          })(),
          line_items: [
            {
              budget_code_id: resolvedBudgetCodeId,
              description: getFieldValue(rawRow, HEADER_ALIASES.description) || null,
              quantity: quantityValue,
              uom: "LOT",
              unit_cost: unitCostValue,
            },
          ],
        };

        const response = await fetch(`/api/projects/${projectId}/direct-costs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          failedCount += 1;
          failedRows.push(`Row ${index + 1}: ${body.error || "failed to create direct cost"}`);
          continue;
        }

        successCount += 1;
      }

      if (successCount === 0) {
        throw new Error(
          failedRows.length > 0
            ? `No rows imported. ${failedRows.slice(0, 3).join(" | ")}`
            : "No rows imported.",
        );
      }

      const summary =
        failedCount > 0
          ? `Imported ${successCount} direct costs. ${failedCount} rows failed.`
          : `Imported ${successCount} direct costs.`;

      toast.success(summary);
      if (failedRows.length > 0) {
        toast.info(failedRows.slice(0, 3).join(" | "));
      }

      onImported?.();
      onOpenChange(false);
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : "Failed to import direct costs";
      setError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isImporting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Import Direct Costs from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV and import each row as a direct cost. Expected columns include Created/Date, Status, Type,
            Description, Vendor, and Amount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="direct-costs-import-file">CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="direct-costs-import-file"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => handlePickFile(event.target.files?.[0])}
                disabled={isImporting}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                <Upload />
                Browse
              </Button>
            </div>
            {file ? (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Fallback Vendor</Label>
              <Select
                value={fallbackVendorId}
                onValueChange={setFallbackVendorId}
                disabled={isLoadingOptions || isImporting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fallback Employee</Label>
              <Select
                value={fallbackEmployeeId}
                onValueChange={setFallbackEmployeeId}
                disabled={isLoadingOptions || isImporting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vendor and employee are optional. If present in CSV, we will try to match them; otherwise fallback selections
              are used when set. Budget code is optional and will auto-resolve server-side when available.
            </AlertDescription>
          </Alert>

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting || isLoadingOptions || !file}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import CSV"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
