"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  Files,
  PencilRuler,
  FileCheck,
  FileText,
  ScrollText,
  CircleHelp,
  FileDiff,
  FileStack,
  Image,
  Mail,
  Calendar,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SMART_GROUPS,
  type SmartGroup,
  type SmartGroupCounts,
} from "@/features/documents/smart-groups";

const ICONS: Record<string, LucideIcon> = {
  files: Files,
  blueprints: PencilRuler,
  "file-check": FileCheck,
  "file-text": FileText,
  "file-description": ScrollText,
  "help-circle": CircleHelp,
  "file-diff": FileDiff,
  "file-stack": FileStack,
  photo: Image,
  mail: Mail,
  calendar: Calendar,
};

function RailItem({
  group,
  count,
  active,
  onSelect,
}: {
  group: SmartGroup;
  count: number;
  active: boolean;
  onSelect: () => void;
}) {
  // Always call useDroppable unconditionally — use `disabled` to opt out non-droppable groups
  const { setNodeRef, isOver } = useDroppable({
    id: `group:${group.id}`,
    disabled: !group.reclassifyTo,
  });

  const Icon = ICONS[group.icon] ?? Files;
  const dropHighlight = group.reclassifyTo && isOver;

  return (
    <Button
      ref={setNodeRef}
      variant="ghost"
      size="sm"
      onClick={onSelect}
      className={cn(
        "w-full justify-start gap-2 px-2 py-1.5 text-sm font-normal",
        active
          ? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        dropHighlight && "ring-2 ring-inset ring-primary",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate text-left">{group.label}</span>
      <span className="tabular-nums text-xs">{count}</span>
    </Button>
  );
}

export function SmartGroupRail({
  counts,
  activeGroupId,
  onSelect,
}: {
  counts: SmartGroupCounts;
  activeGroupId: string;
  onSelect: (groupId: string) => void;
}): React.ReactElement {
  return (
    <nav className="flex h-full w-full flex-col gap-0.5 overflow-y-auto border-r border-border bg-muted/30 p-2">
      <p className="px-2 pb-1 pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        Smart groups
      </p>
      {SMART_GROUPS.map((group) => (
        <RailItem
          key={group.id}
          group={group}
          count={counts[group.id] ?? 0}
          active={group.id === activeGroupId}
          onSelect={() => onSelect(group.id)}
        />
      ))}
    </nav>
  );
}
