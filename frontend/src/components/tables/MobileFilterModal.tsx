"use client";

import * as React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MobileFilterModalProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export function MobileFilterModal({
  children,
  open,
  onOpenChange,
  onReset,
  hasActiveFilters = false,
  className,
}: MobileFilterModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const controlledOpen = open !== undefined ? open : isOpen;
  const controlledOnOpenChange = onOpenChange || setIsOpen;

  return (
    <Dialog open={controlledOpen} onOpenChange={controlledOnOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("relative", className)}
        >
          <Filter />
          <span className="sr-only">Open filters</span>
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-dvh w-full overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
          <DialogDescription>
            Apply filters to narrow down your results.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">{children}</div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onReset?.();
              controlledOnOpenChange(false);
            }}
            disabled={!hasActiveFilters}
          >
            Reset Filters
          </Button>
          <Button onClick={() => controlledOnOpenChange(false)}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
