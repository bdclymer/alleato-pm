"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface BaseSidebarProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * BaseSidebar - Reusable sidebar component for budget detail views
 *
 * Provides a consistent layout with:
 * - Dark header with title and close button
 * - Scrollable content area
 * - Responsive sizing
 */
export function BaseSidebar({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = "lg",
}: BaseSidebarProps) {
  const sizeClasses = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-xl",
    xl: "sm:max-w-2xl",
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn("w-full p-0 flex flex-col bg-background", sizeClasses[size])}
      >
        {/* Header */}
        <div className="bg-card px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {children}
      </SheetContent>
    </Sheet>
  );
}

/**
 * SidebarBody - Scrollable content area
 */
export function SidebarBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto", className)}>{children}</div>
  );
}

/**
 * SidebarFooter - Fixed footer area
 */
export function SidebarFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-t border-border bg-muted px-8 py-6 flex-shrink-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * SidebarTabs - Tab navigation for sidebar
 */
export function SidebarTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}) {
  return (
    <div className="px-8 py-2 bg-transparent flex-shrink-0">
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "outline" : "ghost"}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all h-auto",
              activeTab === tab.id
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50",
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
