"use client";

import * as React from "react";
import {
  Plus,
  RefreshCw,
  Unlock,
  Lock,
  Download,
  Upload,
  MoreVertical,
  ChevronDown,
  AlertTriangle,
  Camera,
  FilePlus,
  FileEdit,
  FileSearch,
  BarChart2,
  FileText,
  Activity,
  PieChart,
  Plug,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/layout/page-header-unified";

interface BudgetPageHeaderProps {
  title?: string;
  isLocked?: boolean;
  lockedAt?: string | null;
  lockedBy?: string | null;
  onCreateClick?: () => void;
  onCreateSnapshot?: () => void;
  onModificationClick?: () => void;
  onResendToERP?: () => void;
  onLockBudget?: () => void;
  onUnlockBudget?: () => void;
  onImport?: () => void;
  onImportFromContract?: () => void;
  onExport?: (format: string) => void;
  onOpenBuyoutSummaryReport?: () => void;
  onOpenLegacyBudgetDetailReport?: () => void;
  onOpenMonitoredResourcesReport?: () => void;
  onOpenCustomReports?: () => void;
  onOpenErpIntegrations?: () => void;
  onConfigureBudgetViews?: () => void;
}

export function BudgetPageHeader({
  title = "Budget",
  isLocked = false,
  lockedAt,
  lockedBy,
  onCreateClick,
  onCreateSnapshot,
  onModificationClick,
  onResendToERP,
  onLockBudget,
  onUnlockBudget,
  onImportFromContract,
  onImport,
  onExport,
  onOpenBuyoutSummaryReport,
  onOpenLegacyBudgetDetailReport,
  onOpenMonitoredResourcesReport,
  onOpenCustomReports,
  onOpenErpIntegrations,
  onConfigureBudgetViews,
}: BudgetPageHeaderProps) {
  const [showLockDialog, setShowLockDialog] = React.useState(false);

  const handleLockConfirm = () => {
    onLockBudget?.();
    setShowLockDialog(false);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const titleContent = (
    <div className="flex items-center gap-2">
      <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-medium text-foreground/90 break-words">{title}</h1>
      {isLocked && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Locked
        </Badge>
      )}
    </div>
  );

  const statusDescription =
    isLocked && lockedAt
      ? `Locked ${formatDate(lockedAt)}${lockedBy ? ` by ${lockedBy}` : ""}`
      : undefined;

  const actionButtons = (
    <div className="flex w-full gap-2 min-w-0">
      {/* Mobile: Show primary actions and bundle others in dropdown */}
      <div className="flex flex-wrap gap-2 sm:hidden w-full">
        {/* Create Dropdown - Always visible */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white flex-1 min-w-[100px]"
            >
              <Plus />
              Create
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCreateClick}>
              <FilePlus className="w-4 h-4 mr-2" />
              Budget Line Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateSnapshot}>
              <Camera className="w-4 h-4 mr-2" />
              Snapshot
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import from File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImportFromContract}>
              <FileSearch className="w-4 h-4 mr-2" />
              Import from Prime Contract SOV
            </DropdownMenuItem>
            {isLocked && (
              <DropdownMenuItem onClick={onModificationClick}>
                <FileEdit className="w-4 h-4 mr-2" />
                Budget Modification
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More Actions Dropdown for Mobile — icon-only trigger, no border */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onResendToERP}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync to ERP
            </DropdownMenuItem>
            {isLocked ? (
              <DropdownMenuItem onClick={onUnlockBudget}>
                <Unlock className="w-4 h-4 mr-2" />
                Unlock Budget
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setShowLockDialog(true)}>
                <Lock className="w-4 h-4 mr-2" />
                Lock Budget
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport?.("excel")}>
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.("csv")}>
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <BarChart2 className="w-4 h-4 mr-2" />
                Budget Reports
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={onOpenBuyoutSummaryReport}>
                  <FileText className="w-4 h-4 mr-2" />
                  Buyout Summary Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenLegacyBudgetDetailReport}>
                  <FileText className="w-4 h-4 mr-2" />
                  Legacy Budget Detail
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenMonitoredResourcesReport}>
                  <Activity className="w-4 h-4 mr-2" />
                  Monitored Resources Report
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={onOpenCustomReports}>
              <PieChart className="w-4 h-4 mr-2" />
              Custom Reports
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenErpIntegrations}>
              <Plug className="w-4 h-4 mr-2" />
              ERP Integrations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onConfigureBudgetViews}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Configure Budget Views
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: Show all buttons */}
      <div className="hidden sm:flex gap-2 flex-wrap justify-end items-center">
        {/* Create Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus />
              Create
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCreateClick}>
              <FilePlus className="w-4 h-4 mr-2" />
              Budget Line Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateSnapshot}>
              <Camera className="w-4 h-4 mr-2" />
              Snapshot
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import from File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImportFromContract}>
              <FileSearch className="w-4 h-4 mr-2" />
              Import from Prime Contract SOV
            </DropdownMenuItem>
            {isLocked && (
              <DropdownMenuItem onClick={onModificationClick}>
                <FileEdit className="w-4 h-4 mr-2" />
                Budget Modification
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Lock/Unlock Budget Button */}
        {isLocked ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onUnlockBudget}
          >
            <Unlock />
            <span className="hidden lg:inline">Unlock Budget</span>
            <span className="lg:hidden">Unlock</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLockDialog(true)}
          >
            <Lock />
            <span className="hidden lg:inline">Lock Budget</span>
            <span className="lg:hidden">Lock</span>
          </Button>
        )}

        {/* Sync + Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:bg-muted hover:text-foreground"
              onClick={onResendToERP}
              aria-label="Sync to ERP"
            >
              <RefreshCw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sync to ERP</TooltipContent>
        </Tooltip>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:bg-muted hover:text-foreground"
              aria-label="Export"
              title="Export"
            >
              <Download />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport?.("excel")}>
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.("csv")}>
              Export to CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Budget Reports</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={onOpenBuyoutSummaryReport}>
                  Buyout Summary Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenLegacyBudgetDetailReport}>
                  Legacy Budget Detail
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenMonitoredResourcesReport}>
                  Monitored Resources Report
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Custom Reports</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={onOpenCustomReports}>
                  Open Custom Reports
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>ERP Integrations</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={onOpenErpIntegrations}>
                  Open ERP Integrations
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={onConfigureBudgetViews}>
              Configure Budget Views
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title={title}
        titleContent={titleContent}
        description={statusDescription}
        actions={actionButtons}
      />

      {/* Lock Budget Confirmation Dialog */}
      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Lock Budget
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to lock the budget for this project?</p>
              <div className="bg-muted border rounded-md p-4 mt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">What happens when you lock:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>
                        Budget line items cannot be added, edited, or deleted
                      </li>
                      <li>Original budget amounts become read-only</li>
                      <li>
                        Changes can only be made through approved change orders
                      </li>
                      <li>Budget modifications require unlock permission</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLockConfirm}>
              Lock Budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
