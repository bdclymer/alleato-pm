"use client";

import Link from "next/link";

import type { HeaderNavigationTool } from "@/lib/navigation-config";
import { cn } from "@/lib/utils";

interface MegaMenuToolItemProps {
  tool: HeaderNavigationTool;
  href: string;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
  variant?: "featured" | "default";
}

export function MegaMenuToolItem({
  tool,
  href,
  isActive,
  isDisabled,
  onClick,
  variant = "default",
}: MegaMenuToolItemProps) {
  const isFeatured = variant === "featured";

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        onClick();
      }}
      className={cn(
        "block transition-colors",
        isFeatured ? "py-1" : "py-[3px]",
        isDisabled
          ? "cursor-not-allowed opacity-30"
          : "hover:text-white"
      )}
    >
      <span
        className={cn(
          "block leading-snug",
          isFeatured
            ? "text-xl font-semibold tracking-tight"
            : "text-sm",
          isDisabled
            ? "text-zinc-600"
            : isActive
              ? "text-white font-semibold"
              : isFeatured
                ? "text-zinc-100"
                : "text-zinc-400"
        )}
      >
        {tool.name}
      </span>
    </Link>
  );
}
