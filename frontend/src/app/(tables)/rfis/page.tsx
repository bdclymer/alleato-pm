"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RFI {
  id: string;
  number: string;
  subject: string;
  assignee: string;
  status: "draft" | "open" | "answered" | "closed";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
}

const mockRFIs: RFI[] = [
  {
    id: "1",
    number: "RFI-001",
    subject: "Clarification on structural beam specification",
    assignee: "Engineering Team",
    status: "open",
    priority: "high",
    dueDate: "2025-12-14",
    createdBy: "John Smith",
    createdAt: "2025-12-08",
  },
  {
    id: "2",
    number: "RFI-002",
    subject: "Material substitution approval for flooring",
    assignee: "Architect",
    status: "answered",
    priority: "medium",
    dueDate: "2025-12-16",
    createdBy: "Jane Doe",
    createdAt: "2025-12-09",
  },
];

export default function RFIsPage() {
  const data = mockRFIs;

  const columns: ColumnDef<RFI>[] = [
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
      accessorKey: "subject",
      header: "Subject",
    },
    {
      accessorKey: "assignee",
      header: "Assigned To",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusColors: Record<string, string> = {
          draft: "bg-muted text-foreground",
          open: "bg-blue-100 text-blue-700",
          answered: "bg-purple-100 text-purple-700",
          closed: "bg-green-100 text-green-700",
        };
        return (
          <Badge
            className={statusColors[status] || "bg-muted text-foreground"}
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        const priorityColors: Record<string, string> = {
          low: "bg-muted text-foreground",
          medium: "bg-yellow-100 text-yellow-700",
          high: "bg-orange-100 text-orange-700",
        };
        return (
          <Badge
            className={priorityColors[priority] || "bg-muted text-foreground"}
          >
            {priority}
          </Badge>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => {
        const date = row.getValue("dueDate") as string | null;
        return date ? new Date(date).toLocaleDateString() : "-";
      },
    },
    {
      accessorKey: "createdBy",
      header: "Created By",
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
          <h1 className="text-3xl font-bold text-foreground">RFIs</h1>
          <p className="text-sm text-muted-foreground mt-1">Requests for Information</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Create RFI
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 bg-background rounded-lg border overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          searchKey="subject"
          searchPlaceholder="Search RFIs..."
        />
      </div>
    </div>
  );
}
