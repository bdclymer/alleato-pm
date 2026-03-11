import * as React from "react";
import { cn } from "@/lib/utils";

const gapMap = {
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
  "2xl": "gap-12",
} as const;

const colsMap = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  12: "grid-cols-12",
} as const;

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
} as const;

const justifyMap = {
  start: "justify-items-start",
  center: "justify-items-center",
  end: "justify-items-end",
  stretch: "justify-items-stretch",
} as const;

type ResponsiveCols = {
  base?: keyof typeof colsMap;
  sm?: keyof typeof colsMap;
  md?: keyof typeof colsMap;
  lg?: keyof typeof colsMap;
  xl?: keyof typeof colsMap;
};

export interface GridProps {
  cols?: keyof typeof colsMap | ResponsiveCols;
  gap?: keyof typeof gapMap;
  align?: keyof typeof alignMap;
  justify?: keyof typeof justifyMap;
  as?: "div" | "section" | "article" | "main" | "aside" | "nav";
  className?: string;
  children: React.ReactNode;
}

export function Grid({
  cols = 1,
  gap = "md",
  align = "stretch",
  justify = "stretch",
  as: Component = "div",
  className,
  children,
}: GridProps) {
  const colsClasses =
    typeof cols === "object"
      ? [
          cols.base && colsMap[cols.base],
          cols.sm && `sm:grid-cols-${cols.sm}`,
          cols.md && `md:grid-cols-${cols.md}`,
          cols.lg && `lg:grid-cols-${cols.lg}`,
          cols.xl && `xl:grid-cols-${cols.xl}`,
        ].filter(Boolean)
      : colsMap[cols];

  return (
    <Component
      className={cn(
        "grid",
        colsClasses,
        gapMap[gap],
        alignMap[align],
        justifyMap[justify],
        className,
      )}
    >
      {children}
    </Component>
  );
}
