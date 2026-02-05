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
        onClick();
      }}
      className={cn(
        "flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isDisabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-zinc-700/50",
        isActive && "bg-zinc-700 text-white"
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 mt-0.5",
            isActive ? "text-white" : "text-zinc-400"
          )}
        />
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className={cn(
            "font-medium truncate",
            isActive ? "text-white" : "text-zinc-100"
          )}
        >
          {tool.name}
        </span>
        {tool.description && (
          <span
            className={cn(
              "text-xs truncate",
              isActive ? "text-zinc-300" : "text-zinc-400"
            )}
          >
            {tool.description}
          </span>
        )}
      </div>
    </Link>
  );
}
