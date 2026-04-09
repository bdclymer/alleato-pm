"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Mail,
  Phone,
  MoreHorizontal,
  Eye,
  UserX,
  RefreshCw,
  Shield,
  UserPlus,
  Users,
  Edit,
} from "lucide-react";
import { useProjectUsers } from "@/hooks/use-project-users";

import { PageShell } from "@/components/layout";
import { Text } from "@/components/ds/text";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { MetricCard } from "@/components/ds/metric-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDirectoryTabs } from "@/config/directory-tabs";
import { UserFormDialog } from "@/components/domain/users/UserFormDialog";
import { UserDetailSheet } from "@/components/domain/users/UserDetailSheet";
import { BulkAddUsersDialog } from "@/components/domain/users/BulkAddUsersDialog";
import { UserPermissionsManager } from "@/components/domain/users/UserPermissionsManager";
import type { PersonWithDetails } from "@/services/directoryService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/use-projects";

export default function DirectoryUsersPage() {
  const pathname = usePathname();
  const { projects, isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = React.useState("");

  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "active" | "inactive"
  >("all");
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] =
    React.useState<PersonWithDetails | null>(null);
  const [editingUser, setEditingUser] =
    React.useState<PersonWithDetails | null>(null);
  const [permissionsUserId, setPermissionsUserId] = React.useState<
    string | null
  >(null);
  const [permissionsUserName, setPermissionsUserName] =
    React.useState<string>("");

  // Set initial projectId when projects load
  React.useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id.toString());
    }
  }, [projects, projectId]);

  const filters = React.useMemo(() => {
    if (statusFilter === "all") return undefined;
    return { status: statusFilter as "active" | "inactive" };
  }, [statusFilter]);

  const { users, isLoading, error, refetch } = useProjectUsers(
    projectId,
    filters,
  );

  const handleUserUpdated = () => {
    refetch();
  };

  const handleManagePermissions = (user: PersonWithDetails) => {
    setPermissionsUserId(user.id);
    setPermissionsUserName(`${user.first_name} ${user.last_name}`);
  };

  const columns: ColumnDef<PersonWithDetails>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const user = row.original;
        const fullName = `${user.first_name} ${user.last_name}`;
        const initials =
          (user.membership as { initials?: string })?.initials ||
          `${user.first_name[0] || ""}${user.last_name[0] || ""}`;

        return (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelectedUser(user)}
            className="flex items-center gap-4 hover:opacity-80 transition-opacity text-left h-auto p-0 justify-start"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Text as="span" weight="medium">
              {fullName}
            </Text>
          </Button>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const user = row.original;
        if (!user.email)
          return (
            <Text as="span" tone="muted">
              -
            </Text>
          );
        return (
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <Text as="span" size="sm" tone="muted">
              {user.email}
            </Text>
          </div>
        );
      },
    },
    {
      accessorKey: "phone_mobile",
      header: "Phone",
      cell: ({ row }) => {
        const user = row.original;
        const phone = user.phone_mobile || user.phone_business;
        if (!phone)
          return (
            <Text as="span" tone="muted">
              -
            </Text>
          );
        return (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <Text as="span" size="sm" tone="muted">
              {phone}
            </Text>
          </div>
        );
      },
    },
    {
      accessorKey: "job_title",
      header: "Job Title",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Text as="span" size="sm">
            {user.job_title || "-"}
          </Text>
        );
      },
    },
    {
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Text as="span" size="sm">
            {user.company?.name || "-"}
          </Text>
        );
      },
    },
    {
      accessorKey: "permission_template",
      header: "Permissions",
      cell: ({ row }) => {
        const user = row.original;
        if (!user.permission_template)
          return (
            <Text as="span" tone="muted">
              -
            </Text>
          );
        return (
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <Text as="span" size="sm">
              {user.permission_template.name}
            </Text>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const user = row.original;
        const status = user.membership?.status || "inactive";
        const inviteStatus = user.membership?.invite_status;

        return (
          <div className="flex items-center gap-2">
            <Badge variant={status === "active" ? "active" : "inactive"}>
              {status}
            </Badge>
            {(inviteStatus === "invited" || inviteStatus === "not_invited") && (
              <Badge variant="outline" className="text-xs">
                Pending
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        const isPendingInvite =
          user.membership?.invite_status === "invited" ||
          user.membership?.invite_status === "not_invited";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingUser(user)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleManagePermissions(user)}>
                <Shield className="mr-2 h-4 w-4" />
                Manage Permissions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isPendingInvite && (
                <DropdownMenuItem>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Invite
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive">
                <UserX className="mr-2 h-4 w-4" />
                Remove from Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const tabs = getDirectoryTabs(pathname);

  const activeUsers = users.filter(
    (u) => u.membership?.status === "active",
  ).length;
  const pendingUsers = users.filter(
    (u) =>
      u.membership?.invite_status === "invited" ||
      u.membership?.invite_status === "not_invited",
  ).length;

  if (isLoading) {
    return (
      <PageShell variant="table" title="Directory" description="Manage companies, clients, contacts, users, and employees across your organization" tabs={tabs}>
        <div className="flex justify-center items-center py-12">
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Text tone="muted">Loading users...</Text>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell variant="table" title="Directory" description="Manage companies, clients, contacts, users, and employees across your organization" tabs={tabs}>
        <div className="text-center py-12">
          <Text tone="destructive">Error loading users: {error.message}</Text>
        </div>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell variant="table" title="Directory" description="Manage companies, clients, contacts, users, and employees across your organization" tabs={tabs}>
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Users" value={users.length} />
            <MetricCard label="Active" value={activeUsers} />
            <MetricCard label="Pending Invites" value={pendingUsers} />
            <MetricCard
              label="Permission Templates"
              value={
                new Set(
                  users.map((u) => u.permission_template?.id).filter(Boolean),
                ).size
              }
            />
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Text weight="medium">Project:</Text>
                <Select value={projectId} onValueChange={setProjectId} disabled={projectsLoading}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={projectsLoading ? "Loading..." : "Select project"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.project_number ? `${p.project_number} - ` : ""}{p.name || "Unnamed Project"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Text weight="medium">Filters:</Text>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as "all" | "active" | "inactive")
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsBulkAddOpen(true)}>
                <Users />
                Bulk Add
              </Button>
              <Button onClick={() => setIsAddOpen(true)}>
                <UserPlus />
                Add User
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <DataTable
            columns={columns}
            data={users}
            searchKey="first_name"
            searchPlaceholder="Search users..."
          />
        </div>
      </PageShell>

      {/* Dialogs and Sheets */}
      <UserFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        projectId={projectId}
        onSuccess={handleUserUpdated}
      />

      <BulkAddUsersDialog
        open={isBulkAddOpen}
        onOpenChange={setIsBulkAddOpen}
        projectId={projectId}
        onSuccess={handleUserUpdated}
      />

      {selectedUser && (
        <UserDetailSheet
          user={selectedUser}
          projectId={projectId}
          open={!!selectedUser}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedUser(null);
            }
          }}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {editingUser && (
        <UserFormDialog
          open={!!editingUser}
          onOpenChange={(open) => {
            if (!open) {
              setEditingUser(null);
            }
          }}
          projectId={projectId}
          user={{
            id: editingUser.id,
            first_name: editingUser.first_name,
            last_name: editingUser.last_name,
            email: editingUser.email,
            phone_mobile: editingUser.phone_mobile,
            phone_business: editingUser.phone_business,
            job_title: editingUser.job_title,
            company_id: editingUser.company_id,
            membership: {
              permission_template_id:
                editingUser.membership?.permission_template_id,
              department: (editingUser.membership as { department?: string })
                ?.department,
            },
          }}
          onSuccess={handleUserUpdated}
        />
      )}

      {permissionsUserId && (
        <UserPermissionsManager
          open={!!permissionsUserId}
          onOpenChange={(open) => {
            if (!open) {
              setPermissionsUserId(null);
              setPermissionsUserName("");
            }
          }}
          projectId={projectId}
          personId={permissionsUserId}
          userName={permissionsUserName}
        />
      )}
    </>
  );
}
