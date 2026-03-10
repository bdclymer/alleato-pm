"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProjects } from "@/hooks/use-projects";
import {
  useUnifiedTableState,
  type FilterValue,
  type DetailFieldConfig,
  type FilterConfig,
  type TableColumn,
} from "@/components/tables/unified";
import type { Meeting } from "@/lib/validation/meetings";
import {
  buildMeetingDetailFields,
  buildMeetingFilters,
  buildMeetingTableColumns,
  meetingDefaultVisibleColumns,
  type EditableField,
  type EditContext,
} from "@/features/meetings/meetings-table-config";

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_FILTERS: Record<string, FilterValue> = {
  year: undefined,
  type: undefined,
  category: undefined,
};

const EDITABLE_FIELD_ORDER: EditableField[] = [
  "title",
  "date",
  "project",
  "type",
  "category",
];

type FilterState = Record<string, FilterValue>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMeetingYear(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getFullYear().toString();
}

function uniqueSorted(values: string[]): string[] {
  const unique = Array.from(new Set(values.filter((value) => value.trim() !== "")));
  return unique.sort((a, b) => a.localeCompare(b));
}

function sanitizeMeetingPayload(data: Partial<Meeting>): Partial<Meeting> {
  const allowedKeys: Array<keyof Meeting> = [
    "title",
    "date",
    "project",
    "type",
    "category",
    "description",
    "participants",
    "source",
    "url",
    "summary",
    "fireflies_link",
  ];

  return allowedKeys.reduce<Partial<Meeting>>((acc, key) => {
    if (data[key] !== undefined) {
      acc[key] = data[key];
    }
    return acc;
  }, {});
}

function sortMeetings(
  meetings: Meeting[],
  sortBy: string | null,
  sortDirection: "asc" | "desc",
  getSortValue: (meeting: Meeting, columnId: string) => string | number | null,
): Meeting[] {
  if (!sortBy) return meetings;
  return [...meetings].sort((a, b) => {
    const valueA = getSortValue(a, sortBy);
    const valueB = getSortValue(b, sortBy);

    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return sortDirection === "asc" ? -1 : 1;
    if (valueB == null) return sortDirection === "asc" ? 1 : -1;

    if (typeof valueA === "number" && typeof valueB === "number") {
      return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
    }

    const comparison = String(valueA).localeCompare(String(valueB));
    return sortDirection === "asc" ? comparison : -comparison;
  });
}

// ─── Result type ──────────────────────────────────────────────────────────────

export interface UseMeetingsTableResult {
  tableState: ReturnType<typeof useUnifiedTableState>;
  meetings: Meeting[];
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  pagedMeetings: Meeting[];
  totalItems: number;
  unfilteredTotal: number;
  totalPages: number;
  filters: FilterConfig[];
  activeFilters: FilterState;
  detailFields: DetailFieldConfig[];
  selectedMeeting: Meeting | null;
  editingMeeting: Meeting | null;
  detailPanelOpen: boolean;
  tableColumns: TableColumn<Meeting>[];
  activeMeetingId: string | null;
  isFiltered: boolean;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  meetingToDelete: Meeting | null;
  setMeetingToDelete: React.Dispatch<React.SetStateAction<Meeting | null>>;
  handleFilterChange: (nextFilters: FilterState) => void;
  handleRowClick: (meeting: Meeting) => void;
  handleOpenMeetingPage: (meeting: Meeting) => void;
  handleEdit: (meeting: Meeting) => void;
  handleTableKeyDown: (
    event: React.KeyboardEvent<HTMLDivElement>,
    visibleItems: Meeting[],
  ) => void;
  handlePanelOpenChange: (open: boolean) => void;
  handleSave: (data: Partial<Meeting>) => Promise<void>;
  handleDeleteConfirm: () => Promise<void>;
  handleSelectAll: (checked: boolean) => void;
  handleSelectRow: (id: string, checked: boolean) => void;
  handleOpenSource: (meeting: Meeting) => void;
  handleOpenRecording: (meeting: Meeting) => void;
  handleExport: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMeetingsTable(initialMeetings: Meeting[], projectId?: string): UseMeetingsTableResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [meetings, setMeetings] = React.useState<Meeting[]>(initialMeetings);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [meetingToDelete, setMeetingToDelete] = React.useState<Meeting | null>(null);
  const [editingMeetingId, setEditingMeetingId] = React.useState<string | null>(null);

