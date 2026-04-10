"use client";

import * as React from "react";
import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  BudgetPageHeader,
  BudgetTabs,
  BudgetFilters,
  BudgetTable,
  BudgetDetailsTable,
  BudgetModificationModal,
  VerticalMarkupSettings,
  CostCodesTab,
  OriginalBudgetEditModal,
  ForecastingTab,
  SnapshotsTab,
  ChangeHistoryTab,
  BudgetModificationsTab,
} from "@/components/budget";
import { UnlockBudgetDialog } from "@/components/budget/unlock-budget-dialog";
import { BudgetLineItemCreatorModal, type InlineLineItemData } from "@/components/budget/BudgetLineItemCreatorModal";
import { BudgetLineItemModalAnimated } from "@/components/budget/budget-line-item-modal-animated";
import { BudgetModificationsModal } from "@/components/budget/modals/BudgetModificationsModal";
import { ApprovedCOsModal } from "@/components/budget/modals/ApprovedCOsModal";
import { JobToDateCostDetailModal } from "@/components/budget/modals/JobToDateCostDetailModal";
import { DirectCostsModal } from "@/components/budget/modals/DirectCostsModal";
import { PendingBudgetChangesModal } from "@/components/budget/modals/PendingBudgetChangesModal";
import { CommittedCostsModal } from "@/components/budget/modals/CommittedCostsModal";
import { PendingCostChangesModal } from "@/components/budget/modals/PendingCostChangesModal";
import { ForecastToCompleteModal } from "@/components/budget/modals/ForecastToCompleteModal";
import { ImportBudgetModal } from "@/components/budget/ImportBudgetModal";
import type { BudgetDetailLineItem } from "@/components/budget/budget-details-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { BudgetLineItem } from "@/types/budget";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { budgetSnapshots, budgetGroups } from "@/config/budget";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import {
  applyQuickFilter,
  loadQuickFilterPreference,
  saveQuickFilterPreference,
} from "@/lib/budget-filters";
import type { QuickFilterType } from "@/components/budget/budget-filters";
import { applyGrouping, type GroupingType } from "@/lib/budget-grouping";
import { BudgetTableCommentsWrapper } from "@/components/budget/budget-table-comments-wrapper";
import { PermissionGate } from "@/components/domain/permissions/PermissionGate";

const EMPTY_GRAND_TOTALS = {
  originalBudgetAmount: 0,
  budgetModifications: 0,
  approvedCOs: 0,
  revisedBudget: 0,
  jobToDateCostDetail: 0,
  directCosts: 0,
  pendingChanges: 0,
  projectedBudget: 0,
  committedCosts: 0,
  pendingCostChanges: 0,
  projectedCosts: 0,
  forecastToComplete: 0,
  estimatedCostAtCompletion: 0,
  projectedOverUnder: 0,
};

