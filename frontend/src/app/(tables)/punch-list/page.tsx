"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PunchItemStatusBadge,
  PunchItemPriorityBadge,
} from "@/components/domain/punch-items/punch-item-status-badge";
import type { Database } from "@/types/database.types";

type PunchItemRow = Database["public"]["Tables"]["punch_items"]["Row"];

export default function PunchListTablePage() {
  const [data, setData] = React.useState<PunchItemRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Fetch punch items for the default project
    async function fetchData() {
      try {
        const res = await fetch("/api/projects/67/punch-items");
        if (res.ok) {
          const json = await res.json();
          setData(json.items ?? []);
        }
      } catch {
        // Silently fail for tables view
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const columns: ColumnDef<PunchItemRow>[] = [
    {
      accessorKey: "number",
      header: "Number",
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium text-[hsl(var(--procore-orange))] hover:underline"
        >
          #{row.getValue("number")}
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
      cell: ({ row }) => row.getValue("location") || "-",
    },
    {
      accessorKey: "assignee_company",
      header: "Assignee",
      cell: ({ row }) => row.getValue("assignee_company") || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <PunchItemStatusBadge status={row.getValue("status")} />
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <PunchItemPriorityBadge priority={row.getValue("priority")} />
      ),
    },
    {
      accessorKey: "trade",
      header: "Trade",
      cell: ({ row }) => row.getValue("trade") || "-",
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }) => {
        const date = row.getValue("due_date") as string | null;
        return date ? new Date(date).toLocaleDateString() : "-";
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

      {/* Table */}
      <div className="flex-1 bg-background rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading punch items...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            searchKey="title"
            searchPlaceholder="Search punch list items..."
          />
        )}
      </div>
    </div>
  );
}
