"use client";

import * as React from "react";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  ChevronDown,
  Circle,
  ExternalLink,
  Filter,
  Github,
  GripVertical,
  Lightbulb,
  MoreHorizontal,
  Pencil,
  Plus,
  Rows3,
  Search,
  Sparkles,
  Terminal,
  Trash2,
  X,
  Zap,
  Bot,
  Check,
} from "lucide-react";
import {
  useInitiativeCards,
  useCreateCard,
  useUpdateCard,
  useDeleteCard,
  useReorderCards,
  useDispatchCard,
  useEmployees,
  type InitiativeCard,
  type Employee,
} from "@/hooks/use-initiative-cards";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type CardStatus = InitiativeCard["status"];
type CardPriority = InitiativeCard["priority"];
type Density = "compact" | "default" | "spacious";

interface ColumnDef {
  id: CardStatus;
  title: string;
  icon: React.ReactNode;
  accent: string;
  emptyText: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: "idea",
    title: "Ideas",
    icon: <Lightbulb className="h-4 w-4" />,
    accent: "bg-amber-500/5",
    emptyText: "Capture your next idea",
  },
  {
    id: "planned",
    title: "Planned",
    icon: <Calendar className="h-4 w-4" />,
    accent: "bg-blue-500/5",
    emptyText: "Drag ideas here to plan",
  },
  {
    id: "in_progress",
    title: "In Progress",
    icon: <Zap className="h-4 w-4" />,
    accent: "bg-violet-500/5",
    emptyText: "Active work appears here",
  },
  {
    id: "done",
    title: "Done",
    icon: <Circle className="h-4 w-4" />,
    accent: "bg-emerald-500/5",
    emptyText: "Completed items",
  },
];

const PRIORITY_CONFIG: Record<
  CardPriority,
  { label: string; dot: string }
> = {
  urgent: { label: "Urgent", dot: "bg-red-600" },
  high: { label: "High", dot: "bg-red-400" },
  medium: { label: "Medium", dot: "bg-amber-400" },
  low: { label: "Low", dot: "bg-blue-400" },
};

const SOURCE_BADGE: Record<string, { label: string; icon: React.ReactNode }> = {
  agentation: { label: "Agentation", icon: <Sparkles className="h-3 w-3" /> },
  ai_chat: { label: "AI Chat", icon: <Terminal className="h-3 w-3" /> },
  github: { label: "GitHub", icon: <Github className="h-3 w-3" /> },
};

const ALL_PRIORITIES: CardPriority[] = ["urgent", "high", "medium", "low"];
const ALL_SOURCES = ["manual", "agentation", "ai_chat", "github"] as const;

// Card field keys that can be toggled
type CardField = "priority" | "description" | "labels" | "assignee" | "dueDate" | "source" | "github";
const CARD_FIELDS: { key: CardField; label: string }[] = [
  { key: "priority", label: "Priority badge" },
  { key: "description", label: "Description" },
  { key: "labels", label: "Labels" },
  { key: "assignee", label: "Assignee" },
  { key: "dueDate", label: "Due date" },
  { key: "source", label: "Source badge" },
  { key: "github", label: "GitHub link" },
];

const DENSITY_CONFIG: Record<Density, { cardPadding: string; gap: string; titleClass: string; showDescription: boolean }> = {
  compact: { cardPadding: "p-2", gap: "space-y-1", titleClass: "text-xs", showDescription: false },
  default: { cardPadding: "p-3", gap: "space-y-2", titleClass: "text-sm", showDescription: true },
  spacious: { cardPadding: "p-4", gap: "space-y-3", titleClass: "text-sm", showDescription: true },
};

// ---------------------------------------------------------------------------
// Expandable search — icon collapses to input on click (Notion-style)
// ---------------------------------------------------------------------------

