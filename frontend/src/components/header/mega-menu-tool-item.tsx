"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { HeaderNavigationTool } from "@/lib/navigation-config";

interface MegaMenuToolItemProps {
  tool: HeaderNavigationTool;
  href: string;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export function MegaMenuToolItem({
  tool,
  href,
  isActive,
  isDisabled,
  onClick,
}: MegaMenuToolItemProps) {
  const Icon = tool.icon;

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        // Don't call onClick() here - let the navigation happen via Link
        // The auto-close effect in useHeaderNav will close the panel on route change
      }}
      className={cn(
        "flex items-start gap-4 rounded-md px-4 py-2 text-sm transition-colors",
        isDisabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-muted",
        isActive && "bg-muted text-foreground"
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 mt-0.5",
            isActive ? "text-foreground" : "text-muted-foreground"
          )}
        />
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-medium truncate text-foreground">
          {tool.name}
        </span>
        {tool.description && (
          <span className="text-xs truncate text-muted-foreground">
            {tool.description}
          </span>
        )}
      </div>
    </Link>
  );
}
