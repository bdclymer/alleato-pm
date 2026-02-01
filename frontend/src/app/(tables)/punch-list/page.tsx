"use client";

import * as React from "react";
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

interface PunchListItem {
  id: string;
  number: string;
  title: string;
  location: string;
  assignee: string;
  status: "open" | "in_progress" | "ready_for_review" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  trade: string;
  dueDate: string | null;
  createdAt: string;
}

const mockPunchList: PunchListItem[] = [
  {
    id: "1",
    number: "PL-001",
    title: "Paint touch-ups in main lobby",
    location: "Floor 1 - Main Lobby",
    assignee: "Johnson Painting",
    status: "open",
    priority: "medium",
    trade: "Painting",
    dueDate: "2025-12-15",
    createdAt: "2025-12-01",
  },
  {
    id: "2",
    number: "PL-002",
    title: "Fix door alignment",
    location: "Floor 2 - Office 201",
    assignee: "ABC Carpentry",
    status: "in_progress",
    priority: "high",
    trade: "Carpentry",
    dueDate: "2025-12-12",
    createdAt: "2025-12-02",
  },
];

export default function PunchListPage() {
  const [data, setData] = React.useState<PunchListItem[]>(mockPunchList);

  const columns: ColumnDef<PunchListItem>[] = [
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
      accessorKey: "location",
      header: "Location",
    },
    {
      accessorKey: "assignee",
      header: "Assignee",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusColors: Record<string, string> = {
          open: "bg-yellow-100 text-yellow-700",
          in_progress: "bg-blue-100 text-blue-700",
          ready_for_review: "bg-purple-100 text-purple-700",
          closed: "bg-green-100 text-green-700",
        };
        return (
          <Badge
            className={statusColors[status] || "bg-muted text-foreground"}
          >
            {status.replace("_", " ")}
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
          critical: "bg-red-100 text-red-700",
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
      accessorKey: "trade",
      header: "Trade",
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
          <h1 className="text-3xl font-bold text-foreground">Punch List</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage punch list items
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Create Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Open</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((item) => item.status === "open").length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">In Progress</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((item) => item.status === "in_progress").length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Ready for Review
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((item) => item.status === "ready_for_review").length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Closed</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((item) => item.status === "closed").length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-background rounded-lg border overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          searchKey="title"
          searchPlaceholder="Search punch list items..."
        />
      </div>
    </div>
  );
}