  // ── Inline editing state ────────────────────────────────────────────────────
  const [editingCell, setEditingCell] = React.useState<{
    meetingId: string;
    field: EditableField;
  } | null>(null);
  const [editingValue, setEditingValue] = React.useState("");

  // ── Table state ─────────────────────────────────────────────────────────────
  const initialYear = searchParams.get("year") ?? "";
  const initialType = searchParams.get("type") ?? "";
  const initialCategory = searchParams.get("category") ?? "";
  const initialFilters: FilterState = {
    year: initialYear || undefined,
    type: initialType || undefined,
    category: initialCategory || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "meetings",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "date",
      sortDirection: "desc",
      filters: initialFilters,
    },
  });

  // Sync filter state from URL (handles browser back/forward navigation)
  React.useEffect(() => {
    const nextYear = searchParams.get("year") ?? "";
    const nextType = searchParams.get("type") ?? "";
    const nextCategory = searchParams.get("category") ?? "";

    tableState.setActiveFilters((prev) => {
      const normalizedYear = nextYear || undefined;
      const normalizedType = nextType || undefined;
      const normalizedCategory = nextCategory || undefined;

      if (
        prev.year === normalizedYear &&
        prev.type === normalizedType &&
        prev.category === normalizedCategory
      ) {
        return prev;
      }

      return {
        year: normalizedYear,
        type: normalizedType,
        category: normalizedCategory,
      };
    });
  }, [searchParams, tableState.setActiveFilters]);

  // One-time migration: hide Type/Category by default and remove deprecated Source.
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const migrationKey = "meetings:visibleColumns:migrate-2026-03-06";
    if (window.localStorage.getItem(migrationKey) === "1") return;

    tableState.setVisibleColumns((prev) => {
      const sanitized = prev.filter(
        (columnId) => columnId !== "source" && columnId !== "type" && columnId !== "category",
      );
      if (sanitized.length > 0) {
        return sanitized;
      }
      return meetingDefaultVisibleColumns;
    });

    window.localStorage.setItem(migrationKey, "1");
  }, [tableState.visibleColumns, tableState.setVisibleColumns]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const activeFilters = tableState.activeFilters as FilterState;
  const searchTerm = tableState.debouncedSearch.toLowerCase();

  const filteredMeetings = meetings.filter((meeting) => {
    const meetingYear = getMeetingYear(meeting.date);
    const matchesYear = !activeFilters.year || meetingYear === activeFilters.year;
    const matchesType = !activeFilters.type || meeting.type === activeFilters.type;
    const matchesCategory =
      !activeFilters.category || meeting.category === activeFilters.category;

    const searchFields = [
      meeting.title ?? "",
      meeting.project ?? "",
      meeting.participants ?? "",
      meeting.type ?? "",
      meeting.category ?? "",
    ];
    const matchesSearch =
      searchTerm.length === 0 ||
      searchFields.some((field) => field.toLowerCase().includes(searchTerm));

    return matchesYear && matchesType && matchesCategory && matchesSearch;
  });

  // ── Projects for inline select ───────────────────────────────────────────────
  const { projects } = useProjects();
  const projectOptions = projects.map((project) => ({
    value: project.name || "",
    label: project.name || "Unnamed Project",
  }));

  // ── Inline edit handlers ─────────────────────────────────────────────────────
  const getInitialFieldValue = React.useCallback((meeting: Meeting, field: EditableField): string => {
    let initialValue = "";
    if (field === "date" && meeting.date) {
      // Format as YYYY-MM-DD for <input type="date">
      const d = new Date(meeting.date);
      if (!Number.isNaN(d.getTime())) {
        initialValue = d.toISOString().split("T")[0];
      }
    } else {
      initialValue = (meeting[field as keyof Meeting] as string | null) ?? "";
    }
    return initialValue;
  }, []);

  const handleCellClick = (meeting: Meeting, field: EditableField) => {
    const initialValue = getInitialFieldValue(meeting, field);
    setEditingCell({ meetingId: meeting.id, field });
    setEditingValue(initialValue);
  };

  const handleInlineSave = async (options?: {
    valueOverride?: string;
    move?: "next" | "prev";
  }) => {
    if (!editingCell) return;
    const { meetingId, field } = editingCell;

    let saveValue: string | null =
      options?.valueOverride !== undefined ? options.valueOverride : editingValue;
    if (!saveValue) saveValue = null;

    // Convert YYYY-MM-DD to full ISO string for date fields
    if (field === "date" && saveValue) {
      saveValue = new Date(`${saveValue}T12:00:00`).toISOString();
    }

    // Close editing state immediately so UX feels snappy
    setEditingCell(null);
    setEditingValue("");

    if (options?.move) {
      const currentIndex = EDITABLE_FIELD_ORDER.indexOf(field);
      const nextIndex = options.move === "next" ? currentIndex + 1 : currentIndex - 1;
      const nextField = EDITABLE_FIELD_ORDER[nextIndex];
      if (nextField) {
        const nextMeeting = meetings.find((meeting) => meeting.id === meetingId);
        if (nextMeeting) {
          const nextValue = getInitialFieldValue(nextMeeting, nextField);
          window.requestAnimationFrame(() => {
            setEditingCell({ meetingId, field: nextField });
            setEditingValue(nextValue);
          });
        }
      }
    }

    try {
      const supabase = createClient();
      const { data: updatedMeeting, error } = await supabase
        .from("document_metadata")
        .update({ [field]: saveValue })
        .eq("id", meetingId)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId ? { ...m, ...(updatedMeeting as Partial<Meeting>) } : m,
        ),
      );
      toast.success("Updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update";
      toast.error(message);
    }
  };

  const handleInlineCancel = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  // ── Build edit context and columns ───────────────────────────────────────────
  const editContext: EditContext = {
    editingCell,
    editingValue,
    projectOptions,
    handleCellClick,
    setEditingValue,
    handleInlineSave,
    handleInlineCancel,
  };

  const tableColumns = buildMeetingTableColumns(editContext);

  // ── Sorting and pagination ────────────────────────────────────────────────────
  const sortedMeetings = sortMeetings(
    filteredMeetings,
    tableState.sortBy,
    tableState.sortDirection,
    (meeting, columnId) =>
      tableColumns.find((column) => column.id === columnId)?.sortValue?.(meeting) ?? null,
  );

  const unfilteredTotal = meetings.length;
  const totalItems = sortedMeetings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / tableState.perPage));
  const pageStart = (tableState.page - 1) * tableState.perPage;
  const pageEnd = pageStart + tableState.perPage;
  const pagedMeetings = sortedMeetings.slice(pageStart, pageEnd);

  React.useEffect(() => {
    if (tableState.page > totalPages) {
      tableState.setPage(1);
      tableState.setSearchParams({ page: "1" });
    }
  }, [tableState.page, tableState.setPage, tableState.setSearchParams, totalPages]);

  // ── Filter options derived from raw data ─────────────────────────────────────
  const years = uniqueSorted(
    meetings
      .map((meeting) => getMeetingYear(meeting.date))
      .filter((value): value is string => Boolean(value)),
  ).sort((a, b) => Number(b) - Number(a));

  const types = uniqueSorted(
    meetings.map((meeting) => meeting.type ?? "").filter((value) => value !== ""),
  );

  const categories = uniqueSorted(
    meetings.map((meeting) => meeting.category ?? "").filter((value) => value !== ""),
  );

  const filters = buildMeetingFilters({ years, types, categories });

  const detailFields = buildMeetingDetailFields({ projectOptions });

  // ── Detail panel ──────────────────────────────────────────────────────────────
  const detailParam = tableState.detailParam;
  const selectedMeeting = detailParam
    ? meetings.find((meeting) => meeting.id === detailParam) || null
    : null;
  const editingMeeting = editingMeetingId
    ? meetings.find((meeting) => meeting.id === editingMeetingId) || null
    : null;
  const detailPanelOpen = Boolean(editingMeetingId);
  const activeMeetingId = selectedMeeting?.id ?? pagedMeetings[0]?.id ?? null;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleFilterChange = (nextFilters: FilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      year: typeof nextFilters.year === "string" ? nextFilters.year : null,
      type: typeof nextFilters.type === "string" ? nextFilters.type : null,
      category: typeof nextFilters.category === "string" ? nextFilters.category : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleRowClick = (meeting: Meeting) => {
    tableState.setSearchParams({ detail: meeting.id });
  };

  const handleOpenMeetingPage = (meeting: Meeting) => {
    if (projectId) {
      router.push(`/${projectId}/meetings/${meeting.id}`);
    } else {
      router.push(`/meetings/${meeting.id}`);
    }
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeetingId(meeting.id);
  };

  const handleTableKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    visibleItems: Meeting[],
  ) => {
    if (editingCell) return;

    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName)) {
      return;
    }

    if (visibleItems.length === 0) return;

    const currentIndex = visibleItems.findIndex((meeting) => meeting.id === activeMeetingId);
    const hasSelection = currentIndex >= 0;
    const fallbackIndex = hasSelection ? currentIndex : 0;

    if (event.key === "j") {
      event.preventDefault();
      const nextIndex = hasSelection ? Math.min(visibleItems.length - 1, fallbackIndex + 1) : 0;
      tableState.setSearchParams({ detail: visibleItems[nextIndex].id });
      return;
    }

    if (event.key === "k") {
      event.preventDefault();
      const nextIndex = hasSelection ? Math.max(0, fallbackIndex - 1) : 0;
      tableState.setSearchParams({ detail: visibleItems[nextIndex].id });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const current = visibleItems[fallbackIndex];
      if (current) {
        handleOpenMeetingPage(current);
      }
    }
  };

  const handlePanelOpenChange = (open: boolean) => {
    if (!open) {
      setEditingMeetingId(null);
    }
  };

  const handleSave = async (data: Partial<Meeting>) => {
    if (!editingMeeting) return;

    const payload = sanitizeMeetingPayload(data);
    if (typeof payload.date === "string" && payload.date.length === 10) {
      payload.date = new Date(`${payload.date}T12:00:00`).toISOString();
    }

    try {
      const supabase = createClient();
      const { data: updatedMeeting, error } = await supabase
        .from("document_metadata")
        .update(payload)
        .eq("id", editingMeeting.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      setMeetings((prev) =>
        prev.map((meeting) =>
          meeting.id === editingMeeting.id
            ? { ...meeting, ...(updatedMeeting as Partial<Meeting>) }
            : meeting,
        ),
      );
      toast.success("Meeting updated successfully");
      setEditingMeetingId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update meeting";
      toast.error(message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!meetingToDelete) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("document_metadata")
        .delete()
        .eq("id", meetingToDelete.id);

      if (error) throw new Error(error.message);

      setMeetings((prev) => prev.filter((meeting) => meeting.id !== meetingToDelete.id));
      toast.success("Meeting deleted successfully");
    } catch {
      toast.error("Failed to delete meeting");
    } finally {
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(pagedMeetings.map((meeting) => meeting.id));
    } else {
      tableState.setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds((prev) => [...prev, id]);
    } else {
      tableState.setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const handleOpenSource = (meeting: Meeting) => {
    if (meeting.source) {
      window.open(meeting.source, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenRecording = (meeting: Meeting) => {
    if (meeting.fireflies_link) {
      window.open(meeting.fireflies_link, "_blank", "noopener,noreferrer");
    }
  };

  const handleExport = () => {
    if (sortedMeetings.length === 0) {
      toast.info("No meetings to export");
      return;
    }

    const cols = buildMeetingTableColumns();
    const visibleCols = cols.filter((column) =>
      tableState.visibleColumns.includes(column.id),
    );

    const headers = visibleCols.map((column) => column.label);
    const rows = sortedMeetings.map((meeting) =>
      visibleCols
        .map((column) =>
          column.csvValue ? column.csvValue(meeting) : String(column.render(meeting) ?? ""),
        )
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `meetings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.year) ||
    Boolean(activeFilters.type) ||
    Boolean(activeFilters.category);

  return {
    tableState,
    meetings,
    setMeetings,
    pagedMeetings,
    totalItems,
    unfilteredTotal,
    totalPages,
    filters,
    activeFilters,
    detailFields,
    selectedMeeting,
    editingMeeting,
    detailPanelOpen,
    tableColumns,
    activeMeetingId,
    isFiltered,
    deleteDialogOpen,
    setDeleteDialogOpen,
    meetingToDelete,
    setMeetingToDelete,
    handleFilterChange,
    handleRowClick,
    handleOpenMeetingPage,
    handleEdit,
    handleTableKeyDown,
    handlePanelOpenChange,
    handleSave,
    handleDeleteConfirm,
    handleSelectAll,
    handleSelectRow,
    handleOpenSource,
    handleOpenRecording,
    handleExport,
  };
}

export { EMPTY_FILTERS };
