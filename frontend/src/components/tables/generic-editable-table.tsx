"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  X,
  Pencil,
  Trash2,
  Loader2,
  MoreHorizontal,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Table2,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "card" | "list";

export interface EditableColumn<T> {
  key: keyof T;
  header: string;
  type?: "text" | "number" | "date" | "datetime-local" | "textarea" | "select";
  width?: string;
  editable?: boolean;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  selectOptions?: { value: string; label: string }[];
  /** Used for card/list view to determine which column is the primary display */
  isPrimary?: boolean;
  /** Used for card/list view to determine which column is the secondary display */
  isSecondary?: boolean;
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: "default" | "destructive";
}

interface GenericEditableTableProps<T extends { id: string | number }> {
  data: T[];
  columns: EditableColumn<T>[];
  onUpdate?: (
    id: string | number,
    data: Partial<T>,
  ) => Promise<{ error?: string }>;
  onDelete?: (id: string | number) => Promise<{ error?: string }>;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onRowClick?: (row: T) => void;
  className?: string;
  /** Additional row actions beyond edit/delete */
  rowActions?: RowAction<T>[];
  /** Enable row selection with checkboxes */
  enableRowSelection?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  /** Enable view switching between table/card/list */
  enableViewSwitcher?: boolean;
  /** Default view mode */
  defaultViewMode?: ViewMode;
  /** Enable column sorting */
  enableSorting?: boolean;
  /** Default sort column */
  defaultSortColumn?: keyof T;
  /** Default sort direction */
  defaultSortDirection?: "asc" | "desc";
}