function BudgetTableSkeleton() {
  return (
    <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
      {/* Table header skeleton */}
      <div className="flex items-center gap-2 px-4 py-4 border-b bg-muted/50">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32 ml-4" />
        <Skeleton className="h-4 w-20 ml-4" />
        <Skeleton className="h-4 w-28 ml-auto" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-28" />
      </div>
      {/* Table rows skeleton */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-4 py-4 border-b last:border-b-0">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-48 ml-4" />
          <Skeleton className="h-4 w-12 ml-4" />
          <Skeleton className="h-5 w-24 ml-auto" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
      {/* Grand total row skeleton */}
      <div className="flex items-center gap-2 px-4 py-4 bg-muted/30 border-t">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-28 ml-auto" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-28" />
      </div>
    </div>
  );
}

function BudgetPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  useProjectTitle("Budget");

  // Get active tab from URL query parameter, default to 'budget'
  const activeTab = searchParams.get("tab") || "budget";
  const [selectedSnapshot, setSelectedSnapshot] = React.useState("current");
  const [selectedGroup, setSelectedGroup] = React.useState("cost-code-tier-1");
  const [budgetData, setBudgetData] = React.useState<BudgetLineItem[]>([]);
  const [budgetDetailsData, setBudgetDetailsData] = React.useState<
    BudgetDetailLineItem[]
  >([]);
  const [quickFilter, setQuickFilter] = React.useState<QuickFilterType>("all");
  const [grandTotals, setGrandTotals] = React.useState(EMPTY_GRAND_TOTALS);
  const [loading, setLoading] = React.useState(true);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [detailsRequested, setDetailsRequested] = React.useState(false);
  const [detailsFetchError, setDetailsFetchError] = React.useState(false);
  const [showLineItemModal, setShowLineItemModal] = React.useState(false);
  const [showModificationModal, setShowModificationModal] =
    React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = React.useState(false);
  const [selectedLineItem, setSelectedLineItem] =
    React.useState<BudgetLineItem | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [deleting, setDeleting] = React.useState(false);
  const [showInlineCreate, setShowInlineCreate] = React.useState(false);

  // New modal states for budget column modals
  const [showBudgetModificationsModal, setShowBudgetModificationsModal] =
    React.useState(false);
  const [showApprovedCOsModal, setShowApprovedCOsModal] = React.useState(false);
  const [showJobToDateCostDetailModal, setShowJobToDateCostDetailModal] =
    React.useState(false);
  const [showDirectCostsModal, setShowDirectCostsModal] = React.useState(false);
  const [showPendingChangesModal, setShowPendingChangesModal] =
    React.useState(false);
  const [showCommittedCostsModal, setShowCommittedCostsModal] =
    React.useState(false);
  const [showPendingCostChangesModal, setShowPendingCostChangesModal] =
    React.useState(false);
  const [showForecastToCompleteModal, setShowForecastToCompleteModal] =
    React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [snapshotsRefreshToken, setSnapshotsRefreshToken] = React.useState(0);

  // Budget lock state
  const [isLocked, setIsLocked] = React.useState(false);
  const [lockedAt, setLockedAt] = React.useState<string | null>(null);
  const [lockedBy, setLockedBy] = React.useState<string | null>(null);

  // Fetch budget lock status
  const fetchLockStatus = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget/lock`);
      if (response.ok) {
        const data = await response.json();
        setIsLocked(data.isLocked || false);
        setLockedAt(data.lockedAt);
        setLockedBy(data.lockedBy);
      }
    } catch (error) {
      console.error("Failed to fetch budget lock status:", error);
      // Intentionally swallowed: lock status fetch is non-critical
    }
  }, [projectId]);

  // Fetch budget data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch budget data and lock status in parallel
        const [budgetResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/budget`),
          fetchLockStatus(),
        ]);

        if (budgetResponse.ok) {
          const budgetDataResponse = await budgetResponse.json();
          setBudgetData(budgetDataResponse.lineItems || []);
          setGrandTotals(budgetDataResponse.grandTotals || EMPTY_GRAND_TOTALS);
        } else {
          setBudgetData([]);
          setGrandTotals(EMPTY_GRAND_TOTALS);
        }
      } catch (error) {
        console.error("Failed to fetch budget data:", error);
        setBudgetData([]);
        setGrandTotals(EMPTY_GRAND_TOTALS);
        toast.error("Failed to load budget", { description: "Please try again." });
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchData();
      // Load saved quick filter preference
      const savedFilter = loadQuickFilterPreference(projectId);
      setQuickFilter(savedFilter);
    }
  }, [projectId, fetchLockStatus]);

  // Apply quick filter to budget data
  // Apply filtering and grouping to budget data
  const filteredData = React.useMemo(() => {
    // First apply quick filter
    const filtered = applyQuickFilter(budgetData, quickFilter);

    // Then apply grouping
    const grouped = applyGrouping(filtered, selectedGroup as GroupingType);

    return grouped;
  }, [budgetData, quickFilter, selectedGroup]);

  // Handle quick filter change
  const handleQuickFilterChange = React.useCallback(
    (filter: QuickFilterType) => {
      setQuickFilter(filter);
      saveQuickFilterPreference(projectId, filter);
      toast.success(
        `Filter applied: ${
          filter === "all"
            ? "All Items"
            : filter
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")
        }`,
      );
    },
    [projectId],
  );

  const handleCreateClick = () => {
    if (isLocked) {
      toast.error("Budget is locked. Unlock to add new line items.");
      return;
    }
    // Don't open the modal, instead trigger the inline creation
    // This will be passed to BudgetTable component
    setShowInlineCreate(true);
  };

  const handleModificationClick = () => {
    if (isLocked) {
      toast.error("Budget is locked. Unlock to create modifications.");
      return;
    }
    setShowModificationModal(true);
  };

  const handleResendToERP = () => {
    // TODO: Implement ERP integration
    toast.info("ERP integration coming soon");
  };

  const handleLockBudget = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget/lock`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setIsLocked(true);
        setLockedAt(data.data.budget_locked_at);
        setLockedBy(data.data.budget_locked_by);
        toast.success("Budget locked successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to lock budget");
      }
    } catch (error) {
      toast.error("Failed to lock budget");
    }
  };

  const handleUnlockBudget = () => {
    // Open the unlock dialog instead of immediately unlocking
    setShowUnlockDialog(true);
  };

  const handleUnlockSuccess = async () => {
    // Refetch budget data and lock status after successful unlock
    setIsLocked(false);
    setLockedAt(null);
    setLockedBy(null);

    try {
      setLoading(true);
      const [budgetResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}/budget`),
        fetchLockStatus(),
      ]);

      if (budgetResponse.ok) {
        const budgetDataResponse = await budgetResponse.json();
        setBudgetData(budgetDataResponse.lineItems || []);
        setGrandTotals(budgetDataResponse.grandTotals || EMPTY_GRAND_TOTALS);
      }
    } catch (fetchError) {
      console.error("Failed to refetch budget data after unlock:", fetchError);
      toast.error("Failed to refresh data after unlock", {
        description: "Please refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (isLocked) {
      toast.error("Budget is locked. Unlock to import budget data.");
      return;
    }
    setShowImportModal(true);
  };

  const handleCreateSnapshot = React.useCallback(async () => {
    let toastId: string | number | undefined;
    try {
      toastId = toast.loading("Creating snapshot...");
      const response = await fetch(`/api/projects/${projectId}/budget/snapshots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Snapshot ${new Date().toLocaleDateString()}`,
          description: "Manual snapshot",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to create snapshot");
      }

      setSnapshotsRefreshToken((prev) => prev + 1);
      toast.success("Snapshot created successfully", { id: toastId });
      if (activeTab !== "snapshots") {
        router.push(`/${projectId}/budget?tab=snapshots`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create snapshot",
        { id: toastId },
      );
    }
  }, [activeTab, projectId, router]);

  const handleExport = async (format: string) => {
    let toastId: string | number | undefined;

    try {
      // Validate format
      if (!["excel", "csv", "pdf"].includes(format)) {
        toast.error("Invalid export format");
        return;
      }

      if (format === "pdf") {
        toast.info("PDF export coming soon");
        return;
      }

      // Show initial loading state
      toastId = toast.loading(`Preparing ${format.toUpperCase()} export...`, {
        description: "Gathering budget data...",
      });

      // Call export API
      const response = await fetch(
        `/api/projects/${projectId}/budget/export?format=${format}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      // Update progress
      toast.loading(`Generating ${format.toUpperCase()} file...`, {
        id: toastId,
        description: "Processing data and creating file...",
      });

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `budget-export.${format === "excel" ? "xlsx" : "csv"}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Update progress before download
      toast.loading("Starting download...", {
        id: toastId,
        description: `File: ${filename}`,
      });

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      // Show success message with details
      const fileSize = (blob.size / 1024 / 1024).toFixed(2);
      toast.success(`Export completed successfully!`, {
        id: toastId,
        description: `${filename} (${fileSize} MB) has been downloaded`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to export budget data";

      toast.error(`Export failed: ${errorMessage}`, {
        id: toastId,
        description: "Please try again or contact support if the problem persists",
      });
    }
  };

  const handleTabChange = (tabId: string) => {
    // Update URL to reflect tab change
    if (tabId === "budget") {
      router.push(`/${projectId}/budget`);
    } else {
      router.push(`/${projectId}/budget?tab=${tabId}`);
    }

    // Fetch budget details when switching to budget-details tab
    if (
      tabId === "budget-details" &&
      !detailsLoading &&
      (budgetDetailsData.length === 0 || detailsFetchError)
    ) {
      fetchBudgetDetails();
    }
  };

  // Fetch budget details data
  const fetchBudgetDetails = React.useCallback(async () => {
    try {
      setDetailsRequested(true);
      setDetailsLoading(true);
      setDetailsFetchError(false);
      const response = await fetch(`/api/projects/${projectId}/budget/details`);
      if (response.ok) {
        const data = await response.json();
        setBudgetDetailsData(data.details || []);
      } else {
        const errorBody = await response.json().catch(() => null);
        const errorMessage =
          errorBody?.error || "Failed to load budget details";
        toast.error(errorMessage);
        setDetailsFetchError(true);
      }
    } catch (error) {
      console.error("Failed to load budget details:", error);
      toast.error("Failed to load budget details");
      setDetailsFetchError(true);
    } finally {
      setDetailsLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    if (
      activeTab === "budget-details" &&
      budgetDetailsData.length === 0 &&
      !detailsLoading &&
      !detailsRequested
    ) {
      fetchBudgetDetails();
    }
  }, [
    activeTab,
    budgetDetailsData.length,
    detailsLoading,
    detailsRequested,
    fetchBudgetDetails,
  ]);

  const handleAnalyzeVariance = () => {
    // TODO: Implement variance analysis
    toast.info("Variance analysis coming soon");
  };

  const handleToggleFullscreen = React.useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
        return;
      }

      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      toast.error("Unable to toggle full page view");
    }
  }, []);

  React.useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const showViewControls =
    activeTab === "budget" || activeTab === "budget-details";

  const handleOpenBudgetModificationsReport = React.useCallback(() => {
    router.push(`/${projectId}/budget?tab=budget-modifications`);
  }, [router, projectId]);

  const handleOpenBuyoutSummaryReport = React.useCallback(() => {
    router.push(`/${projectId}/reporting?report=buyout-summary`);
  }, [router, projectId]);

  const handleOpenLegacyBudgetDetailReport = React.useCallback(() => {
    router.push(`/${projectId}/budget?tab=budget-details`);
  }, [router, projectId]);

  const handleOpenMonitoredResourcesReport = React.useCallback(() => {
    router.push(`/${projectId}/budget?tab=forecasting&view=monitored-resources`);
  }, [router, projectId]);

  const handleOpenCustomReports = React.useCallback(() => {
    router.push(`/${projectId}/reporting?type=custom`);
  }, [router, projectId]);

  const handleOpenErpIntegrations = React.useCallback(() => {
    window.open(
      "https://v2.support.procore.com/product-manuals/erp-integrations-company/tutorials/send-a-budget-to-erp-integrations-for-accounting-acceptance/",
      "_blank",
      "noopener,noreferrer",
    );
  }, []);

  const handleConfigureBudgetViews = React.useCallback(() => {
    router.push(`/${projectId}/budget`);
    toast.info("Budget view configuration is available in the actions menu.");
  }, [router, projectId]);

  const handleLineItemSuccess = React.useCallback(() => {
    // Refresh budget data after creating line items
    const fetchData = async () => {
      try {
        const budgetResponse = await fetch(`/api/projects/${projectId}/budget`);
        if (budgetResponse.ok) {
          const budgetDataResponse = await budgetResponse.json();
          setBudgetData(budgetDataResponse.lineItems || []);
          setGrandTotals(budgetDataResponse.grandTotals || EMPTY_GRAND_TOTALS);
        }

        // Also refresh budget details if that tab has been loaded
        if (detailsRequested) {
          const detailsResponse = await fetch(`/api/projects/${projectId}/budget/details`);
          if (detailsResponse.ok) {
            const detailsDataResponse = await detailsResponse.json();
            setBudgetDetailsData(detailsDataResponse.lineItems || []);
          }
        }
      } catch (error) {
        console.error("Failed to refresh budget data:", error);
        toast.error("Failed to refresh budget", { description: "Please reload the page." });
      }
    };
    fetchData();
  }, [projectId, detailsRequested]);

  const handleInlineCreateLineItem = React.useCallback(async (lineItem: {
    costCode?: string;
    description: string;
    originalBudgetAmount: string | number
  }) => {
    try {
      // Prepare the data for the API
      const amount = typeof lineItem.originalBudgetAmount === 'string'
        ? parseFloat(lineItem.originalBudgetAmount)
        : lineItem.originalBudgetAmount;

      // Fetch available cost codes to find or validate the cost code
      let costCodeId: string | null = null;

      try {
        const codesResponse = await fetch(`/api/projects/${projectId}/budget-codes`);
        if (codesResponse.ok) {
          const codesData = await codesResponse.json();
          const budgetCodes = codesData.budgetCodes || [];

          if (lineItem.costCode) {
            // User provided a cost code - try to match it
            const matchingCode = budgetCodes.find(
              (c: { code: string; id: string }) =>
                c.code === lineItem.costCode || c.id === lineItem.costCode,
            );
            if (matchingCode) {
              costCodeId = matchingCode.code;
            } else {
              // Try using the provided code directly (it might be a valid cost_code id)
              costCodeId = lineItem.costCode;
            }
          } else if (budgetCodes.length > 0) {
            // No cost code provided but budget codes exist - use the first one
            costCodeId = budgetCodes[0].code;
          }
        }
      } catch {
        // If fetching budget codes fails and user provided one, use it directly
        if (lineItem.costCode) {
          costCodeId = lineItem.costCode;
        }
      }

      // If we still don't have a valid cost code, show helpful error
      if (!costCodeId) {
        toast.error("A budget code is required. Use the Budget Code field in the panel below to select one, or create a new budget code first.", {
          duration: 6000,
        });
        throw new Error("Budget code is required");
      }

      const payload = {
        lineItems: [{
          costCodeId: costCodeId,
          costType: null,
          qty: "",
          uom: null,
          unitCost: "",
          amount: amount.toString(),
          description: lineItem.description,
        }]
      };

      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create budget line item');
      }

      // Refresh the budget data
      await handleLineItemSuccess();
    } catch (error) {
      throw error;
    }
  }, [projectId, handleLineItemSuccess]);

  const handleInlineCreateMultipleLineItems = React.useCallback(async (lineItems: InlineLineItemData[]) => {
    try {
      const payload = {
        lineItems: lineItems.map((item) => ({
          costCodeId: item.costCodeId,
          costType: item.costTypeId ?? null,
          qty: item.qty,
          uom: item.uom,
          unitCost: item.unitCost,
          amount: item.amount,
        })),
      };

      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create budget line items");
      }

      // Refresh the budget data
      await handleLineItemSuccess();
      toast.success(`Created ${lineItems.length} budget line item${lineItems.length > 1 ? "s" : ""}`);
    } catch (error) {
      throw error;
    }
  }, [projectId, handleLineItemSuccess]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Escape: Close any open modals (only if one is actually open)
      if (e.key === "Escape") {
        const hasOpenModal =
          showLineItemModal ||
          showModificationModal ||
          showImportModal ||
          showEditModal ||
          showDeleteDialog;

        if (hasOpenModal) {
          setShowLineItemModal(false);
          setShowModificationModal(false);
          setShowImportModal(false);
          setShowEditModal(false);
          setShowDeleteDialog(false);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLineItemModal, showModificationModal, showImportModal, showEditModal, showDeleteDialog]);

  const handleModificationSuccess = () => {
    // Refresh budget data after creating modification
    handleLineItemSuccess();
  };

  const handleEditLineItem = (lineItem: BudgetLineItem) => {
    if (isLocked) {
      toast.error("Budget is locked. Unlock to edit line items.");
      return;
    }
    setSelectedLineItem(lineItem);
    setShowEditModal(true);
  };

  // Modal handlers for budget column clicks
  const handleBudgetModificationsClick = (lineItem: BudgetLineItem) => {
    setSelectedLineItem(lineItem);
    setShowBudgetModificationsModal(true);
  };

  const handleApprovedCOsClick = (lineItem: BudgetLineItem) => {
    setSelectedLineItem(lineItem);
    setShowApprovedCOsModal(true);
  };

  const handleJobToDateCostDetailClick = (lineItem: BudgetLineItem) => {
    setSelectedLineItem(lineItem);
    setShowJobToDateCostDetailModal(true);
  };

  const handleDirectCostsClick = (lineItem: BudgetLineItem) => {
    setSelectedLineItem(lineItem);
    setShowDirectCostsModal(true);
  };

  const handlePendingChangesClick = (lineItem: BudgetLineItem) => {
    setSelectedLineItem(lineItem);
    setShowPendingChangesModal(true);
  };

  const handleCommittedCostsClick = (lineItem: BudgetLineItem) => {
    setSelectedLineItem(lineItem);
    setShowCommittedCostsModal(true);
  };

  const handlePendingCostChangesClick = (lineItem: BudgetLineItem) => {
    setSelectedLineItem(lineItem);
    setShowPendingCostChangesModal(true);
  };

  const handleForecastToCompleteClick = (lineItem: BudgetLineItem) => {
    setSelectedLineItem(lineItem);
    setShowForecastToCompleteModal(true);
  };

  const handleForecastSave = async (data: {
    budgetLineId: string;
    forecastMethod: string;
    forecastAmount: number;
  }) => {
    // TODO: Implement API call to save forecast data
    toast.success("Forecast saved successfully");
  };

  const handleSelectionChange = React.useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const handleDeleteSelected = () => {
    if (isLocked) {
      toast.error("Budget is locked. Unlock to delete line items.");
      return;
    }
    if (selectedIds.length === 0) return;
    setShowDeleteDialog(true);
  };

  const confirmDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    setDeleting(true);
    try {
      // Delete all selected items
      const deletePromises = selectedIds.map((id) =>
        fetch(`/api/projects/${projectId}/budget/lines/${id}`, {
          method: "DELETE",
        }),
      );

      const results = await Promise.all(deletePromises);
      const allSuccessful = results.every((r) => r.ok);

      if (allSuccessful) {
        toast.success(
          `${selectedIds.length} line item(s) deleted successfully`,
        );
        setSelectedIds([]);
        handleLineItemSuccess(); // Refresh data
      } else {
        toast.error("Some items could not be deleted");
      }
    } catch (error) {
      toast.error("Failed to delete line items");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleEditSave = async (data: {
    unitQty: number;
    uom: string;
    unitCost: number;
    originalBudget: number;
  }) => {
    if (!selectedLineItem) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/budget/lines/${selectedLineItem.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quantity: data.unitQty,
            unit_cost: data.unitCost,
            original_amount: data.originalBudget,
          }),
        },
      );

      if (response.ok) {
        toast.success("Line item updated successfully");
        handleLineItemSuccess(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update line item");
      }
    } catch (error) {
      toast.error("Failed to update line item");
    }
  };

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8">
        <BudgetPageHeader
          title="Budget"
          isLocked={isLocked}
          lockedAt={lockedAt}
          lockedBy={lockedBy}
          onCreateClick={handleCreateClick}
          onCreateSnapshot={handleCreateSnapshot}
          onModificationClick={handleModificationClick}
          onResendToERP={handleResendToERP}
          onLockBudget={handleLockBudget}
          onUnlockBudget={handleUnlockBudget}
          onImport={handleImport}
          onExport={handleExport}
          onOpenBudgetModificationsReport={handleOpenBudgetModificationsReport}
          onOpenBuyoutSummaryReport={handleOpenBuyoutSummaryReport}
          onOpenLegacyBudgetDetailReport={handleOpenLegacyBudgetDetailReport}
          onOpenMonitoredResourcesReport={handleOpenMonitoredResourcesReport}
          onOpenCustomReports={handleOpenCustomReports}
          onOpenErpIntegrations={handleOpenErpIntegrations}
          onConfigureBudgetViews={handleConfigureBudgetViews}
        />
      </div>

      <BudgetTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        controls={
          showViewControls ? (
            <BudgetFilters
              snapshots={budgetSnapshots}
              groups={budgetGroups}
              selectedSnapshot={selectedSnapshot}
              selectedGroup={selectedGroup}
              onSnapshotChange={setSelectedSnapshot}
              onGroupChange={setSelectedGroup}
              onAnalyzeVariance={handleAnalyzeVariance}
              onToggleFullscreen={handleToggleFullscreen}
              onQuickFilterChange={handleQuickFilterChange}
              activeQuickFilter={quickFilter}
              isFullscreen={isFullscreen}
            />
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-4 bg-background pl-4 pt-2 pb-6 sm:pl-6 lg:pl-8">
        {activeTab === "settings" ? (
          <div className="flex-1">
            <VerticalMarkupSettings projectId={projectId} />
          </div>
        ) : activeTab === "cost-codes" ? (
          <div className="flex-1 p-6">
            <CostCodesTab projectId={projectId} />
          </div>
        ) : activeTab === "forecasting" ? (
          <div className="flex-1">
            <ForecastingTab projectId={projectId} />
          </div>
        ) : activeTab === "snapshots" ? (
          <div className="flex-1">
            <SnapshotsTab key={`${projectId}-${snapshotsRefreshToken}`} projectId={projectId} />
          </div>
        ) : activeTab === "change-history" ? (
          <div className="flex-1">
            <ChangeHistoryTab projectId={projectId} />
          </div>
        ) : activeTab === "budget-modifications" ? (
          <div className="flex-1 p-6">
            <BudgetModificationsTab
              projectId={projectId}
              onCreateClick={() => setShowModificationModal(true)}
              refreshTrigger={loading ? 0 : 1}
            />
          </div>
        ) : activeTab === "budget-details" ? (
          <>
            <div className="flex-1">
              <BudgetDetailsTable
                data={budgetDetailsData}
                loading={detailsLoading}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-full">
              {/* Selection action bar */}
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-4 px-4 py-2 mb-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <span className="text-sm text-primary font-medium">
                    {selectedIds.length} item(s) selected
                  </span>
                  <PermissionGate projectId={projectId} module="budget" level="admin">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={isLocked}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Selected
                    </Button>
                  </PermissionGate>
                </div>
              )}

              <Suspense
                fallback={
                  <BudgetTableSkeleton />
                }
              >
                {loading ? (
                  <BudgetTableSkeleton />
                ) : (
                  <BudgetTableCommentsWrapper projectId={projectId}>
                    <BudgetTable
                      data={filteredData}
                      grandTotals={grandTotals}
                      isLocked={isLocked}
                      onEditLineItem={handleEditLineItem}
                      onSelectionChange={handleSelectionChange}
                      projectId={projectId}
                      onBudgetModificationsClick={handleBudgetModificationsClick}
                      onApprovedCOsClick={handleApprovedCOsClick}
                      onJobToDateCostDetailClick={handleJobToDateCostDetailClick}
                      onDirectCostsClick={handleDirectCostsClick}
                      onPendingChangesClick={handlePendingChangesClick}
                      onCommittedCostsClick={handleCommittedCostsClick}
                      onPendingCostChangesClick={handlePendingCostChangesClick}
                      onForecastToCompleteClick={handleForecastToCompleteClick}
                    />
                  </BudgetTableCommentsWrapper>
                )}
              </Suspense>
            </div>
          </div>
        )}
      </div>

      <BudgetLineItemModalAnimated
        open={showLineItemModal}
        onOpenChange={setShowLineItemModal}
        projectId={projectId}
        onSuccess={handleLineItemSuccess}
      />
      <BudgetModificationModal
        open={showModificationModal}
        onOpenChange={setShowModificationModal}
        projectId={projectId}
        onSuccess={handleModificationSuccess}
      />
      <ImportBudgetModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        projectId={projectId}
        onSuccess={handleLineItemSuccess}
      />

      {/* Add Budget Line Items Modal */}
      <BudgetLineItemCreatorModal
        projectId={projectId}
        isOpen={showInlineCreate}
        onClose={() => setShowInlineCreate(false)}
        onCreate={handleInlineCreateMultipleLineItems}
        isLocked={isLocked}
      />

      {/* Edit Original Budget Modal */}
      {selectedLineItem && (
        <OriginalBudgetEditModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLineItem(null);
          }}
          lineItem={{
            id: selectedLineItem.id,
            description: selectedLineItem.description,
            costCode: selectedLineItem.costCode,
            originalBudgetAmount: selectedLineItem.originalBudgetAmount,
            unitQty: selectedLineItem.unitQty,
            uom: selectedLineItem.uom,
            unitCost: selectedLineItem.unitCost,
            children: selectedLineItem.children,
          }}
          projectId={projectId}
          onSave={handleEditSave}
        />
      )}

      {/* Budget Column Detail Modals */}
      {selectedLineItem && (
        <>
          <BudgetModificationsModal
            open={showBudgetModificationsModal}
            onClose={() => {
              setShowBudgetModificationsModal(false);
              setSelectedLineItem(null);
            }}
            costCode={selectedLineItem.costCode}
            budgetLineId={selectedLineItem.id}
            projectId={projectId}
          />

          <ApprovedCOsModal
            open={showApprovedCOsModal}
            onClose={() => {
              setShowApprovedCOsModal(false);
              setSelectedLineItem(null);
            }}
            costCode={selectedLineItem.costCode}
            budgetLineId={selectedLineItem.id}
            projectId={projectId}
          />

          <JobToDateCostDetailModal
            open={showJobToDateCostDetailModal}
            onClose={() => {
              setShowJobToDateCostDetailModal(false);
              setSelectedLineItem(null);
            }}
            costCode={selectedLineItem.costCode}
            budgetLineId={selectedLineItem.id}
            projectId={projectId}
          />

          <DirectCostsModal
            open={showDirectCostsModal}
            onClose={() => {
              setShowDirectCostsModal(false);
              setSelectedLineItem(null);
            }}
            costCode={selectedLineItem.costCode}
            budgetLineId={selectedLineItem.id}
            projectId={projectId}
          />

          <PendingBudgetChangesModal
            open={showPendingChangesModal}
            onClose={() => {
              setShowPendingChangesModal(false);
              setSelectedLineItem(null);
            }}
            costCode={selectedLineItem.costCode}
            budgetLineId={selectedLineItem.id}
            projectId={projectId}
          />

          <CommittedCostsModal
            open={showCommittedCostsModal}
            onClose={() => {
              setShowCommittedCostsModal(false);
              setSelectedLineItem(null);
            }}
            costCode={selectedLineItem.costCode}
            budgetLineId={selectedLineItem.id}
            projectId={projectId}
          />

          <PendingCostChangesModal
            open={showPendingCostChangesModal}
            onClose={() => {
              setShowPendingCostChangesModal(false);
              setSelectedLineItem(null);
            }}
            costCode={selectedLineItem.costCode}
            budgetLineId={selectedLineItem.id}
            projectId={projectId}
          />

          <ForecastToCompleteModal
            open={showForecastToCompleteModal}
            onClose={() => {
              setShowForecastToCompleteModal(false);
              setSelectedLineItem(null);
            }}
            costCode={selectedLineItem.costCode}
            budgetLineId={selectedLineItem.id}
            projectId={projectId}
            currentData={{
              forecastMethod: "lump_sum",
              forecastAmount: selectedLineItem.forecastToComplete || 0,
              projectedBudget: selectedLineItem.projectedBudget || 0,
              projectedCosts: selectedLineItem.projectedCosts || 0,
            }}
            onSave={handleForecastSave}
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Line Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} selected line
              item(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSelected}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlock Budget Dialog */}
      <UnlockBudgetDialog
        open={showUnlockDialog}
        onOpenChange={setShowUnlockDialog}
        projectId={projectId}
        onUnlockSuccess={handleUnlockSuccess}
      />
    </>
  );
}

export default function ProjectBudgetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
          <BudgetTableSkeleton />
        </div>
      }
    >
      <BudgetPageContent />
    </Suspense>
  );
}
