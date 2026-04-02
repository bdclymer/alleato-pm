"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  showCloseButton?: boolean;
}

/**
 * BaseModal - Standard modal component for budget modals
 *
 * Features:
 * - Wider design (default: max-w-4xl)
 * - Mobile responsive
 * - Dark header with white text
 * - ESC key to close
 * - Overlay click to close
 * - Keyboard navigation support
 */
export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  size = "xl",
  className,
  showCloseButton = true,
}: BaseModalProps) {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl", // Default
    full: "max-w-[98vw]",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "relative p-0 gap-0 overflow-hidden border border-border/80",
          sizeClasses[size],
          "w-full sm:w-full",
          "h-[92dvh] sm:h-auto max-h-[92dvh] flex flex-col",
          "rounded-t-2xl rounded-b-none sm:rounded-2xl bg-card shadow-sm",
          "!top-auto !left-0 !translate-x-0 !translate-y-0 !bottom-0 sm:!top-[50%] sm:!left-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%]",
          "transition-transform duration-200",
          className,
        )}
      >
        {/* Header */}
        <DialogHeader className="bg-background px-4 py-4 sm:px-6 sm:py-5 flex-shrink-0 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              {title}
            </DialogTitle>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-background">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ModalFooter - Standard footer for modal actions
 */
interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        "px-4 py-4 sm:px-6 sm:py-4 bg-muted/40 border-t border-border",
        "flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4",
        "pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4",
        "flex-shrink-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * ModalBody - Standard body for modal content
 */
interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return <div className={cn("px-4 py-4 sm:px-6 sm:py-5", className)}>{children}</div>;
}