function ExpandableSearch({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) inputRef.current.focus();
  }, [isExpanded]);

  useEffect(() => {
    if (value) setIsExpanded(true);
  }, [value]);

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(true)}>
            <Search />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Search</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="relative flex items-center animate-in slide-in-from-right-2 duration-200">
      <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { if (!value) setIsExpanded(false); }}
        placeholder={placeholder}
        className="h-8 w-48 pl-8 pr-8 text-sm"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 h-8 w-8"
          onClick={() => { onChange(""); inputRef.current?.focus(); }}
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CommandCenterPage() {
  const { data: cards = [], isLoading } = useInitiativeCards();
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const reorderCards = useReorderCards();
  const dispatchCard = useDispatchCard();
  const { data: employees = [] } = useEmployees();

  // Local state for optimistic drag-and-drop
  const [localCards, setLocalCards] = useState<InitiativeCard[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createInColumn, setCreateInColumn] = useState<CardStatus>("idea");
  const [editingCard, setEditingCard] = useState<InitiativeCard | null>(null);

  // Toolbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<CardPriority>>(new Set(ALL_PRIORITIES));
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set(ALL_SOURCES));
  const [labelFilter, setLabelFilter] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<Density>("default");
  const [visibleFields, setVisibleFields] = useState<Set<CardField>>(
    new Set(CARD_FIELDS.map((f) => f.key)),
  );

  // Sync server data → local state
  useEffect(() => {
    if (cards.length > 0 || !isLoading) {
      setLocalCards(cards);
    }
  }, [cards, isLoading]);

  // Collect all unique labels for filter menu
  const allLabels = useMemo(() => {
    const set = new Set<string>();
    for (const card of localCards) {
      for (const label of card.labels ?? []) {
        if (label) set.add(label);
      }
    }
    return Array.from(set).sort();
  }, [localCards]);

  // Initialize label filter with all labels once loaded
  useEffect(() => {
    if (allLabels.length > 0 && labelFilter.size === 0) {
      setLabelFilter(new Set(allLabels));
    }
  }, [allLabels, labelFilter.size]);

  // Filter cards
  const filteredCards = useMemo(() => {
    return localCards.filter((card) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          card.title.toLowerCase().includes(q) ||
          card.description?.toLowerCase().includes(q) ||
          card.assignee?.toLowerCase().includes(q) ||
          card.labels?.some((l) => l.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      // Priority
      if (!priorityFilter.has(card.priority)) return false;
      // Source
      if (!sourceFilter.has(card.source)) return false;
      // Labels (card passes if it has ANY label that's in the filter, or has no labels)
      if (labelFilter.size < allLabels.length) {
        const cardLabels = card.labels?.filter(Boolean) ?? [];
        if (cardLabels.length > 0 && !cardLabels.some((l) => labelFilter.has(l))) {
          return false;
        }
      }
      return true;
    });
  }, [localCards, searchQuery, priorityFilter, sourceFilter, labelFilter, allLabels.length]);

  const hasActiveFilters =
    searchQuery.length > 0 ||
    priorityFilter.size < ALL_PRIORITIES.length ||
    sourceFilter.size < ALL_SOURCES.length ||
    (allLabels.length > 0 && labelFilter.size < allLabels.length);

  // Group cards by column
  const columnCards = useMemo(() => {
    const grouped: Record<CardStatus, InitiativeCard[]> = {
      idea: [],
      planned: [],
      in_progress: [],
      done: [],
    };
    for (const card of filteredCards) {
      if (grouped[card.status]) {
        grouped[card.status].push(card);
      }
    }
    const priorityWeight: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    for (const status of Object.keys(grouped) as CardStatus[]) {
      grouped[status].sort(
        (a, b) =>
          (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2) ||
          a.sort_order - b.sort_order,
      );
    }
    return grouped;
  }, [filteredCards]);

  // Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const findColumnForCard = useCallback(
    (cardId: UniqueIdentifier): CardStatus | null => {
      for (const [status, items] of Object.entries(columnCards)) {
        if (items.some((c) => c.id === cardId)) return status as CardStatus;
      }
      if (COLUMNS.some((c) => c.id === cardId)) return cardId as CardStatus;
      return null;
    },
    [columnCards],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;

      const activeColumn = findColumnForCard(active.id);
      let overColumn = findColumnForCard(over.id);
      if (!overColumn && COLUMNS.some((c) => c.id === over.id)) {
        overColumn = over.id as CardStatus;
      }
      if (!activeColumn || !overColumn) return;

      setLocalCards((prev) => {
        const updated = [...prev];
        const activeIdx = updated.findIndex((c) => c.id === active.id);
        if (activeIdx === -1) return prev;

        if (activeColumn === overColumn) {
          const colItems = updated.filter((c) => c.status === activeColumn);
          const overIdx = colItems.findIndex((c) => c.id === over.id);
          if (overIdx === -1) return prev;
          const fromIdx = colItems.findIndex((c) => c.id === active.id);
          const reordered = arrayMove(colItems, fromIdx, overIdx);
          const reorderedIds = new Set(reordered.map((c) => c.id));
          const rest = updated.filter((c) => !reorderedIds.has(c.id));
          const withOrder = reordered.map((c, i) => ({ ...c, sort_order: i }));
          reorderCards.mutate(withOrder.map((c) => ({ id: c.id, status: c.status, sort_order: c.sort_order })));
          return [...rest, ...withOrder];
        }

        updated[activeIdx] = { ...updated[activeIdx], status: overColumn! };
        const affectedStatuses = [activeColumn, overColumn!];
        const patches: { id: string; status: string; sort_order: number }[] = [];
        for (const status of affectedStatuses) {
          updated.filter((c) => c.status === status).forEach((c, i) => {
            c.sort_order = i;
            patches.push({ id: c.id, status: c.status, sort_order: i });
          });
        }
        reorderCards.mutate(patches);
        return updated;
      });
    },
    [findColumnForCard, reorderCards],
  );

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    return localCards.find((c) => c.id === activeId) ?? null;
  }, [activeId, localCards]);

  const handleCreateCard = useCallback(
    (data: {
      title: string;
      description: string;
      priority: CardPriority;
      labels: string[];
      assignee: string;
      status?: CardStatus;
    }) => {
      createCard.mutate({
        title: data.title,
        description: data.description || null,
        status: data.status || createInColumn,
        priority: data.priority,
        labels: data.labels,
        assignee: data.assignee || null,
      });
      setShowCreateDialog(false);
    },
    [createCard, createInColumn],
  );

  const handleUpdateCard = useCallback(
    (data: Partial<InitiativeCard> & { id: string }) => {
      updateCard.mutate(data);
      setEditingCard(null);
    },
    [updateCard],
  );

  const handleDeleteCard = useCallback(
    (id: string) => { deleteCard.mutate(id); },
    [deleteCard],
  );

  const [copiedDispatch, setCopiedDispatch] = useState<string | null>(null);
  const handleDispatchCard = useCallback(
    async (id: string) => {
      const result = await dispatchCard.mutateAsync(id);
      if (result.cliCommand) {
        await navigator.clipboard.writeText(result.cliCommand);
        setCopiedDispatch(id);
        setTimeout(() => setCopiedDispatch(null), 2000);
      }
    },
    [dispatchCard],
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setPriorityFilter(new Set(ALL_PRIORITIES));
    setSourceFilter(new Set(ALL_SOURCES));
    setLabelFilter(new Set(allLabels));
  }, [allLabels]);

  const togglePriority = (p: CardPriority) => {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const toggleSource = (s: string) => {
    setSourceFilter((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const toggleLabel = (l: string) => {
    setLabelFilter((prev) => {
      const next = new Set(prev);
      next.has(l) ? next.delete(l) : next.add(l);
      return next;
    });
  };

  const toggleField = (f: CardField) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  const totalCards = localCards.length;
  const filteredTotal = filteredCards.length;
  const densityConfig = DENSITY_CONFIG[density];

  return (
    <PageShell variant="dashboard" title="Command Center" showHeader={false} className="h-full" contentClassName="space-y-0">
      <div className="flex flex-col h-full">
      {/* Header — Notion-style: title left, icon toolbar + primary action right */}
      <div className="bg-background px-6 py-3 mx-auto w-full max-w-screen-2xl">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">Command Center</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {hasActiveFilters
                ? `${filteredTotal} of ${totalCards} initiatives`
                : `${totalCards} initiative${totalCards !== 1 ? "s" : ""} across ${COLUMNS.length} stages`}
            </p>
          </div>

          {/* Right side: icon toolbar + New button */}
          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={300}>
              {/* Filter icon — unified popover with all filter categories */}
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative h-8 w-8">
                        <Filter />
                        {hasActiveFilters && (
                          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                            {ALL_PRIORITIES.length - priorityFilter.size + ALL_SOURCES.length - sourceFilter.size + (allLabels.length > 0 ? allLabels.length - labelFilter.size : 0)}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Filter</TooltipContent>
                </Tooltip>
                <PopoverContent align="end" className="w-64 p-0">
                  <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-medium">Filters</span>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={clearFilters}
                        className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                  <div className="p-3 space-y-4 max-h-80 overflow-y-auto">
                    {/* Priority */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Priority</p>
                      {ALL_PRIORITIES.map((p) => (
                        <label key={p} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                          <Checkbox checked={priorityFilter.has(p)} onCheckedChange={() => togglePriority(p)} />
                          <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${PRIORITY_CONFIG[p].dot}`} />{PRIORITY_CONFIG[p].label}</span>
                        </label>
                      ))}
                    </div>
                    {/* Source */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Source</p>
                      {ALL_SOURCES.map((s) => (
                        <label key={s} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer text-sm capitalize">
                          <Checkbox checked={sourceFilter.has(s)} onCheckedChange={() => toggleSource(s)} />
                          {s.replace("_", " ")}
                        </label>
                      ))}
                    </div>
                    {/* Labels */}
                    {allLabels.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Labels</p>
                        {allLabels.map((l) => (
                          <label key={l} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                            <Checkbox checked={labelFilter.has(l)} onCheckedChange={() => toggleLabel(l)} />
                            {l}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Search icon — expandable */}
              <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search cards..." />

              {/* Settings icon — field visibility + density */}
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Rows3 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>View settings</TooltipContent>
                </Tooltip>
                <PopoverContent align="end" className="w-56 p-0">
                  <div className="px-3 py-2.5 border-b border-border">
                    <span className="text-sm font-medium">View settings</span>
                  </div>
                  <div className="p-3 space-y-4">
                    {/* Density */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Density</p>
                      <div className="flex gap-1">
                        {(["compact", "default", "spacious"] as Density[]).map((d) => (
                          <Button
                            key={d}
                            type="button"
                            variant={density === d ? "secondary" : "ghost"}
                            size="xs"
                            onClick={() => setDensity(d)}
                            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                              density === d
                                ? "bg-foreground text-background"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {/* Property visibility */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Property visibility</p>
                      {CARD_FIELDS.map((f) => (
                        <label key={f.key} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                          <Checkbox checked={visibleFields.has(f.key)} onCheckedChange={() => toggleField(f.key)} />
                          {f.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </TooltipProvider>

            {/* Primary action — always rightmost */}
            <Button
              size="sm"
              onClick={() => {
                setCreateInColumn("idea");
                setShowCreateDialog(true);
              }}
            >
              New
              <ChevronDown />
            </Button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 w-full max-w-screen-2xl mx-auto overflow-x-auto flex">
        {isLoading ? (
          <div className="flex items-center justify-center flex-1 text-muted-foreground">
            Loading command center...
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full min-w-fit flex-1">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  cards={columnCards[col.id]}
                  density={densityConfig}
                  visibleFields={visibleFields}
                  employees={employees}
                  copiedDispatch={copiedDispatch}
                  onAddCard={() => {
                    setCreateInColumn(col.id);
                    setShowCreateDialog(true);
                  }}
                  onEditCard={setEditingCard}
                  onDeleteCard={handleDeleteCard}
                  onDispatchCard={handleDispatchCard}
                />
              ))}
            </div>
            <DragOverlay>
              {activeCard ? (
                <div className="w-72 rotate-2">
                  <CardContent card={activeCard} density={densityConfig} visibleFields={visibleFields} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {showCreateDialog && (
        <CardFormDialog
          title="New Initiative"
          defaultStatus={createInColumn}
          employees={employees}
          onSubmit={handleCreateCard}
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      {editingCard && (
        <CardFormDialog
          title="Edit Initiative"
          card={editingCard}
          defaultStatus={editingCard.status}
          employees={employees}
          onSubmit={(data) => handleUpdateCard({ id: editingCard.id, ...data })}
          onClose={() => setEditingCard(null)}
        />
      )}
      </div>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

function KanbanColumn({
  column,
  cards,
  density,
  visibleFields,
  employees,
  copiedDispatch,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onDispatchCard,
}: {
  column: ColumnDef;
  cards: InitiativeCard[];
  density: (typeof DENSITY_CONFIG)[Density];
  visibleFields: Set<CardField>;
  employees: Employee[];
  copiedDispatch: string | null;
  onAddCard: () => void;
  onEditCard: (card: InitiativeCard) => void;
  onDeleteCard: (id: string) => void;
  onDispatchCard: (id: string) => void;
}) {
  return (
    <div className={`flex-1 min-w-72 flex flex-col ${column.accent}`}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {column.icon}
          <span className="text-sm font-semibold text-foreground">{column.title}</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/10 px-1.5 text-xs font-medium text-foreground">
            {cards.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onAddCard}
        >
          <Plus />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className={density.gap}>
            {cards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                density={density}
                visibleFields={visibleFields}
                employees={employees}
                copiedDispatch={copiedDispatch}
                onEdit={() => onEditCard(card)}
                onDelete={() => onDeleteCard(card.id)}
                onDispatch={() => onDispatchCard(card.id)}
              />
            ))}
          </div>
        </SortableContext>
        {cards.length === 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={onAddCard}
            className="h-auto w-full rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground hover:border-border hover:bg-muted/30"
          >
            {column.emptyText}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable card wrapper
// ---------------------------------------------------------------------------

function SortableCard({
  card,
  density,
  visibleFields,
  employees,
  copiedDispatch,
  onEdit,
  onDelete,
  onDispatch,
}: {
  card: InitiativeCard;
  density: (typeof DENSITY_CONFIG)[Density];
  visibleFields: Set<CardField>;
  employees: Employee[];
  copiedDispatch: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onDispatch: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-30" : "opacity-100"}>
      <CardContent
        card={card}
        density={density}
        visibleFields={visibleFields}
        employees={employees}
        copiedDispatch={copiedDispatch}
        dragProps={{ ...attributes, ...listeners }}
        onEdit={onEdit}
        onDelete={onDelete}
        onDispatch={onDispatch}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card content (used in board + drag overlay)
// ---------------------------------------------------------------------------

function CardContent({
  card,
  density,
  visibleFields,
  employees,
  copiedDispatch,
  dragProps,
  onEdit,
  onDelete,
  onDispatch,
}: {
  card: InitiativeCard;
  density: (typeof DENSITY_CONFIG)[Density];
  visibleFields: Set<CardField>;
  employees?: Employee[];
  copiedDispatch?: string | null;
  dragProps?: Record<string, unknown>;
  onEdit?: () => void;
  onDelete?: () => void;
  onDispatch?: () => void;
}) {
  const priority = PRIORITY_CONFIG[card.priority];
  const sourceBadge = card.source !== "manual" ? SOURCE_BADGE[card.source] : null;
  const labels = card.labels?.filter(Boolean) ?? [];
  const isCompact = density.cardPadding === "p-2";

  // Resolve assignee name from employees list or fall back to text field
  const assigneeEmployee = card.assignee_id
    ? employees?.find((e) => e.id === card.assignee_id)
    : null;
  const assigneeName = assigneeEmployee
    ? `${assigneeEmployee.first_name} ${assigneeEmployee.last_name}`
    : card.assignee;
  const assigneeInitials = assigneeName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isDispatched = card.dispatch_status === "dispatched" || card.dispatch_status === "in_progress";
  const isCopied = copiedDispatch === card.id;
  const isEditable = Boolean(onEdit);

  const handleCardClick = useCallback(() => {
    if (onEdit) onEdit();
  }, [onEdit]);

  const handleCardKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onEdit) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onEdit();
      }
    },
    [onEdit],
  );

  return (
    <div
      className={`rounded-lg border border-border/60 bg-muted/20 ${density.cardPadding} shadow-xs hover:shadow-sm transition-shadow group ${
        isEditable ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""
      }`}
      onClick={isEditable ? handleCardClick : undefined}
      onKeyDown={isEditable ? handleCardKeyDown : undefined}
      role={isEditable ? "button" : undefined}
      tabIndex={isEditable ? 0 : undefined}
      aria-label={isEditable ? `Edit ${card.title}` : undefined}
    >
      <div className="flex items-start gap-1.5">
        <Button
          asChild
          variant="ghost"
          size="icon-xs"
          {...dragProps}
          className="mt-1 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        >
          <span aria-label="Drag card" onClick={(event) => event.stopPropagation()}>
            <GripVertical className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
          </span>
        </Button>

        <div className="flex-1 min-w-0">
          {/* Source badge — priority is shown as dot on the title line */}
          {visibleFields.has("source") && sourceBadge && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                {sourceBadge.icon}
                {!isCompact && sourceBadge.label}
              </span>
            </div>
          )}

          {/* Title with priority dot */}
          <p className={`${density.titleClass} font-medium text-foreground leading-snug ${isCompact ? "line-clamp-1" : "line-clamp-2"} flex items-start gap-1.5`}>
            {visibleFields.has("priority") && (
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${priority.dot}`} title={priority.label} />
            )}
            <span>{card.title}</span>
          </p>

          {/* Description — hidden in compact */}
          {visibleFields.has("description") && density.showDescription && card.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {card.description.replace(/\*\*.*?\*\*/g, "").slice(0, 120)}
            </p>
          )}

          {/* Labels */}
          {visibleFields.has("labels") && labels.length > 0 && (
            <div className={`flex flex-wrap gap-1 ${isCompact ? "mt-1" : "mt-2"}`}>
              {labels.map((label) => (
                <Badge key={label} variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                  {label}
                </Badge>
              ))}
            </div>
          )}

          {/* Footer */}
          {(visibleFields.has("assignee") || visibleFields.has("dueDate") || visibleFields.has("github")) && (
            <div className={`flex items-center justify-between ${isCompact ? "mt-1" : "mt-2"}`}>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {visibleFields.has("assignee") && assigneeName && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold" title={assigneeName}>
                    {assigneeInitials}
                  </span>
                )}
                {isDispatched && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-status-info">
                    <Bot className="h-3 w-3" />
                    {card.dispatch_status === "in_progress" ? "Running" : "Sent"}
                  </span>
                )}
                {visibleFields.has("dueDate") && card.due_date && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(card.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
              {visibleFields.has("github") && card.github_issue_url && (
                <a
                  href={card.github_issue_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Actions menu */}
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDispatch && (
                <DropdownMenuItem onClick={onDispatch}>
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-2 text-status-success" />
                      Copied to clipboard
                    </>
                  ) : (
                    <>
                      <Bot className="h-3.5 w-3.5 mr-2" />
                      Send to Claude Code
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit dialog
// ---------------------------------------------------------------------------

function CardFormDialog({
  title,
  card,
  defaultStatus,
  employees,
  onSubmit,
  onClose,
}: {
  title: string;
  card?: InitiativeCard;
  defaultStatus: CardStatus;
  employees: Employee[];
  onSubmit: (data: {
    title: string;
    description: string;
    priority: CardPriority;
    labels: string[];
    assignee: string;
    assignee_id?: string | null;
    status?: CardStatus;
    due_date?: string | null;
    github_issue_url?: string | null;
  }) => void;
  onClose: () => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [formTitle, setFormTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [priority, setPriority] = useState<CardPriority>(card?.priority ?? "medium");
  const [labelsStr, setLabelsStr] = useState((card?.labels ?? []).join(", "));
  const [assigneeId, setAssigneeId] = useState(card?.assignee_id ?? "");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [status, setStatus] = useState<CardStatus>(card?.status ?? defaultStatus);
  const [dueDate, setDueDate] = useState(card?.due_date ?? "");
  const [githubUrl, setGithubUrl] = useState(card?.github_issue_url ?? "");

  // Resolve display name for existing assignee
  const selectedEmployee = employees.find((e) => e.id === assigneeId);
  const displayName = selectedEmployee
    ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
    : card?.assignee ?? "";

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!assigneeSearch) return employees;
    const q = assigneeSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q),
    );
  }, [employees, assigneeSearch]);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const emp = employees.find((e) => e.id === assigneeId);
    onSubmit({
      title: formTitle.trim(),
      description: description.trim(),
      priority,
      labels: labelsStr.split(",").map((l) => l.trim()).filter(Boolean),
      assignee: emp ? `${emp.first_name} ${emp.last_name}` : "",
      assignee_id: assigneeId || null,
      status,
      due_date: dueDate || null,
      github_issue_url: githubUrl.trim() || null,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-title">Title</Label>
            <Input id="card-title" ref={titleRef} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="What needs to happen?" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-desc">Description</Label>
            <Textarea id="card-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details, context, acceptance criteria..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="card-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as CardPriority)}>
                <SelectTrigger id="card-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CardStatus)}>
                <SelectTrigger id="card-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Assignee — searchable employee dropdown */}
            <div className="space-y-2 relative">
              <Label htmlFor="card-assignee">Assignee</Label>
              <div className="relative">
                <Input
                  id="card-assignee"
                  value={showAssigneeDropdown ? assigneeSearch : displayName}
                  onChange={(e) => {
                    setAssigneeSearch(e.target.value);
                    setShowAssigneeDropdown(true);
                  }}
                  onFocus={() => setShowAssigneeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowAssigneeDropdown(false), 200)}
                  placeholder="Search team members..."
                  autoComplete="off"
                />
                {assigneeId && !showAssigneeDropdown && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setAssigneeId(""); setAssigneeSearch(""); }}
                    title="Clear assignee"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {showAssigneeDropdown && filteredEmployees.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-sm max-h-48 overflow-y-auto">
                  {/* Claude Code option at top */}
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start px-3 py-2 text-sm hover:bg-muted text-left"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setAssigneeId("claude-code");
                      setAssigneeSearch("");
                      setShowAssigneeDropdown(false);
                    }}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-status-info/10 text-status-info text-xs font-semibold shrink-0">
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">Claude Code</p>
                      <p className="text-xs text-muted-foreground">AI agent — dispatches as dev task</p>
                    </div>
                  </Button>
                  <div className="border-t border-border" />
                  {filteredEmployees.map((emp) => (
                    <Button
                      key={emp.id}
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start px-3 py-2 text-sm hover:bg-muted text-left"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setAssigneeId(emp.id);
                        setAssigneeSearch("");
                        setShowAssigneeDropdown(false);
                      }}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                        {emp.first_name[0]}{emp.last_name[0]}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.job_title || emp.email}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-due">Due date</Label>
              <Input id="card-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-labels">Labels</Label>
            <Input id="card-labels" value={labelsStr} onChange={(e) => setLabelsStr(e.target.value)} placeholder="AI, Frontend, Backend (comma-separated)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-github">GitHub issue URL</Label>
            <Input id="card-github" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/org/repo/issues/123" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!formTitle.trim()}>{card ? "Save changes" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
