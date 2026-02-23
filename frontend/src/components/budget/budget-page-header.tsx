"use client";

import * as React from "react";
import {
  Plus,
  ArrowRight,
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
import { PageHeader } from "@/components/layout/page-header-unified";

interface BudgetPageHeaderProps {
  title?: string;
  isLocked?: boolean;
  lockedAt?: string | null;
  lockedBy?: string | null;
  onCreateClick?: () => void;
  onModificationClick?: () => void;
  onResendToERP?: () => void;
  onLockBudget?: () => void;
  onUnlockBudget?: () => void;
  onImport?: () => void;
  onExport?: (format: string) => void;
}

export function BudgetPageHeader({
  title = "Budget",
  isLocked = false,
  lockedAt,
  lockedBy,
  onCreateClick,
  onModificationClick,
  onResendToERP,
  onLockBudget,
  onUnlockBudget,
  onImport,
  onExport,
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
              className="bg-brand hover:bg-brand/90 text-white flex-1 min-w-[100px]"
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
            <DropdownMenuItem>Snapshot</DropdownMenuItem>
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
              <ArrowRight className="w-4 h-4 mr-2" />
              Resend to ERP
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
            <DropdownMenuItem onClick={onImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </DropdownMenuItem>
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
            <DropdownMenuItem>Configure Columns</DropdownMenuItem>
            <DropdownMenuItem>Budget Settings</DropdownMenuItem>
            <DropdownMenuItem>View Audit Log</DropdownMenuItem>
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
              className="bg-brand hover:bg-brand/90 text-white"
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
            <DropdownMenuItem>Snapshot</DropdownMenuItem>
            {isLocked && (
              <DropdownMenuItem onClick={onModificationClick}>
                Budget Modification
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Resend to ERP Button */}
        <Button variant="outline" size="sm" onClick={onResendToERP}>
          <ArrowRight className="w-4 h-4 mr-2" />
          <span className="hidden lg:inline">Resend to ERP</span>
          <span className="lg:hidden">ERP</span>
        </Button>

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

        {/* Import Button */}
        <Button variant="outline" size="sm" onClick={onImport}>
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
              <ChevronDown className="w-4 h-4 ml-2" />
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
            <DropdownMenuItem>Configure Columns</DropdownMenuItem>
            <DropdownMenuItem>Budget Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View Audit Log</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Chat/Converse Icon */}
        <Button variant="ghost" size="icon" className="text-muted-foreground">
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
              <div className="bg-muted border rounded-md p-3 mt-3">
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
