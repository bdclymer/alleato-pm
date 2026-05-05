"use client";

import { useMemo } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { BoardItem, BoardAssignee } from "./use-product-board";
import type { BoardLabel, BoardItemMeta } from "./use-board-item";
import type { CardViewSettings } from "./card-view-settings";

export interface BoardFilters {
  search?: string;
  assigneeId?: string;
  priority?: string;
  labelColor?: string;
}

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Med" },
  { value: "low", label: "Low" },
];

const VIEW_TOGGLES: { key: keyof CardViewSettings; label: string }[] = [
  { key: "showCover",        label: "Cover image" },
  { key: "showLinkPreview",  label: "Live link" },
  { key: "showDescription",  label: "Description preview" },
  { key: "showLabels",       label: "Labels" },
  { key: "showAssignee",     label: "Assignee" },
  { key: "showDueDate",      label: "Due date" },
  { key: "showSeverity",     label: "Priority" },
  { key: "showCommentCount", label: "Comment count" },
];

function AssigneeAvatar({ user, size = "sm" }: { user: BoardAssignee; size?: "sm" | "xs" }) {
  const initials = user.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-muted font-semibold text-foreground",
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-5 w-5 text-[9px]"
      )}
      title={user.full_name ?? user.email}
    >
      {initials}
    </div>
  );
}

interface BoardFilterBarProps {
  items: BoardItem[];
  filters: BoardFilters;
  onChange: (f: BoardFilters) => void;
  cardSettings: CardViewSettings;
  onCardSettingsChange: (patch: Partial<CardViewSettings>) => void;
}

export function BoardFilterBar({ items, filters, onChange, cardSettings, onCardSettingsChange }: BoardFilterBarProps) {
  const assignees = useMemo<BoardAssignee[]>(() => {
    const map = new Map<string, BoardAssignee>();
    items.forEach((item) => {
      if (item.assignee_id && item.assignee) {
        map.set(item.assignee_id, item.assignee as BoardAssignee);
      }
    });
    return Array.from(map.values());
  }, [items]);

  const labelColors = useMemo<BoardLabel[]>(() => {
    const map = new Map<string, BoardLabel>();
    items.forEach((item) => {
      const meta = (item.metadata as BoardItemMeta | null) ?? {};
      (meta.labels ?? []).forEach((l) => {
        if (!map.has(l.color)) map.set(l.color, l);
      });
    });
    return Array.from(map.values());
  }, [items]);

  const hasFilters = !!(filters.search || filters.assigneeId || filters.priority || filters.labelColor);

  function set(patch: Partial<BoardFilters>) {
    onChange({ ...filters, ...patch });
  }
  function clear() { onChange({}); }

  const activeViewCount = VIEW_TOGGLES.filter(({ key }) => cardSettings[key]).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search cards…"
          value={filters.search ?? ""}
          onChange={(e) => set({ search: e.target.value || undefined })}
          className="h-8 w-48 pl-8 text-sm"
        />
      </div>

      {/* Assignee filter */}
      {assignees.length > 0 && (
        <div className="flex items-center gap-1">
          {assignees.map((user) => (
            <Button
              key={user.id}
              variant="ghost"
              size="icon"
              onClick={() => set({ assigneeId: filters.assigneeId === user.id ? undefined : user.id })}
              className={cn(
                "h-7 w-7 rounded-full p-0 transition-all",
                filters.assigneeId === user.id
                  ? "ring-2 ring-primary ring-offset-1"
                  : "opacity-60 hover:opacity-100"
              )}
              title={`Filter by ${user.full_name ?? user.email}`}
            >
              <AssigneeAvatar user={user} />
            </Button>
          ))}
        </div>
      )}

      {/* Label color filter */}
      {labelColors.length > 0 && (
        <div className="flex items-center gap-1">
          {labelColors.map((l) => (
            <Button
              key={l.color}
              variant="ghost"
              size="icon"
              onClick={() => set({ labelColor: filters.labelColor === l.color ? undefined : l.color })}
              className={cn(
                "h-5 w-5 rounded-sm p-0 transition-all",
                l.color,
                filters.labelColor === l.color
                  ? "ring-2 ring-foreground ring-offset-1 scale-110"
                  : "opacity-70 hover:opacity-100 hover:scale-110"
              )}
              title={l.name || l.color}
            />
          ))}
        </div>
      )}

      {/* Priority filter */}
      <div className="flex items-center gap-1">
        {PRIORITY_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            onClick={() => set({ priority: filters.priority === opt.value ? undefined : opt.value })}
            className={cn(
              "h-7 px-2.5 text-xs",
              filters.priority === opt.value
                ? "bg-muted text-foreground"
                : "text-muted-foreground"
            )}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear} className="h-7 gap-1.5 text-xs text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}

      {/* View settings */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "ml-auto h-7 gap-1.5 text-xs",
              activeViewCount < VIEW_TOGGLES.length
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            View
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-3">
          <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Card fields
          </p>
          <div className="space-y-2.5">
            {VIEW_TOGGLES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">{label}</span>
                <Switch
                  checked={cardSettings[key]}
                  onCheckedChange={(checked) => onCardSettingsChange({ [key]: checked })}
                />
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
