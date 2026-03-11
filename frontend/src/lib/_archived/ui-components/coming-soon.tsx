"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { HardHat, Ruler, Wrench, Construction } from "lucide-react";

interface ComingSoonProps {
  /**
   * The title of the feature/page
   */
  title: string;
  /**
   * Optional description text
   */
  description?: string;
  /**
   * Optional custom icon (defaults to Construction)
   */
  icon?: React.ReactNode;
  /**
   * Optional className for the container
   */
  className?: string;
  /**
   * Show the animated background grid
   * @default true
   */
  showGrid?: boolean;
  /**
   * Show floating construction icons
   * @default true
   */
  showFloatingIcons?: boolean;
}

/**
 * Coming Soon Component
 *
 * A visually distinctive placeholder for pages under development.
 * Features a construction blueprint aesthetic with animated elements.
 *
 * @example
 * ```tsx
 * <ComingSoon
 *   title="Submittals"
 *   description="Track and manage project submittals"
 * />
 * ```
 */
export function ComingSoon({
  title,
  description,
  icon,
  className,
  showGrid = true,
  showFloatingIcons = true,
}: ComingSoonProps) {
  return (
    <div
      className={cn(
        "relative min-h-[60vh] w-full overflow-hidden rounded-lg border border-border bg-gradient-to-br from-slate-50 via-white to-orange-50/30",
        className
      )}
    >
      {/* Blueprint Grid Background */}
      {showGrid && (
        <div className="absolute inset-0 opacity-[0.15]">
          {/* Major grid lines */}
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="blueprint-grid-major"
                width="80"
                height="80"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 80 0 L 0 0 0 80"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                />
              </pattern>
              <pattern
                id="blueprint-grid-minor"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 16 0 L 0 0 0 16"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="0.5"
                  opacity="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#blueprint-grid-minor)" />
            <rect width="100%" height="100%" fill="url(#blueprint-grid-major)" />
          </svg>
        </div>
      )}

      {/* Floating Construction Icons */}
      {showFloatingIcons && (
        <>
          <div className="absolute left-[10%] top-[15%] animate-float-slow opacity-20">
            <HardHat className="h-12 w-12 text-primary" strokeWidth={1} />
          </div>
          <div className="absolute right-[15%] top-[20%] animate-float-delayed opacity-15">
            <Ruler className="h-10 w-10 text-primary rotate-45" strokeWidth={1} />
          </div>
          <div className="absolute bottom-[20%] left-[15%] animate-float opacity-15">
            <Wrench className="h-10 w-10 text-primary -rotate-12" strokeWidth={1} />
          </div>
          <div className="absolute bottom-[25%] right-[10%] animate-float-slow opacity-20">
            <Construction className="h-14 w-14 text-primary" strokeWidth={1} />
          </div>
        </>
      )}

      {/* Center Content */}
      <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center px-6 py-16">
        {/* Icon Container */}
        <div className="relative mb-8">
          {/* Pulsing ring */}
          <div className="absolute inset-0 -m-4 animate-ping-slow rounded-full bg-primary/10" />
          <div className="absolute inset-0 -m-2 rounded-full bg-primary/5" />

          {/* Icon */}
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-white/80 backdrop-blur-sm">
            {icon || (
              <Construction
                className="h-12 w-12 text-primary"
                strokeWidth={1.5}
              />
            )}
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center">
          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Under Construction
            </span>
          </div>

          {/* Title */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground">
            Coming Soon
          </p>

          {/* Description */}
          {description && (
            <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground/80">
              {description}
            </p>
          )}

          {/* Progress Indicator */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>

      {/* Bottom Decoration - Blueprint Corner Marks */}
      <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-primary/20" />
      <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-primary/20" />
      <div className="absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-primary/20" />
      <div className="absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-primary/20" />
    </div>
  );
}
