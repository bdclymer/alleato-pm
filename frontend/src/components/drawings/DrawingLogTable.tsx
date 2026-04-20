"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import {
  DRAWING_DISCIPLINES,
  DRAWING_TYPES,
  type DrawingLogTableRow,
} from "@/types/drawings.types";
import { DrawingQRCode } from "@/components/drawings/DrawingQRCode";
import { apiFetch, apiFetchBlob } from "@/lib/api-client";

interface DrawingLogTableProps {
  data: DrawingLogTableRow[];
  projectId: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onDeleteDrawing?: (id: string) => Promise<void>;
}

const createDrawingLogConfig = (
  projectId: string,
  onBulkAction: (action: string, selectedRows: DrawingLogTableRow[]) => Promise<void>,
  onQrCode: (drawingId: string, drawingNumber: string) => void,
): GenericTableConfig => ({
  title: "Drawing Log",
  description: "Manage all drawing revisions and their metadata",
  searchFields: ["drawingNumber", "title", "fileName", "setName"],
  exportFilename: `drawings-export-${new Date().toISOString().split('T')[0]}.csv`,
  rowClickPath: `/{projectId}/drawings/viewer/{id}`,
  rowActions: [
    {
      id: "view",
      label: "View Drawing",
      icon: "external" as const,
    },
    {
      id: "download",
      label: "Download",
    },
    {
      id: "edit",
      label: "Edit",
      icon: "pencil" as const,
    },
    {
      id: "newRevision",
      label: "New Revision",
    },
    {
      id: "qrCode",
      label: "QR Code",
      onClick: (row: Record<string, unknown>) => {
        onQrCode(String(row.id ?? ""), String(row.drawingNumber ?? "Drawing"));
      },
    },
    {
      id: "delete",
      label: "Delete",
      icon: "trash" as const,
      variant: "destructive" as const,
    },
  ],
  columns: [
    {
      id: "drawingNumber",
      label: "Drawing Number",
      defaultVisible: true,
      type: "text",
      isPrimary: true,
    },
    {
      id: "title",
      label: "Title",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "revisionNumber",
      label: "Revision",
      defaultVisible: true,
      type: "badge",
      renderConfig: {
        type: "badge",
        defaultVariant: "outline",
      },
    },
    {
      id: "discipline",
      label: "Discipline",
      defaultVisible: true,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          Architectural: "default",
          Structural: "secondary",
          Mechanical: "default",
          Electrical: "secondary",
          Plumbing: "default",
          "Fire Protection": "destructive",
          Civil: "default",
          Landscape: "secondary",
          Other: "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "drawingType",
      label: "Type",
      defaultVisible: true,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          Plan: "default",
          Section: "secondary",
          Detail: "outline",
          Elevation: "default",
          Schedule: "secondary",
          Specification: "outline",
          Other: "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          draft: "outline",
          under_review: "secondary",
          approved: "default",
          superseded: "destructive",
          void: "destructive",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "drawingDate",
      label: "Drawing Date",
      defaultVisible: true,
      type: "date",
    },
    {
      id: "receivedDate",
      label: "Received Date",
      defaultVisible: true,
      type: "date",
    },
    {
      id: "setName",
      label: "Set",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "fileName",
      label: "File Name",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "fileSize",
      label: "File Size",
      defaultVisible: false,
      type: "number",
    },
    {
      id: "fileType",
      label: "File Type",
      defaultVisible: false,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          "application/pdf": "default",
          "image/png": "secondary",
          "image/jpeg": "secondary",
          "image/tiff": "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "uploadedByEmail",
      label: "Uploaded By",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "revisionCreatedAt",
      label: "Upload Date",
      defaultVisible: false,
      type: "date",
    },
    {
      id: "revisionDescription",
      label: "Notes",
      defaultVisible: false,
      type: "text",
      renderConfig: {
        type: "truncate",
        maxLength: 50,
      },
    },
  ],
  filters: [
    {
      id: "discipline",
      label: "Discipline",
      field: "discipline",
      options: DRAWING_DISCIPLINES.map(discipline => ({
        value: discipline,
        label: discipline,
      })),
    },
    {
      id: "drawingType",
      label: "Type",
      field: "drawingType",
      options: DRAWING_TYPES.map(type => ({
        value: type,
        label: type,
      })),
    },
    {
      id: "status",
      label: "Status",
      field: "status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "under_review", label: "Under Review" },
        { value: "approved", label: "Approved" },
        { value: "superseded", label: "Superseded" },
        { value: "void", label: "Void" },
      ],
    },
    {
      id: "setName",
      label: "Drawing Set",
      field: "setName",
      options: [], // Will be populated dynamically
    },
    {
      id: "fileType",
      label: "File Type",
      field: "fileType",
      options: [
        { value: "application/pdf", label: "PDF" },
        { value: "image/png", label: "PNG" },
        { value: "image/jpeg", label: "JPEG" },
        { value: "image/tiff", label: "TIFF" },
      ],
    },
  ],
  enableViewSwitcher: true,
  enableRowSelection: true,
  enableSorting: true,
  enableColumnResize: true,
  defaultSortColumn: "drawingNumber",
  defaultSortDirection: "asc",
  bulkActions: [
    {
      id: "bulkDownload",
      label: "Download Selected",
      onClick: async (selectedIds) => {
        await onBulkAction("bulkDownload", selectedIds as unknown as DrawingLogTableRow[]);
      },
    },
    {
      id: "bulkExport",
      label: "Export Selected",
      onClick: async (selectedIds) => {
        await onBulkAction("bulkExport", selectedIds as unknown as DrawingLogTableRow[]);
      },
    },
    {
      id: "bulkStatusUpdate",
      label: "Update Status",
      onClick: async (selectedIds) => {
        await onBulkAction("bulkStatusUpdate", selectedIds as unknown as DrawingLogTableRow[]);
      },
    },
  ],
});

