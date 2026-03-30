"use client";

import { ChevronDown, Send } from "lucide-react";
import { toast } from "sonner";

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
}

export function ChangeEventSelectionBar({
  selectedCount,
  hasItems,
  onSendRfq,
}: ChangeEventSelectionBarProps) {
  if (selectedCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/40 border-b border-border">
        <span className="mr-2 text-sm text-muted-foreground">
          {selectedCount} item{selectedCount === 1 ? "" : "s"} selected
        </span>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem
                    className="cursor-not-allowed opacity-50"
                    onSelect={(e) => e.preventDefault()}
                  >
                    Commitment CO
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>Coming soon — create commitment change order</TooltipContent>
              </Tooltip>
              <DropdownMenuItem
                onSelect={() =>
                  toast.info("Add to Prime Contract PCO — select a prime contract first")
                }
              >
                Prime Contract PCO
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={onSendRfq}>
          <Send />
          Send Requests for Quote
        </Button>
      </div>
    );
  }

  if (hasItems) {
    return (
      <div className="flex items-center justify-end px-4 py-1.5 text-xs text-muted-foreground border-b border-border">
        0 items selected
      </div>
    );
  }

  return null;
}
