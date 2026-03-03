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
  showDescription?: boolean;
}

export function MegaMenuToolItem({
  tool,
  href,
  isActive,
  isDisabled,
  onClick,
  showDescription = true,
}: MegaMenuToolItemProps) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
      }}
      className={cn(
        "group block rounded-md px-1 py-1.5 transition-colors",
        isDisabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-accent/50"
      )}
    >
      <span
        className={cn(
          "block text-[13.5px] font-medium leading-tight",
          isDisabled
            ? "text-muted-foreground"
            : isActive
              ? "text-primary font-semibold"
              : "text-primary group-hover:text-primary/80"
        )}
      >
        {tool.name}
      </span>
      {showDescription && tool.description && (
        <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
          {tool.description}
        </span>
      )}
    </Link>
  );
}
