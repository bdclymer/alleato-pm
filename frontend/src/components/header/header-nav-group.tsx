"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { HeaderNavGroup } from "@/lib/navigation-config";
import { MegaMenuPanel } from "./mega-menu-panel";

interface HeaderNavGroupProps {
  group: HeaderNavGroup;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  projectId: number | null;
  activeToolName: string;
  activeGroupId: string | null;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
}

export function HeaderNavGroup({
  group,
  isOpen,
  onToggle,
  onClose,
  projectId,
  activeToolName,
  activeGroupId,
  permissions,
  isAppAdmin,
  userType,
}: HeaderNavGroupProps) {
  const isActiveGroup = activeGroupId === group.id;

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <PopoverTrigger asChild>
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            "text-zinc-300 hover:text-white hover:bg-zinc-700/50",
            isOpen && "text-white bg-zinc-700/50",
            isActiveGroup && !isOpen && "text-white"
          )}
        >
          {group.label}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-auto p-0 border-0 bg-transparent shadow-none"
      >
        <MegaMenuPanel
          group={group}
          projectId={projectId}
          activeToolName={activeToolName}
          onToolClick={onClose}
          permissions={permissions}
          isAppAdmin={isAppAdmin}
          userType={userType}
        />
      </PopoverContent>
    </Popover>
  );
}
