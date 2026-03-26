"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  Search,
  MoreHorizontal,
  UserPlus,
  Mail,
  UserX,
  Edit,
  Building2,
  Phone,
  MapPin,
  Filter,
  Download,
  Upload,
  Settings2,
} from "lucide-react";
import {
  DirectoryFilters,
  type PersonWithDetails,
} from "@/components/directory/DirectoryFilters";
import {
  ColumnManager,
  type ColumnConfig,
} from "@/components/directory/ColumnManager";
import { useDirectory } from "@/hooks/useDirectory";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImportDialog } from "@/components/directory/ImportDialog";
import { ExportDialog } from "@/components/directory/ExportDialog";
import { BulkActionDialog } from "@/components/directory/BulkActionDialog";
import { useDirectoryPreferences } from "@/hooks/useDirectoryPreferences";
import { useDirectoryRealtime } from "@/hooks/useDirectoryRealtime";
import { toast } from "@/hooks/use-toast";

interface DirectoryTableProps {
  projectId: string;
  type: "users" | "contacts" | "companies" | "groups";
  status?: "active" | "inactive";
  defaultGroupBy?: "company" | "none";
  onInvite?: (person: PersonWithDetails) => void;
  onEdit?: (person: PersonWithDetails) => void;
  onDeactivate?: (person: PersonWithDetails) => void;
  onReactivate?: (person: PersonWithDetails) => void;
}

const defaultColumns: ColumnConfig[] = [
  { id: "select", label: "", visible: true, order: 0, width: "40px" },
  { id: "name", label: "Name", visible: true, order: 1 },
  { id: "email", label: "Email", visible: true, order: 2 },
  { id: "phone", label: "Phone", visible: true, order: 3 },
  { id: "job_title", label: "Job Title", visible: true, order: 4 },
  { id: "company", label: "Company", visible: true, order: 5 },
  { id: "permission_template", label: "Permission", visible: true, order: 6 },
  { id: "invite_status", label: "Status", visible: true, order: 7 },
  { id: "actions", label: "", visible: true, order: 8, width: "80px" },
];

/**
 * Render a configurable directory table for users, contacts, companies, or groups.
 *
 * Supports searching, filtering, grouping by company, column customization, row selection,
 * bulk actions, and per-row actions (invite, edit, deactivate, reactivate) via callbacks.
 *
 * @param projectId - The project identifier used to fetch directory data.
 * @param type - The directory type to display: 'users', 'contacts', 'companies', or 'groups'.
 * @param status - Filter by membership status; defaults to 'active'.
 * @param defaultGroupBy - Initial grouping mode, either 'company' or 'none'; defaults to 'company'.
 * @param onInvite - Optional callback invoked with a person when sending or resending an invite.
 * @param onEdit - Optional callback invoked with a person when the Edit action is selected.
 * @param onDeactivate - Optional callback invoked with a person when Deactivate is selected.
 * @param onReactivate - Optional callback invoked with a person when Reactivate is selected.
 * @returns The rendered directory table React element.
 */
