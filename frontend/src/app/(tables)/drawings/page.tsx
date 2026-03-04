"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDrawings } from "@/hooks/use-drawings";
import type { DrawingLogTableRow } from "@/types/drawings.types";

export default function DrawingsPage() {
  // Use project 31 as default for tables view (standalone page, no projectId in route)
  const { data: drawingsData, isLoading } = useDrawings("31");
  const drawings = drawingsData?.drawings || [];

  const columns: ColumnDef<DrawingLogTableRow>[] = [
    {
      accessorKey: "drawingNumber",
      header: "Number",
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium text-[hsl(var(--procore-orange))] hover:underline"
        >
          {row.getValue("drawingNumber")}
        </button>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
    },
    {
      accessorKey: "discipline",
      header: "Discipline",
      cell: ({ row }) => {
        const discipline = row.getValue("discipline") as string | null;
        if (!discipline) return null;
        const disciplineColors: Record<string, string> = {
          Architectural: "bg-blue-100 text-blue-700",
          Structural: "bg-green-100 text-green-700",
          Mechanical: "bg-purple-100 text-purple-700",
          Electrical: "bg-yellow-100 text-yellow-700",
          Plumbing: "bg-cyan-100 text-cyan-700",
        };
        return (
          <Badge
            className={
              disciplineColors[discipline] || "bg-muted text-foreground"
            }
          >
            {discipline}
          </Badge>
        );
      },
    },
    {
      accessorKey: "revisionNumber",
      header: "Rev",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string | null;
        if (!status) return null;
        const statusColors: Record<string, string> = {
          approved: "bg-green-100 text-green-700",
          under_review: "bg-yellow-100 text-yellow-700",
          superseded: "bg-muted text-foreground",
          void: "bg-red-100 text-red-700",
          draft: "bg-blue-100 text-blue-700",
        };
        return (
          <Badge
            className={statusColors[status] || "bg-muted text-foreground"}
          >
            {status.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "uploadedByEmail",
      header: "Uploaded By",
    },
    {
      accessorKey: "receivedDate",
      header: "Received",
      cell: ({ row }) => {
        const date = row.getValue("receivedDate") as string | null;
        return date ? new Date(date).toLocaleDateString() : "";
      },
    },
    {
      accessorKey: "fileSize",
      header: "Size",
      cell: ({ row }) => {
        const size = row.getValue("fileSize") as number | null;
        if (!size) return "";
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
      },
    },
    {
      id: "actions",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading drawings...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Drawings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Construction drawings and blueprints
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Upload Drawing
        </Button>
      </div>

      <div className="flex-1 bg-background rounded-lg border overflow-hidden">
        <DataTable
          columns={columns}
          data={drawings}
          searchKey="title"
          searchPlaceholder="Search drawings..."
        />
      </div>
    </div>
  );
}
