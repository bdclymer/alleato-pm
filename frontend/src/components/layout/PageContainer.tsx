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
        "mx-auto w-full min-w-0 min-h-full pb-20",
        maxWidthClasses[maxWidth],
        padding && "px-4 sm:px-6 lg:px-8 pt-0.5 sm:pt-1 pb-1 sm:pb-2",
        // Prevent horizontal overflow on all screen sizes
        "overflow-x-clip",
        className,
      )}
    >
      {children}
    </div>
  );
}