export function DirectoryTable({
  projectId,
  type,
  status = "active",
  defaultGroupBy = "company",
  onInvite,
  onEdit,
  onDeactivate,
  onReactivate,
}: DirectoryTableProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [columns, setColumns] = useState(defaultColumns);
  const [filters, setFilters] = useState<DirectoryFilters>({
    type: type === "users" ? "user" : type === "contacts" ? "contact" : "all",
    status,
    groupBy: defaultGroupBy,
  });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [columnsInitialized, setColumnsInitialized] = useState(false);

  const {
    savedFilters,
    saveFilter,
    deleteFilter,
    persistPreferences,
    lastFilters,
    columnPreferences,
    loading: preferencesLoading,
  } = useDirectoryPreferences(projectId);

  const {
    data,
    groups,
    loading,
    error,
    meta,
    refetch,
    updateFilters,
  } = useDirectory(
    projectId,
    {
      ...filters,
      search,
    },
  );

  // Sort columns by order
  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.order - b.order);
  }, [columns]);

  const handleSaveFilter = useCallback(
    (filtersToSave: DirectoryFilters, savedSearch?: string) => {
      const name = window.prompt("Name this filter");
      if (!name) return;
      void saveFilter({
        name,
        filters: filtersToSave,
        search: savedSearch,
      });
    },
    [saveFilter],
  );

  const handleApplySavedFilter = useCallback(
    (saved: DirectoryFilters, savedSearch?: string) => {
      setFilters(saved);
      updateFilters(saved);
      if (typeof savedSearch === "string") {
        setSearch(savedSearch);
      }
    },
    [updateFilters],
  );

  const handleDeleteSavedFilter = useCallback(
    (filterId: string) => {
      void deleteFilter(filterId);
    },
    [deleteFilter],
  );

  useEffect(() => {
    if (!filtersInitialized && lastFilters) {
      setFilters(lastFilters);
      updateFilters(lastFilters);
      setFiltersInitialized(true);
    } else if (!filtersInitialized && !lastFilters) {
      setFiltersInitialized(true);
    }
  }, [lastFilters, filtersInitialized, updateFilters]);

  useEffect(() => {
    if (!columnsInitialized && columnPreferences) {
      setColumns(columnPreferences);
      setColumnsInitialized(true);
    }
  }, [columnPreferences, columnsInitialized]);

  useEffect(() => {
    if (!filtersInitialized) return;
    const timeout = setTimeout(() => {
      persistPreferences({ lastFilters: filters });
    }, 800);
    return () => clearTimeout(timeout);
  }, [filters, persistPreferences, filtersInitialized]);

  useEffect(() => {
    if (!columnsInitialized) return;
    const timeout = setTimeout(() => {
      persistPreferences({ columnPreferences: columns });
    }, 800);
    return () => clearTimeout(timeout);
  }, [columns, persistPreferences, columnsInitialized]);

  useDirectoryRealtime(projectId, (eventType) => {
    const message =
      eventType === "INSERT"
        ? "A new person was added to the directory."
        : eventType === "DELETE"
          ? "A person was removed from the directory."
          : "Directory entry updated.";
    toast.info("Directory Updated", { description: message });
    void refetch();
  });

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Toggle all groups
  const toggleAllGroups = () => {
    if (groups) {
      if (expandedGroups.size === groups.length) {
        setExpandedGroups(new Set());
      } else {
        setExpandedGroups(new Set(groups.map((g) => g.key)));
      }
    }
  };

  // Selection handling
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((p) => p.id)));
    }
  };

  // Get initials for avatar
  const getInitials = (person: PersonWithDetails) => {
    return `${person.first_name?.[0] || ""}${person.last_name?.[0] || ""}`.toUpperCase();
  };

  // Render person row
  const renderPersonRow = (person: PersonWithDetails) => {
    const avatarVersion = person.avatar_updated_at
      ? `&v=${encodeURIComponent(person.avatar_updated_at)}`
      : "";
    const avatarSrc = `/api/avatar/${person.id}?projectId=${projectId}${avatarVersion}`;
    const visibleColumns = sortedColumns.filter((c) => c.visible);

    return (
      <TableRow key={person.id} className="hover:bg-muted/50">
        {visibleColumns.map((column) => {
          switch (column.id) {
            case "select":
              return (
                <TableCell key={column.id} style={{ width: column.width }}>
                  <Checkbox
                    checked={selectedIds.has(person.id)}
                    onCheckedChange={() => toggleSelection(person.id)}
                  />
                </TableCell>
              );

            case "name":
              return (
                <TableCell key={column.id}>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarSrc} />
                      <AvatarFallback>{getInitials(person)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {person.first_name} {person.last_name}
                      </div>
                      {person.person_type === "user" && (
                        <div className="text-xs text-muted-foreground">
                          User
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
              );

            case "email":
              return (
                <TableCell key={column.id}>
                  {person.email && (
                    <a
                      href={`mailto:${person.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {person.email}
                    </a>
                  )}
                </TableCell>
              );

            case "phone":
              return (
                <TableCell key={column.id}>
                  {person.phone_mobile || person.phone_business}
                </TableCell>
              );

            case "job_title":
              return <TableCell key={column.id}>{person.job_title}</TableCell>;

            case "company":
              return (
                <TableCell key={column.id}>{person.company?.name}</TableCell>
              );

            case "permission_template":
              return (
                <TableCell key={column.id}>
                  {person.permission_template?.name && (
                    <Badge variant="secondary">
                      {person.permission_template.name}
                    </Badge>
                  )}
                </TableCell>
              );

            case "invite_status":
              return (
                <TableCell key={column.id}>
                  {person.membership?.invite_status && (
                    <Badge
                      variant={
                        person.membership.invite_status === "accepted"
                          ? "default"
                          : person.membership.invite_status === "invited"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {person.membership.invite_status}
                    </Badge>
                  )}
                </TableCell>
              );

            case "actions":
              return (
                <TableCell key={column.id} style={{ width: column.width }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(person)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}

                      {person.person_type === "user" &&
                        person.membership?.invite_status !== "accepted" &&
                        onInvite && (
                          <DropdownMenuItem onClick={() => onInvite(person)}>
                            <Mail className="mr-2 h-4 w-4" />
                            {person.membership?.invite_status === "invited"
                              ? "Resend Invite"
                              : "Send Invite"}
                          </DropdownMenuItem>
                        )}

                      <DropdownMenuSeparator />

                      {status === "active" && onDeactivate && (
                        <DropdownMenuItem
                          onClick={() => onDeactivate(person)}
                          className="text-destructive"
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      )}

                      {status === "inactive" && onReactivate && (
                        <DropdownMenuItem onClick={() => onReactivate(person)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Reactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              );

            default:
              return null;
          }
        })}
      </TableRow>
    );
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        Error: {error.message}
      </div>
    );
  }

  const visibleColumns = sortedColumns.filter((c) => c.visible);

  return (
    <div className="space-y-4">
      {/* Search and Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-accent")}
          >
            <Filter />
            Filters
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            title="Import CSV"
            onClick={() => setIsImportOpen(true)}
          >
            <Upload />
          </Button>

          <Button
            variant="outline"
            size="icon"
            title="Export CSV"
            onClick={() => setIsExportOpen(true)}
          >
            <Download />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowColumnManager(true)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>

          {type === "users" && (
            <Button>
              <UserPlus />
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <DirectoryFilters
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            updateFilters(newFilters);
          }}
          projectId={projectId}
          search={search}
          savedFilters={savedFilters}
          savedFiltersLoading={preferencesLoading}
          onSaveFilter={handleSaveFilter}
          onDeleteSavedFilter={handleDeleteSavedFilter}
          onSavedFilterSelected={handleApplySavedFilter}
        />
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 rounded-md border bg-muted/50 p-2">
          <span className="text-sm">
            {selectedIds.size} {selectedIds.size === 1 ? "item" : "items"}{" "}
            selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkOpen(true)}
          >
            <Filter />
            Open Bulk Actions
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {filters.groupBy === "company" && (
                <TableHead colSpan={visibleColumns.length}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllGroups}
                    className="h-8 px-2"
                  >
                    {expandedGroups.size === groups?.length ? (
                      <ChevronDown />
                    ) : (
                      <ChevronRight />
                    )}
                    <span className="ml-2">All Companies</span>
                  </Button>
                </TableHead>
              )}
              {filters.groupBy === "none" &&
                visibleColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    style={{ width: column.width }}
                    className={column.id === "select" ? "w-12" : ""}
                  >
                    {column.id === "select" ? (
                      <Checkbox
                        checked={
                          selectedIds.size === data.length && data.length > 0
                        }
                        onCheckedChange={selectAll}
                      />
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filters.groupBy === "company" && groups
              ? // Grouped view
                groups.map((group) => (
                  <React.Fragment key={group.key}>
                    <TableRow
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleGroup(group.key)}
                    >
                      <TableCell colSpan={visibleColumns.length}>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            {expandedGroups.has(group.key) ? (
                              <ChevronDown />
                            ) : (
                              <ChevronRight />
                            )}
                          </Button>
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{group.label}</span>
                          <Badge variant="secondary" className="ml-auto">
                            {group.items.length}{" "}
                            {group.items.length === 1 ? "person" : "people"}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedGroups.has(group.key) && (
                      <>
                        {/* Sub-header */}
                        <TableRow className="bg-muted/30">
                          {visibleColumns.map((column) => (
                            <TableHead
                              key={column.id}
                              style={{ width: column.width }}
                              className="h-8 text-xs"
                            >
                              {column.id === "select" ? (
                                <Checkbox
                                  checked={group.items.every((p) =>
                                    selectedIds.has(p.id),
                                  )}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedIds((prev) => {
                                        const next = new Set(prev);
                                        group.items.forEach((p) =>
                                          next.add(p.id),
                                        );
                                        return next;
                                      });
                                    } else {
                                      setSelectedIds((prev) => {
                                        const next = new Set(prev);
                                        group.items.forEach((p) =>
                                          next.delete(p.id),
                                        );
                                        return next;
                                      });
                                    }
                                  }}
                                />
                              ) : (
                                column.label
                              )}
                            </TableHead>
                          ))}
                        </TableRow>

                        {/* Group items */}
                        {group.items.map((person) => renderPersonRow(person))}
                      </>
                    )}
                  </React.Fragment>
                ))
              : // Flat view
                data.map((person) => renderPersonRow(person))}

            {data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="text-center py-8"
                >
                  No {type} found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Column Manager Modal */}
      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onColumnsChange={setColumns}
          onClose={() => setShowColumnManager(false)}
        />
      )}

      <ImportDialog
        projectId={projectId}
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onComplete={() => {
          void refetch();
        }}
      />

      <ExportDialog
        projectId={projectId}
        filters={filters}
        columns={columns}
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
      />

      <BulkActionDialog
        projectId={projectId}
        personIds={Array.from(selectedIds)}
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        onComplete={() => {
          setSelectedIds(new Set());
          void refetch();
        }}
      />
    </div>
  );
}
