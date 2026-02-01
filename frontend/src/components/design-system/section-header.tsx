import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
  count?: number;
}

/**
 * Section header component for consistent typography across the app
 * Matches the uppercase, tracked style used in PageHeader and throughout the design system
 */
export function SectionHeader({
  children,
  className,
  count,
}: SectionHeaderProps) {
  return (
    <h3
      className={cn(
        "text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500",
        className,
      )}
    >
      {children}
      {count !== undefined && ` (${count})`}
    </h3>
  );
}
