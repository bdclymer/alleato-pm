"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ChevronDown } from "lucide-react";

import { AddToCommitmentCODialog } from "@/components/domain/change-events/AddToCommitmentCODialog";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const router = useRouter();
  const [showAddToCommitmentCODialog, setShowAddToCommitmentCODialog] = useState(false);

  if (selectedCount > 0) {
    return (
      <>
        <div className="flex items-center gap-1.5 py-2 px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                Add to
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Add to Commitment</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onSelect={() => {
                      router.push(`/${projectId}/commitments/new?type=purchase_order`);
                    }}
                  >
                    New Purchase Order
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      router.push(`/${projectId}/commitments/new?type=subcontract`);
                    }}
                  >
                    New Subcontract
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Add to Commitment Change Order</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onSelect={() => setShowAddToCommitmentCODialog(true)}>
                    New Commitment Potential Change Order (PCO) - Contracts matching cost codes
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowAddToCommitmentCODialog(true)}>
                    New Commitment Potential Change Order (PCO) - Contracts
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setShowAddToCommitmentCODialog(true)}>
                    Create Bulk Draft Commitment Potential Change Orders
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem
                onSelect={() => {
                  const ids = selectedChangeEventIds.join(",");
                  router.push(
                    `/${projectId}/prime-contract-pcos/new?changeEventIds=${encodeURIComponent(ids)}`,
                  );
                }}
              >
                Add to Prime Contract PCO
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={onSendRfq}>
            Send RFQ
          </Button>
        </div>

        <AddToCommitmentCODialog
          open={showAddToCommitmentCODialog}
          onClose={() => setShowAddToCommitmentCODialog(false)}
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
