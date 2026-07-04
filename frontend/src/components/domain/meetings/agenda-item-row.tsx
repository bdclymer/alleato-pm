"use client";

import { ChevronDown, ChevronRight, GripVertical, History, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SortableItemHandle } from "@/components/ui/sortable";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useDeleteItem,
  useItemHistory,
  useUpdateItem,
  type MeetingDetailItem,
} from "@/hooks/use-meetings";
import type { UpdateItemInput } from "@/lib/meetings/schemas";

export interface AgendaItemRowProps {
  projectId: number;
  meetingId: string;
  item: MeetingDetailItem;
  mode: "agenda" | "minutes";
}

export function AgendaItemRow({
  projectId,
  meetingId,
  item,
  mode,
}: AgendaItemRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [titleDraft, setTitleDraft] = useState(item.title);
  const [descriptionDraft, setDescriptionDraft] = useState(item.description ?? "");
  const [minutesDraft, setMinutesDraft] = useState(item.official_minutes ?? "");
  const [titleDirty, setTitleDirty] = useState(false);
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [minutesDirty, setMinutesDirty] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const updateItem = useUpdateItem(String(projectId), meetingId);
  const deleteItem = useDeleteItem(String(projectId), meetingId);
  const itemHistory = useItemHistory(String(projectId), meetingId, item.id, {
    enabled: historyOpen,
  });

  useEffect(() => {
    setTitleDraft(item.title);
    setDescriptionDraft(item.description ?? "");
    setMinutesDraft(item.official_minutes ?? "");
    setTitleDirty(false);
    setDescriptionDirty(false);
    setMinutesDirty(false);
  }, [item.description, item.official_minutes, item.title]);

  function commitItem(data: UpdateItemInput, onSuccess?: () => void) {
    updateItem.mutate({ itemId: item.id, data }, { onSuccess });
  }

  function commitTitle() {
    const title = titleDraft.trim();
    if (!titleDirty) return;
    if (!title) {
      setTitleDraft(item.title);
      setTitleDirty(false);
      return;
    }
    if (title === item.title) {
      setTitleDirty(false);
      return;
    }
    commitItem({ title }, () => setTitleDirty(false));
  }

  function commitDescription() {
    if (!descriptionDirty) return;
    commitItem({ description: descriptionDraft }, () => setDescriptionDirty(false));
  }

  function commitMinutes() {
    if (!minutesDirty) return;
    commitItem({ official_minutes: minutesDraft }, () => setMinutesDirty(false));
  }

  return (
    <div
      className="group flex flex-col gap-1 py-1.5"
      data-testid="agenda-item-row"
      data-item-id={item.id}
    >
      <div className="flex items-center gap-1.5">
        <SortableItemHandle
          className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-30"
          aria-label={`Reorder ${item.title}`}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </SortableItemHandle>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Collapse item" : "Expand item"}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </Button>

        <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
          {item.agenda_number}
        </span>

        <Input
          value={titleDraft}
          aria-label={`Agenda item ${item.agenda_number}`}
          className="h-7 min-w-0 flex-1 border-transparent px-1 text-sm font-medium shadow-none hover:bg-muted/50 focus-visible:border-input focus-visible:bg-background"
          onChange={(event) => {
            setTitleDraft(event.target.value);
            setTitleDirty(true);
          }}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitTitle();
            }
            if (event.key === "Escape") {
              setTitleDraft(item.title);
              setTitleDirty(false);
              event.currentTarget.blur();
            }
          }}
        />

        {item.carried_from_item_id ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setHistoryOpen((value) => !value)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Show previous minutes"
              >
                <History className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous minutes</TooltipContent>
          </Tooltip>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100"
            aria-label="Item actions"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => deleteItem.mutate(item.id)}
            >
              Delete item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded ? (
        <div className="ml-16 flex flex-col gap-3">
          <Textarea
            value={descriptionDraft}
            placeholder="Notes"
            onChange={(event) => {
              setDescriptionDraft(event.target.value);
              setDescriptionDirty(true);
            }}
            onBlur={commitDescription}
            className="min-h-14 text-sm"
          />

          {mode === "minutes" ? (
            <Textarea
              value={minutesDraft}
              placeholder="Minutes for this item"
              onChange={(event) => {
                setMinutesDraft(event.target.value);
                setMinutesDirty(true);
              }}
              onBlur={commitMinutes}
              className="min-h-14 text-sm"
            />
          ) : null}
        </div>
      ) : null}

      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CollapsibleContent className="ml-16 mt-1 flex flex-col gap-2">
          {itemHistory.isLoading ? (
            <span className="text-xs text-muted-foreground">Loading history...</span>
          ) : itemHistory.data?.history.length ? (
            itemHistory.data.history.map((entry) => (
              <div key={entry.meeting_id} className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-foreground">
                  Meeting #{entry.meeting_number}
                  {entry.meeting_date ? ` · ${entry.meeting_date}` : ""}
                </span>
                {entry.official_minutes ? (
                  <p className="text-xs text-muted-foreground">{entry.official_minutes}</p>
                ) : null}
              </div>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No previous minutes.</span>
          )}
        </CollapsibleContent>
        <CollapsibleTrigger className="sr-only">Toggle previous minutes</CollapsibleTrigger>
      </Collapsible>
    </div>
  );
}
