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
  MessageSquare,
  ChevronDown,
  AlertTriangle,
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
  onOpenChat?: () => void;
  onModificationClick?: () => void;
  onResendToERP?: () => void;
  onLockBudget?: () => void;
  onUnlockBudget?: () => void;
  onImport?: () => void;
  onExport?: (format: string) => void;
  onOpenBudgetModificationsReport?: () => void;
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
  onOpenChat,
  onModificationClick,
  onResendToERP,
  onLockBudget,
  onUnlockBudget,
  onImport,
  onExport,
  onOpenBudgetModificationsReport,
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
      <h1 className="text-2xl sm:text-3xl lg:text-3xl font-semibold">{title}</h1>
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
              <Plus className="w-4 h-4 mr-1" />
              Create
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCreateClick}>
              Budget Line Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateSnapshot}>Snapshot</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </DropdownMenuItem>
            {isLocked && (
              <DropdownMenuItem onClick={onModificationClick}>
                Budget Modification
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More Actions Dropdown for Mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 min-w-[100px]">
              <MoreVertical className="w-4 h-4 mr-1" />
              Actions
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
            <DropdownMenuItem onClick={() => onExport?.("pdf")}>
              <Download className="w-4 h-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.("excel")}>
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.("csv")}>
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenChat}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Open AI Assistant
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Budget Reports</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={onOpenBudgetModificationsReport}>
                  Budget Modifications
                </DropdownMenuItem>
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
            <DropdownMenuItem onClick={onOpenCustomReports}>
              Custom Reports
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenErpIntegrations}>
              ERP Integrations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onConfigureBudgetViews}>
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
              <Plus className="w-4 h-4 mr-2" />
              Create
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCreateClick}>
              Budget Line Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateSnapshot}>Snapshot</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </DropdownMenuItem>
            {isLocked && (
              <DropdownMenuItem onClick={onModificationClick}>
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
            <Unlock className="w-4 h-4 mr-2" />
            <span className="hidden lg:inline">Unlock Budget</span>
            <span className="lg:hidden">Unlock</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLockDialog(true)}
          >
            <Lock className="w-4 h-4 mr-2" />
            <span className="hidden lg:inline">Lock Budget</span>
            <span className="lg:hidden">Lock</span>
          </Button>
        )}

        {/* Sync + Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onResendToERP}
              aria-label="Sync to ERP"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sync to ERP</TooltipContent>
        </Tooltip>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Export"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport?.("pdf")}>
              Export to PDF
            </DropdownMenuItem>
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
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Budget Reports</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={onOpenBudgetModificationsReport}>
                  Budget Modifications
                </DropdownMenuItem>
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

        {/* Chat/Converse Icon */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={onOpenChat}
          aria-label="Open AI Assistant"
          title="Open AI Assistant"
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
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
