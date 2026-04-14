"use client";

import { useCallback, useEffect, useRef } from "react";

import { ChevronDown } from "lucide-react";

import type { HeaderNavGroup as HeaderNavGroupConfig } from "@/lib/navigation-config";
import { cn } from "@/lib/utils";

import { MegaMenuPanel } from "./mega-menu-panel";

interface HeaderNavGroupProps {
  group: HeaderNavGroupConfig;
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
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    },
    [onClose]
  );

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClickOutside, handleKeyDown]);

  return (
    <>
      {/* eslint-disable-next-line design-system/no-design-violations -- dark header nav trigger with custom styling */}
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1 px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
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

      {/* Full-width overlay panel — Apple-style drop-down from header */}
      {isOpen && (
        <>
          {/* Backdrop */}
          { }
          <div
            className="fixed inset-0 z-40 bg-black/40 top-14"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            ref={panelRef}
            className="fixed left-0 right-0 z-50 top-14 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <MegaMenuPanel
              activeGroupId={group.id}
              projectId={projectId}
              activeToolName={activeToolName}
              onToolClick={onClose}
              permissions={permissions}
              isAppAdmin={isAppAdmin}
              userType={userType}
            />
          </div>
        </>
      )}
    </>
  );
}
