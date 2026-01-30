"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUsers } from "@/hooks/use-users";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "project_manager" | "superintendent" | "foreman" | "viewer";
  company: string;
  status: "active" | "inactive";
  lastLogin: string | null;
}

export default function UserDirectoryPage() {
  // Fetch users from Supabase
  const { users: dbUsers, isLoading, error } = useUsers();

  // Transform database users to the format expected by the table
  const data: User[] = React.useMemo(() => {
    return dbUsers.map((user) => {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
      return {
        id: user.id,
        name: fullName || user.email || "Unknown",
        email: user.email || "",
        phone: user.phone_business || user.phone_mobile || "",
        role: "viewer" as User["role"],
        company: "",
        status: (user.status === "active" ? "active" : "inactive") as User["status"],
        lastLogin: user.created_at,
      };
    });
  }, [dbUsers]);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        const initials = name
          .split(" ")
          .map((n) => n[0])
          .join("");
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="font-medium text-[hsl(var(--procore-orange))] hover:underline"
            >
              {name}
            </button>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm text-foreground">
          <Mail className="h-3 w-3" />
          {row.getValue("email")}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm text-foreground">
          <Phone className="h-3 w-3" />
          {row.getValue("phone")}
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        const roleColors: Record<string, string> = {
          admin: "bg-red-100 text-red-700",
          project_manager: "bg-blue-100 text-blue-700",
          superintendent: "bg-green-100 text-green-700",
          foreman: "bg-yellow-100 text-yellow-700",
          viewer: "bg-muted text-foreground",
        };
        return (
          <Badge className={roleColors[role] || "bg-muted text-foreground"}>
            {role.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "company",
      header: "Company",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            className={
              status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-muted text-foreground"
            }
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "lastLogin",
      header: "Last Login",
      cell: ({ row }) => {
        const date = row.getValue("lastLogin") as string | null;
        if (!date) return "-";
        const loginDate = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - loginDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return loginDate.toLocaleDateString();
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full p-6 items-center justify-center">
        <p className="text-sm text-red-500">
          Error loading users: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage project users and permissions
          </p>
        </div>
        <Button className="bg-[hsl(var(--procore-orange))] hover:bg-[hsl(var(--procore-orange))]/90">
          <Plus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Users</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Active</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((u) => u.status === "active").length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Admins</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((u) => u.role === "admin").length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Project Managers
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((u) => u.role === "project_manager").length}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {data.length === 0 && (
        <div className="flex-1 bg-background rounded-lg border flex flex-col items-center justify-center p-8">
          <p className="text-muted-foreground mb-4">No users found</p>
          <Button className="bg-[hsl(var(--procore-orange))] hover:bg-[hsl(var(--procore-orange))]/90">
            <Plus className="h-4 w-4 mr-2" />
            Invite First User
          </Button>
        </div>
      )}

      {/* Table */}
      {data.length > 0 && (
        <div className="flex-1 bg-background rounded-lg border overflow-hidden">
          <DataTable
            columns={columns}
            data={data}
            searchKey="name"
            searchPlaceholder="Search users..."
          />
        </div>
      )}
    </div>
  );
}
