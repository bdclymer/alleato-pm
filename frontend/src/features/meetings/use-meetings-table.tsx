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
} from "@/features/meetings/meetings-table-config";

const EMPTY_FILTERS: Record<string, FilterValue> = {
  year: undefined,
  type: undefined,
  category: undefined,
};

type FilterState = Record<string, FilterValue>;

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

function sortMeetings(
  meetings: Meeting[],
  sortBy: string | null,
  sortDirection: "asc" | "desc",
  getSortValue: (meeting: Meeting, columnId: string) => string | number | null,
): Meeting[] {
  if (!sortBy) return meetings;
  const sorted = [...meetings].sort((a, b) => {
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

  return sorted;
}

export interface UseMeetingsTableResult {
  tableState: ReturnType<typeof useUnifiedTableState>;
  meetings: Meeting[];
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  pagedMeetings: Meeting[];
  totalItems: number;
  totalPages: number;
  filters: FilterConfig[];
  activeFilters: FilterState;
  detailFields: DetailFieldConfig[];
  selectedMeeting: Meeting | null;
  tableColumns: TableColumn<Meeting>[];
  isFiltered: boolean;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  meetingToDelete: Meeting | null;
  setMeetingToDelete: React.Dispatch<React.SetStateAction<Meeting | null>>;
  handleFilterChange: (nextFilters: FilterState) => void;
  handleRowClick: (meeting: Meeting) => void;
  handleEdit: (meeting: Meeting) => void;
  handlePanelOpenChange: (open: boolean) => void;
  handleSave: (data: Partial<Meeting>) => Promise<void>;
  handleDeleteConfirm: () => Promise<void>;
  handleSelectAll: (checked: boolean) => void;
  handleSelectRow: (id: string, checked: boolean) => void;
  handleOpenSource: (meeting: Meeting) => void;
  handleOpenRecording: (meeting: Meeting) => void;
  handleExport: () => void;
}

export function useMeetingsTable(initialMeetings: Meeting[]): UseMeetingsTableResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [meetings, setMeetings] = React.useState<Meeting[]>(initialMeetings);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [meetingToDelete, setMeetingToDelete] = React.useState<Meeting | null>(null);

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

  React.useEffect(() => {
    if (tableState.visibleColumns.length === 0) {
      tableState.setVisibleColumns(meetingDefaultVisibleColumns);
    }
  }, [tableState.visibleColumns.length, tableState.setVisibleColumns]);

  const activeFilters = tableState.activeFilters as FilterState;
  const searchTerm = tableState.debouncedSearch.toLowerCase();
  const tableColumns = buildMeetingTableColumns();

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

  const sortedMeetings = sortMeetings(
    filteredMeetings,
    tableState.sortBy,
    tableState.sortDirection,
    (meeting, columnId) =>
      tableColumns.find((column) => column.id === columnId)?.sortValue?.(meeting) ??
      null,
  );

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

  const years = uniqueSorted(
    meetings
      .map((meeting) => getMeetingYear(meeting.date))
      .filter((value): value is string => Boolean(value)),
  ).sort((a, b) => Number(b) - Number(a));

  const types = uniqueSorted(
    meetings
      .map((meeting) => meeting.type ?? "")
      .filter((value) => value !== ""),
  );

  const categories = uniqueSorted(
    meetings
      .map((meeting) => meeting.category ?? "")
      .filter((value) => value !== ""),
  );

  const filters = buildMeetingFilters({
    years,
    types,
    categories,
  });

  const { projects } = useProjects();
  const projectOptions = projects.map((project) => ({
    value: project.name || "",
    label: project.name || "Unnamed Project",
  }));

  const detailFields = buildMeetingDetailFields({ projectOptions });

  const detailParam = tableState.detailParam;
  const selectedMeeting = detailParam
    ? meetings.find((meeting) => meeting.id === detailParam) || null
    : null;

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
    router.push(`/meetings/${meeting.id}`);
  };

  const handleEdit = (meeting: Meeting) => {
    tableState.setSearchParams({ detail: meeting.id });
  };

  const handlePanelOpenChange = (open: boolean) => {
    if (!open) {
      tableState.setSearchParams({ detail: null });
    }
  };

  const handleSave = async (data: Partial<Meeting>) => {
    if (!selectedMeeting) return;

    const payload: Partial<Meeting> = { ...data };
    if (typeof payload.date === "string" && payload.date.length === 10) {
      payload.date = new Date(`${payload.date}T12:00:00`).toISOString();
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("document_metadata")
        .update(payload)
        .eq("id", selectedMeeting.id);

      if (error) {
        throw new Error(error.message);
      }

      setMeetings((prev) =>
        prev.map((meeting) =>
          meeting.id === selectedMeeting.id ? { ...meeting, ...payload } : meeting,
        ),
      );
      toast.success("Meeting updated successfully");
      tableState.setSearchParams({ detail: null });
    } catch (err) {
      toast.error("Failed to update meeting");
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

      if (error) {
        throw new Error(error.message);
      }

      setMeetings((prev) => prev.filter((meeting) => meeting.id !== meetingToDelete.id));
      toast.success("Meeting deleted successfully");
    } catch (err) {
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

    const tableColumns = buildMeetingTableColumns();
    const visibleColumns = tableColumns.filter((column) =>
      tableState.visibleColumns.includes(column.id),
    );

    const headers = visibleColumns.map((column) => column.label);
    const rows = sortedMeetings.map((meeting) =>
      visibleColumns
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
    totalPages,
    filters,
    activeFilters,
    detailFields,
    selectedMeeting,
    tableColumns,
    isFiltered,
    deleteDialogOpen,
    setDeleteDialogOpen,
    meetingToDelete,
    setMeetingToDelete,
    handleFilterChange,
    handleRowClick,
    handleEdit,
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
