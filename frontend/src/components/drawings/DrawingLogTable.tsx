"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
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

interface DrawingLogTableProps {
  data: DrawingLogTableRow[];
  projectId: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onDeleteDrawing?: (id: string) => Promise<void>;
}

const createDrawingLogConfig = (projectId: string): GenericTableConfig => ({
  title: "Drawing Log",
  description: "Manage all drawing revisions and their metadata",
  searchFields: ["drawingNumber", "title", "fileName", "areaName", "setName"],
  exportFilename: `drawings-export-${new Date().toISOString().split('T')[0]}.csv`,
  rowClickPath: `/{projectId}/drawings/viewer/{id}`,
  rowActions: [
    {
      id: "view",
      label: "View Drawing",
      icon: "eye" as const,
    },
    {
      id: "download",
      label: "Download",
      icon: "download" as const,
    },
    {
      id: "edit",
      label: "Edit",
      icon: "pencil" as const,
    },
    {
      id: "newRevision",
      label: "New Revision",
      icon: "plus" as const,
    },
    {
      id: "qrCode",
      label: "QR Code",
      icon: "qr-code" as const,
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
      renderConfig: {
        type: "link",
        linkPath: `/${projectId}/drawings/viewer/{id}`,
      },
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
        variant: "outline",
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
      renderConfig: {
        type: "date",
        format: "MMM dd, yyyy",
      },
    },
    {
      id: "receivedDate",
      label: "Received Date",
      defaultVisible: true,
      type: "date",
      renderConfig: {
        type: "date",
        format: "MMM dd, yyyy",
      },
    },
    {
      id: "areaName",
      label: "Area",
      defaultVisible: true,
      type: "text",
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
      renderConfig: {
        type: "fileSize",
      },
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
        transform: (value: string) => value?.split('/')[1]?.toUpperCase() || value,
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
      renderConfig: {
        type: "datetime",
        format: "MMM dd, yyyy hh:mm a",
      },
    },
    {
      id: "revisionDescription",
      label: "Notes",
      defaultVisible: false,
      type: "text",
      renderConfig: {
        type: "truncated",
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
      id: "areaName",
      label: "Area",
      field: "areaName",
      options: [], // Will be populated dynamically
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
  enableColumnVisibility: true,
  enableExport: true,
  defaultSort: {
    field: "drawingNumber",
    direction: "asc",
  },
  bulkActions: [
    {
      id: "bulkDownload",
      label: "Download Selected",
      icon: "download" as const,
    },
    {
      id: "bulkExport",
      label: "Export Selected",
      icon: "file-text" as const,
    },
    {
      id: "bulkStatusUpdate",
      label: "Update Status",
      icon: "edit" as const,
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
  const router = useRouter();

  const handleRowAction = useCallback(async (action: string, rowData: any) => {
    try {
      switch (action) {
        case "view":
          router.push(`/${projectId}/drawings/viewer/${rowData.id}`);
          break;

        case "download":
          // Trigger file download
          if (rowData.fileUrl) {
            const link = document.createElement('a');
            link.href = rowData.fileUrl;
            link.download = rowData.fileName || 'drawing.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Download started");
          } else {
            toast.error("File not available for download");
          }
          break;

        case "edit":
          router.push(`/${projectId}/drawings/${rowData.id}/edit`);
          break;

        case "newRevision":
          router.push(`/${projectId}/drawings/${rowData.id}/new-revision`);
          break;

        case "qrCode":
          // Show QR code modal (implement QR code generation)
          toast.info("QR Code generation coming soon");
          break;

        case "delete":
          if (onDeleteDrawing) {
            await onDeleteDrawing(rowData.id);
            onRefresh?.();
          }
          break;

        default:
          console.warn(`Unhandled action: ${action}`);
      }
    } catch (error) {
      console.error(`Error handling action ${action}:`, error);
      toast.error(`Failed to ${action} drawing`);
    }
  }, [router, projectId, onDeleteDrawing, onRefresh]);

  const handleBulkAction = useCallback(async (action: string, selectedRows: any[]) => {
    try {
      switch (action) {
        case "bulkDownload":
          // Implement bulk download
          selectedRows.forEach(row => {
            if (row.fileUrl) {
              const link = document.createElement('a');
              link.href = row.fileUrl;
              link.download = row.fileName || `drawing-${row.drawingNumber}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          });
          toast.success(`Started download of ${selectedRows.length} drawings`);
          break;

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
            'Area': row.areaName,
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

        case "bulkStatusUpdate":
          // Implement bulk status update
          toast.info("Bulk status update coming soon");
          break;

        default:
          console.warn(`Unhandled bulk action: ${action}`);
      }
    } catch (error) {
      console.error(`Error handling bulk action ${action}:`, error);
      toast.error(`Failed to ${action} selected drawings`);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading drawings...</div>
      </div>
    );
  }

  return (
    <GenericDataTable
      data={data}
      config={createDrawingLogConfig(projectId)}
      onRowAction={handleRowAction}
      onBulkAction={handleBulkAction}
    />
  );
}