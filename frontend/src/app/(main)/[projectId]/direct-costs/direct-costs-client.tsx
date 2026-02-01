"use client";

import { useRouter } from "next/navigation";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { toast } from "sonner";

export type DirectCostRow = {
  id: string;
  date: string;
  invoice_number: string | null;
  cost_type: string;
  status: string;
  description: string | null;
  total_amount: number;
  received_date: string | null;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
  vendor: {
    name: string;
  } | null;
};

interface DirectCostsClientProps {
  projectId: string;
  directCosts: DirectCostRow[];
}

export function DirectCostsClient({
  projectId,
  directCosts,
}: DirectCostsClientProps) {
  const router = useRouter();

  const config: GenericTableConfig = {
    title: "Direct Costs",
    description: "Track project direct costs including expenses, work orders, and equipment",
    searchFields: ["description", "invoice_number"],
    exportFilename: "direct-costs-export.csv",
    editConfig: {
      tableName: "direct_costs",
      editableFields: ["status", "description", "received_date", "paid_date"],
    },
    rowClickPath: `/${projectId}/direct-costs/{id}`,
    requireDeleteConfirmation: true,
    columns: [
      {
        id: "date",
        label: "Date",
        defaultVisible: true,
        type: "date",
        sortable: true,
      },
      {
        id: "vendor_name",
        label: "Vendor",
        defaultVisible: true,
        type: "text",
        renderConfig: {
          type: "nested",
          path: "vendor.name",
          fallback: "Internal",
        },
      },
      {
        id: "cost_type",
        label: "Type",
        defaultVisible: true,
        type: "badge",
        renderConfig: {
          type: "badge",
          variantMap: {
            Expense: "default",
            Invoice: "secondary",
            "Subcontractor Invoice": "outline",
          },
          defaultVariant: "outline",
        },
      },
      {
        id: "invoice_number",
        label: "Invoice #",
        defaultVisible: true,
        type: "text",
      },
      {
        id: "status",
        label: "Status",
        defaultVisible: true,
        type: "badge",
        renderConfig: {
          type: "badge",
          variantMap: {
            Draft: "secondary",
            Pending: "outline",
            Approved: "default",
            Rejected: "destructive",
            Paid: "default",
          },
          defaultVariant: "outline",
        },
      },
      {
        id: "total_amount",
        label: "Amount",
        defaultVisible: true,
        type: "number",
        renderConfig: {
          type: "currency",
          prefix: "$",
          showDecimals: true,
        },
      },
      {
        id: "description",
        label: "Description",
        defaultVisible: false,
        type: "text",
        renderConfig: {
          type: "truncate",
          maxLength: 100,
        },
      },
      {
        id: "received_date",
        label: "Received",
        defaultVisible: true,
        type: "date",
      },
      {
        id: "paid_date",
        label: "Paid",
        defaultVisible: false,
        type: "date",
      },
      {
        id: "created_at",
        label: "Created",
        defaultVisible: false,
        type: "date",
      },
      {
        id: "updated_at",
        label: "Updated",
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
          { value: "Draft", label: "Draft" },
          { value: "Pending", label: "Pending" },
          { value: "Approved", label: "Approved" },
          { value: "Rejected", label: "Rejected" },
          { value: "Paid", label: "Paid" },
        ],
      },
      {
        id: "cost_type",
        label: "Cost Type",
        field: "cost_type",
        options: [
          { value: "Expense", label: "Expense" },
          { value: "Invoice", label: "Invoice" },
          { value: "Subcontractor Invoice", label: "Subcontractor Invoice" },
        ],
      },
    ],
  };

  const handleDeleteRow = async (id: string | number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/direct-costs/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete direct cost");
        return { error: errorData.error || "Failed to delete direct cost" };
      }

      toast.success("Direct cost deleted successfully");
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
      data={directCosts}
      config={config}
      onDeleteRow={handleDeleteRow}
    />
  );
}
