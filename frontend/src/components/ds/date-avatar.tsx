"use client";

import { cn } from "@/lib/utils";

interface DateAvatarProps {
  date: string | Date;
  size?: "sm" | "md";
  className?: string;
}

/**
 * A compact date display showing the month abbreviation above a circled day number.
 * Designed for use in lists, sidebars, and timeline-style layouts.
 */
export function DateAvatar({ date, size = "md", className }: DateAvatarProps) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  const month = parsed.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = parsed.getDate();

  const sizeClasses = {
    sm: "w-9 h-9 text-sm",
    md: "w-10 h-10 text-base",
  };

  return (
    <div className={cn("flex flex-col items-center gap-0.5 shrink-0", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">
        {month}
      </span>
      <div
        className={cn(
          "flex items-center justify-center rounded-full border border-border bg-muted/50 font-semibold text-foreground leading-none",
          sizeClasses[size],
        )}
      >
        {day}
      </div>
    </div>
  );
}
