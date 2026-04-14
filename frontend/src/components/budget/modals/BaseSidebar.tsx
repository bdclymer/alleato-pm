"use client";

import { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BudgetOverlay,
  BudgetOverlayBody,
  BudgetOverlayFooter,
  BudgetOverlayHeader,
} from "@/components/ui/budget-overlay";
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
  return (
    <BudgetOverlay
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      variant="sheet"
      size={size}
      className="flex h-full flex-col bg-background"
    >
      <BudgetOverlayHeader
        title={title}
        subtitle={subtitle}
        className="px-4 py-4 sm:px-8 sm:py-6"
      />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </BudgetOverlay>
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
    <BudgetOverlayBody className={className}>{children}</BudgetOverlayBody>
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
    <BudgetOverlayFooter
      className={cn("bg-muted px-4 py-4 sm:px-8 sm:py-6", className)}
    >
      {children}
    </BudgetOverlayFooter>
  );
}

/**
 * SidebarTabs - Tab navigation for sidebar using standard line tabs
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
    <div className="px-4 sm:px-8 flex-shrink-0">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList
          variant="line"
          className="w-full justify-start border-b border-border"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="px-1.5 py-3 text-sm font-medium"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