export function DrawingLogTable({
  data,
  projectId,
  isLoading = false,
  onRefresh,
  onDeleteDrawing,
}: DrawingLogTableProps) {
  const [qrTarget, setQrTarget] = useState<{ drawingId: string; drawingNumber: string } | null>(null);

  const handleBulkAction = useCallback(async (action: string, selectedRows: DrawingLogTableRow[]) => {
    try {
      switch (action) {
        case "bulkDownload": {
          const drawingIds = selectedRows.map((r) => r.id).filter(Boolean);
          if (drawingIds.length === 0) { toast.error("No drawings selected"); break; }
          toast.info(`Packaging ${drawingIds.length} drawings…`);
          const blob = await apiFetchBlob(
            `/api/projects/${projectId}/drawings/bulk-download`,
            { method: "POST", body: JSON.stringify({ drawingIds }) },
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `drawings-${new Date().toISOString().split("T")[0]}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success(`Downloaded ${drawingIds.length} drawings`);
          break;
        }

        case "bulkExport":
          // Export selected rows to CSV
          const csvData = selectedRows.map(row => ({
            'Drawing Number': row.drawingNumber,
            'Title': row.title,
            'Revision': row.revisionNumber,
            'Discipline': row.discipline,
            'Type': row.drawingType,
            'Status': row.status,
            'Drawing Date': row.drawingDate,
            'Received Date': row.receivedDate,
            'Set': row.setName,
            'File Name': row.fileName,
            'Uploaded By': row.uploadedByEmail,
          }));

          const csvContent = "data:text/csv;charset=utf-8," +
            Object.keys(csvData[0] || {}).join(",") + "\n" +
            csvData.map(row => Object.values(row).join(",")).join("\n");

          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `selected-drawings-${Date.now()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast.success(`Exported ${selectedRows.length} drawings to CSV`);
          break;

        case "bulkStatusUpdate": {
          const drawingIds = selectedRows.map((r) => r.id).filter(Boolean);
          if (drawingIds.length === 0) { toast.error("No drawings selected"); break; }
          // Default action: publish all selected
          const result = await apiFetch<{ succeeded: number; failed: number }>(
            `/api/projects/${projectId}/drawings/bulk-status`,
            { method: "PATCH", body: JSON.stringify({ drawingIds, action: "publish" }) },
          );
          if (result.failed > 0) {
            toast.warning(`${result.succeeded} updated, ${result.failed} failed`);
          } else {
            toast.success(`Updated ${result.succeeded} drawings`);
          }
          onRefresh?.();
          break;
        }

        default:
          console.warn(`Unhandled bulk action: ${action}`);
      }
    } catch (error) {
      console.error(`Error handling bulk action ${action}:`, error);
      toast.error(`Failed to ${action} selected drawings`);
    }
  }, [projectId, onRefresh]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading drawings...</div>
      </div>
    );
  }

  return (
    <>
      <GenericDataTable
        data={data as unknown as Record<string, unknown>[]}
        config={createDrawingLogConfig(projectId, handleBulkAction, (drawingId, drawingNumber) => setQrTarget({ drawingId, drawingNumber }))}
        onDeleteRow={onDeleteDrawing ? async (id) => {
          await onDeleteDrawing(String(id));
          return {};
        } : undefined}
      />
      {qrTarget && (
        <DrawingQRCode
          projectId={projectId}
          drawingId={qrTarget.drawingId}
          drawingNumber={qrTarget.drawingNumber}
          isOpen={true}
          onClose={() => setQrTarget(null)}
        />
      )}
    </>
  );
}