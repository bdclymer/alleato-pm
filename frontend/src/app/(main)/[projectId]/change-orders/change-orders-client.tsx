"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";
import { Card, CardContent } from "@/components/ui/card";
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
type PrimeContractChangeOrderRow =
  Database["public"]["Tables"]["prime_contract_change_orders"]["Row"];
type ContractChangeOrderRow =
  Database["public"]["Tables"]["contract_change_orders"]["Row"];

// Unified change order type that can represent data from any of the three tables
type UnifiedChangeOrder =
  | (ChangeOrderRow & {
      contractType: "general";
      normalizedNumber: string | null;
      normalizedTitle: string | null;
      normalizedDescription: string | null;
      normalizedStatus: string | null;
      normalizedAmount: number | null;
      normalizedCreatedAt: string | null;
      normalizedDueDate: string | null;
    })
  | (Omit<PrimeContractChangeOrderRow, "contracts"> & {
      contractType: "prime";
      normalizedNumber: string | null;
      normalizedTitle: string;
      normalizedDescription: null;
      normalizedStatus: string | null;
      normalizedAmount: number | null;
      normalizedCreatedAt: string | null;
      normalizedDueDate: null;
    })
  | (Omit<ContractChangeOrderRow, "prime_contracts"> & {
      contractType: "commitment";
      normalizedNumber: string;
      normalizedTitle: null;
      normalizedDescription: string;
      normalizedStatus: string;
      normalizedAmount: number;
      normalizedCreatedAt: string;
      normalizedDueDate: null;
    });

interface ChangeOrdersClientProps {
  projectId: string;
  changeOrders: UnifiedChangeOrder[];
}

export function ChangeOrdersClient({
  projectId,
  changeOrders,
}: ChangeOrdersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get("status") || "all");
  const [contractTypeTab, setContractTypeTab] = useState(
    searchParams.get("contractType") || "all"
  );

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
    if (contractTypeTab === "all") {
      params.delete("contractType");
    } else {
      params.set("contractType", contractTypeTab);
    }
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.push(newUrl, { scroll: false });
  }, [activeTab, contractTypeTab, pathname, router, searchParams]);

  // Get unique reviewers for filter dropdown
  const uniqueReviewers = useMemo(() => {
    const reviewers = changeOrders
      .filter((co) => co.contractType === "general") // Only general change orders have reviewers
      .map((co) => {
        if (co.contractType === "general") {
          return co.designated_reviewer_id;
        }
        return null;
      })
      .filter((id): id is string => !!id);
    return Array.from(new Set(reviewers));
  }, [changeOrders]);

  // Filter data based on active tab and additional filters
  const filteredChangeOrders = useMemo(() => {
    let result = changeOrders;

    // Contract type filter
    if (contractTypeTab !== "all") {
      result = result.filter((co) => co.contractType === contractTypeTab);
    }

    // Status tab filter
    if (activeTab !== "all") {
      result = result.filter((co) => {
        const status = co.normalizedStatus;
        if (!status) return false;
        if (activeTab === "pending") {
          return status === "pending" || status === "submitted";
        }
        if (activeTab === "approved") {
          return status === "approved" || status === "executed";
        }
        return status === activeTab;
      });
    }

    // Text search filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter((co) => {
        return (
          co.normalizedNumber?.toLowerCase().includes(search) ||
          co.normalizedTitle?.toLowerCase().includes(search) ||
          co.normalizedDescription?.toLowerCase().includes(search)
        );
      });
    }

    // Reviewer filter (only applies to general change orders)
    if (reviewerFilter !== "all") {
      result = result.filter((co) => {
        if (co.contractType === "general") {
          return co.designated_reviewer_id === reviewerFilter;
        }
        return false;
      });
    }

    // Due date range filter (only general change orders have due dates)
    if (dueDateFrom) {
      result = result.filter((co) => {
        if (!co.normalizedDueDate) return false;
        return new Date(co.normalizedDueDate) >= new Date(dueDateFrom);
      });
    }
    if (dueDateTo) {
      result = result.filter((co) => {
        if (!co.normalizedDueDate) return false;
        return new Date(co.normalizedDueDate) <= new Date(dueDateTo);
      });
    }

    return result;
  }, [
    changeOrders,
    contractTypeTab,
    activeTab,
    searchText,
    reviewerFilter,
    dueDateFrom,
    dueDateTo,
  ]);

  // Calculate status counts based on current contract type filter
  const statusCounts = useMemo(() => {
    const dataToCount =
      contractTypeTab === "all"
        ? changeOrders
        : changeOrders.filter((co) => co.contractType === contractTypeTab);

    return dataToCount.reduce(
      (acc, co) => {
        const status = co.normalizedStatus;

        switch (status) {
          case "pending":
          case "submitted":
            acc.pending++;
            break;
          case "approved":
            acc.approved++;
            break;
          case "executed":
            acc.executed++;
            break;
          case "rejected":
            acc.rejected++;
            break;
          case "draft":
            acc.draft++;
            break;
        }

        acc.total++;

        return acc;
      },
      {
        pending: 0,
        approved: 0,
        executed: 0,
        rejected: 0,
        draft: 0,
        total: 0,
      }
    );
  }, [changeOrders, contractTypeTab]);

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

      {/* Contract Type Tabs */}
      <div className="space-y-4">
        <Tabs
          value={contractTypeTab}
          onValueChange={setContractTypeTab}
          className="space-y-4"
        >
          <div className="border-b">
            <TabsList className="bg-transparent border-0">
              <TabsTrigger
                value="all"
                className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
              >
                All (
                {changeOrders.length})
              </TabsTrigger>
              <TabsTrigger
                value="prime"
                className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
              >
                Prime Contract (
                {changeOrders.filter((co) => co.contractType === "prime").length})
              </TabsTrigger>
              <TabsTrigger
                value="commitment"
                className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
              >
                Commitments (
                {
                  changeOrders.filter((co) => co.contractType === "commitment")
                    .length
                }
                )
              </TabsTrigger>
              <TabsTrigger
                value="general"
                className="border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
              >
                General (
                {changeOrders.filter((co) => co.contractType === "general").length})
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {/* Status Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All ({statusCounts.total})
            </TabsTrigger>
            <TabsTrigger value="draft">Draft ({statusCounts.draft})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({statusCounts.pending})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({statusCounts.approved})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({statusCounts.rejected})
            </TabsTrigger>
            <TabsTrigger value="executed">
              Executed ({statusCounts.executed})
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
    </div>
  );
}
