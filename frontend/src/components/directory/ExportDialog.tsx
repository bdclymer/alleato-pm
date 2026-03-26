"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { DirectoryFilters } from "@/components/directory/DirectoryFilters";
import type { ColumnConfig } from "@/components/directory/ColumnManager";
import { toast } from "@/hooks/use-toast";
import type { DirectoryExportColumn } from "@/services/directoryAdminService";

interface ExportDialogProps {
  projectId: string;
  filters: DirectoryFilters;
  columns: ColumnConfig[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_EXPORT_COLUMNS: DirectoryExportColumn[] = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "job_title", label: "Job Title" },
  { id: "company", label: "Company" },
  { id: "permission_template", label: "Permission" },
  { id: "invite_status", label: "Invite Status" },
  { id: "status", label: "Status" },
];

export function ExportDialog({
  projectId,
  filters,
  columns,
  open,
  onOpenChange,
}: ExportDialogProps) {
  const [selectedColumns, setSelectedColumns] = React.useState<
    DirectoryExportColumn[]
  >(DEFAULT_EXPORT_COLUMNS);
  const [isExporting, setIsExporting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    const visibleColumns = columns
      .filter((column) => column.visible && column.id !== "select")
      .map((column) => ({
        id: column.id,
        label: column.label,
      }));

    if (visibleColumns.length) {
      setSelectedColumns(visibleColumns);
    }
  }, [open, columns]);

  const toggleColumn = (column: DirectoryExportColumn) => {
    setSelectedColumns((prev) => {
      const exists = prev.some((item) => item.id === column.id);
      if (exists) {
        return prev.filter((item) => item.id !== column.id);
      }
      return [...prev, column];
    });
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast.error("Select at least one column to export.");
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.type) params.append("type", filters.type);
      if (filters.status) params.append("status", filters.status);
      if (filters.companyId) params.append("company_id", filters.companyId);
      if (filters.permissionTemplateId)
        params.append("permission_template_id", filters.permissionTemplateId);
      if (filters.groupBy) params.append("group_by", filters.groupBy);
      if (filters.sortBy?.length) params.append("sort", filters.sortBy.join(","));
      params.append("columns", JSON.stringify(selectedColumns));

      const response = await fetch(
        `/api/projects/${projectId}/directory/export?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to export directory data");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `directory-export-${projectId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Export started. Check your downloads.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export data",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const allColumns = React.useMemo(() => {
    const baseColumns = Array.from(
      new Map(
        [...DEFAULT_EXPORT_COLUMNS, ...columns.map((col) => ({ id: col.id, label: col.label }))]
          .filter((col) => col.id && col.id !== "select" && col.id !== "actions")
          .map((col) => [col.id, col]),
      ).values(),
    );
    return baseColumns;
  }, [columns]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Directory</DialogTitle>
          <DialogDescription>
            Choose which columns you want to include in the CSV export.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 max-h-72 overflow-y-auto border rounded-md p-4">
          {allColumns.map((column) => {
            const checked = selectedColumns.some(
              (selected) => selected.id === column.id,
            );
            return (
              <label
                key={column.id}
                className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() =>
                    toggleColumn(column as DirectoryExportColumn)
                  }
                />
                  <span>{column.label}</span>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedColumns.length} column
            {selectedColumns.length === 1 ? "" : "s"} selected
          </span>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <Download />
                Export CSV
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
