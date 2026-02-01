"use client";

import { useRouter } from "next/navigation";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";

type ChangeOrderRow = Database["public"]["Tables"]["change_orders"]["Row"];

interface ChangeOrdersClientProps {
  projectId: string;
  changeOrders: ChangeOrderRow[];
}

export function ChangeOrdersClient({
  projectId,
  changeOrders,
}: ChangeOrdersClientProps) {
  const router = useRouter();

  const config: GenericTableConfig = {
    title: "Change Orders",
    description: "Manage contract change orders and modifications",
    searchFields: ["co_number", "title", "description"],
    exportFilename: "change-orders-export.csv",
    editConfig: {
      tableName: "change_orders",
      editableFields: [
        "co_number",
        "title",
        "description",
        "status",
        "amount",
      ],
    },
    rowClickPath: `/${projectId}/change-orders/{id}`,
    requireDeleteConfirmation: true,
    columns: [
      {
        id: "co_number",
        label: "Number",
        defaultVisible: true,
        type: "text",
      },
      {
        id: "title",
        label: "Title",
        defaultVisible: true,
        type: "text",
      },
      {
        id: "description",
        label: "Description",
        defaultVisible: true,
        type: "text",
        renderConfig: {
          type: "truncate",
          maxLength: 50,
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
            approved: "default",
            pending: "secondary",
            draft: "outline",
            executed: "default",
            rejected: "destructive",
            void: "destructive",
          },
          defaultVariant: "outline",
        },
      },
      {
        id: "amount",
        label: "Amount",
        defaultVisible: true,
        type: "number",
      },
      {
        id: "due_date",
        label: "Due Date",
        defaultVisible: false,
        type: "date",
      },
      {
        id: "submitted_at",
        label: "Submitted",
        defaultVisible: true,
        type: "date",
      },
      {
        id: "approved_at",
        label: "Approved",
        defaultVisible: false,
        type: "date",
      },
      {
        id: "created_at",
        label: "Created",
        defaultVisible: false,
        type: "date",
      },
    ],
    filters: [
      {
        id: "status",
        label: "Status",
        field: "status",
        options: [
          { value: "draft", label: "Draft" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "executed", label: "Executed" },
          { value: "rejected", label: "Rejected" },
          { value: "void", label: "Void" },
        ],
      },
    ],
  };

  const handleDeleteRow = async (id: string | number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/change-orders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete change order");
        return { error: errorData.error || "Failed to delete change order" };
      }

      toast.success("Change order deleted successfully");
      router.refresh();
      return {};
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(message);
      return { error: message };
    }
  };

  return (
    <GenericDataTable
      data={changeOrders}
      config={config}
      onDeleteRow={handleDeleteRow}
    />
  );
}
