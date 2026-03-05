"use client";

import { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, Edit, Trash2, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  usePunchItems,
  useUpdatePunchItem,
  useDeletePunchItem,
  useRestorePunchItem,
} from "@/hooks/use-punch-items";
import {
  PunchItemFormDialog,
  type PunchItemFormValues,
} from "@/components/domain/punch-items/punch-item-form-dialog";
import {
  PunchItemStatusBadge,
  PunchItemPriorityBadge,
} from "@/components/domain/punch-items/punch-item-status-badge";
import type { Database } from "@/types/database.types";

type PunchItemRow = Database["public"]["Tables"]["punch_items"]["Row"];

interface PunchListClientProps {
  projectId: number;
}

export function PunchListClient({ projectId }: PunchListClientProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [editingItem, setEditingItem] = useState<PunchItemRow | null>(null);

  const isRecycleBin = activeTab === "recycle-bin";

  const { data: listData, isLoading } = usePunchItems(projectId, {
    is_deleted: isRecycleBin,
  });

  const updateMutation = useUpdatePunchItem(projectId);
  const deleteMutation = useDeletePunchItem(projectId);
  const restoreMutation = useRestorePunchItem(projectId);

  const items: PunchItemRow[] = listData?.items ?? [];

  const statusCounts = useMemo(() => {
    return {
      draft: items.filter((i) => i.status === "draft").length,
      work_required: items.filter((i) => i.status === "work_required").length,
      initiated: items.filter((i) => i.status === "initiated").length,
      closed: items.filter((i) => i.status === "closed").length,
      total: items.length,
    };
  }, [items]);

  const handleEdit = (data: PunchItemFormValues) => {
    if (!editingItem) return;
    updateMutation.mutate(
      { punchItemId: editingItem.id, data },
      {
        onSuccess: () => {
          setEditingItem(null);
        },
      },
    );
  };

  const handleDelete = (punchItemId: string) => {
    deleteMutation.mutate(punchItemId);
  };

  const handleRestore = (punchItemId: string) => {
    restoreMutation.mutate(punchItemId);
  };

  const columns: ColumnDef<PunchItemRow>[] = [
    {
      accessorKey: "number",
      header: "#",
      cell: ({ row }) => (
        <span className="font-medium text-primary">
          {row.getValue("number")}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
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
      accessorKey: "assignee_company",
      header: "Assignee",
      cell: ({ row }) => row.getValue("assignee_company") || "-",
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => row.getValue("location") || "-",
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
      cell: ({ row }) => {
        const item = row.original;
        if (isRecycleBin) {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRestore(item.id)}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restore
            </Button>
          );
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingItem(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {!isRecycleBin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-background rounded-lg border p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Draft
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {statusCounts.draft}
            </div>
          </div>
          <div className="bg-background rounded-lg border p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Work Required
            </div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              {statusCounts.work_required}
            </div>
          </div>
          <div className="bg-background rounded-lg border p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Initiated
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {statusCounts.initiated}
            </div>
          </div>
          <div className="bg-background rounded-lg border p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Closed
            </div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {statusCounts.closed}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="recycle-bin">Recycle Bin</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="bg-background rounded-lg border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading punch items...
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={items}
                searchKey="title"
                searchPlaceholder="Search punch items..."
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="recycle-bin" className="mt-4">
          <div className="bg-background rounded-lg border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading recycle bin...
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Recycle bin is empty
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={items}
                searchKey="title"
                searchPlaceholder="Search deleted items..."
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <PunchItemFormDialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        onSubmit={handleEdit}
        defaultValues={editingItem ?? undefined}
        isLoading={updateMutation.isPending}
        mode="edit"
      />
    </div>
  );
}
