"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
};

export function PageContainer({
  children,
  className,
  maxWidth = "full",
  padding = true,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-h-screen pb-20",
        maxWidthClasses[maxWidth],
        // Mobile-first responsive padding following 8px grid system
        // Horizontal: Mobile 12px, Tablet 20px, Desktop 28px
        // Vertical: compact on mobile, slightly roomier from tablet+
        padding && "px-3 sm:px-5 lg:px-7 py-1 sm:py-2",
        // Prevent horizontal overflow on all screen sizes
        "overflow-x-clip",
        className,
      )}
    >
      {children}
    </div>
  );
}
