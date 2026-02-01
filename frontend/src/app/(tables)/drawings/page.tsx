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
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Drawing {
  id: string;
  number: string;
  title: string;
  discipline:
    | "architectural"
    | "structural"
    | "mechanical"
    | "electrical"
    | "plumbing";
  revision: string;
  status:
    | "issued_for_construction"
    | "issued_for_review"
    | "superseded"
    | "void";
  uploadedBy: string;
  uploadedAt: string;
  fileSize: string;
}

const mockDrawings: Drawing[] = [
  {
    id: "1",
    number: "A-101",
    title: "First Floor Plan",
    discipline: "architectural",
    revision: "B",
    status: "issued_for_construction",
    uploadedBy: "Architect",
    uploadedAt: "2025-12-05",
    fileSize: "2.4 MB",
  },
  {
    id: "2",
    number: "S-201",
    title: "Foundation Plan",
    discipline: "structural",
    revision: "A",
    status: "issued_for_construction",
    uploadedBy: "Structural Engineer",
    uploadedAt: "2025-12-04",
    fileSize: "3.1 MB",
  },
  {
    id: "3",
    number: "M-301",
    title: "HVAC Layout - Floor 1",
    discipline: "mechanical",
    revision: "C",
    status: "issued_for_review",
    uploadedBy: "MEP Engineer",
    uploadedAt: "2025-12-06",
    fileSize: "1.8 MB",
  },
];

export default function DrawingsPage() {
  const [data, setData] = React.useState<Drawing[]>(mockDrawings);

  const columns: ColumnDef<Drawing>[] = [
    {
      accessorKey: "number",
      header: "Number",
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium text-[hsl(var(--procore-orange))] hover:underline"
        >
          {row.getValue("number")}
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
        const discipline = row.getValue("discipline") as string;
        const disciplineColors: Record<string, string> = {
          architectural: "bg-blue-100 text-blue-700",
          structural: "bg-green-100 text-green-700",
          mechanical: "bg-purple-100 text-purple-700",
          electrical: "bg-yellow-100 text-yellow-700",
          plumbing: "bg-cyan-100 text-cyan-700",
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
      accessorKey: "revision",
      header: "Rev",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusColors: Record<string, string> = {
          issued_for_construction: "bg-green-100 text-green-700",
          issued_for_review: "bg-yellow-100 text-yellow-700",
          superseded: "bg-muted text-foreground",
          void: "bg-red-100 text-red-700",
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
      accessorKey: "uploadedBy",
      header: "Uploaded By",
    },
    {
      accessorKey: "uploadedAt",
      header: "Uploaded",
      cell: ({ row }) => {
        const date = row.getValue("uploadedAt") as string;
        return new Date(date).toLocaleDateString();
      },
    },
    {
      accessorKey: "fileSize",
      header: "Size",
    },
    {
      id: "actions",
      cell: ({ row }) => (
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

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Total</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">
            For Construction
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((d) => d.status === "issued_for_construction").length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">For Review</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((d) => d.status === "issued_for_review").length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Superseded</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((d) => d.status === "superseded").length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Void</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((d) => d.status === "void").length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-background rounded-lg border overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          searchKey="title"
          searchPlaceholder="Search drawings..."
        />
      </div>
    </div>
  );
}
