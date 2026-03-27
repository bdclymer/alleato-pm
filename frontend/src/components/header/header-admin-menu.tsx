"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  adminSettingsTools,
  buildToolUrl,
  filterToolsByPermission,
} from "@/lib/navigation-config";

interface HeaderAdminMenuProps {
  projectId: number | null;
  activeToolName: string;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
}

export function HeaderAdminMenu({
  projectId,
  activeToolName,
  permissions,
  isAppAdmin,
  userType,
}: HeaderAdminMenuProps) {
  // Filter admin tools by permission
  const visibleTools = useMemo(
    () =>
      filterToolsByPermission(
        adminSettingsTools,
        projectId,
        permissions,
        isAppAdmin,
        userType
      ),
    [projectId, permissions, isAppAdmin, userType]
  );

  // Don't render if no tools are visible
  if (visibleTools.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-zinc-300 hover:text-white hover:bg-zinc-700/50"
          aria-label="Settings and admin tools"
        >
          <Settings />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel>Settings & Admin</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {adminSettingsTools.map((tool) => {
          const href = buildToolUrl(tool.path, projectId, tool.requiresProject);
          const isActive = tool.name === activeToolName;
          const isDisabled =
            (tool.requiresProject && !projectId) ||
            !visibleTools.includes(tool);
          const Icon = tool.icon;

          return (
            <DropdownMenuItem
              key={tool.name}
              asChild
              disabled={isDisabled}
              className={cn(isActive && "bg-accent")}
            >
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  isDisabled && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <div className="flex flex-col">
                  <span className="font-medium">{tool.name}</span>
                  {tool.description && (
                    <span className="text-xs text-muted-foreground">
                      {tool.description}
                    </span>
                  )}
                </div>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
