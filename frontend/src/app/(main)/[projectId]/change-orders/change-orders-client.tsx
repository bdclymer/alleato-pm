"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo, useState, useEffect } from "react";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get("status") || "all");

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (activeTab === "all") {
      params.delete("status");
    } else {
      params.set("status", activeTab);
    }
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.push(newUrl, { scroll: false });
  }, [activeTab, pathname, router, searchParams]);

  // Filter data based on active tab
  const filteredChangeOrders = useMemo(() => {
    if (activeTab === "all") {
      return changeOrders;
    }
    return changeOrders.filter((co) => {
      if (activeTab === "pending") {
        return co.status === "pending" || co.status === "submitted";
      }
      if (activeTab === "approved") {
        return co.status === "approved" || co.status === "executed";
      }
      return co.status === activeTab;
    });
  }, [changeOrders, activeTab]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    return changeOrders.reduce(
      (acc, co) => {
        const amount = co.amount || 0;

        switch (co.status) {
          case "pending":
          case "submitted":
            acc.pending.count++;
            acc.pending.amount += amount;
            break;
          case "approved":
          case "executed":
            acc.approved.count++;
            acc.approved.amount += amount;
            break;
          case "rejected":
            acc.rejected.count++;
            acc.rejected.amount += amount;
            break;
          case "draft":
            acc.draft.count++;
            acc.draft.amount += amount;
            break;
        }

        acc.total.count++;
        acc.total.amount += amount;

        return acc;
      },
      {
        pending: { count: 0, amount: 0 },
        approved: { count: 0, amount: 0 },
        rejected: { count: 0, amount: 0 },
        draft: { count: 0, amount: 0 },
        total: { count: 0, amount: 0 },
      }
    );
  }, [changeOrders]);

  const config: GenericTableConfig = {
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
        renderConfig: {
          type: "currency",
          currency: "USD",
        },
      },
      {
        id: "submitted_at",
        label: "Date Initiated",
        defaultVisible: true,
        type: "date",
      },
      {
        id: "designated_reviewer_id",
        label: "Designated Reviewer",
        defaultVisible: true,
        type: "text",
        renderConfig: {
          type: "truncate",
          maxLength: 20,
        },
      },
      {
        id: "approved_at",
        label: "Review Date",
        defaultVisible: true,
        type: "date",
      },
      {
        id: "due_date",
        label: "Due Date",
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.draft.count}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.draft.amount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pending.count}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.pending.amount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.approved.count}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.approved.amount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.rejected.count}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.rejected.amount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All ({changeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Draft ({summary.draft.count})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({summary.pending.count})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({summary.approved.count})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({summary.rejected.count})
          </TabsTrigger>
          <TabsTrigger value="executed">
            Executed ({changeOrders.filter(co => co.status === "executed").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <GenericDataTable
            data={filteredChangeOrders}
            config={config}
            onDeleteRow={handleDeleteRow}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
