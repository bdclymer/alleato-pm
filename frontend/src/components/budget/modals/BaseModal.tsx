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
          "relative p-0 gap-0 overflow-hidden",
          sizeClasses[size],
          "w-[98vw] sm:w-full",
          "max-h-[92vh] flex flex-col",
          "rounded-2xl bg-card shadow-sm",
          "transition-transform duration-200",
          className,
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 opacity-90" />

        {/* Header */}
        <DialogHeader className="bg-slate-900/95 text-white px-6 py-4 flex-shrink-0 border-b border-white/10 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-lg font-semibold tracking-tight text-white">
              {title}
            </DialogTitle>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-background/5 h-8 w-8 text-white hover:border-white/30 hover:bg-background/10 transition-all"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50">
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
        "px-6 py-4 bg-slate-50/90 border-t border-slate-200",
        "flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4",
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
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}
