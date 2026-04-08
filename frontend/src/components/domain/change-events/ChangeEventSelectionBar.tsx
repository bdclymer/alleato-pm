"use client";

import { useState } from "react";

import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { AddToPrimePCODialog } from "@/components/domain/change-events/AddToPrimePCODialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChangeEventSelectionBarProps {
  selectedCount: number;
  hasItems: boolean;
  onSendRfq: () => void;
  selectedChangeEventIds: string[];
  projectId: number;
  onSuccess?: () => void;
}

export function ChangeEventSelectionBar({
  selectedCount,
  hasItems,
  onSendRfq,
  selectedChangeEventIds,
  projectId,
  onSuccess,
}: ChangeEventSelectionBarProps) {
  const [showAddToPcoDialog, setShowAddToPcoDialog] = useState(false);

  if (selectedCount > 0) {
    return (
      <>
        <div className="flex items-center gap-1.5 py-2 bg-muted/40 border-b border-border">
          <TooltipProvider>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Add to
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      className="cursor-not-allowed opacity-50"
                      onSelect={(e) => e.preventDefault()}
                    >
                      Commitment
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon — link change event to a commitment</TooltipContent>
                </Tooltip>
                <DropdownMenuItem
                  onSelect={() =>
                    toast.info(
                      "Commitment CO creation coming soon — contact your admin",
                    )
                  }
                >
                  Commitment CO
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setShowAddToPcoDialog(true)}
                >
                  Prime Contract PCO
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>

          <Button variant="outline" size="sm" onClick={onSendRfq}>
            Send RFQ
          </Button>
        </div>

        <AddToPrimePCODialog
          open={showAddToPcoDialog}
          onClose={() => setShowAddToPcoDialog(false)}
          selectedChangeEventIds={selectedChangeEventIds}
          projectId={projectId}
          onSuccess={() => {
            onSuccess?.();
          }}
        />
      </>
    );
  }

  return null;
}
