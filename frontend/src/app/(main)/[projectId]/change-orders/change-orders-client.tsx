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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Filter, X } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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

  // Filter state
  const [searchText, setSearchText] = useState("");
  const [reviewerFilter, setReviewerFilter] = useState("all");
  const [dueDateFrom, setDueDateFrom] = useState<string>("");
  const [dueDateTo, setDueDateTo] = useState<string>("");

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

  // Get unique reviewers for filter dropdown
  const uniqueReviewers = useMemo(() => {
    const reviewers = changeOrders
      .map((co) => co.designated_reviewer_id)
      .filter((id): id is string => !!id);
    return Array.from(new Set(reviewers));
  }, [changeOrders]);

  // Filter data based on active tab and additional filters
  const filteredChangeOrders = useMemo(() => {
    let result = changeOrders;

    // Tab filter
    if (activeTab !== "all") {
      result = result.filter((co) => {
        if (activeTab === "pending") {
          return co.status === "pending" || co.status === "submitted";
        }
        if (activeTab === "approved") {
          return co.status === "approved" || co.status === "executed";
        }
        return co.status === activeTab;
      });
    }

    // Text search filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter((co) => {
        return (
          co.co_number?.toLowerCase().includes(search) ||
          co.title?.toLowerCase().includes(search) ||
          co.description?.toLowerCase().includes(search)
        );
      });
    }

    // Reviewer filter
    if (reviewerFilter !== "all") {
      result = result.filter((co) => co.designated_reviewer_id === reviewerFilter);
    }

    // Due date range filter
    if (dueDateFrom) {
      result = result.filter((co) => {
        if (!co.due_date) return false;
        return new Date(co.due_date) >= new Date(dueDateFrom);
      });
    }
    if (dueDateTo) {
      result = result.filter((co) => {
        if (!co.due_date) return false;
        return new Date(co.due_date) <= new Date(dueDateTo);
      });
    }

    return result;
  }, [
    changeOrders,
    activeTab,
    searchText,
    reviewerFilter,
    dueDateFrom,
    dueDateTo,
  ]);

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
          prefix: "$",
          showDecimals: true,
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

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchText.trim()) count++;
    if (reviewerFilter !== "all") count++;
    if (dueDateFrom) count++;
    if (dueDateTo) count++;
    return count;
  }, [searchText, reviewerFilter, dueDateFrom, dueDateTo]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchText("");
    setReviewerFilter("all");
    setDueDateFrom("");
    setDueDateTo("");
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

      {/* Filter Bar */}
      <Card className="bg-muted/40">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Filters</h3>
              {activeFiltersCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="space-y-1.5">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Number, title, description..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Reviewer Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Reviewer</Label>
              <Select value={reviewerFilter} onValueChange={setReviewerFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Reviewers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reviewers</SelectItem>
                  {uniqueReviewers.map((reviewer) => (
                    <SelectItem key={reviewer} value={reviewer}>
                      {reviewer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date From */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Due Date From
              </Label>
              <Input
                type="date"
                value={dueDateFrom}
                onChange={(e) => setDueDateFrom(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Due Date To */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Due Date To
              </Label>
              <Input
                type="date"
                value={dueDateTo}
                onChange={(e) => setDueDateTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Active Filter Pills */}
          {activeFiltersCount > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Active filters:
                </span>
                {searchText.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100"
                  >
                    Search: {searchText}
                    <X className="w-3 h-3" />
                  </button>
                )}
                {reviewerFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setReviewerFilter("all")}
                    className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100"
                  >
                    Reviewer: {reviewerFilter}
                    <X className="w-3 h-3" />
                  </button>
                )}
                {dueDateFrom && (
                  <button
                    type="button"
                    onClick={() => setDueDateFrom("")}
                    className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100"
                  >
                    From: {new Date(dueDateFrom).toLocaleDateString()}
                    <X className="w-3 h-3" />
                  </button>
                )}
                {dueDateTo && (
                  <button
                    type="button"
                    onClick={() => setDueDateTo("")}
                    className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100"
                  >
                    To: {new Date(dueDateTo).toLocaleDateString()}
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
