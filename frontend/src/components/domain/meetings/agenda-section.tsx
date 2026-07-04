"use client";

import {
  CalendarIcon,
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from "@/components/ui/sortable";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SectionRuleHeading } from "@/components/layout";
import {
  useCreateCategory,
  useCreateItem,
  useCreateItemTask,
  useDeleteCategory,
  useDeleteItem,
  useReorderCategories,
  useReorderItems,
  useUpdateCategory,
  useUpdateItem,
  type MeetingDetail,
  type MeetingDetailCategory,
  type MeetingDetailItem,
} from "@/hooks/use-meetings";
import { useUsers } from "@/hooks/use-users";
import type { UpdateItemInput } from "@/lib/meetings/schemas";
import { AgendaItemRow } from "./agenda-item-row";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Closed" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "none", label: "No priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

function parseDueDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!parts) return undefined;
  return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
}

export interface AgendaSectionProps {
  projectId: number;
  meetingId: string;
  detail: MeetingDetail;
  mode: "agenda" | "minutes";
}

export function AgendaSection({ projectId, meetingId, detail, mode }: AgendaSectionProps) {
  const projectIdStr = String(projectId);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(new Set());
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const createCategory = useCreateCategory(projectIdStr, meetingId);
  const reorderCategories = useReorderCategories(projectIdStr, meetingId);
  const reorderItems = useReorderItems(projectIdStr, meetingId);

  const categories = detail.categories;
  const allCollapsed = categories.length > 0 && collapsedCategoryIds.size === categories.length;

  function toggleCategoryCollapsed(categoryId: string) {
    setCollapsedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  function toggleExpandCollapseAll() {
    if (allCollapsed) {
      setCollapsedCategoryIds(new Set());
    } else {
      setCollapsedCategoryIds(new Set(categories.map((category) => category.id)));
    }
  }

  function handleCategoryReorder(orderedCategories: MeetingDetailCategory[]) {
    reorderCategories.mutate(orderedCategories.map((category) => category.id));
  }

  function handleItemReorder(categoryId: string, orderedItems: MeetingDetailItem[]) {
    reorderItems.mutate({
      categoryId,
      orderedIds: orderedItems.map((item) => item.id),
    });
  }

  function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setAddingCategory(false);
      return;
    }
    createCategory.mutate(name, {
      onSuccess: () => {
        setNewCategoryName("");
        setAddingCategory(false);
      },
    });
  }

  return (
    <div className="flex flex-col gap-4" data-testid="agenda-section">
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="xs" onClick={toggleExpandCollapseAll}>
          {allCollapsed ? "Expand all" : "Collapse all"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setAddingCategory(true)}
          aria-label="Add section"
        >
          <Plus className="h-3.5 w-3.5" />
          Add section
        </Button>
      </div>

      <Sortable
        value={categories}
        getItemValue={(category) => category.id}
        orientation="vertical"
        onValueChange={handleCategoryReorder}
      >
        <SortableContent asChild>
          <div className="flex flex-col gap-6">
            {categories.map((category, index) => {
              const isCollapsed = collapsedCategoryIds.has(category.id);

              return (
                <SortableItem key={category.id} value={category.id} asChild>
                  <section data-testid="agenda-category" data-category-id={category.id}>
                    <CategoryHeader
                      index={index}
                      category={category}
                      projectId={projectIdStr}
                      meetingId={meetingId}
                      collapsed={isCollapsed}
                      onToggleCollapsed={() => toggleCategoryCollapsed(category.id)}
                      canDelete={categories.length > 1}
                    />

                    {!isCollapsed ? (
                      <div className="flex flex-col pl-1">
                        <Sortable
                          value={category.items}
                          getItemValue={(item) => item.id}
                          orientation="vertical"
                          onValueChange={(orderedItems) =>
                            handleItemReorder(category.id, orderedItems)
                          }
                        >
                          <SortableContent asChild>
                            <div className="flex flex-col divide-y divide-border/60">
                              {category.items.map((item) => (
                                <SortableItem key={item.id} value={item.id} asChild>
                                  <AgendaItemRow
                                    projectId={projectId}
                                    meetingId={meetingId}
                                    item={item}
                                    mode={mode}
                                  />
                                </SortableItem>
                              ))}
                            </div>
                          </SortableContent>
                        </Sortable>

                        <QuickAddItemRow
                          projectId={projectIdStr}
                          meetingId={meetingId}
                          categoryId={category.id}
                        />
                      </div>
                    ) : null}
                  </section>
                </SortableItem>
              );
            })}
          </div>
        </SortableContent>
      </Sortable>

      {addingCategory ? (
        <Input
          autoFocus
          disabled={createCategory.isPending}
          value={newCategoryName}
          placeholder="Section name"
          className="h-8 max-w-xs text-sm"
          onChange={(event) => setNewCategoryName(event.target.value)}
          onBlur={handleAddCategory}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !createCategory.isPending) handleAddCategory();
            if (event.key === "Escape") {
              setNewCategoryName("");
              setAddingCategory(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

export function MeetingActionItemsSection({
  projectId,
  meetingId,
  detail,
}: {
  projectId: number;
  meetingId: string;
  detail: MeetingDetail;
}) {
  const projectIdStr = String(projectId);
  const [newActionTitle, setNewActionTitle] = useState("");
  const createItem = useCreateItem(projectIdStr, meetingId);
  const firstCategory = detail.categories[0];

  const actionItems = useMemo(
    () =>
      detail.categories
        .flatMap((category) => category.items)
        .filter(
          (item) =>
            item.status !== "closed" ||
            Boolean(item.assignee_person_id) ||
            Boolean(item.due_date) ||
            Boolean(item.priority) ||
            item.task_count > 0,
        ),
    [detail.categories],
  );

  function handleAddActionItem() {
    const title = newActionTitle.trim();
    if (!title || !firstCategory) return;
    createItem.mutate(
      {
        category_id: firstCategory.id,
        title,
        status: "open",
      },
      { onSuccess: () => setNewActionTitle("") },
    );
  }

  return (
    <section className="space-y-3" data-testid="meeting-action-items">
      <div className="space-y-1">
        <SectionRuleHeading label="Action items" className="mb-0 pb-0" />
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Populated from the prior meeting and open project tasks. Remove or add items as needed below.
        </p>
      </div>

      <div className="divide-y divide-border/60">
        {actionItems.length > 0 ? (
          actionItems.map((item) => (
            <ActionItemRow
              key={item.id}
              projectId={projectIdStr}
              meetingId={meetingId}
              item={item}
            />
          ))
        ) : (
          <p className="py-2 text-sm text-muted-foreground">
            No action items yet.
          </p>
        )}
      </div>

      <div className="flex max-w-xl items-center gap-2">
        <Input
          value={newActionTitle}
          disabled={!firstCategory || createItem.isPending}
          placeholder={firstCategory ? "Add item" : "Add an agenda section first"}
          className="h-8 text-sm"
          onChange={(event) => setNewActionTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !createItem.isPending) handleAddActionItem();
          }}
          onBlur={handleAddActionItem}
        />
      </div>
    </section>
  );
}

interface CategoryHeaderProps {
  index: number;
  category: MeetingDetailCategory;
  projectId: string;
  meetingId: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  canDelete: boolean;
}

function CategoryHeader({
  index,
  category,
  projectId,
  meetingId,
  collapsed,
  onToggleCollapsed,
  canDelete,
}: CategoryHeaderProps) {
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(category.name);
  const updateCategory = useUpdateCategory(projectId, meetingId);
  const deleteCategory = useDeleteCategory(projectId, meetingId);

  function commitRename() {
    const trimmed = nameDraft.trim();
    setRenaming(false);
    if (!trimmed || trimmed === category.name) {
      setNameDraft(category.name);
      return;
    }
    updateCategory.mutate({ categoryId: category.id, name: trimmed });
  }

  function handleDelete() {
    if (!canDelete) return;
    deleteCategory.mutate(category.id);
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <SortableItemHandle
        className="text-muted-foreground/50 hover:text-muted-foreground"
        aria-label={`Reorder ${category.name}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </SortableItemHandle>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onToggleCollapsed}
        className="text-muted-foreground hover:text-foreground"
        aria-label={collapsed ? `Expand ${category.name}` : `Collapse ${category.name}`}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button>

      <span className="text-xs font-semibold text-primary tabular-nums">
        {index + 1}
      </span>

      {renaming ? (
        <Input
          autoFocus
          disabled={updateCategory.isPending}
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !updateCategory.isPending) commitRename();
            if (event.key === "Escape") {
              setNameDraft(category.name);
              setRenaming(false);
            }
          }}
          className="h-7 max-w-xs text-sm font-semibold"
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onDoubleClick={() => setRenaming(true)}
          className="h-auto min-w-0 flex-1 justify-start truncate px-0 text-left text-sm font-semibold text-foreground hover:bg-transparent"
        >
          {category.name}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={`${category.name} actions`}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenaming(true)}>Rename</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={!canDelete}>
            Delete section
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface QuickAddItemRowProps {
  projectId: string;
  meetingId: string;
  categoryId: string;
}

function QuickAddItemRow({ projectId, meetingId, categoryId }: QuickAddItemRowProps) {
  const [titleDraft, setTitleDraft] = useState("");
  const createItem = useCreateItem(projectId, meetingId);

  function handleAdd() {
    const title = titleDraft.trim();
    if (!title) return;
    createItem.mutate(
      { category_id: categoryId, title },
      { onSuccess: () => setTitleDraft("") },
    );
  }

  return (
    <div className="ml-14 py-1.5">
      <Input
        value={titleDraft}
        placeholder="Add item"
        disabled={createItem.isPending}
        className="h-7 max-w-sm border-transparent px-1 text-xs shadow-none hover:bg-muted/50 focus-visible:border-input focus-visible:bg-background"
        onChange={(event) => setTitleDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !createItem.isPending) handleAdd();
        }}
        onBlur={handleAdd}
      />
    </div>
  );
}

function ActionItemRow({
  projectId,
  meetingId,
  item,
}: {
  projectId: string;
  meetingId: string;
  item: MeetingDetailItem;
}) {
  const updateItem = useUpdateItem(projectId, meetingId);
  const deleteItem = useDeleteItem(projectId, meetingId);
  const createTask = useCreateItemTask(projectId, meetingId);
  const { users } = useUsers({ personType: "all" });
  const [taskLinked, setTaskLinked] = useState(item.task_count > 0);

  useEffect(() => {
    setTaskLinked(item.task_count > 0);
  }, [item.task_count]);

  function update(data: UpdateItemInput) {
    updateItem.mutate({ itemId: item.id, data });
  }

  function handleCreateTask() {
    createTask.mutate(
      {
        itemId: item.id,
        data: {
          title: item.title,
          description: item.description ?? undefined,
          assignee_person_id: item.assignee_person_id ?? undefined,
          due_date: item.due_date ?? undefined,
        },
      },
      { onSuccess: () => setTaskLinked(true) },
    );
  }

  return (
    <div className="grid gap-2 py-2 text-sm md:grid-cols-[4rem_minmax(0,1fr)_9rem_8rem_8rem_13rem] md:items-center">
      <span className="text-xs font-medium text-muted-foreground tabular-nums">
        {item.agenda_number}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{item.title}</p>
        {item.description ? (
          <p className="truncate text-xs text-muted-foreground">{item.description}</p>
        ) : null}
      </div>

      <Select
        value={item.assignee_person_id ?? "unassigned"}
        onValueChange={(value) =>
          update({ assignee_person_id: value === "unassigned" ? null : value })
        }
      >
        <SelectTrigger size="sm" className="h-7 text-xs">
          <SelectValue placeholder="Owner" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={item.status}
        onValueChange={(value) => update({ status: value as NonNullable<UpdateItemInput["status"]> })}
      >
        <SelectTrigger size="sm" className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 justify-start text-xs font-normal"
            aria-label={`Due date for ${item.title}`}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {item.due_date ? format(parseDueDate(item.due_date)!, "MMM d") : "Due date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parseDueDate(item.due_date)}
            onSelect={(date) => update({ due_date: date ? format(date, "yyyy-MM-dd") : null })}
            initialFocus
          />
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => update({ due_date: null })}
            >
              Clear date
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-1">
        {taskLinked ? (
          <span className="w-20 text-xs text-muted-foreground">
            Task linked
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleCreateTask}
            disabled={createTask.isPending}
            className="w-20"
          >
            Create task
          </Button>
        )}

        <Select
          value={item.priority ?? "none"}
          onValueChange={(value) =>
            update({
              priority: value === "none" ? null : (value as NonNullable<UpdateItemInput["priority"]>),
            })
          }
        >
          <SelectTrigger size="sm" className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label={`${item.title} actions`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
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
    </div>
  );
}
