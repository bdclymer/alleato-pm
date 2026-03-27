"use client";

import { PanelLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";

interface HeaderSidebarTriggerProps {
  className?: string;
}

export function HeaderSidebarTrigger({ className }: HeaderSidebarTriggerProps) {
  const sidebar = useStore(useSidebar, (x) => x);
  const toggleOpen = sidebar?.toggleOpen ?? (() => {});

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-7", className)}
      onClick={toggleOpen}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
