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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Download,
  Columns3,
  ChevronDown,
  ChevronUp,
  User,
  Mail,
  Phone as PhoneIcon,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
  Building2,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export interface Employee {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  salery: number | null;
  start_date: string | null;
  supervisor: number | null;
  company_card: boolean | null;
  truck_allowance: number | null;
  phone_allowance: number | null;
  created_at: string | null;
  updated_at: string | null;
  job_title: string | null;
  supervisor_name: string | null;
  photo: string | null;
}

interface EmployeesDataTableProps {
  employees: Employee[];
}

const COLUMNS = [
  { id: "name", label: "Name", defaultVisible: true },
  { id: "email", label: "Email", defaultVisible: true },
  { id: "phone", label: "Phone", defaultVisible: true },
  { id: "job_title", label: "Job Title", defaultVisible: true },
  { id: "department", label: "Department", defaultVisible: true },
  { id: "supervisor_name", label: "Supervisor", defaultVisible: true },
  { id: "start_date", label: "Start Date", defaultVisible: false },
];

export function EmployeesDataTable({
  employees: initialEmployees,
}: EmployeesDataTableProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(COLUMNS.filter((col) => col.defaultVisible).map((col) => col.id)),
  );
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const fullName =
        `${employee.first_name || ""} ${employee.last_name || ""}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.supervisor_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [employees, searchTerm]);

  const getSortValue = (employee: Employee, columnId: string) => {
    switch (columnId) {
      case "name":
        return `${employee.first_name || ""} ${employee.last_name || ""}`.toLowerCase();
      case "email":
        return employee.email?.toLowerCase() || "";
      case "phone":
        return employee.phone?.toLowerCase() || "";
      case "job_title":
        return employee.job_title?.toLowerCase() || "";
      case "department":
        return employee.department?.toLowerCase() || "";
      case "supervisor_name":
        return employee.supervisor_name?.toLowerCase() || "";
      case "start_date":
        return employee.start_date
          ? new Date(employee.start_date).getTime()
          : 0;
      default:
        return "";
    }
  };

  const sortedEmployees = useMemo(() => {
    if (!sortColumn) return filteredEmployees;

    const sorted = [...filteredEmployees].sort((a, b) => {
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
  }, [filteredEmployees, sortColumn, sortDirection]);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
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
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Job Title",
      "Department",
      "Supervisor",
      "Start Date",
    ];
    const rows = sortedEmployees.map((e) => [
      e.first_name || "",
      e.last_name || "",
      e.email || "",
      e.phone || "",
      e.job_title || "",
      e.department || "",
      e.supervisor_name || "",
      e.start_date ? format(new Date(e.start_date), "yyyy-MM-dd") : "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Exported to CSV");
  };

  const handleRowClick = (employeeId: number) => {
    // Future: navigate to employee detail page
    };

  const startEditingEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      job_title: employee.job_title,
      department: employee.department,
      start_date: employee.start_date,
    });
  };

  const handleEdit = (e: React.MouseEvent, employee: Employee) => {
    e.stopPropagation();
    startEditingEmployee(employee);
  };

  const handleCellEdit = (employee: Employee) => (e: React.MouseEvent) => {
    e.stopPropagation();
    startEditingEmployee(employee);
  };

  const handleSave = async () => {
    if (!editingEmployee) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("people")
        .update(editData as Record<string, unknown>)
        .eq("id", String(editingEmployee.id));

      if (error) throw error;

      setEmployees((prev) =>
        prev.map((e) =>
          e.id === editingEmployee.id ? { ...e, ...editData } : e,
        ),
      );
      toast.success("Employee updated successfully");
      setEditingEmployee(null);
      setEditData({});
    } catch (error) {
      toast.error("Failed to update employee");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setIsDeleting(id);
  };

  const confirmDelete = async () => {
    if (!isDeleting) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("people")
        .delete()
        .eq("id", String(isDeleting));

      if (error) throw error;

      setEmployees((prev) => prev.filter((e) => e.id !== isDeleting));
      toast.success("Employee deleted successfully");
      setIsDeleting(null);
    } catch (error) {
      toast.error("Failed to delete employee");
      setIsDeleting(null);
    }
  };

  const getInitials = (employee: Employee) => {
    const first = employee.first_name?.[0] || "";
    const last = employee.last_name?.[0] || "";
    return (first + last).toUpperCase() || "NA";
  };

  const visibleColumnCount = visibleColumns.size + 1;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Total employees: {filteredEmployees.length}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
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
                <ChevronDown className="h-4 w-4 ml-2" />
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
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.has("name") && (
                    <TableHead
                      className="w-[250px] cursor-pointer select-none"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Name
                        {renderSortIcon("name")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("email") && (
                    <TableHead
                      className="w-[200px] cursor-pointer select-none"
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center">
                        Email
                        {renderSortIcon("email")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("phone") && (
                    <TableHead
                      className="w-[140px] cursor-pointer select-none"
                      onClick={() => handleSort("phone")}
                    >
                      <div className="flex items-center">
                        Phone
                        {renderSortIcon("phone")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("job_title") && (
                    <TableHead
                      className="w-[160px] cursor-pointer select-none"
                      onClick={() => handleSort("job_title")}
                    >
                      <div className="flex items-center">
                        Job Title
                        {renderSortIcon("job_title")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("department") && (
                    <TableHead
                      className="w-[140px] cursor-pointer select-none"
                      onClick={() => handleSort("department")}
                    >
                      <div className="flex items-center">
                        Department
                        {renderSortIcon("department")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("supervisor_name") && (
                    <TableHead
                      className="w-[150px] cursor-pointer select-none"
                      onClick={() => handleSort("supervisor_name")}
                    >
                      <div className="flex items-center">
                        Supervisor
                        {renderSortIcon("supervisor_name")}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("start_date") && (
                    <TableHead
                      className="w-[140px] cursor-pointer select-none"
                      onClick={() => handleSort("start_date")}
                    >
                      <div className="flex items-center">
                        Start Date
                        {renderSortIcon("start_date")}
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumnCount}
                      className="text-center text-muted-foreground h-32"
                    >
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEmployees.map((employee) => (
                    <TableRow
                      key={employee.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(employee.id)}
                    >
                      {visibleColumns.has("name") && (
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={employee.photo || undefined}
                                alt={`${employee.first_name} ${employee.last_name}`}
                              />
                              <AvatarFallback>
                                {getInitials(employee)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-medium">
                              {employee.first_name} {employee.last_name}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.has("email") && (
                        <TableCell
                          className="cursor-text"
                          onClick={handleCellEdit(employee)}
                        >
                          {employee.email ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{employee.email}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("phone") && (
                        <TableCell
                          className="cursor-text"
                          onClick={handleCellEdit(employee)}
                        >
                          {employee.phone ? (
                            <div className="flex items-center gap-2 text-sm">
                              <PhoneIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span>{employee.phone}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("job_title") && (
                        <TableCell
                          className="cursor-text"
                          onClick={handleCellEdit(employee)}
                        >
                          {employee.job_title ? (
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <Badge
                                variant="secondary"
                                className="font-normal"
                              >
                                {employee.job_title}
                              </Badge>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("department") && (
                        <TableCell
                          className="cursor-text"
                          onClick={handleCellEdit(employee)}
                        >
                          {employee.department ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <Badge variant="outline" className="font-normal">
                                {employee.department}
                              </Badge>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("supervisor_name") && (
                        <TableCell
                          className="cursor-text"
                          onClick={handleCellEdit(employee)}
                        >
                          {employee.supervisor_name || "-"}
                        </TableCell>
                      )}
                      {visibleColumns.has("start_date") && (
                        <TableCell
                          className="whitespace-nowrap cursor-text"
                          onClick={handleCellEdit(employee)}
                        >
                          {employee.start_date ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm">
                                {format(
                                  new Date(employee.start_date),
                                  "MMM d, yyyy",
                                )}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => handleEdit(e, employee)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(e, employee.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
      {editingEmployee && (
        <Dialog
          open={!!editingEmployee}
          onOpenChange={() => setEditingEmployee(null)}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>
                Make changes to the employee details below
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>First Name</Label>
                  <Input
                    value={String(editData.first_name || "")}
                    onChange={(e) =>
                      setEditData({ ...editData, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Last Name</Label>
                  <Input
                    value={String(editData.last_name || "")}
                    onChange={(e) =>
                      setEditData({ ...editData, last_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={String(editData.email || "")}
                  onChange={(e) =>
                    setEditData({ ...editData, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={String(editData.phone || "")}
                  onChange={(e) =>
                    setEditData({ ...editData, phone: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Job Title</Label>
                <Input
                  value={String(editData.job_title || "")}
                  onChange={(e) =>
                    setEditData({ ...editData, job_title: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Department</Label>
                <Input
                  value={String(editData.department || "")}
                  onChange={(e) =>
                    setEditData({ ...editData, department: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={
                    editData.start_date && typeof editData.start_date === 'string'
                      ? new Date(editData.start_date)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const localDate = new Date(e.target.value + "T12:00:00");
                    setEditData({
                      ...editData,
                      start_date: localDate.toISOString(),
                    });
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingEmployee(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleting && (
        <Dialog open={!!isDeleting} onOpenChange={() => setIsDeleting(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this employee? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleting(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
