"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Download,
  Columns3,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { useProjects } from "@/hooks/use-projects";

export type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];

interface MeetingsDataTableProps {
  meetings: Meeting[];
}

const COLUMNS = [
  { id: "title", label: "Title", defaultVisible: true },
  { id: "date", label: "Date", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "source", label: "Source", defaultVisible: true },
  { id: "url", label: "URL", defaultVisible: true },
  { id: "project", label: "Project", defaultVisible: true },
];

const getMeetingYear = (dateString: string | null): string | null => {
  if (!dateString) return null;
  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate.getFullYear().toString();
};

// Generate consistent badge variant for project names
const getProjectVariant = (
  projectName: string,
): "default" | "secondary" | "outline" => {
  const variants: Array<"default" | "secondary" | "outline"> = [
    "default",
    "secondary",
    "outline",
  ];

  // Generate consistent hash from project name
  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
  }

  return variants[Math.abs(hash) % variants.length];
};

export function MeetingsDataTable({
  meetings: initialMeetings,
}: MeetingsDataTableProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState(initialMeetings);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(COLUMNS.filter((col) => col.defaultVisible).map((col) => col.id)),
  );
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editData, setEditData] = useState<Partial<Meeting>>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch projects for dropdown
  const { projects } = useProjects();

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    meetings.forEach((meeting) => {
      const meetingYear = getMeetingYear(meeting.date);
      if (meetingYear) {
        years.add(meetingYear);
      }
    });
    return Array.from(years).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      const matchesSearch =
        meeting.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.project?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.participants
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        meeting.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.category?.toLowerCase().includes(searchTerm.toLowerCase());

      const meetingYear = getMeetingYear(meeting.date);
      const matchesYear = yearFilter === "all" || meetingYear === yearFilter;

      return matchesSearch && matchesYear;
    });
  }, [meetings, searchTerm, yearFilter]);

  const getSortValue = (meeting: Meeting, columnId: string) => {
    switch (columnId) {
      case "title":
        return meeting.title?.toLowerCase() || "";
      case "date":
        return meeting.date ? new Date(meeting.date).getTime() : 0;
      case "type":
        return meeting.type?.toLowerCase() || "";
      case "category":
        return meeting.category?.toLowerCase() || "";
      case "source":
        return meeting.source?.toLowerCase() || "";
      case "url":
        return meeting.url?.toLowerCase() || "";
      case "project":
        return meeting.project?.toLowerCase() || "";
      default:
        return "";
    }
  };

  const sortedMeetings = useMemo(() => {
    if (!sortColumn) return filteredMeetings;

    const sorted = [...filteredMeetings].sort((a, b) => {
      const valueA = getSortValue(a, sortColumn);
      const valueB = getSortValue(b, sortColumn);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }

      return sortDirection === "asc"
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });

    return sorted;
  }, [filteredMeetings, sortColumn, sortDirection]);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnId);
      setSortDirection(columnId === "date" ? "desc" : "asc");
    }
  };

  const renderSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />;
    }

    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="ml-1 h-3.5 w-3.5" />
    );
  };

  const exportToCSV = () => {
    const headers = [
      "Title",
      "Date",
      "Type",
      "Category",
      "Source",
      "URL",
      "Project",
    ];
    const rows = sortedMeetings.map((m) => [
      m.title || "",
      m.date ? format(new Date(m.date), "yyyy-MM-dd") : "",
      m.type || "",
      m.category || "",
      m.source || "",
      m.url || "",
      m.project || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meetings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Exported to CSV");
  };

  const handleRowClick = (meetingId: string) => {
    router.push(`/meetings/${meetingId}`);
  };

  const handleDownload = (e: React.MouseEvent, source: string | null) => {
    e.stopPropagation();
    if (source) {
      window.open(source, "_blank");
    }
  };

  const handleFirefliesLink = (e: React.MouseEvent, link: string | null) => {
    e.stopPropagation();
    if (link) {
      window.open(link, "_blank");
    }
  };

  const startEditingMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setEditData({
      title: meeting.title,
      date: meeting.date,
      type: meeting.type,
      category: meeting.category,
      source: meeting.source,
      url: meeting.url,
      project: meeting.project,
      project_id: meeting.project_id,
      participants: meeting.participants,
      summary: meeting.summary,
    });
  };

  const handleEdit = (e: React.MouseEvent, meeting: Meeting) => {
    e.stopPropagation();
    startEditingMeeting(meeting);
  };

  const handleCellEdit = (meeting: Meeting) => (e: React.MouseEvent) => {
    e.stopPropagation();
    startEditingMeeting(meeting);
  };

  const handleSave = async () => {
    if (!editingMeeting) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("document_metadata")
        .update(editData)
        .eq("id", editingMeeting.id);

      if (error) throw error;

      setMeetings((prev) =>
        prev.map((m) =>
          m.id === editingMeeting.id ? { ...m, ...editData } : m,
        ),
      );
      toast.success("Meeting updated successfully");
      setEditingMeeting(null);
      setEditData({});
    } catch (error) {
      toast.error("Failed to update meeting");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIsDeleting(id);
  };

  const confirmDelete = async () => {
    if (!isDeleting) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("document_metadata")
        .delete()
        .eq("id", isDeleting);

      if (error) throw error;

      setMeetings((prev) => prev.filter((m) => m.id !== isDeleting));
      toast.success("Meeting deleted successfully");
      setIsDeleting(null);
    } catch (error) {
      toast.error("Failed to delete meeting");
      setIsDeleting(null);
    }
  };

  const visibleColumnCount = visibleColumns.size + 1;

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={yearFilter}
            onValueChange={setYearFilter}
            className="w-full sm:w-auto"
          >
            <TabsList variant="line">
              <TabsTrigger value="all" className="flex-shrink-0">
                All
              </TabsTrigger>
              {availableYears.map((year) => (
                <TabsTrigger key={year} value={year} className="flex-shrink-0">
                  {year}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <span className="text-sm text-muted-foreground text-right">
            Total rows: {filteredMeetings.length}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-muted/30 border border-muted/50 text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus-visible:ring-0"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="h-4 w-4 mr-2" />
                Columns
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMNS.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumns.has(column.id)}
                  onCheckedChange={(checked) => {
                    const newColumns = new Set(visibleColumns);
                    if (checked) {
                      newColumns.add(column.id);
                    } else {
                      newColumns.delete(column.id);
                    }
                    setVisibleColumns(newColumns);
                  }}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={exportToCSV} variant="outline">
            <Download />
            Export
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.has("title") && (
                    <TableHead
                      className="w-[300px] cursor-pointer select-none"
                      onClick={() => handleSort("title")}
                    >
                      <div className="flex items-center">
                        Title
                        {renderSortIcon("title")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("date") && (
                    <TableHead
                      className="w-[140px] cursor-pointer select-none"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center">
                        Date
                        {renderSortIcon("date")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("type") && (
                    <TableHead
                      className="w-[120px] cursor-pointer select-none"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center">
                        Type
                        {renderSortIcon("type")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("category") && (
                    <TableHead
                      className="w-[140px] cursor-pointer select-none"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center">
                        Category
                        {renderSortIcon("category")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("source") && (
                    <TableHead
                      className="w-[200px] cursor-pointer select-none"
                      onClick={() => handleSort("source")}
                    >
                      <div className="flex items-center">
                        Source
                        {renderSortIcon("source")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("url") && (
                    <TableHead
                      className="w-[200px] cursor-pointer select-none"
                      onClick={() => handleSort("url")}
                    >
                      <div className="flex items-center">
                        URL
                        {renderSortIcon("url")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("project") && (
                    <TableHead
                      className="w-[150px] cursor-pointer select-none"
                      onClick={() => handleSort("project")}
                    >
                      <div className="flex items-center">
                        Project
                        {renderSortIcon("project")}
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="text-right w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumnCount}
                      className="text-center text-muted-foreground h-32"
                    >
                      No meetings found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedMeetings.map((meeting) => (
                    <TableRow
                      key={meeting.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(meeting.id)}
                    >
                      {visibleColumns.has("title") && (
                        <TableCell className="max-w-[300px]">
                          <div className="font-medium truncate">
                            {meeting.title || "Untitled Meeting"}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.has("date") && (
                        <TableCell
                          className="whitespace-nowrap cursor-text"
                          onClick={handleCellEdit(meeting)}
                        >
                          {meeting.date ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm">
                                {format(new Date(meeting.date), "MMM d, yyyy")}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("type") && (
                        <TableCell
                          className="cursor-text"
                          onClick={handleCellEdit(meeting)}
                        >
                          {meeting.type ? (
                            <Badge variant="secondary" className="font-normal">
                              {meeting.type}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("category") && (
                        <TableCell
                          className="cursor-text"
                          onClick={handleCellEdit(meeting)}
                        >
                          {meeting.category ? (
                            <Badge variant="outline" className="font-normal">
                              {meeting.category}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("source") && (
                        <TableCell
                          className="max-w-[200px] cursor-text"
                          onClick={handleCellEdit(meeting)}
                        >
                          {meeting.source ? (
                            <div
                              className="text-sm text-muted-foreground truncate"
                              title={meeting.source}
                            >
                              {meeting.source}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("url") && (
                        <TableCell
                          className="max-w-[200px] cursor-text"
                          onClick={handleCellEdit(meeting)}
                        >
                          {meeting.url ? (
                            <div
                              className="text-sm text-muted-foreground truncate"
                              title={meeting.url}
                            >
                              {meeting.url}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("project") && (
                        <TableCell
                          className="cursor-text"
                          onClick={handleCellEdit(meeting)}
                        >
                          {meeting.project ? (
                            <Badge
                              variant={getProjectVariant(meeting.project)}
                              className="font-normal truncate max-w-[140px]"
                            >
                              {meeting.project}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {meeting.source && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDownload(e, meeting.source)}
                              title="Download/View Source"
                            >
                              <FileText />
                            </Button>
                          )}
                          {meeting.fireflies_link && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) =>
                                handleFirefliesLink(e, meeting.fireflies_link)
                              }
                              title="View Fireflies Recording"
                            >
                              <ExternalLink />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => handleEdit(e, meeting)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => handleDelete(e, meeting.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {editingMeeting && (
        <Modal
          open={!!editingMeeting}
          onOpenChange={() => setEditingMeeting(null)}
        >
          <ModalContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <ModalHeader>
              <ModalTitle>Edit Meeting</ModalTitle>
              <ModalDescription>
                Make changes to the meeting details below
              </ModalDescription>
            </ModalHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input
                  value={editData.title || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, title: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={
                    editData.date
                      ? new Date(editData.date).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    // Create date at noon local time to avoid timezone issues
                    const localDate = new Date(e.target.value + "T12:00:00");
                    setEditData({ ...editData, date: localDate.toISOString() });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Input
                  value={editData.type || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, type: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Project</Label>
                <Select
                  value={editData.project_id?.toString() || ""}
                  onValueChange={(value) => {
                    const selectedProjectId = Number.parseInt(value, 10);
                    const selectedProject = projects.find(
                      (project) => project.id === selectedProjectId,
                    );

                    setEditData({
                      ...editData,
                      project_id: Number.isNaN(selectedProjectId)
                        ? null
                        : selectedProjectId,
                      project: selectedProject?.name || null,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name || "Unnamed Project"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Participants</Label>
                <Input
                  value={editData.participants || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, participants: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Source</Label>
                <Input
                  value={editData.source || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, source: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>URL</Label>
                <Input
                  value={editData.url || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, url: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Summary</Label>
                <Textarea
                  value={editData.summary || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, summary: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </div>
            <ModalFooter>
              <Button variant="outline" onClick={() => setEditingMeeting(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save changes</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleting && (
        <Modal open={!!isDeleting} onOpenChange={() => setIsDeleting(null)}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Confirm Deletion</ModalTitle>
              <ModalDescription>
                Are you sure you want to delete this meeting? This action cannot
                be undone.
              </ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <Button variant="outline" onClick={() => setIsDeleting(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}