export function GenericEditableTable<T extends { id: string | number }>({
  data,
  columns,
  onUpdate,
  onDelete,
  onUpdateSuccess,
  onDeleteSuccess,
  onRowClick,
  className,
  rowActions = [],
  enableRowSelection = false,
  onSelectionChange,
  enableViewSwitcher = false,
  defaultViewMode = "table",
  enableSorting = true,
  defaultSortColumn,
  defaultSortDirection = "asc",
}: GenericEditableTableProps<T>) {
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editData, setEditData] = useState<Partial<T>>({});
  const [isDeleting, setIsDeleting] = useState<string | number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [sortColumn, setSortColumn] = useState<keyof T | null>(
    defaultSortColumn ?? null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    defaultSortDirection,
  );

  // Get sorted data
  const sortedData = useMemo(() => {
    if (!sortColumn || !enableSorting) return data;

    return [...data].sort((a, b) => {
      const valueA = a[sortColumn];
      const valueB = b[sortColumn];

      // Handle null/undefined
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return sortDirection === "asc" ? 1 : -1;
      if (valueB == null) return sortDirection === "asc" ? -1 : 1;

      // Handle different types
      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }

      if (valueA instanceof Date && valueB instanceof Date) {
        return sortDirection === "asc"
          ? valueA.getTime() - valueB.getTime()
          : valueB.getTime() - valueA.getTime();
      }

      // String comparison
      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();
      return sortDirection === "asc"
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
  }, [data, sortColumn, sortDirection, enableSorting]);

  const handleSort = (columnKey: keyof T) => {
    if (!enableSorting) return;

    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (columnKey: keyof T) => {
    if (!enableSorting) return null;

    const column = columns.find((c) => c.key === columnKey);
    if (column?.sortable === false) return null;

    if (sortColumn !== columnKey) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />;
    }

    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="ml-1 h-3.5 w-3.5" />
    );
  };

  const handleEdit = (row: T) => {
    setEditingId(row.id);
    const editableData: Partial<T> = {};
    columns.forEach((col) => {
      if (col.editable !== false) {
        editableData[col.key] = row[col.key];
      }
    });
    setEditData(editableData);
  };

  const handleSave = async (id: string | number) => {
    if (!onUpdate) return;

    setIsSaving(true);
    try {
      const { error } = await onUpdate(id, editData);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Updated successfully");
        setEditingId(null);
        setEditData({});
        onUpdateSuccess?.();
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = async (id: string | number) => {
    if (!onDelete) return;

    setIsDeleting(id);
    try {
      const { error } = await onDelete(id);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Deleted successfully");
        // Remove from selection if selected
        const newSelection = new Set(selectedIds);
        newSelection.delete(id);
        setSelectedIds(newSelection);
        onSelectionChange?.(Array.from(newSelection));
        onDeleteSuccess?.();
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(sortedData.map((row) => row.id));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string | number, checked: boolean) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedIds(newSelection);
    onSelectionChange?.(Array.from(newSelection));
  };

  const isAllSelected =
    sortedData.length > 0 && selectedIds.size === sortedData.length;
  const isSomeSelected =
    selectedIds.size > 0 && selectedIds.size < sortedData.length;

  const renderEditableCell = (column: EditableColumn<T>) => {
    const commonProps = {
      value: editData[column.key] ?? "",
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setEditData((prev) => ({ ...prev, [column.key]: e.target.value })),
    };

    switch (column.type) {
      case "textarea":
        return (
          <Textarea
            value={String(editData[column.key] ?? "")}
            onChange={commonProps.onChange}
            className="min-h-[60px]"
          />
        );
      case "select":
        return (
          <select
            value={editData[column.key] as string}
            onChange={(e) =>
              setEditData((prev) => ({ ...prev, [column.key]: e.target.value }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-4 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {column.selectOptions?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <Input
            type={column.type || "text"}
            value={String(editData[column.key] ?? "")}
            onChange={commonProps.onChange}
          />
        );
    }
  };

  const renderRowActions = (row: T) => {
    const isEditing = editingId === row.id;
    const isCurrentlyDeleting = isDeleting === row.id;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSave(row.id)}
            disabled={isSaving}
            className="h-8 w-8 p-0"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="text-success" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      );
    }

    const hasActions = onUpdate || onDelete || rowActions.length > 0;
    if (!hasActions) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onUpdate && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(row);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {rowActions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick(row);
              }}
              className={
                action.variant === "destructive" ? "text-destructive" : ""
              }
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          ))}
          {onDelete && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.id);
              }}
              className="text-destructive"
              disabled={isCurrentlyDeleting}
            >
              {isCurrentlyDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderCellValue = (column: EditableColumn<T>, row: T) => {
    const value = row[column.key];
    if (column.render) {
      return column.render(value, row);
    }
    return String(value ?? "-");
  };

  // Card View
  const renderCardView = () => {
    const primaryColumn = columns.find((c) => c.isPrimary) || columns[0];
    const secondaryColumn = columns.find((c) => c.isSecondary) || columns[1];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedData.map((row) => (
          <Card
            key={String(row.id)}
            className={cn(
              "group transition-all cursor-pointer",
              selectedIds.has(row.id) && "ring-2 ring-primary",
            )}
            onClick={() => onRowClick?.(row)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {enableRowSelection && (
                    <Checkbox
                      checked={selectedIds.has(row.id)}
                      onCheckedChange={(checked) => {
                        handleSelectRow(row.id, !!checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Select row"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {renderCellValue(primaryColumn, row)}
                    </h3>
                    {secondaryColumn && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {renderCellValue(secondaryColumn, row)}
                      </p>
                    )}
                    <div className="mt-2 space-y-1">
                      {columns
                        .filter((c) => !c.isPrimary && !c.isSecondary)
                        .slice(0, 3)
                        .map((column) => (
                          <div
                            key={String(column.key)}
                            className="text-xs text-muted-foreground"
                          >
                            <span className="font-medium">
                              {column.header}:
                            </span>{" "}
                            {renderCellValue(column, row)}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  {renderRowActions(row)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // List View
  const renderListView = () => {
    const primaryColumn = columns.find((c) => c.isPrimary) || columns[0];
    const secondaryColumn = columns.find((c) => c.isSecondary) || columns[1];

    return (
      <div className="space-y-2">
        {sortedData.map((row) => (
          <div
            key={String(row.id)}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer",
              selectedIds.has(row.id) && "ring-2 ring-primary",
            )}
            onClick={() => onRowClick?.(row)}
          >
            {enableRowSelection && (
              <Checkbox
                checked={selectedIds.has(row.id)}
                onCheckedChange={(checked) => {
                  handleSelectRow(row.id, !!checked);
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label="Select row"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4">
                <h3 className="font-medium truncate flex-1">
                  {renderCellValue(primaryColumn, row)}
                </h3>
                {secondaryColumn && (
                  <span className="text-sm text-muted-foreground truncate">
                    {renderCellValue(secondaryColumn, row)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                {columns
                  .filter((c) => !c.isPrimary && !c.isSecondary)
                  .slice(0, 4)
                  .map((column) => (
                    <span key={String(column.key)}>
                      <span className="font-medium">{column.header}:</span>{" "}
                      {renderCellValue(column, row)}
                    </span>
                  ))}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              {renderRowActions(row)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Table View
  const renderTableView = () => {
    const hasActions = onUpdate || onDelete || rowActions.length > 0;

    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {enableRowSelection && (
                <TableHead className="w-[50px]">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) {
                          (
                            el as HTMLButtonElement & {
                              indeterminate?: boolean;
                            }
                          ).indeterminate = isSomeSelected;
                        }
                      }}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Select all"
                    />
                  </div>
                </TableHead>
              )}
              {columns.map((column) => {
                const isSortable = enableSorting && column.sortable !== false;
                return (
                  <TableHead
                    key={String(column.key)}
                    className={cn(
                      column.width,
                      isSortable &&
                        "cursor-pointer select-none hover:bg-muted/50",
                    )}
                    onClick={() => isSortable && handleSort(column.key)}
                  >
                    <div className="flex items-center">
                      {column.header}
                      {renderSortIcon(column.key)}
                    </div>
                  </TableHead>
                );
              })}
              {hasActions && (
                <TableHead className="w-[70px] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => {
              const isEditing = editingId === row.id;

              return (
                <TableRow
                  key={String(row.id)}
                  className={cn(
                    "group hover:bg-muted/50 transition-colors",
                    onRowClick && "cursor-pointer",
                    selectedIds.has(row.id) && "bg-muted/30",
                  )}
                  onClick={() => !isEditing && onRowClick?.(row)}
                  data-state={selectedIds.has(row.id) ? "selected" : undefined}
                >
                  {enableRowSelection && (
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={(checked) => {
                            handleSelectRow(row.id, !!checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Select row"
                        />
                      </div>
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {isEditing && column.editable !== false
                        ? renderEditableCell(column)
                        : renderCellValue(column, row)}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell className="text-right">
                      {renderRowActions(row)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {sortedData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.length +
                    (enableRowSelection ? 1 : 0) +
                    (onUpdate || onDelete || rowActions.length > 0 ? 1 : 0)
                  }
                  className="h-24 text-center text-muted-foreground"
                >
                  No data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {enableRowSelection && selectedIds.size > 0 && (
          <div className="text-sm text-muted-foreground">
            {selectedIds.size} of {sortedData.length} row(s) selected
          </div>
        )}
        {!enableRowSelection || selectedIds.size === 0 ? <div /> : null}

        {enableViewSwitcher && (
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList>
              <TabsTrigger value="table" className="gap-2">
                <Table2 className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </TabsTrigger>
              <TabsTrigger value="card" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Card</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Content based on view mode */}
      {viewMode === "table" && renderTableView()}
      {viewMode === "card" && renderCardView()}
      {viewMode === "list" && renderListView()}
    </div>
  );
}
