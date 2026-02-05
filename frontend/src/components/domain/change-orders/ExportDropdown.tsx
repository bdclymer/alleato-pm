"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportDropdownProps {
  projectId: string;
  /** Optional filters to apply when exporting filtered results */
  filters?: {
    status?: string;
    contractType?: string;
    dateFrom?: string;
    dateTo?: string;
    includeLineItems?: boolean;
  };
}

export function ExportDropdown({ projectId, filters }: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (applyFilters: boolean) => {
    setIsExporting(true);

    try {
      // Build query params
      const params = new URLSearchParams();

      if (applyFilters && filters) {
        if (filters.status) params.append("status", filters.status);
        if (filters.contractType)
          params.append("contractType", filters.contractType);
        if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.append("dateTo", filters.dateTo);
        if (filters.includeLineItems)
          params.append("includeLineItems", "true");
      }

      const url = `/api/projects/${projectId}/change-orders/export/csv${params.toString() ? `?${params.toString()}` : ""}`;

      // Trigger download
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch =
        contentDisposition?.match(/filename="(.+)"/) ||
        contentDisposition?.match(/filename=(.+)/);
      const filename =
        filenameMatch?.[1] || `change-orders-${projectId}-${new Date().toISOString().split("T")[0]}.csv`;

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          data-testid="export-dropdown-trigger"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport(false)}
          disabled={isExporting}
          data-testid="export-all-csv"
        >
          Export All to CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport(true)}
          disabled={isExporting}
          data-testid="export-filtered-csv"
        >
          Export Filtered to CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
